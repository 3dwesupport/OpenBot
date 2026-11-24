//
// Voice Control (Gemini Live)
//

import Foundation

/// Robot functions exposed to Gemini Live as tools; the same actions as the Playground blocks.
/// Every drive stops by itself after safetyTimeout unless a new command arrives. Main queue only.
final class RobotToolExecutor {

    /// Camera and ARKit tools, owned by the screen.
    protocol VisionController: AnyObject {
        /// Nil when the camera can't be used right now.
        var visionUnavailableReason: String? { get }
        func startFollowingPerson()
        func stopFollowingPerson()
        /// Ends following or a distance drive without stopping the motors.
        func stopPhysicalActions()
        /// Starts the drive; the result is reported later.
        func moveDistance(forward: Float, left: Float) -> String?
    }

    typealias ToolResponseSender = (_ id: String, _ name: String, _ response: [String: Any]) -> Void

    static let maxDuration: TimeInterval = 6
    static let safetyTimeout: TimeInterval = 4
    static let defaultSpeedPercent = 60
    static let turnAroundDuration: TimeInterval = 1.5
    static let defaultFlashCount = 3
    static let flashInterval: TimeInterval = 0.25

    private let bluetooth = bluetoothDataController.shared
    private let onAction: (String) -> Void
    private weak var vision: VisionController?
    private let weather: WeatherService?
    private let sendResponse: ToolResponseSender
    private var safetyStop: DispatchWorkItem?
    private var durationStop: DispatchWorkItem?
    private var flashWork: [DispatchWorkItem] = []
    private var stopped = false

    init(onAction: @escaping (String) -> Void, vision: VisionController?, weather: WeatherService?, sendResponse: @escaping ToolResponseSender) {
        self.onAction = onAction
        self.vision = vision
        self.weather = weather
        self.sendResponse = sendResponse
    }

    /// Runs one function call. Returns the response for Gemini, or nil when it is sent later (get_weather).
    func execute(id: String, name: String, args: [String: Any]) -> [String: Any]? {
        switch name {
        case "move_forward":
            return drive(args, description: "Moving forward", left: 1, right: 1)
        case "move_backward":
            return drive(args, description: "Moving backward", left: -1, right: -1)
        case "turn_left":
            return drive(args, description: "Turning left", left: 0, right: 1)
        case "turn_right":
            return drive(args, description: "Turning right", left: 1, right: 0)
        case "turn_around":
            return turnAround(args)
        case "stop":
            return stop()
        case "set_speed_mode":
            return setSpeedMode(args["mode"] as? String ?? "normal")
        case "set_lights":
            return setLights(on: args["on"] as? Bool ?? true)
        case "flash_lights":
            return flashLights(count: RobotToolExecutor.int(args["count"]) ?? RobotToolExecutor.defaultFlashCount)
        case "set_turn_signal":
            return setTurnSignal(args["direction"] as? String ?? "off")
        case "get_robot_status":
            return robotStatus()
        case "follow_person":
            return followPerson()
        case "stop_following":
            return stopFollowing()
        case "move_distance":
            return moveDistance(args)
        case "get_current_time":
            return currentTime()
        case "get_weather":
            return fetchWeather(id: id)
        default:
            return RobotToolExecutor.error("Unknown function: \(name)")
        }
    }

    /// Called when the session ends, so the robot never keeps moving.
    func shutdown() {
        cancelPending()
        flashWork.forEach { $0.cancel() }
        flashWork.removeAll()
        stopMotors()
    }

    // MARK: - Actions

    private func drive(_ args: [String: Any], description: String, left: Float, right: Float) -> [String: Any] {
        let speed = RobotToolExecutor.clampSpeed(RobotToolExecutor.int(args["speed_percent"]) ?? RobotToolExecutor.defaultSpeedPercent)
        let duration = RobotToolExecutor.clampDuration(RobotToolExecutor.int(args["duration_ms"]) ?? 0)
        let fraction = Float(speed) / 100
        // A manual command takes over from following or a distance drive.
        vision?.stopPhysicalActions()
        sendControl(left: left * fraction, right: right * fraction)
        armSafetyStop()
        if duration > 0 {
            armDurationStop(duration)
        }
        report("\(description) at \(speed)% speed")
        return RobotToolExecutor.ok()
    }

