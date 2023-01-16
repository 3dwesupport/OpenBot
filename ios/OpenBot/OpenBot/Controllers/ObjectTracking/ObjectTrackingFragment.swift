//
// Created by Sparsh Jain on 27/10/22.
//

import Foundation
import AVFoundation
import UIKit

class ObjectTrackingFragment: CameraController {
    var objectTrackingSettings: ObjectTrackingSettings?;
    var numberOfThreads: Int = 1
    var bottomAnchorConstraint: NSLayoutConstraint!
    var trailingAnchorConstraint: NSLayoutConstraint!
    var detector: Detector?
    var models: [Model] = [];
    var autoMode: Bool = false;
    var vehicleControl: Control = Control();
    let bluetooth = bluetoothDataController.shared;
    var currentModel: ModelItem!
    var currentDevice: RuntimeDevice = RuntimeDevice.CPU
    var currentObject: String = "person"
    private var MINIMUM_CONFIDENCE_TF_OD_API: Float = 50.0;
    private let inferenceQueue = DispatchQueue(label: "openbot.autopilot.inferencequeue")
    private var isInferenceQueueBusy = false
    private var result: Control?
    private var frames: [UIView] = [];

    override func viewDidLoad() {
        let modelItems = Common.loadAllModelItemsFromBundle()
        if (modelItems.count > 0) {
            let model = modelItems.first(where: { $0.type == TYPE.DETECTOR.rawValue })
            currentModel = model
            detector = try! Detector.create(model: Model.fromModelItem(item: model ?? modelItems[0]), device: RuntimeDevice.CPU, numThreads: numberOfThreads) as? Detector;
        }
        if currentOrientation == .portrait {
            objectTrackingSettings = ObjectTrackingSettings(frame: CGRect(x: 0, y: height - 375, width: width, height: 375), detector: detector, model: currentModel);
        } else {
            objectTrackingSettings = ObjectTrackingSettings(frame: CGRect(x: height - 375, y: 30, width: width, height: 375), detector: detector, model: currentModel);
        }
        objectTrackingSettings!.backgroundColor = Colors.freeRoamButtonsColor
        objectTrackingSettings!.layer.cornerRadius = 5
        createCameraView()
        view.addSubview(objectTrackingSettings!)
        bottomAnchorConstraint = objectTrackingSettings!.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -5);
        trailingAnchorConstraint = objectTrackingSettings!.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: 0)
        NotificationCenter.default.addObserver(self, selector: #selector(openBluetoothSettings), name: .ble, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(switchCamera), name: .switchCamera, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateDevice), name: .updateDevice, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateThread), name: .updateThread, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateConfidence), name: .updateConfidence, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(toggleAutoMode), name: .autoModeObjectTracking, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateModel), name: .updateModel, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(updateSelectedObject), name: .updateObject, object: nil);
        NotificationCenter.default.addObserver(self, selector: #selector(updateDataFromControllerApp), name: .updateStringFromControllerApp, object: nil)
        setupNavigationBarItem()
        super.viewDidLoad()
    }

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        calculateFrame()
    }

    func calculateFrame() {
        if currentOrientation == .portrait || currentOrientation == .portraitUpsideDown {
            objectTrackingSettings?.frame.origin.x = 0;
            objectTrackingSettings?.frame.origin.y = height - 375;
        } else {
            objectTrackingSettings?.frame.origin.x = height - 375;
            objectTrackingSettings?.frame.origin.y = 30;

        }
    }

    @objc func openBluetoothSettings() {
        let nextViewController = (storyboard?.instantiateViewController(withIdentifier: Strings.bluetoothScreen))
        navigationController?.pushViewController(nextViewController!, animated: true)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        switch objectTrackingSettings?.autoModeButton.isOn {
        case false:
            autoMode = false;
        case true:
            autoMode = false;
            toggleAutoMode()
        case .none:
            autoMode = false;
        case .some(_):
            autoMode = false;
        }
    }

    @objc func switchCamera() {
        switchCameraView();
    }

    @objc func updateDevice(_ notification: Notification) throws {
        currentDevice = RuntimeDevice(rawValue: notification.object as! String) ?? RuntimeDevice.CPU
        detector = try! Detector.create(model: Model.fromModelItem(item: currentModel), device: currentDevice, numThreads: numberOfThreads) as? Detector;
        currentDevice.rawValue == RuntimeDevice.GPU.rawValue ? NotificationCenter.default.post(name: .updateThreadLabel, object: "N/A") : NotificationCenter.default.post(name: .updateThreadLabel, object: String(numberOfThreads))
        detector?.tfliteOptions.threadCount = numberOfThreads
    }

    @objc func updateThread(_ notification: Notification) {
        let threadCount = notification.object as! String
        numberOfThreads = Int(threadCount) ?? 1
        detector?.tfliteOptions.threadCount = numberOfThreads
    }

    @objc func updateConfidence(_ notification: Notification) {
        let confidence = notification.object as! Int
        MINIMUM_CONFIDENCE_TF_OD_API = Float(confidence)
    }

    @objc func toggleAutoMode() {
        autoMode = !autoMode;
    }

    func sendControl(control: Control) {
        if (control.getRight() != vehicleControl.getRight() || control.getLeft() != vehicleControl.getLeft()) {
            let left = control.getLeft() * gameController.selectedSpeedMode.rawValue;
            let right = control.getRight() * gameController.selectedSpeedMode.rawValue;
            NotificationCenter.default.post(name: .updateSpeedLabel, object: String(Int(left)) + "," + String(Int(right)));
            NotificationCenter.default.post(name: .updateRpmLabel, object: String(Int(control.getLeft())) + "," + String(Int(control.getRight())));
            vehicleControl = control;
            //print("c" + String(left) + "," + String(right) + "\n");
            bluetooth.sendData(payload: "c" + String(left) + "," + String(right) + "\n");
        }
    }

    @objc func updateModel(_ notification: Notification) throws {
        let selectedModelName = notification.object as! String
        currentModel = Common.returnModelItem(modelName: selectedModelName)
        detector = try! Detector.create(model: Model.fromModelItem(item: currentModel), device: currentDevice, numThreads: numberOfThreads) as? Detector;
        NotificationCenter.default.post(name: .updateObjectList, object: detector?.getLabels());
        NotificationCenter.default.post(name: .updateObject, object: currentObject);

    }

    @objc func updateSelectedObject(_ notification: Notification) throws {
        currentObject = notification.object as! String;
        detector?.setSelectedClass(newClass: notification.object as! String)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        if autoMode {
            autoMode = false
        }
    }

    func setupNavigationBarItem() {
        if UIImage(named: "back") != nil {
            let backNavigationIcon = (UIImage(named: "back")?.withRenderingMode(.alwaysOriginal))!
            let newBackButton = UIBarButtonItem(image: backNavigationIcon, title: Strings.objectTracking, target: self, action: #selector(ObjectTrackingFragment.back(sender:)), titleColor: Colors.navigationColor ?? .white)
            navigationItem.leftBarButtonItem = newBackButton
        }
    }

    @objc func back(sender: UIBarButtonItem) {
        _ = navigationController?.popViewController(animated: true)
    }

    func updateTarget(_ detection: CGRect) -> Control {
        let screenWidth = UIScreen.main.bounds.size.width
        let screenHeight = UIScreen.main.bounds.size.height
        let dx: CGFloat = screenWidth / CGFloat(detector!.getImageSizeX());
        let dy: CGFloat = screenHeight / CGFloat(detector!.getImageSizeY());
        let location = detection.applying(CGAffineTransform(scaleX: dx, y: dy))
        var centerX: Float = Float(location.midX);
        centerX = max(0, min(centerX, Float(screenWidth)));
        let x_pos_norm: Float = 1.0 - 2.0 * centerX / Float(screenWidth);
        var left: Float = 0.0;
        var right: Float = 0.0;
        if (x_pos_norm < 0.0) {
            left = 1;
            right = 1.0 + x_pos_norm;
        } else {
            left = 1 - x_pos_norm;
            right = 1;
        }
        return Control(left: left, right: right)
    }

    func addFrame(item: Detector.Recognition, color: UIColor) -> UIView {
        let frame = UIView()
        let screenWidth = UIScreen.main.bounds.size.width
        let screenHeight = UIScreen.main.bounds.size.height
        let detection = item.getLocation();
        let dx = screenWidth / CGFloat(detector!.getImageSizeX());
        let dy = screenHeight / CGFloat(detector!.getImageSizeY());
        var rect = detection.applying(CGAffineTransform(scaleX: dx, y: dy));
        frame.frame = rect;
        if currentOrientation == .portrait {
//            frame.frame.origin.x = rect.
        } else {
            frame.frame.origin.y = width - rect.size.height;
        }
        print(frame.frame, " : ", detection);
        frame.layer.borderColor = color.cgColor;
        frame.layer.borderWidth = 2.0;
        let nameString = UITextView();
        nameString.textColor = UIColor.white;
        nameString.font = nameString.font?.withSize(12)
        nameString.backgroundColor = color.withAlphaComponent(0.5);
        nameString.text = item.getTitle() + " " + String(format: "%.2f", item.getConfidence() * 100) + "%";
        nameString.translatesAutoresizingMaskIntoConstraints = true
        nameString.sizeToFit()
        frame.addSubview(nameString);
        return frame;
    }

    override func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {

        // extract the image buffer from the sample buffer
        let pixelBuffer: CVPixelBuffer? = CMSampleBufferGetImageBuffer(sampleBuffer)

        guard let imagePixelBuffer = pixelBuffer else {
            debugPrint("unable to get image from sample buffer")
            return
        }
        if webRTCClient != nil {
            inferenceQueue.async {
                webRTCClient.captureCurrentFrame(sampleBuffer: sampleBuffer);
                self.isInferenceQueueBusy = false
            }
        }
        guard !isInferenceQueueBusy else {
            return
        }

        inferenceQueue.async {
            if self.autoMode {
                self.isInferenceQueueBusy = true

                let startTime = Date().millisecondsSince1970

                let res = self.detector?.recognizeImage(pixelBuffer: imagePixelBuffer, height: self.originalHeight, width: self.originalWidth)

                let endTime = Date().millisecondsSince1970

                if (res!.count > 0) {
                    self.result = self.updateTarget(res!.first!.getLocation());
                } else {
                    self.result = Control(left: 0, right: 0)
                }

                guard let controlResult = self.result else {
                    return
                }

                DispatchQueue.main.async {

                    if (self.frames.count > 0) {
                        for frame in self.frames {
                            frame.removeFromSuperview();
                        }
                    }
                    self.frames.removeAll();

                    var i = 0;
                    if (res!.count > 0) {
                        for item in res! {
                            if (item.getConfidence() * 100 > self.MINIMUM_CONFIDENCE_TF_OD_API) {
                                let frame = self.addFrame(item: item, color: Constants.frameColors[i % 5]);
                                self.frames.append(frame);
                                self.cameraView.addSubview(frame);
                                i += 1;
                            }
                        }
                    }

                    if (endTime - startTime) != 0 {
                        NotificationCenter.default.post(name: .updateObjectTrackingFps, object: 1000 / (endTime - startTime));
                    }
                    self.sendControl(control: controlResult)
                }
            } else {
                DispatchQueue.main.async {
                    self.sendControl(control: Control())
                }
            }
            self.isInferenceQueueBusy = false

        }

    }

    @objc func updateDataFromControllerApp(_ notification: Notification) {
        if gameController.selectedControlMode == ControlMode.GAMEPAD {
            return
        }
        if notification.object != nil {
            let command = notification.object as! String
            let rightSpeed = command.slice(from: "r:", to: ", ");
            let leftSpeed = command.slice(from: "l:", to: "}}")
            gameController.sendControlFromPhoneController(control: Control(left: Float(Double(leftSpeed ?? "0.0") ?? 0.0), right: Float(Double(rightSpeed ?? "0.0") ?? 0.0)));
        }
    }
}
