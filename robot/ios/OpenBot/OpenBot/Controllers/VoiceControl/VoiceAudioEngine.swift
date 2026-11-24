//
// Voice Control (Gemini Live)
//

import Foundation
import AVFoundation

/// Mic capture (16 kHz mono PCM16 for Gemini) and speaker playback (Gemini's 24 kHz mono PCM16) on one AVAudioEngine.
/// Restarts itself when iOS stops the engine (camera start, call, Siri). Listener callbacks arrive on the main queue.
final class VoiceAudioEngine {

    protocol Listener: AnyObject {
        /// Mic audio to send; only while the mic is on and the robot isn't speaking.
        func onMicChunk(_ pcm16: Data)
        /// 0...1 level of the latest mic chunk.
        func onMicLevel(_ level: Float)
        /// 0...1 level of the chunk being played.
        func onPlaybackLevel(_ level: Float)
        /// All queued speech has played.
        func onPlaybackIdle()
    }

    static let inputSampleRate: Double = 16000
    static let outputSampleRate: Double = 24000
    /// Quiet time after playback before mic audio is sent again, so the robot doesn't hear its own voice tail.
    private static let echoCooldown: TimeInterval = 0.4
    /// Playback this late past its expected end is stuck.
    private static let stallTimeout: TimeInterval = 1.5
    private static let statsInterval: TimeInterval = 5