    private func turnAround(_ args: [String: Any]) -> [String: Any] {
        let fraction = Float(RobotToolExecutor.clampSpeed(RobotToolExecutor.int(args["speed_percent"]) ?? RobotToolExecutor.defaultSpeedPercent)) / 100
        vision?.stopPhysicalActions()
        sendControl(left: fraction, right: -fraction)
        armSafetyStop()
        armDurationStop(RobotToolExecutor.turnAroundDuration)
        report("Turning around")
        return RobotToolExecutor.ok()
    }

    private func stop() -> [String: Any] {
        cancelPending()
        // stop also ends following and distance drives, as the tool descriptions say.
        vision?.stopPhysicalActions()
        stopMotors()
        report("Stopped")
        return RobotToolExecutor.ok()
    }

    private func setSpeedMode(_ mode: String) -> [String: Any] {
        switch mode.lowercased() {
        case "slow":
            gameController.selectedSpeedMode = .SLOW
        case "fast":
            gameController.selectedSpeedMode = .FAST
        default:
            gameController.selectedSpeedMode = .NORMAL
        }
        report("Speed set to \(mode)")
        return RobotToolExecutor.ok()
    }

    private func setLights(on: Bool) -> [String: Any] {
        sendLights(on: on)
        report(on ? "Lights on" : "Lights off")
        return RobotToolExecutor.ok()
    }

    private func flashLights(count: Int) -> [String: Any] {
        let flashes = max(1, min(count, 10))
        flashWork.forEach { $0.cancel() }
        flashWork.removeAll()
        for i in 0..<flashes {
            let onDelay = Double(i * 2) * RobotToolExecutor.flashInterval
            let on = DispatchWorkItem { [weak self] in self?.sendLights(on: true) }
            let off = DispatchWorkItem { [weak self] in self?.sendLights(on: false) }
            flashWork += [on, off]
            DispatchQueue.main.asyncAfter(deadline: .now() + onDelay, execute: on)
            DispatchQueue.main.asyncAfter(deadline: .now() + onDelay + RobotToolExecutor.flashInterval, execute: off)
        }
        report("Flashing lights \(flashes) times")
        return RobotToolExecutor.ok()
    }

    private func setTurnSignal(_ direction: String) -> [String: Any] {
        switch direction.lowercased() {
        case "left":
            bluetooth.sendDataFromJs(payloadData: "i1,0\n")
        case "right":
            bluetooth.sendDataFromJs(payloadData: "i0,1\n")
        default:
            bluetooth.sendDataFromJs(payloadData: "i0,0\n")
        }
        report("Turn signal: \(direction)")
        return RobotToolExecutor.ok()
    }

    private func robotStatus() -> [String: Any] {
        var status: [String: Any] = [
            "bluetooth_connected": isBluetoothConnected,
            "battery_voltage": bluetooth.getVoltage(),
            "speed_mode": RobotToolExecutor.speedModeName(gameController.selectedSpeedMode),
            "wheel_speed_rpm": bluetooth.getSpeed(),
        ]
        if !bluetooth.sonarData.isEmpty {
            status["sonar_distance_cm"] = bluetooth.getSonar()
        }
        report("Reporting robot status")
        return ["status": "ok", "result": status]
    }

    private func followPerson() -> [String: Any] {
        guard let vision = vision, vision.visionUnavailableReason == nil else {
            return RobotToolExecutor.error(vision?.visionUnavailableReason ?? "Camera isn't available for following.")
        }
        cancelPending()
        vision.startFollowingPerson()
        report("Following person")
        return RobotToolExecutor.ok()
    }

    private func stopFollowing() -> [String: Any] {
        guard let vision = vision else {
            return RobotToolExecutor.error("Camera isn't available for following.")
        }
        vision.stopFollowingPerson()
        report("Stopped following")
        return RobotToolExecutor.ok()
    }

    private func moveDistance(_ args: [String: Any]) -> [String: Any] {
        guard let vision = vision, vision.visionUnavailableReason == nil else {
            return RobotToolExecutor.error(vision?.visionUnavailableReason ?? "Precise navigation isn't available right now.")
        }
        let forward = RobotToolExecutor.float(args["forward_m"]) ?? 0
        let left = RobotToolExecutor.float(args["left_m"]) ?? 0
        cancelPending()
        if let failure = vision.moveDistance(forward: forward, left: left) {
            return RobotToolExecutor.error(failure)
        }
        report(String(format: "Moving %.1fm forward, %.1fm left", forward, left))
        return RobotToolExecutor.ok()
    }

