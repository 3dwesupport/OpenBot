//
// Voice Control (Gemini Live)
//

import UIKit
import AVFoundation
import ARKit
import SceneKit
import simd

/// Talk to the robot with the Gemini Live API. Gemini answers by voice and drives the robot through the tools in RobotToolExecutor.
/// One ARKit session runs for the whole conversation: camera frames for Gemini, person following and precise distance moves.
final class VoiceControlFragment: UIViewController, ARSCNViewDelegate, UITableViewDataSource, UITextFieldDelegate {

    static let aiStudioApiKeyUrl = "https://aistudio.google.com/apikey"
    // Google API keys: the older "AIza..." format and the newer "AQ...." format.
    private static let apiKeyPattern = "^(AIza[0-9A-Za-z_\\-]{20,}|AQ\\.[0-9A-Za-z_.\\-]{20,})$"
    private static let personConfidence: Float = 0.5
    // ARKit calls back every frame; this long without a navigation step means it's stuck.
    private static let navWatchdogTimeout: TimeInterval = 0.7
    private static let trackingLimitedTimeout: TimeInterval = 2

    private let preferences = SharedPreferencesManager()

    // Setup card
    private let setupCard = UIScrollView()
    private let keyField = UITextField()
    private var awaitingKeyFromBrowser = false

    // Main content
    private let mainContent = UIView()
    private let cameraContainer = UIView()
    private var sceneView: ARSCNView!
    private let trackingBox = CAShapeLayer()
    private let orbButton = UIControl()
    private let orb = VoiceOrbView()
    private let micIcon = UIImageView()
    private let statusLabel = UILabel()
    private let transcriptTable = UITableView(frame: .zero, style: .plain)
    private let textInput = UITextField()
    private let hintLabel = ToastLabel()
    private var hintHideWork: DispatchWorkItem?

    // Session, main queue only
    private var client: GeminiLiveClient?
    private var audio: VoiceAudioEngine?
    private var toolExecutor: RobotToolExecutor?
    private let weather = WeatherService()
    private var sessionActive = false
    private var pendingTypedText: String?
    private var messages: [VoiceChatMessage] = []
    // While following or driving a distance the orb stays "acting" even when Gemini stops talking.
    private var physicalActionRunning = false
    private var cameraRunning = false

    // Vision, main queue only
    private var detector: Detector?
    private var navigation: Navigation?
    private var navTimer: Timer?
    private var lastNavUpdate: TimeInterval = 0
    private var trackingLimitedSince: TimeInterval?
    private var lastFollowControl: (left: Float, right: Float)?
    private let frameState = FrameState()
    private let visionQueue = DispatchQueue(label: "openbot.voice.vision")
    private let detectQueue = DispatchQueue(label: "openbot.voice.detect")
    private let navQueue = DispatchQueue(label: "openbot.voice.nav")
    private let blueDress = try! YCbCrImageBufferConverter()
    private let ciContext = CIContext()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        setupNavigationBarItem()
        setupSetupCard()
        setupMainContent()
        setupHintLabel()
        // Tapping outside a text field closes the keyboard; other taps still reach buttons.
        let tapOutside = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapOutside.cancelsTouchesInView = false
        view.addGestureRecognizer(tapOutside)
        // Not willResignActive: that also fires for the camera and location permission alerts.
        NotificationCenter.default.addObserver(self, selector: #selector(appDidEnterBackground), name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(appDidBecomeActive), name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // The robot holds the phone in landscape, and camera frames are read in that orientation.
        lockOrientation(.landscapeRight, rotateTo: .landscapeRight)
        refreshSetupState()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Never leave the robot moving when leaving this screen.
        stopSession()
        lockOrientation(.all, rotateTo: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }

    @objc private func appDidEnterBackground() {
        stopSession()
    }

    @objc private func appDidBecomeActive() {
        // Back from the AI Studio page: offer the copied key.
        autoFillApiKeyFromClipboard()
    }

    private func lockOrientation(_ mask: UIInterfaceOrientationMask, rotateTo orientation: UIInterfaceOrientation?) {
        if let orientation = orientation {
            AppDelegate.AppUtility.lockOrientation(mask, andRotateTo: orientation)
        } else {
            AppDelegate.AppUtility.lockOrientation(mask)
        }
        if #available(iOS 16.0, *) {
            setNeedsUpdateOfSupportedInterfaceOrientations()
            navigationController?.setNeedsUpdateOfSupportedInterfaceOrientations()
            if orientation != nil {
                view.window?.windowScene?.requestGeometryUpdate(.iOS(interfaceOrientations: mask))
            }
        }
    }

    // MARK: - Layout