    weak var listener: Listener?
    private let engine = AVAudioEngine()
    private let player = AVAudioPlayerNode()
    private let playbackFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: outputSampleRate, channels: 1, interleaved: false)!
    private let micFormat = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: inputSampleRate, channels: 1, interleaved: true)!

    // Main queue only.
    private(set) var isRunning = false
    private var micEnabled = false
    private var queuedBuffers = 0
    private var playbackGeneration = 0
    private var idleSince: TimeInterval = 0
    private var playbackEndsAt: TimeInterval = 0
    private var lastRestart: TimeInterval = 0
    private var observers: [NSObjectProtocol] = []
    private var watchdog: Timer?
    private var lastStats: TimeInterval = 0
    private var micCaptured = 0
    private var micSent = 0
    private var audioReceived = 0
    private var audioPlayed = 0
    private var restarts = 0

    init(listener: Listener) {
        self.listener = listener
    }

    /// Starts the audio session, mic capture and speaker. Returns an error message on failure.
    func start() -> String? {
        guard !isRunning else {
            return nil
        }
        let audioSession = AVAudioSession.sharedInstance()
        do {
            // voiceChat mode with voice processing cancels the robot's own voice; defaultToSpeaker plays out loud.
            try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker])
            try audioSession.setActive(true)
            try engine.inputNode.setVoiceProcessingEnabled(true)
        } catch {
            return error.localizedDescription
        }
        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: playbackFormat)
        // The mic is attached before the engine starts; with voice processing a later tap often gets no audio.
        if let failure = installMicTap() {
            return failure
        }
        engine.prepare()
        do {
            try engine.start()
        } catch {
            engine.inputNode.removeTap(onBus: 0)
            return error.localizedDescription
        }
        player.play()
        isRunning = true
        idleSince = 0
        playbackEndsAt = 0
        observeSystemChanges()
        watchdog = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.checkPlayback()
        }
        print("voice: audio started, mic format \(engine.inputNode.outputFormat(forBus: 0))")
        return nil
    }

    /// Starts sending mic audio; call once the Gemini session is ready.
    func startMic() {
        micEnabled = true
    }

    func stopMic() {
        micEnabled = false
    }

    func stop() {
        guard isRunning else {
            return
        }
        micEnabled = false
        isRunning = false
        observers.forEach { NotificationCenter.default.removeObserver($0) }
        observers.removeAll()
        watchdog?.invalidate()
        watchdog = nil
        playbackGeneration += 1
        queuedBuffers = 0
        engine.inputNode.removeTap(onBus: 0)
        player.stop()
        engine.stop()
        engine.detach(player)
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        print("voice: audio stopped")
    }

    /// Queues one chunk of 24 kHz mono PCM16 for playback.
    func play(_ pcm16: Data) {
        guard isRunning else {
            return
        }
        audioReceived += 1
        // iOS may have stopped the engine or player; start them again before playing.
        if !engine.isRunning {
            restart(reason: "engine was stopped")
        }
        if !player.isPlaying {
            player.play()
        }
        let samples = pcm16.count / 2
        guard samples > 0, let buffer = AVAudioPCMBuffer(pcmFormat: playbackFormat, frameCapacity: AVAudioFrameCount(samples)) else {
            return
        }
        buffer.frameLength = AVAudioFrameCount(samples)
        let out = buffer.floatChannelData![0]
        pcm16.withUnsafeBytes { raw in
            let input = raw.bindMemory(to: Int16.self)
            for i in 0..<samples {
                out[i] = Float(Int16(littleEndian: input[i])) / 32768
            }
        }
        listener?.onPlaybackLevel(VoiceAudioEngine.level(pcm16))
        let now = Date.timeIntervalSinceReferenceDate
        playbackEndsAt = max(playbackEndsAt, now) + Double(samples) / VoiceAudioEngine.outputSampleRate
        queuedBuffers += 1
        let generation = playbackGeneration
        player.scheduleBuffer(buffer) { [weak self] in
            DispatchQueue.main.async {
                self?.bufferFinished(generation: generation)
            }
        }
    }

    /// Drops queued speech right away (the user talked over the robot).
    func flush() {
        guard isRunning else {
            return
        }
        let wasPlaying = queuedBuffers > 0
        resetPlayback()
        player.stop()
        player.play()
        if !wasPlaying {
            idleSince = 0
        }
    }

    /// False while the robot is speaking and shortly after; mic audio is not sent then.
    var isSafeForMicInput: Bool {
        queuedBuffers == 0 && Date.timeIntervalSinceReferenceDate - idleSince >= VoiceAudioEngine.echoCooldown
    }

    // MARK: - Private

    /// Taps the mic in whatever format the iPhone gives (voice processing can give several channels).
    private func installMicTap() -> String? {
        let input = engine.inputNode
        input.removeTap(onBus: 0)
        let inputFormat = input.outputFormat(forBus: 0)
        guard inputFormat.sampleRate > 0, inputFormat.channelCount > 0,
              let mono = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: inputFormat.sampleRate, channels: 1, interleaved: false),
              let converter = AVAudioConverter(from: mono, to: micFormat) else {
            return "Microphone format not supported: \(inputFormat)"
        }
        // About 100 ms per chunk.
        let bufferSize = AVAudioFrameCount(inputFormat.sampleRate / 10)
        input.installTap(onBus: 0, bufferSize: bufferSize, format: inputFormat) { [weak self] buffer, _ in
            self?.handleMicBuffer(buffer, mono: mono, converter: converter)
        }
        return nil
    }

    /// Runs on the audio thread: first channel only, resampled to 16 kHz PCM16.
    private func handleMicBuffer(_ buffer: AVAudioPCMBuffer, mono: AVAudioFormat, converter: AVAudioConverter) {
        let frames = Int(buffer.frameLength)
        guard frames > 0, let monoBuffer = AVAudioPCMBuffer(pcmFormat: mono, frameCapacity: AVAudioFrameCount(frames)) else {
            return
        }
        monoBuffer.frameLength = AVAudioFrameCount(frames)
        let out = monoBuffer.floatChannelData![0]
        let interleaved = buffer.format.isInterleaved
        let stride = interleaved ? Int(buffer.format.channelCount) : 1
        if let floats = buffer.floatChannelData {
            for i in 0..<frames {
                out[i] = floats[0][i * stride]
            }
        } else if let ints = buffer.int16ChannelData {
            for i in 0..<frames {
                out[i] = Float(ints[0][i * stride]) / 32768
            }
        } else {
            return
        }

        let ratio = micFormat.sampleRate / mono.sampleRate
        guard let output = AVAudioPCMBuffer(pcmFormat: micFormat, frameCapacity: AVAudioFrameCount(Double(frames) * ratio) + 32) else {
            return
        }
        var consumed = false
        var error: NSError?
        converter.convert(to: output, error: &error) { _, status in
            if consumed {
                status.pointee = .noDataNow
                return nil
            }
            consumed = true
            status.pointee = .haveData
            return monoBuffer
        }
        guard error == nil, output.frameLength > 0, let channel = output.int16ChannelData else {
            if let error = error {
                print("voice: mic conversion failed: \(error.localizedDescription)")
            }
            return
        }
        let data = Data(bytes: channel[0], count: Int(output.frameLength) * 2)
        let level = VoiceAudioEngine.level(data)
        DispatchQueue.main.async { [weak self] in
            self?.deliverMic(data, level: level)
        }
    }

    private func deliverMic(_ data: Data, level: Float) {
        guard isRunning else {
            return
        }
        micCaptured += 1
        listener?.onMicLevel(level)
        // Not while the robot speaks, or Gemini hears itself and keeps interrupting.
        guard micEnabled, isSafeForMicInput else {
            return
        }
        micSent += 1
        listener?.onMicChunk(data)
    }

    private func bufferFinished(generation: Int) {
        guard generation == playbackGeneration, queuedBuffers > 0 else {
            return
        }
        audioPlayed += 1
        queuedBuffers -= 1
        if queuedBuffers == 0 {
            idleSince = Date.timeIntervalSinceReferenceDate
            listener?.onPlaybackIdle()
        }
    }

    /// Forgets queued speech, so a stuck buffer can never keep the mic blocked.
    private func resetPlayback() {
        playbackGeneration += 1
        let hadQueue = queuedBuffers > 0
        queuedBuffers = 0
        playbackEndsAt = 0
        idleSince = Date.timeIntervalSinceReferenceDate
        if hadQueue {
            listener?.onPlaybackIdle()
        }
    }

    /// Every 0.5 s: catches stuck playback or a stopped engine, and logs counters every 5 s.
    private func checkPlayback() {
        guard isRunning else {
            return
        }
        let now = Date.timeIntervalSinceReferenceDate
        if queuedBuffers > 0 && now > playbackEndsAt + VoiceAudioEngine.stallTimeout {
            print("voice: playback stuck with \(queuedBuffers) chunks queued, restarting audio")
            restart(reason: "playback stuck")
        } else if !engine.isRunning {
            restart(reason: "engine was stopped")
        }
        if now - lastStats >= VoiceAudioEngine.statsInterval {
            lastStats = now
            print("voice: engine \(engine.isRunning ? "on" : "off"), player \(player.isPlaying ? "on" : "off"), mic \(micCaptured) captured / \(micSent) sent\(micEnabled ? "" : " (mic off)"), audio \(audioReceived) received / \(audioPlayed) played, queued \(queuedBuffers), restarts \(restarts)")
        }
    }

    private func observeSystemChanges() {
        let center = NotificationCenter.default
        // iOS stops the engine when the audio setup changes (for example when the camera starts).
        observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            self?.restart(reason: "audio configuration changed")
        })
        observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt
            if raw.flatMap(AVAudioSession.InterruptionType.init) == .ended {
                self?.restart(reason: "interruption ended")
            }
        })
        observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification, object: nil, queue: .main) { [weak self] _ in
            self?.restart(reason: "media services reset")
        })
    }

    /// Starts the engine, mic and player again after iOS stopped them.
    private func restart(reason: String) {
        guard isRunning else {
            return
        }
        let now = Date.timeIntervalSinceReferenceDate
        // A restart itself can post a configuration change; don't loop.
        guard now - lastRestart > 0.5 else {
            return
        }
        lastRestart = now
        restarts += 1
        print("voice: restarting audio (\(reason))")
        resetPlayback()
        player.stop()
        engine.stop()
        try? AVAudioSession.sharedInstance().setActive(true)
        if let failure = installMicTap() {
            print("voice: \(failure)")
        }
        engine.prepare()
        do {
            try engine.start()
            player.play()
        } catch {
            print("voice: audio restart failed: \(error.localizedDescription)")
        }
    }

    /// Mean absolute amplitude of PCM16, scaled to 0...1.
    static func level(_ pcm16: Data) -> Float {
        let samples = pcm16.count / 2
        guard samples > 0 else {
            return 0
        }
        var sum: Int = 0
        pcm16.withUnsafeBytes { raw in
            let input = raw.bindMemory(to: Int16.self)
            for i in 0..<samples {
                sum += abs(Int(Int16(littleEndian: input[i])))
            }
        }
        return min(1, Float(sum) / Float(samples) / 8000)
    }
}