    private func currentTime() -> [String: Any] {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE, MMM d, yyyy h:mm a"
        report("Checked the time")
        return ["status": "ok", "result": ["current_time": formatter.string(from: Date()), "timezone": TimeZone.current.identifier]]
    }

    private func fetchWeather(id: String) -> [String: Any]? {
        guard let weather = weather else {
            return RobotToolExecutor.error("Weather isn't available right now.")
        }
        report("Checking the weather")
        weather.fetchCurrentWeather { [sendResponse] result in
            switch result {
            case .success(let data):
                sendResponse(id, "get_weather", ["status": "ok", "result": data])
            case .failure(let error):
                sendResponse(id, "get_weather", RobotToolExecutor.error(error.localizedDescription))
            }
        }
        return nil
    }

    // MARK: - Robot commands

    /// left and right in -1...1, scaled by the current speed mode.
    func sendControl(left: Float, right: Float) {
        let speed = gameController.selectedSpeedMode.rawValue
        let l = Int((max(-1, min(1, left)) * speed).rounded())
        let r = Int((max(-1, min(1, right)) * speed).rounded())
        if l == 0 && r == 0 {
            // Follow and navigation ask for zero every frame; one queued stop is enough.
            if !stopped {
                stopMotors()
            }
            return
        }
        stopped = false
        bluetooth.sendData(payload: "c\(l),\(r)\n")
        NotificationCenter.default.post(name: .updateSpeedLabel, object: "\(l),\(r)")
    }

    private func stopMotors() {
        stopped = true
        // Queued write, so the stop isn't dropped while the Bluetooth buffer is full.
        bluetooth.stopRobot()
        NotificationCenter.default.post(name: .updateSpeedLabel, object: "0,0")
    }

    private func sendLights(on: Bool) {
        let value = on ? 255 : 0
        bluetooth.sendDataFromJs(payloadData: "l\(value),\(value)\n")
    }