    private func setupNavigationBarItem() {
        if let backImage = UIImage(named: "back")?.withRenderingMode(.alwaysOriginal) {
            navigationItem.leftBarButtonItem = UIBarButtonItem(image: backImage, title: Strings.voiceControl, target: self, action: #selector(back), titleColor: Colors.navigationColor ?? .white)
        }
    }

    @objc private func back() {
        navigationController?.popViewController(animated: true)
    }

    private func setupSetupCard() {
        let title = UILabel()
        title.text = Strings.voiceSetupTitle
        title.font = UIFont.boldSystemFont(ofSize: 22)
        title.numberOfLines = 0

        let description = UILabel()
        description.text = Strings.voiceSetupDescription
        description.font = UIFont.systemFont(ofSize: 15)
        description.textColor = .secondaryLabel
        description.numberOfLines = 0

        let link = UIButton(type: .system)
        link.setTitle(Strings.voiceSetupGetKeyLink, for: .normal)
        link.contentHorizontalAlignment = .leading
        link.addTarget(self, action: #selector(openKeyPage), for: .touchUpInside)

        keyField.placeholder = Strings.voiceSetupApiKeyHint
        keyField.borderStyle = .roundedRect
        keyField.configureForApiKey()
        keyField.font = UIFont.monospacedSystemFont(ofSize: 14, weight: .regular)
        keyField.returnKeyType = .done
        keyField.delegate = self

        let save = UIButton(type: .system)
        save.setTitle(Strings.voiceSetupSaveButton, for: .normal)
        save.setTitleColor(.white, for: .normal)
        save.titleLabel?.font = UIFont.boldSystemFont(ofSize: 16)
        save.backgroundColor = Colors.voiceControlColor
        save.layer.cornerRadius = 8
        save.addTarget(self, action: #selector(saveApiKey), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [title, description, link, keyField, save])
        stack.axis = .vertical
        stack.spacing = 14
        stack.translatesAutoresizingMaskIntoConstraints = false
        setupCard.translatesAutoresizingMaskIntoConstraints = false
        setupCard.keyboardDismissMode = .interactive
        setupCard.addSubview(stack)
        view.addSubview(setupCard)
        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            setupCard.topAnchor.constraint(equalTo: guide.topAnchor),
            setupCard.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            setupCard.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            setupCard.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
            stack.topAnchor.constraint(equalTo: setupCard.contentLayoutGuide.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(equalTo: setupCard.contentLayoutGuide.bottomAnchor, constant: -24),
            stack.centerXAnchor.constraint(equalTo: setupCard.frameLayoutGuide.centerXAnchor),
            stack.widthAnchor.constraint(equalTo: setupCard.frameLayoutGuide.widthAnchor, multiplier: 0.8),
            keyField.heightAnchor.constraint(equalToConstant: 44),
            save.heightAnchor.constraint(equalToConstant: 44),
        ])
    }

    private func setupMainContent() {
        mainContent.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(mainContent)
        let guide = view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            mainContent.topAnchor.constraint(equalTo: guide.topAnchor),
            mainContent.leadingAnchor.constraint(equalTo: guide.leadingAnchor),
            mainContent.trailingAnchor.constraint(equalTo: guide.trailingAnchor),
            mainContent.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor),
        ])

        // Left column: camera thumbnail, orb, status.
        let left = UIView()
        left.translatesAutoresizingMaskIntoConstraints = false
        mainContent.addSubview(left)

        sceneView = ARSCNView(frame: .zero)
        sceneView.delegate = self
        sceneView.scene = SCNScene()
        sceneView.translatesAutoresizingMaskIntoConstraints = false
        cameraContainer.addSubview(sceneView)
        trackingBox.strokeColor = UIColor.systemGreen.cgColor
        trackingBox.fillColor = UIColor.clear.cgColor
        trackingBox.lineWidth = 2
        cameraContainer.layer.addSublayer(trackingBox)
        cameraContainer.layer.cornerRadius = 8
        cameraContainer.clipsToBounds = true
        cameraContainer.isHidden = true
        cameraContainer.translatesAutoresizingMaskIntoConstraints = false
        left.addSubview(cameraContainer)

