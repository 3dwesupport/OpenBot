//
// Voice Control (Gemini Live)
//

import Foundation

/// Client for the Gemini Live API (BidiGenerateContent over WebSocket). All listener callbacks arrive on the main queue.
final class GeminiLiveClient: NSObject {

    protocol Listener: AnyObject {
        func onSetupComplete()
        func onInputTranscript(_ text: String)
        func onOutputTranscript(_ text: String)
        func onAudioChunk(_ pcm24: Data)
        func onToolCall(id: String, name: String, args: [String: Any])
        func onTurnComplete()
        func onInterrupted()
        func onError(_ message: String)
        /// The session ended; code 1000 is a normal close.
        func onClosed(code: Int, reason: String)
        /// The server closes the connection soon (about 10 min cap); reconnect to keep the conversation.
        func onGoAway(timeLeft: TimeInterval)
    }

    /// Seed model, used until the settings list loads the models this key can use.
    static let defaultModel = "models/gemini-3.1-flash-live-preview"
    /// The API reads realtime video at up to 1 frame per second.
    static let maxVideoFrameInterval: TimeInterval = 1

    private static let endpoint = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent"
    private static let inputMimeType = "audio/pcm;rate=16000"
    private static let videoMimeType = "image/jpeg"

    weak var listener: Listener?
    private var session: URLSession?
    private var task: URLSessionWebSocketTask?
    private var setupMessage: [String: Any] = [:]
    private var pingTimer: Timer?
    // Main queue only.
    private(set) var isSetupComplete = false
    private(set) var resumptionHandle: String?

    init(listener: Listener) {
        self.listener = listener
        super.init()
    }

    func connect(apiKey: String, model: String, systemInstruction: String, functionDeclarations: [[String: Any]]) {
        closeTask()
        isSetupComplete = false
        var setup: [String: Any] = [
            "model": model,
            "generationConfig": ["responseModalities": ["AUDIO"]],
            "systemInstruction": ["parts": [["text": systemInstruction]]],
            "tools": [["functionDeclarations": functionDeclarations]],
            "inputAudioTranscription": [String: Any](),
            "outputAudioTranscription": [String: Any](),
            // Without this a session with video ends after 2 minutes.
            "contextWindowCompression": ["slidingWindow": [String: Any]()],
        ]
        var resumption: [String: Any] = [:]
        if let handle = resumptionHandle {
            resumption["handle"] = handle
        }
        setup["sessionResumption"] = resumption
        setupMessage = ["setup": setup]

        guard var components = URLComponents(string: GeminiLiveClient.endpoint) else {
            return
        }
        components.queryItems = [URLQueryItem(name: "key", value: apiKey)]
        guard let url = components.url else {
            return
        }
        let session = URLSession(configuration: .default, delegate: self, delegateQueue: OperationQueue.main)
        let task = session.webSocketTask(with: url)
        // Video frames and audio replies can be large.
        task.maximumMessageSize = 16 * 1024 * 1024
        self.session = session
        self.task = task
        task.resume()
        receive(on: task)
    }

    func disconnect() {
        closeTask()
        isSetupComplete = false
    }

    /// Forgets the resumption handle, so the next connect starts a new conversation.
    func clearResumptionHandle() {
        resumptionHandle = nil
    }

    /// One chunk of 16 kHz mono 16-bit PCM mic audio.
    func sendAudioChunk(_ pcm16: Data) {
        guard isSetupComplete else {
            return
        }
        send(["realtimeInput": ["audio": ["mimeType": GeminiLiveClient.inputMimeType, "data": pcm16.base64EncodedString()]]])
    }

    /// One JPEG camera frame; callers throttle to maxVideoFrameInterval.
    func sendVideoFrame(_ jpeg: Data) {
        guard isSetupComplete else {
            return
        }
        send(["realtimeInput": ["video": ["mimeType": GeminiLiveClient.videoMimeType, "data": jpeg.base64EncodedString()]]])
    }

    /// A typed user turn.
    func sendText(_ text: String) {
        guard isSetupComplete else {
            return
        }
        send(["clientContent": ["turns": [["role": "user", "parts": [["text": text]]]], "turnComplete": true]])
    }

    func sendToolResponse(id: String, name: String, response: [String: Any]) {
        send(["toolResponse": ["functionResponses": [["id": id, "name": name, "response": response]]]])
    }