    private func armSafetyStop() {
        safetyStop?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.stopMotors() }
        safetyStop = work
        DispatchQueue.main.asyncAfter(deadline: .now() + RobotToolExecutor.safetyTimeout, execute: work)
    }

    private func armDurationStop(_ duration: TimeInterval) {
        durationStop?.cancel()
        let work = DispatchWorkItem { [weak self] in self?.stopMotors() }
        durationStop = work
        DispatchQueue.main.asyncAfter(deadline: .now() + duration, execute: work)
    }

    private func cancelPending() {
        safetyStop?.cancel()
        safetyStop = nil
        durationStop?.cancel()
        durationStop = nil
    }

    private func report(_ description: String) {
        onAction(description)
    }

    // MARK: - Helpers

    static func clampSpeed(_ percent: Int) -> Int {
        max(10, min(percent, 100))
    }

    /// Milliseconds in, seconds out, capped at maxDuration.
    static func clampDuration(_ milliseconds: Int) -> TimeInterval {
        min(Double(max(0, milliseconds)) / 1000, maxDuration)
    }

    static func speedModeName(_ mode: SpeedMode) -> String {
        switch mode {
        case .SLOW: return "slow"
        case .NORMAL: return "normal"
        case .FAST: return "fast"
        }
    }

    /// JSON numbers arrive as Int or Double.
    static func int(_ value: Any?) -> Int? {
        (value as? NSNumber)?.intValue
    }

    static func float(_ value: Any?) -> Float? {
        (value as? NSNumber)?.floatValue
    }

    static func ok() -> [String: Any] {
        ["status": "ok"]
    }

    static func error(_ message: String) -> [String: Any] {
        ["status": "error", "message": message]
    }

    // MARK: - Tool declarations

    /// The Gemini functionDeclarations for every tool above.
    static func functionDeclarations() -> [[String: Any]] {
        [
            declaration("move_forward", "Drives the robot straight forward.", speedAndDurationParams()),
            declaration("move_backward", "Drives the robot straight backward.", speedAndDurationParams()),
            declaration("turn_left", "Pivots the robot in place to the left (counter-clockwise).", speedAndDurationParams()),
            declaration("turn_right", "Pivots the robot in place to the right (clockwise).", speedAndDurationParams()),
            declaration("turn_around", "Spins the robot roughly 180 degrees in place, then stops automatically.", speedOnlyParams()),
            declaration("stop", "Immediately stops all robot movement.", emptyParams()),
            declaration("set_speed_mode", "Sets the overall drive speed preset used for subsequent movement commands.", [
                "type": "OBJECT",
                "properties": ["mode": ["type": "STRING", "enum": ["slow", "normal", "fast"], "description": "Speed preset."]],
                "required": ["mode"],
            ]),
            declaration("set_lights", "Turns the robot's headlights fully on or off.", [
                "type": "OBJECT",
                "properties": ["on": ["type": "BOOLEAN", "description": "true to turn lights on, false to turn off."]],
                "required": ["on"],
            ]),
            declaration("flash_lights", "Flashes/blinks the robot's lights a number of times, useful for getting attention or signaling.", [
                "type": "OBJECT",
                "properties": ["count": ["type": "INTEGER", "description": "Number of flashes, defaults to 3."]],
            ]),
            declaration("set_turn_signal", "Sets the left/right turn-signal indicator lights.", [
                "type": "OBJECT",
                "properties": ["direction": ["type": "STRING", "enum": ["left", "right", "off"], "description": "Which indicator to activate."]],
                "required": ["direction"],
            ]),
            declaration("get_robot_status", "Reads back the robot's current sensor status: battery voltage, drive speed and, if available, sonar distance to the nearest obstacle in front.", emptyParams()),
            declaration("follow_person", "Uses the camera to find a person and drive toward/track them continuously, until stop_following or stop is called.", emptyParams()),
            declaration("stop_following", "Stops following a person (but does not otherwise stop the robot).", emptyParams()),
            declaration("move_distance", "Precisely drives a specific distance in meters using visual-inertial navigation, e.g. \"move 1 meter forward\" or \"go 2 meters forward and 1 meter left\". More accurate than move_forward for a requested distance. Takes a while to complete; the robot will announce when it arrives.", [
                "type": "OBJECT",
                "properties": [
                    "forward_m": ["type": "NUMBER", "description": "Meters to drive forward; negative means backward."],
                    "left_m": ["type": "NUMBER", "description": "Meters to drive left; negative means right. Defaults to 0."],
                ],
                "required": ["forward_m"],
            ]),
            declaration("get_current_time", "Reads back the current date and time (device local time).", emptyParams()),
            declaration("get_weather", "Looks up the current weather conditions at the robot's location (temperature, wind, and general conditions). Requires location access; if unavailable, say so instead of guessing.", emptyParams()),
        ]
    }

    private static func declaration(_ name: String, _ description: String, _ parameters: [String: Any]) -> [String: Any] {
        ["name": name, "description": description, "parameters": parameters]
    }

    private static func speedAndDurationParams() -> [String: Any] {
        [
            "type": "OBJECT",
            "properties": [
                "speed_percent": ["type": "INTEGER", "description": "Speed from 10-100 percent of max speed. Defaults to 60 if omitted."],
                "duration_ms": ["type": "INTEGER", "description": "Optional: how long to move in milliseconds before auto-stopping. If omitted, the robot keeps moving until a stop command is issued (capped at a few seconds for safety)."],
            ],
        ]
    }

    private static func speedOnlyParams() -> [String: Any] {
        ["type": "OBJECT", "properties": ["speed_percent": ["type": "INTEGER", "description": "Speed from 10-100 percent. Defaults to 60."]]]
    }

    private static func emptyParams() -> [String: Any] {
        ["type": "OBJECT", "properties": [String: Any]()]
    }

    /// System prompt; same text as the Android app.
    static let systemInstruction = """
    You are the onboard voice assistant of an OpenBot robot. You can hear and speak with the user, you periodically receive still images from the robot's camera so you know what is currently in front of it, and you can control the physical robot by calling the provided functions: move_forward, move_backward, turn_left, turn_right, turn_around, stop, set_speed_mode, set_lights, flash_lights, set_turn_signal, get_robot_status, follow_person, stop_following, move_distance, get_current_time, and get_weather. Always call the matching function when the user asks the robot to move, turn, come closer, back away, spin around, follow someone, or control its lights, instead of just talking about it. If the user gives a specific distance (e.g. "move 1 meter forward", "go 2 meters forward and 1 meter left"), use move_distance instead of move_forward since it drives that distance precisely; move_distance takes a little while to complete and you will be told when the robot arrives. If the user asks the robot to follow them or follow a person, call follow_person; call stop_following when they ask it to stop following (this does not stop other movement). Use get_current_time or get_weather when asked about the time or the weather rather than guessing. You can also describe what you currently see if asked. Keep spoken replies short and conversational. If a request is unsafe, unclear, or you are not sure what they mean, ask a brief clarifying question instead of guessing. If the robot is already moving and the user asks it to stop, immediately call stop.
    """
}