        let settingsButton = UIButton(type: .system)
        settingsButton.setImage(UIImage(systemName: "gearshape.fill"), for: .normal)
        settingsButton.tintColor = .secondaryLabel
        settingsButton.accessibilityLabel = Strings.voiceSettingsButtonDescription
        settingsButton.addTarget(self, action: #selector(openSettings), for: .touchUpInside)
        settingsButton.translatesAutoresizingMaskIntoConstraints = false
        left.addSubview(settingsButton)

        orbButton.translatesAutoresizingMaskIntoConstraints = false
        orbButton.accessibilityLabel = Strings.voiceMicButtonDescription
        orbButton.accessibilityTraits = .button
        orbButton.addTarget(self, action: #selector(toggleSession), for: .touchUpInside)
        left.addSubview(orbButton)
        orb.translatesAutoresizingMaskIntoConstraints = false
        orbButton.addSubview(orb)
        micIcon.image = UIImage(systemName: "mic.fill")
        micIcon.tintColor = .white
        micIcon.contentMode = .scaleAspectFit
        micIcon.isUserInteractionEnabled = false
        micIcon.translatesAutoresizingMaskIntoConstraints = false
        orbButton.addSubview(micIcon)

        statusLabel.text = Strings.voiceStatusIdle
        statusLabel.font = UIFont.systemFont(ofSize: 15)
        statusLabel.textColor = .secondaryLabel
        statusLabel.textAlignment = .center
        statusLabel.numberOfLines = 2
        statusLabel.translatesAutoresizingMaskIntoConstraints = false
        left.addSubview(statusLabel)

        // Right column: transcript and text input.
        transcriptTable.dataSource = self
        transcriptTable.separatorStyle = .none
        transcriptTable.backgroundColor = .clear
        transcriptTable.allowsSelection = false
        transcriptTable.keyboardDismissMode = .interactive
        transcriptTable.register(VoiceChatCell.self, forCellReuseIdentifier: VoiceChatCell.identifier)
        transcriptTable.translatesAutoresizingMaskIntoConstraints = false
        mainContent.addSubview(transcriptTable)

        textInput.placeholder = Strings.voiceTypeCommandHint
        textInput.borderStyle = .roundedRect
        textInput.returnKeyType = .send
        textInput.delegate = self
        textInput.translatesAutoresizingMaskIntoConstraints = false
        mainContent.addSubview(textInput)

        let sendButton = UIButton(type: .system)
        sendButton.setImage(UIImage(systemName: "paperplane.fill"), for: .normal)
        sendButton.tintColor = Colors.voiceControlColor
        sendButton.accessibilityLabel = Strings.voiceSendButtonDescription
        sendButton.addTarget(self, action: #selector(sendTypedText), for: .touchUpInside)
        sendButton.translatesAutoresizingMaskIntoConstraints = false
        mainContent.addSubview(sendButton)

        NSLayoutConstraint.activate([
            left.topAnchor.constraint(equalTo: mainContent.topAnchor),
            left.bottomAnchor.constraint(equalTo: mainContent.bottomAnchor),
            left.leadingAnchor.constraint(equalTo: mainContent.leadingAnchor),
            left.widthAnchor.constraint(equalTo: mainContent.widthAnchor, multiplier: 0.42),

            cameraContainer.topAnchor.constraint(equalTo: left.topAnchor, constant: 8),
            cameraContainer.leadingAnchor.constraint(equalTo: left.leadingAnchor, constant: 8),
            cameraContainer.widthAnchor.constraint(equalToConstant: 160),
            // Same 4:3 shape as the camera image, so the box overlay maps 1:1.
            cameraContainer.heightAnchor.constraint(equalToConstant: 120),
            sceneView.topAnchor.constraint(equalTo: cameraContainer.topAnchor),
            sceneView.bottomAnchor.constraint(equalTo: cameraContainer.bottomAnchor),
            sceneView.leadingAnchor.constraint(equalTo: cameraContainer.leadingAnchor),
            sceneView.trailingAnchor.constraint(equalTo: cameraContainer.trailingAnchor),

            settingsButton.topAnchor.constraint(equalTo: left.topAnchor, constant: 8),
            settingsButton.trailingAnchor.constraint(equalTo: left.trailingAnchor, constant: -8),
            settingsButton.widthAnchor.constraint(equalToConstant: 44),
            settingsButton.heightAnchor.constraint(equalToConstant: 44),

            orbButton.centerXAnchor.constraint(equalTo: left.centerXAnchor),
            orbButton.centerYAnchor.constraint(equalTo: left.centerYAnchor, constant: 20),
            orbButton.widthAnchor.constraint(equalTo: orbButton.heightAnchor),
            orbButton.heightAnchor.constraint(lessThanOrEqualTo: left.heightAnchor, multiplier: 0.5),
            orbButton.widthAnchor.constraint(lessThanOrEqualTo: left.widthAnchor, multiplier: 0.6),
            orb.topAnchor.constraint(equalTo: orbButton.topAnchor),
            orb.bottomAnchor.constraint(equalTo: orbButton.bottomAnchor),
            orb.leadingAnchor.constraint(equalTo: orbButton.leadingAnchor),
            orb.trailingAnchor.constraint(equalTo: orbButton.trailingAnchor),
            micIcon.centerXAnchor.constraint(equalTo: orbButton.centerXAnchor),
            micIcon.centerYAnchor.constraint(equalTo: orbButton.centerYAnchor),
            micIcon.widthAnchor.constraint(equalToConstant: 32),
            micIcon.heightAnchor.constraint(equalToConstant: 32),

            statusLabel.topAnchor.constraint(equalTo: orbButton.bottomAnchor, constant: 12),
            statusLabel.leadingAnchor.constraint(equalTo: left.leadingAnchor, constant: 8),
            statusLabel.trailingAnchor.constraint(equalTo: left.trailingAnchor, constant: -8),

            transcriptTable.topAnchor.constraint(equalTo: mainContent.topAnchor, constant: 8),
            transcriptTable.leadingAnchor.constraint(equalTo: left.trailingAnchor),
            transcriptTable.trailingAnchor.constraint(equalTo: mainContent.trailingAnchor, constant: -8),
            transcriptTable.bottomAnchor.constraint(equalTo: textInput.topAnchor, constant: -8),

            textInput.leadingAnchor.constraint(equalTo: left.trailingAnchor, constant: 8),
            textInput.bottomAnchor.constraint(equalTo: mainContent.bottomAnchor, constant: -8),
            textInput.heightAnchor.constraint(equalToConstant: 40),
            sendButton.leadingAnchor.constraint(equalTo: textInput.trailingAnchor, constant: 4),
            sendButton.trailingAnchor.constraint(equalTo: mainContent.trailingAnchor, constant: -8),
            sendButton.centerYAnchor.constraint(equalTo: textInput.centerYAnchor),
            sendButton.widthAnchor.constraint(equalToConstant: 44),
            sendButton.heightAnchor.constraint(equalToConstant: 44),
        ])
        // Keep the orb fully visible on small screens.
        let preferred = orbButton.widthAnchor.constraint(equalToConstant: 220)
        preferred.priority = .defaultHigh
        preferred.isActive = true
    }

    private func setupHintLabel() {
        hintLabel.textInsets = UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)
        hintLabel.numberOfLines = 0
        hintLabel.textAlignment = .center
        hintLabel.textColor = .white
        hintLabel.font = UIFont.systemFont(ofSize: 15)
        hintLabel.backgroundColor = UIColor.black.withAlphaComponent(0.75)
        hintLabel.layer.cornerRadius = 10
        hintLabel.clipsToBounds = true
        hintLabel.alpha = 0
        hintLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hintLabel)
        NSLayoutConstraint.activate([
            hintLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            hintLabel.bottomAnchor.constraint(equalTo: view.keyboardLayoutGuide.topAnchor, constant: -60),
            hintLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            hintLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
        ])
    }