    // MARK: - Private

    private func closeTask() {
        pingTimer?.invalidate()
        pingTimer = nil
        task?.cancel(with: .normalClosure, reason: "client_closed".data(using: .utf8))
        task = nil
        session?.invalidateAndCancel()
        session = nil
    }

    private func send(_ message: [String: Any]) {
        guard let task = task, let data = try? JSONSerialization.data(withJSONObject: message), let text = String(data: data, encoding: .utf8) else {
            return
        }
        task.send(.string(text)) { error in
            if let error = error {
                print("Gemini Live send failed: \(error.localizedDescription)")
            }
        }
    }

    private func receive(on task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self, self.task === task else {
                    return
                }
                switch result {
                case .success(let message):
                    switch message {
                    case .string(let text):
                        self.handleServerMessage(Data(text.utf8))
                    case .data(let data):
                        self.handleServerMessage(data)
                    @unknown default:
                        break
                    }
                    self.receive(on: task)
                case .failure(let error):
                    // A close frame is reported by the delegate; this is a dropped or refused connection.
                    guard self.task === task, task.closeCode == .invalid else {
                        return
                    }
                    self.isSetupComplete = false
                    var detail = error.localizedDescription
                    if let http = task.response as? HTTPURLResponse, http.statusCode >= 400 {
                        detail = "\(http.statusCode): \(HTTPURLResponse.localizedString(forStatusCode: http.statusCode))"
                    }
                    self.closeTask()
                    self.listener?.onError(detail)
                }
            }
        }
    }

    private func handleServerMessage(_ data: Data) {
        guard let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
            return
        }
        if let error = json["error"] {
            listener?.onError(String(describing: error))
            return
        }
        if json["setupComplete"] != nil {
            isSetupComplete = true
            listener?.onSetupComplete()
            return
        }
        if let update = json["sessionResumptionUpdate"] as? [String: Any] {
            if update["resumable"] as? Bool == true, let handle = update["newHandle"] as? String {
                resumptionHandle = handle
            }
            return
        }
        if let goAway = json["goAway"] as? [String: Any] {
            // timeLeft is a duration string such as "9.5s".
            let text = (goAway["timeLeft"] as? String) ?? "0s"
            let seconds = Double(text.hasSuffix("s") ? String(text.dropLast()) : text) ?? 0
            listener?.onGoAway(timeLeft: seconds)
            return
        }
        if let content = json["serverContent"] as? [String: Any] {
            if let text = (content["inputTranscription"] as? [String: Any])?["text"] as? String, !text.isEmpty {
                listener?.onInputTranscript(text)
            }
            if let text = (content["outputTranscription"] as? [String: Any])?["text"] as? String, !text.isEmpty {
                listener?.onOutputTranscript(text)
            }
            if let parts = (content["modelTurn"] as? [String: Any])?["parts"] as? [[String: Any]] {
                for part in parts {
                    if let inline = part["inlineData"] as? [String: Any], let base64 = inline["data"] as? String, let pcm = Data(base64Encoded: base64) {
                        listener?.onAudioChunk(pcm)
                    }
                }
            }
            if content["interrupted"] as? Bool == true {
                listener?.onInterrupted()
            }
            if content["turnComplete"] as? Bool == true {
                listener?.onTurnComplete()
            }
            return
        }
        if let calls = (json["toolCall"] as? [String: Any])?["functionCalls"] as? [[String: Any]] {
            for call in calls {
                listener?.onToolCall(id: call["id"] as? String ?? "", name: call["name"] as? String ?? "", args: call["args"] as? [String: Any] ?? [:])
            }
        }
    }
}

extension GeminiLiveClient: URLSessionWebSocketDelegate {
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        guard webSocketTask === task else {
            return
        }
        send(setupMessage)
        // Keeps the connection alive through idle periods.
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 20, repeats: true) { [weak webSocketTask] _ in
            webSocketTask?.sendPing { _ in }
        }
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        guard webSocketTask === task else {
            return
        }
        isSetupComplete = false
        // Google puts the reason here, e.g. "API key not valid. Please pass a valid API key."
        let text = reason.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        closeTask()
        listener?.onClosed(code: closeCode.rawValue, reason: text)
    }
}