    private func showHint(_ text: String) {
        hintHideWork?.cancel()
        hintLabel.text = text
        UIView.animate(withDuration: 0.2) { self.hintLabel.alpha = 1 }
        let work = DispatchWorkItem { [weak self] in
            UIView.animate(withDuration: 0.3) { self?.hintLabel.alpha = 0 }
        }
        hintHideWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: work)
    }

    // MARK: - API key setup

    private func refreshSetupState() {
        let hasKey = !preferences.getGeminiApiKey().isEmpty
        setupCard.isHidden = hasKey
        mainContent.isHidden = !hasKey
    }

    private func autoFillApiKeyFromClipboard() {
        // Only right after the AI Studio page, since reading the clipboard can show an iOS paste prompt.
        guard awaitingKeyFromBrowser, isViewLoaded, view.window != nil, !setupCard.isHidden, (keyField.text ?? "").isEmpty, UIPasteboard.general.hasStrings else {
            return
        }
        awaitingKeyFromBrowser = false
        guard let candidate = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines),
              candidate.range(of: VoiceControlFragment.apiKeyPattern, options: .regularExpression) != nil else {
            return
        }
        keyField.text = candidate
        showHint(Strings.voiceSetupKeyDetected)
    }

    @objc private func openKeyPage() {
        if let url = URL(string: VoiceControlFragment.aiStudioApiKeyUrl) {
            awaitingKeyFromBrowser = true
            UIApplication.shared.open(url)
        }
    }

    @objc private func saveApiKey() {
        let key = (keyField.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else {
            showHint(Strings.voiceSetupApiKeyRequired)
            return
        }
        keyField.resignFirstResponder()
        preferences.setGeminiApiKey(value: key)
        refreshSetupState()
    }

    @objc private func openSettings() {
        navigationController?.pushViewController(VoiceControlSettingsViewController(), animated: true)
    }

    // MARK: - Session

    @objc private func toggleSession() {
        view.endEditing(true)
        if sessionActive {
            stopSession()
            return
        }
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted:
            startSession()
        case .undetermined:
            AVAudioSession.sharedInstance().requestRecordPermission { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.startSession()
                    } else {
                        self?.showHint(Strings.voiceMicPermissionRequired)
                    }
                }
            }
        default:
            showHint(Strings.voiceMicPermissionRequired)
        }
    }

    @objc private func sendTypedText() {
        let text = (textInput.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else {
            return
        }
        textInput.text = ""
        // Close the keyboard once the message is sent.
        textInput.resignFirstResponder()
        guard sessionActive, let client = client, client.isSetupComplete else {
            pendingTypedText = text
            startSession()
            return
        }
        addMessage(VoiceChatMessage(role: .user, text: text))
        client.sendText(text)
    }

    private func startSession() {
        guard !sessionActive, view.window != nil else {
            return
        }
        let apiKey = preferences.getGeminiApiKey()
        guard !apiKey.isEmpty else {
            refreshSetupState()
            return
        }
        sessionActive = true
        setOrb(.connecting, status: Strings.voiceStatusConnecting)

        toolExecutor = RobotToolExecutor(
            onAction: { [weak self] description in
                self?.addMessage(VoiceChatMessage(role: .action, text: description))
            },
            vision: self,
            weather: weather,
            sendResponse: { [weak self] id, name, response in
                self?.client?.sendToolResponse(id: id, name: name, response: response)
            })

        let audio = VoiceAudioEngine(listener: self)
        if let failure = audio.start() {
            showHint(failure)
            stopSession()
            return
        }
        self.audio = audio

        let client = GeminiLiveClient(listener: self)
        self.client = client
        client.connect(apiKey: apiKey, model: preferences.getGeminiModel(), systemInstruction: RobotToolExecutor.systemInstruction, functionDeclarations: RobotToolExecutor.functionDeclarations())

        startCamera()
    }

    private func stopSession() {
        let wasActive = sessionActive
        sessionActive = false
        pendingTypedText = nil
        physicalActionRunning = false

        audio?.stop()
        audio = nil
        client?.disconnect()
        client = nil
        stopFollowing(stopRobot: false)
        stopGoal(stopRobot: false)
        if wasActive {
            toolExecutor?.shutdown()
        }
        toolExecutor = nil
        stopCamera()
        detector = nil

        setOrb(.idle, status: Strings.voiceStatusIdle)
    }

    private func setOrb(_ state: VoiceOrbView.State, status: String? = nil) {
        orb.state = state
        if let status = status {
            statusLabel.text = status
        }
        micIcon.image = UIImage(systemName: sessionActive ? "stop.fill" : "mic.fill")
    }

    private func showListening() {
        guard sessionActive, !physicalActionRunning else {
            return
        }
        setOrb(.listening, status: Strings.voiceStatusListening)
    }

    // MARK: - Transcript

    private func addMessage(_ message: VoiceChatMessage) {
        messages.append(message)
        transcriptTable.insertRows(at: [IndexPath(row: messages.count - 1, section: 0)], with: .none)
        scrollToBottom()
    }

    /// Streamed transcripts are added to the last bubble of the same role.
    private func appendToLast(role: VoiceChatMessage.Role, text: String) {
        if let last = messages.last, last.role == role {
            last.text += text
            UIView.performWithoutAnimation {
                transcriptTable.reloadRows(at: [IndexPath(row: messages.count - 1, section: 0)], with: .none)
            }
            scrollToBottom()
        } else {
            addMessage(VoiceChatMessage(role: role, text: text))
        }
    }

    private func scrollToBottom() {
        guard !messages.isEmpty else {
            return
        }
        transcriptTable.scrollToRow(at: IndexPath(row: messages.count - 1, section: 0), at: .bottom, animated: true)
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        messages.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: VoiceChatCell.identifier, for: indexPath) as! VoiceChatCell
        cell.configure(with: messages[indexPath.row])
        return cell
    }

    // MARK: - Text fields

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        if textField == textInput {
            sendTypedText()
        } else {
            saveApiKey()
        }
        return true
    }

    // MARK: - Camera (ARKit)

    private func startCamera() {
        guard ARWorldTrackingConfiguration.isSupported else {
            return
        }
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            runArSession()
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.runArSession()
                    }
                }
            }
        default:
            // Camera is optional: the conversation still works without it.
            break
        }
    }

    private func runArSession() {
        guard sessionActive, !cameraRunning else {
            return
        }
        let configuration = ARWorldTrackingConfiguration()
        configuration.planeDetection = []
        sceneView.session.run(configuration, options: [.resetTracking, .removeExistingAnchors])
        cameraRunning = true
        frameState.setCameraRunning(true)
        cameraContainer.isHidden = false
    }

    private func stopCamera() {
        frameState.setCameraRunning(false)
        if cameraRunning {
            sceneView.session.pause()
            cameraRunning = false
        }
        cameraContainer.isHidden = true
        trackingBox.path = nil
    }

    /// Render thread, once per camera frame.
    func renderer(_ renderer: SCNSceneRenderer, didRenderScene scene: SCNScene, atTime time: TimeInterval) {
        guard let frame = sceneView.session.currentFrame else {
            return
        }
        let pixelBuffer = frame.capturedImage
        let now = Date.timeIntervalSinceReferenceDate
        let work = frameState.claimWork(now: now)

        if let goal = work.navigationGoal {
            let tracking = frame.camera.trackingState
            let transform = frame.camera.transform
            navQueue.async { [weak self] in
                self?.navigationStep(pixelBuffer: pixelBuffer, tracking: tracking, transform: transform, goal: goal)
            }
            return
        }
        if work.sendVideo {
            visionQueue.async { [weak self] in
                self?.encodeAndSendFrame(pixelBuffer)
            }
        }
        if work.detect {
            detectQueue.async { [weak self] in
                self?.followStep(pixelBuffer)
            }
        }
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                return
            }
            print("voice: ARKit failed: \(error.localizedDescription)")
            self.stopGoal(stopRobot: true)
            self.stopFollowing(stopRobot: true)
            self.frameState.setCameraRunning(false)
            self.cameraRunning = false
            self.cameraContainer.isHidden = true
        }
    }

    /// Vision queue.
    private func encodeAndSendFrame(_ pixelBuffer: CVPixelBuffer) {
        defer {
            frameState.finishVideo()
        }
        let image = CIImage(cvPixelBuffer: pixelBuffer)
        let scale = 640 / max(image.extent.width, 1)
        let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
        guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
              let jpeg = ciContext.jpegRepresentation(of: scaled, colorSpace: colorSpace, options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.7]) else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.client?.sendVideoFrame(jpeg)
        }
    }

    // MARK: - Follow person

    private func makeDetector() -> Detector? {
        let items = Common.loadAllModelItemsFromBundle()
        // The only detector bundled with the app; others need a download first.
        guard let item = items.first(where: { $0.name == "MobileNetV1-300.tflite" }) ?? items.first(where: { $0.type == TYPE.DETECTOR.rawValue }) else {
            return nil
        }
        guard let created = try? Detector.create(model: Model.fromModelItem(item: item), device: .CPU, numThreads: 2) as? Detector else {
            return nil
        }
        created.setSelectedClass(newClass: "person")
        return created
    }

    /// Detect queue.
    private func followStep(_ pixelBuffer: CVPixelBuffer) {
        defer {
            frameState.finishDetect()
        }
        guard let detector = frameState.detector, let bgra = convertToBGRA(pixelBuffer) else {
            return
        }
        let width = CGFloat(CVPixelBufferGetWidth(bgra))
        let height = CGFloat(CVPixelBufferGetHeight(bgra))
        let best = detector.recognizeImage(pixelBuffer: bgra, detectionType: "single")
            .filter { $0.getConfidence() >= VoiceControlFragment.personConfidence }
            .max { $0.getConfidence() < $1.getConfidence() }
        let box = best?.getLocation()
        let control = box.map { PersonFollowMath.control(box: $0, frameWidth: width, frameHeight: height) } ?? (left: Float(0), right: Float(0))
        let normalized = box.map { CGRect(x: $0.minX / width, y: $0.minY / height, width: $0.width / width, height: $0.height / height) }
        DispatchQueue.main.async { [weak self] in
            self?.applyFollow(control: control, box: normalized)
        }
    }

    private func applyFollow(control: (left: Float, right: Float), box: CGRect?) {
        guard frameState.isFollowing, let executor = toolExecutor else {
            return
        }
        // Skip a repeated drive command; the executor already skips repeated stops.
        if let last = lastFollowControl, last == control, control.left != 0 || control.right != 0 {
            return
        }
        lastFollowControl = control
        executor.sendControl(left: control.left, right: control.right)
        let size = cameraContainer.bounds.size
        trackingBox.path = box.map { UIBezierPath(rect: CGRect(x: $0.minX * size.width, y: $0.minY * size.height, width: $0.width * size.width, height: $0.height * size.height)).cgPath }
    }

    private func stopFollowing(stopRobot: Bool) {
        let wasFollowing = frameState.isFollowing
        frameState.setFollowing(false, detector: nil)
        lastFollowControl = nil
        trackingBox.path = nil
        if wasFollowing && stopRobot {
            bluetoothDataController.shared.stopRobot()
        }
    }

    // MARK: - Move a distance

    private func stopGoal(stopRobot: Bool) {
        let wasNavigating = frameState.isNavigating
        frameState.setGoal(nil)
        navTimer?.invalidate()
        navTimer = nil
        trackingLimitedSince = nil
        if wasNavigating && stopRobot {
            bluetoothDataController.shared.stopRobot()
        }
    }

    /// Nav queue.
    private func navigationStep(pixelBuffer: CVPixelBuffer, tracking: ARCamera.TrackingState, transform: simd_float4x4, goal: simd_float3) {
        guard case .normal = tracking else {
            frameState.finishNav()
            DispatchQueue.main.async { [weak self] in
                self?.onNavigationStep(.trackingLimited)
            }
            return
        }
        let position = simd_make_float3(transform.columns.3)
        let orientation = simd_quatf(transform)
        let distance = PointGoalMath.horizontalDistance(position, goal)
        let yaw = PointGoalMath.deltaYaw(position: position, orientation: orientation, goal: goal)
        let outcome: VoiceNavOutcome
        if frameState.hasArrived(distance: distance, deltaYaw: yaw) {
            outcome = .arrived
        } else if let bgra = convertToBGRA(pixelBuffer), let control = navigation?.recognizeImage(pixelBuffer: bgra, goalDistance: distance, goalSin: sin(yaw), goalCos: cos(yaw)) {
            outcome = .drive(left: control.getLeft(), right: control.getRight())
        } else {
            outcome = .skipped
        }
        frameState.finishNav()
        DispatchQueue.main.async { [weak self] in
            self?.onNavigationStep(outcome)
        }
    }

    private func onNavigationStep(_ outcome: VoiceNavOutcome) {
        guard frameState.isNavigating else {
            return
        }
        let now = Date.timeIntervalSinceReferenceDate
        switch outcome {
        case .drive(let left, let right):
            lastNavUpdate = now
            trackingLimitedSince = nil
            toolExecutor?.sendControl(left: left, right: right)
        case .arrived:
            stopGoal(stopRobot: true)
            addMessage(VoiceChatMessage(role: .action, text: "Reached destination"))
            client?.sendText("(The robot has reached its destination.)")
            onPhysicalActionEnded()
        case .trackingLimited:
            // Hold still and keep the goal; only a long outage ends the drive.
            lastNavUpdate = now
            toolExecutor?.sendControl(left: 0, right: 0)
            let since = trackingLimitedSince ?? now
            trackingLimitedSince = since
            if now - since > VoiceControlFragment.trackingLimitedTimeout {
                stopGoal(stopRobot: true)
                showHint(Strings.voiceTrackingLost)
                client?.sendText("(The robot lost tracking and stopped before reaching its destination.)")
                onPhysicalActionEnded()
            }
        case .skipped:
            break
        }
    }

    private func onPhysicalActionEnded() {
        physicalActionRunning = false
        showListening()
    }

    // MARK: - Helpers

    /// ARKit frames are YCbCr; the TFLite models need BGRA.
    private func convertToBGRA(_ pixelBuffer: CVPixelBuffer) -> CVPixelBuffer? {
        guard let converted = try? blueDress.convertToBGRA(imageBuffer: pixelBuffer) else {
            return nil
        }
        let refCon = NSMutableData()
        var timingInfo: CMSampleTimingInfo = .invalid
        var formatDescription: CMVideoFormatDescription?
        CMVideoFormatDescriptionCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: converted, formatDescriptionOut: &formatDescription)
        guard let format = formatDescription else {
            return nil
        }
        var output: CMSampleBuffer?
        CMSampleBufferCreateForImageBuffer(allocator: kCFAllocatorDefault, imageBuffer: converted, dataReady: true, makeDataReadyCallback: nil, refcon: refCon.mutableBytes, formatDescription: format, sampleTiming: &timingInfo, sampleBufferOut: &output)
        guard let sample = output else {
            return nil
        }
        return CMSampleBufferGetImageBuffer(sample)
    }
}

// MARK: - Gemini Live

extension VoiceControlFragment: GeminiLiveClient.Listener {
    func onSetupComplete() {
        guard sessionActive else {
            return
        }
        showListening()
        if AVAudioSession.sharedInstance().recordPermission == .granted {
            audio?.startMic()
        }
        if let text = pendingTypedText {
            pendingTypedText = nil
            addMessage(VoiceChatMessage(role: .user, text: text))
            client?.sendText(text)
        }
    }

    func onInputTranscript(_ text: String) {
        appendToLast(role: .user, text: text)
    }

    func onOutputTranscript(_ text: String) {
        appendToLast(role: .model, text: text)
        if !physicalActionRunning {
            setOrb(.speaking, status: Strings.voiceStatusSpeaking)
        }
    }

    func onAudioChunk(_ pcm24: Data) {
        audio?.play(pcm24)
        if !physicalActionRunning {
            setOrb(.speaking, status: Strings.voiceStatusSpeaking)
        }
    }

    func onToolCall(id: String, name: String, args: [String: Any]) {
        setOrb(.acting, status: Strings.voiceStatusActing)
        guard let executor = toolExecutor else {
            return
        }
        // nil means the tool answers later (get_weather).
        if let response = executor.execute(id: id, name: name, args: args) {
            client?.sendToolResponse(id: id, name: name, response: response)
        }
    }

    func onTurnComplete() {
        // Playback may still be running; onPlaybackIdle switches back to listening.
        if audio?.isSafeForMicInput ?? true {
            showListening()
        }
    }

    func onInterrupted() {
        audio?.flush()
        showListening()
    }

    func onError(_ message: String) {
        print("voice: Gemini Live error: \(message)")
        guard sessionActive else {
            return
        }
        stopSession()
        statusLabel.text = Strings.voiceStatusError
        showHint(message)
    }

    func onClosed(code: Int, reason: String) {
        print("voice: Gemini Live closed: \(code) \(reason)")
        guard sessionActive else {
            return
        }
        stopSession()
        if code != 1000 {
            // Google's own reason: bad key, retired model, quota and similar.
            statusLabel.text = Strings.voiceStatusError
            showHint(reason.isEmpty ? "code \(code)" : reason)
        }
    }

    func onGoAway(timeLeft: TimeInterval) {
        guard sessionActive, let client = client else {
            return
        }
        // Same client, so its resumption handle continues the conversation.
        audio?.stopMic()
        setOrb(.connecting, status: Strings.voiceStatusConnecting)
        client.connect(apiKey: preferences.getGeminiApiKey(), model: preferences.getGeminiModel(), systemInstruction: RobotToolExecutor.systemInstruction, functionDeclarations: RobotToolExecutor.functionDeclarations())
    }
}

// MARK: - Audio

extension VoiceControlFragment: VoiceAudioEngine.Listener {
    func onMicChunk(_ pcm16: Data) {
        // The audio engine already holds the mic back while the robot speaks.
        client?.sendAudioChunk(pcm16)
    }

    func onMicLevel(_ level: Float) {
        if orb.state == .listening {
            orb.setLevel(level)
        }
    }

    func onPlaybackLevel(_ level: Float) {
        if orb.state == .speaking {
            orb.setLevel(level)
        }
    }

    func onPlaybackIdle() {
        if orb.state == .speaking {
            showListening()
        }
    }
}

// MARK: - Vision tools

extension VoiceControlFragment: RobotToolExecutor.VisionController {
    var visionUnavailableReason: String? {
        cameraRunning ? nil : "The camera isn't available right now."
    }

    func startFollowingPerson() {
        stopGoal(stopRobot: false)
        if detector == nil {
            detector = makeDetector()
        }
        guard let detector = detector else {
            showHint(Strings.voicePersonDetectorFailure)
            return
        }
        lastFollowControl = nil
        frameState.setFollowing(true, detector: detector)
        physicalActionRunning = true
        setOrb(.acting, status: Strings.voiceStatusActing)
    }

    func stopFollowingPerson() {
        stopFollowing(stopRobot: true)
        physicalActionRunning = false
        showListening()
    }

    func stopPhysicalActions() {
        guard frameState.isFollowing || frameState.isNavigating else {
            return
        }
        stopFollowing(stopRobot: false)
        stopGoal(stopRobot: false)
        physicalActionRunning = false
    }

    func moveDistance(forward: Float, left: Float) -> String? {
        guard let frame = sceneView.session.currentFrame, case .normal = frame.camera.trackingState else {
            return "Still figuring out where I am, please try again in a moment."
        }
        if navigation == nil {
            navigation = Navigation(model: Model.fromModelItem(item: Common.returnNavigationModel()), device: RuntimeDevice.CPU, numThreads: 1)
        }
        stopFollowing(stopRobot: false)
        // Camera frame: x is right and -z is forward.
        let goal = simd_make_float3(frame.camera.transform * simd_float4(-left, 0, -forward, 1))
        frameState.setGoal(goal)
        lastNavUpdate = Date.timeIntervalSinceReferenceDate
        trackingLimitedSince = nil
        navTimer?.invalidate()
        // Stops the robot if navigation steps stop coming (frozen camera).
        navTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            guard let self = self, self.frameState.isNavigating else {
                return
            }
            if Date.timeIntervalSinceReferenceDate - self.lastNavUpdate > VoiceControlFragment.navWatchdogTimeout {
                self.stopGoal(stopRobot: true)
                self.client?.sendText("(The robot stopped before reaching its destination.)")
                self.onPhysicalActionEnded()
            }
        }
        physicalActionRunning = true
        setOrb(.acting, status: Strings.voiceStatusActing)
        return nil
    }
}

private enum VoiceNavOutcome {
    case drive(left: Float, right: Float)
    case arrived
    case trackingLimited
    case skipped
}

/// Steering toward a detected person; same rule as the Playground "follow" block, slowing down when the person is close.
enum PersonFollowMath {
    /// box is in frame pixels; returns wheel controls in 0...1.
    static func control(box: CGRect, frameWidth: CGFloat, frameHeight: CGFloat) -> (left: Float, right: Float) {
        guard frameWidth > 0, frameHeight > 0 else {
            return (0, 0)
        }
        let centerX = max(0, min(box.midX, frameWidth))
        // -1 (person at the right edge) to 1 (left edge).
        let x = Float(1 - 2 * centerX / frameWidth)
        var left: Float
        var right: Float
        if x < 0 {
            left = 1
            right = 1 + x
        } else {
            left = 1 - x
            right = 1
        }
        var scale = 1 - Float(box.width * box.height / (frameWidth * frameHeight))
        scale = scale > 0.75 ? 1 : scale
        if scale > 0.25 {
            left *= scale
            right *= scale
        } else {
            // Close enough: stop.
            left = 0
            right = 0
        }
        return (left, right)
    }
}

/// State shared by the main thread, the ARKit render thread and the work queues.
private final class FrameState {
    struct Work {
        var navigationGoal: simd_float3?
        var sendVideo = false
        var detect = false
    }

    private let lock = NSLock()
    private var cameraRunning = false
    private var goal: simd_float3?
    private var arrival = ArrivalCheck()
    private var navBusy = false
    private var videoBusy = false
    private var detectBusy = false
    private var lastVideoTime: TimeInterval = 0
    private var following = false
    private var _detector: Detector?

    var isNavigating: Bool {
        lock.lock(); defer { lock.unlock() }; return goal != nil
    }

    var isFollowing: Bool {
        lock.lock(); defer { lock.unlock() }; return following
    }

    var detector: Detector? {
        lock.lock(); defer { lock.unlock() }; return _detector
    }

    func setCameraRunning(_ running: Bool) {
        lock.lock(); cameraRunning = running; lock.unlock()
    }

    func setGoal(_ newGoal: simd_float3?) {
        lock.lock()
        goal = newGoal
        arrival = ArrivalCheck()
        lock.unlock()
    }

    func setFollowing(_ value: Bool, detector: Detector?) {
        lock.lock()
        following = value
        _detector = detector
        lock.unlock()
    }

    /// Decides what to do with this frame. Navigation uses the frame alone; otherwise video (1 per second) and detection.
    func claimWork(now: TimeInterval) -> Work {
        lock.lock()
        defer { lock.unlock() }
        var work = Work()
        guard cameraRunning else {
            return work
        }
        if let goal = goal {
            if !navBusy {
                navBusy = true
                work.navigationGoal = goal
            }
            return work
        }
        if !videoBusy && now - lastVideoTime >= GeminiLiveClient.maxVideoFrameInterval {
            videoBusy = true
            lastVideoTime = now
            work.sendVideo = true
        }
        if following && !detectBusy && _detector != nil {
            detectBusy = true
            work.detect = true
        }
        return work
    }

    func finishNav() {
        lock.lock(); navBusy = false; lock.unlock()
    }

    func finishVideo() {
        lock.lock(); videoBusy = false; lock.unlock()
    }

    func finishDetect() {
        lock.lock(); detectBusy = false; lock.unlock()
    }

    func hasArrived(distance: Float, deltaYaw: Float) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return arrival.hasArrived(distance: distance, deltaYaw: deltaYaw)
    }
}
