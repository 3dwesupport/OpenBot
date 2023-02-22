//
// Created by Nitish Yadav on 13/02/23.
//

import Foundation
import UIKit
import SceneKit
import ARKit
import simd

class PointGoalFragment: UIViewController, ARSCNViewDelegate, UITextFieldDelegate {

    var sceneView: ARSCNView!
    private var startingPoint = SCNNode()
    private var endingPoint: SCNNode!
    private var distanceInput: UITextField!
    private var setGoalRect = UIView();
    private var setGoalText = UILabel();
    private var setGoalHeading = UILabel();
    private var forwardLabel = UILabel();
    private var leftLabel = UILabel();
    private var forwardInput = UITextField();
    private var leftInput = UITextField();
    private var distance: Float = 0;
    private var forward: Float = 0;
    private var left: Float = 0;
    private var isReached: Bool = false;
    var marker = SCNNode();
    let infoMessageRect = UIView();
    var navigation: Navigation?
    let numberOfThreads = 1;
    private var isInferenceQueueBusy = false;
    private let inferenceQueue = DispatchQueue(label: "openbot.navigation.inferencequeue")
    private var result: Control?


    override func viewDidLoad() {
        super.viewDidLoad()

        sceneView = ARSCNView(frame: view
                .bounds)
        view.addSubview(sceneView)
        let scene = SCNScene()
        sceneView.scene = scene;
        let configuration = ARWorldTrackingConfiguration()
        sceneView.session.run(configuration);
        sceneView.delegate = self;
        sceneView.debugOptions = [ARSCNDebugOptions.showFeaturePoints];
        createSetGoalRect();
        createReachMessage();
        let tap = UITapGestureRecognizer(target: self, action: #selector(UIInputViewController.dismissKeyboard))
        view.addGestureRecognizer(tap)
        navigation = Navigation(model: Model.fromModelItem(item: Common.returnNavigationModel()), device: RuntimeDevice.CPU, numThreads: 1);

    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated);
        sceneView.session.pause();
    }

    func createSetGoalRect() {
        setGoalRect.frame = CGRect(x: 30, y: height / 2 - 100, width: width - 60, height: 300);
        setGoalRect.backgroundColor = traitCollection.userInterfaceStyle == .dark ? Colors.bdColor : .white;
        view.addSubview(setGoalRect);
        createSetGoalHeading();
        createSetGoalText();
        createForwardLeftLabels();
        createInputBoxes();
        createButtons()
    }


    func createReachMessage() {
        infoMessageRect.frame = CGRect(x: 30, y: height / 2 - 100, width: width - 60, height: 200);
        infoMessageRect.backgroundColor = traitCollection.userInterfaceStyle == .dark ? Colors.bdColor : .white;
        let infoText = createLabel(text: Strings.info, fontSize: 18, textColor: Colors.bdColor!);
        infoMessageRect.addSubview(infoText)
        infoText.translatesAutoresizingMaskIntoConstraints = false;
        infoText.leadingAnchor.constraint(equalTo: infoMessageRect.leadingAnchor, constant: 30).isActive = true;
        infoText.topAnchor.constraint(equalTo: infoMessageRect.topAnchor, constant: 30).isActive = true;
        let goalReachedText = createLabel(text: "Goal reached", fontSize: 16, textColor: Colors.bdColor!);
        infoMessageRect.addSubview(goalReachedText);
        goalReachedText.translatesAutoresizingMaskIntoConstraints = false
        goalReachedText.leadingAnchor.constraint(equalTo: infoText.leadingAnchor, constant: 0).isActive = true;
        goalReachedText.topAnchor.constraint(equalTo: infoText.bottomAnchor, constant: 30).isActive = true;


        let stopButton = createLabelButtons(title: Strings.stop, selector: #selector(stop(_:)))
        infoMessageRect.addSubview(stopButton);
        stopButton.translatesAutoresizingMaskIntoConstraints = false;
        stopButton.leadingAnchor.constraint(equalTo: infoMessageRect.leadingAnchor, constant: width / 2 - 30).isActive = true;
        stopButton.bottomAnchor.constraint(equalTo: infoMessageRect.topAnchor, constant: infoMessageRect.frame.height - 30).isActive = true;

        let restartButton = createLabelButtons(title: Strings.restart, selector: #selector(restart(_:)))
        infoMessageRect.addSubview(restartButton);
        restartButton.translatesAutoresizingMaskIntoConstraints = false;
        restartButton.trailingAnchor.constraint(equalTo: infoMessageRect.trailingAnchor, constant: -30).isActive = true;
        restartButton.bottomAnchor.constraint(equalTo: stopButton.bottomAnchor, constant: 0).isActive = true;
    }

    func createSetGoalText() {
        setGoalText = createLabel(text: Strings.setGoalText, fontSize: 16, textColor: Colors.bdColor!);
        setGoalRect.addSubview(setGoalText);
        setGoalText.numberOfLines = 0;
        setGoalText.translatesAutoresizingMaskIntoConstraints = false;
        setGoalText.leadingAnchor.constraint(equalTo: setGoalHeading.leadingAnchor, constant: 0).isActive = true;
        setGoalText.topAnchor.constraint(equalTo: setGoalHeading.bottomAnchor, constant: 30).isActive = true;
    }

    func createSetGoalHeading() {
        setGoalHeading = createLabel(text: Strings.setGoal, fontSize: 18, textColor: Colors.bdColor!);
        setGoalRect.addSubview(setGoalHeading);
        setGoalHeading.translatesAutoresizingMaskIntoConstraints = false;
        setGoalHeading.leadingAnchor.constraint(equalTo: setGoalRect.leadingAnchor, constant: 30).isActive = true;
        setGoalHeading.topAnchor.constraint(equalTo: setGoalRect.topAnchor, constant: 30).isActive = true;
    }

    func createForwardLeftLabels() {
        forwardLabel = createLabel(text: Strings.forward + Strings.meter, fontSize: 14, textColor: Colors.bdColor!);
        setGoalRect.addSubview(forwardLabel);
        forwardLabel.translatesAutoresizingMaskIntoConstraints = false;
        forwardLabel.leadingAnchor.constraint(equalTo: setGoalRect.leadingAnchor, constant: width / 2 - 100).isActive = true;
        forwardLabel.topAnchor.constraint(equalTo: setGoalText.bottomAnchor, constant: 20).isActive = true;

        leftLabel = createLabel(text: Strings.left + Strings.meter, fontSize: 14, textColor: Colors.bdColor!);
        setGoalRect.addSubview(leftLabel);
        leftLabel.translatesAutoresizingMaskIntoConstraints = false;
        leftLabel.leadingAnchor.constraint(equalTo: setGoalRect.leadingAnchor, constant: width / 2).isActive = true;
        leftLabel.topAnchor.constraint(equalTo: forwardLabel.topAnchor, constant: 0).isActive = true;
    }

    func createInputBoxes() {
        forwardInput = createTextField()
        forwardInput.delegate = self;
        setGoalRect.addSubview(forwardInput);
        forwardInput.translatesAutoresizingMaskIntoConstraints = false;
        forwardInput.leadingAnchor.constraint(equalTo: setGoalRect.leadingAnchor, constant: width / 2 - 100).isActive = true;
        forwardInput.topAnchor.constraint(equalTo: forwardLabel.bottomAnchor, constant: 20).isActive = true;
        forwardInput.widthAnchor.constraint(equalToConstant: 75).isActive = true;
        forwardInput.heightAnchor.constraint(equalToConstant: 20).isActive = true;

        leftInput = createTextField();
        leftInput.delegate = self;
        setGoalRect.addSubview(leftInput);
        leftInput.translatesAutoresizingMaskIntoConstraints = false;
        leftInput.leadingAnchor.constraint(equalTo: leftLabel.leadingAnchor, constant: 0).isActive = true;
        leftInput.topAnchor.constraint(equalTo: leftLabel.bottomAnchor, constant: 20).isActive = true;
        leftInput.widthAnchor.constraint(equalToConstant: 70).isActive = true;
        leftInput.heightAnchor.constraint(equalToConstant: 20).isActive = true;
    }

    func createButtons() {
        let cancelButton = createLabelButtons(title: Strings.canceled, selector: #selector(cancelFun(_:)))
        setGoalRect.addSubview(cancelButton);
        cancelButton.translatesAutoresizingMaskIntoConstraints = false;
        cancelButton.leadingAnchor.constraint(equalTo: setGoalText.leadingAnchor, constant: 0).isActive = true;
        cancelButton.bottomAnchor.constraint(equalTo: setGoalRect.bottomAnchor, constant: -15).isActive = true;
        let startButton = createLabelButtons(title: Strings.start, selector: #selector(doneFun(_:)));
        setGoalRect.addSubview(startButton);
        startButton.translatesAutoresizingMaskIntoConstraints = false;
        startButton.bottomAnchor.constraint(equalTo: setGoalRect.bottomAnchor, constant: -15).isActive = true;
        startButton.trailingAnchor.constraint(equalTo: setGoalRect.trailingAnchor, constant: -30).isActive = true;
    }

    func createLabel(text: String, fontSize: CGFloat, textColor: UIColor) -> UILabel {
        let label = UILabel();
        label.text = text;
        label.textColor = textColor
        label.font = label.font.withSize(fontSize);
        return label;
    }

    func createLabelButtons(title: String, selector: Selector) -> UIButton {
        let button = UIButton();
        button.setTitleColor(.blue, for: .normal);
        button.frame.size = CGSize(width: 100, height: 40);
        button.setTitle(title, for: .normal);
        button.addTarget(self, action: selector, for: .touchUpInside);
        return button;
    }

    func createTextField() -> UITextField {
        let textField = UITextField();
        textField.layer.cornerRadius = 8;
        textField.layer.masksToBounds = true;
        textField.layer.borderColor = UIColor(named: "red")?.cgColor
        textField.layer.borderWidth = 1.0;
        textField.keyboardType = .default;
        return textField;
    }

    @objc func doneFun(_ sender: UIView) {
        setGoalRect.removeFromSuperview();
        isReached = false;
        let forwardDistance = (forwardInput.text == nil ? 0 : Float(forwardInput.text ?? "0")) ?? 0
        let camera = sceneView.pointOfView!
        let cameraTransform = camera.transform
        _ = SCNVector3(-cameraTransform.m31, -cameraTransform.m32, -cameraTransform.m33)
        let forwardPosition = SCNVector3(camera.position.x, camera.position.y, camera.position.z - Float(forwardDistance));
        let LeftDistance = (leftInput.text == nil ? 0 : Float(leftInput.text ?? "0")) ?? 0
        let cameraRightOrientation = SCNVector3(-cameraTransform.m11, -cameraTransform.m12, -cameraTransform.m13);
        let leftPosition = SCNVector3(camera.position.x + cameraRightOrientation.x * LeftDistance, camera.position.y + cameraRightOrientation.y * LeftDistance, camera.position.z + cameraRightOrientation.z * LeftDistance) // Calculate the marker position based on the right orientation of the camera and the distance
        marker = SCNNode(geometry: SCNSphere(radius: 0.01))
        let resultantVector = addVectors(leftPosition, forwardPosition);
        marker.position = resultantVector
        marker.geometry?.firstMaterial?.diffuse.contents = UIColor.red
        sceneView.scene.rootNode.addChildNode(marker)
        startingPoint.position = sceneView.pointOfView?.position ?? camera.position;
        endingPoint = marker
        calculateRoute();
    }

    @objc func stop(_ sender: UIView) {
        _ = navigationController?.popViewController(animated: true)
    }

    @objc func restart(_ sender: UIView) {
        infoMessageRect.removeFromSuperview();
        view.addSubview(setGoalRect);

    }


    func addVectors(_ vector1: SCNVector3, _ vector2: SCNVector3) -> SCNVector3 {
        SCNVector3(vector1.x + vector2.x, vector1.y + vector2.y, vector1.z + vector2.z)
    }


    func renderer(_ renderer: SCNSceneRenderer, didRenderScene scene: SCNScene, atTime time: TimeInterval) {
        guard let currentFrame = self.sceneView.session.currentFrame else {
            return
        }

        let pixelBuffer = currentFrame.capturedImage
        let pixelBufferType = CVPixelBufferGetPixelFormatType(pixelBuffer)

        if pixelBufferType != kCVPixelFormatType_32BGRA && pixelBufferType != kCVPixelFormatType_32ARGB {
            // Create a new CVPixelBuffer with the desired pixel format
            var convertedPixelBuffer: CVPixelBuffer?
            let status = CVPixelBufferCreate(nil, CVPixelBufferGetWidth(pixelBuffer), CVPixelBufferGetHeight(pixelBuffer), kCVPixelFormatType_32BGRA, nil, &convertedPixelBuffer)
            guard status == kCVReturnSuccess else {
                return
            }

            // Lock the original and converted pixel buffers
            CVPixelBufferLockBaseAddress(pixelBuffer, CVPixelBufferLockFlags.readOnly)
            CVPixelBufferLockBaseAddress(convertedPixelBuffer!, CVPixelBufferLockFlags(rawValue: 0))

            // Get the base address of the original and converted pixel buffers
            let sourceBaseAddress = CVPixelBufferGetBaseAddress(pixelBuffer)
            let destBaseAddress = CVPixelBufferGetBaseAddress(convertedPixelBuffer!)

            // Copy the data from the original to the converted pixel buffer
            let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
            let destBytesPerRow = CVPixelBufferGetBytesPerRow(convertedPixelBuffer!)
            let sourceBuffer = sourceBaseAddress!.assumingMemoryBound(to: UInt8.self)
            let destBuffer = destBaseAddress!.assumingMemoryBound(to: UInt8.self)
            for y in 0 ..< CVPixelBufferGetHeight(pixelBuffer) {
                memcpy(destBuffer + y * destBytesPerRow, sourceBuffer + y * bytesPerRow, bytesPerRow)
            }

            // Unlock the original and converted pixel buffers
            CVPixelBufferUnlockBaseAddress(pixelBuffer, CVPixelBufferLockFlags.readOnly)
            CVPixelBufferUnlockBaseAddress(convertedPixelBuffer!, CVPixelBufferLockFlags(rawValue: 0))

            // Use the converted pixel buffer
            processPixelBuffer(convertedPixelBuffer!)
        } else {
            // Use the original pixel buffer
            processPixelBuffer(pixelBuffer)
        }
    }

    func processPixelBuffer(_ pixelBuffer: CVPixelBuffer) {
        if pixelBuffer == nil{
            return
        }
        guard !isInferenceQueueBusy else {
            return
        }
        inferenceQueue.async {
            self.isInferenceQueueBusy = true;
            self.result = self.navigation?.recognizeImage(pixelBuffer: pixelBuffer, goalDistance: self.distance, goalSin: 0.45, goalCos: 0.45);
            print(self.result?.getLeft() , self.result?.getRight());
            self.isInferenceQueueBusy = false;
        }
    }



    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        if endingPoint != nil {
            computeDeltaYaw(pose: renderer.pointOfView?.position ?? SCNVector3(), goalPose: endingPoint.position)

        }
        guard let camera = sceneView.pointOfView else {
            return
        }

        checkCameraPosition(position: camera.presentation.simdPosition);
    }


// Define a distance threshold for triggering the event
    let distanceThreshold: Float = 0.05 // adjust this value as needed

    func checkCameraPosition(position: simd_float3){
        if endingPoint != nil && isReached != true {
            distance = simd_distance(position, endingPoint.simdPosition)
            if distance <= distanceThreshold {
                DispatchQueue.main.async {
                    self.view.addSubview(self.infoMessageRect);
                    self.isReached = true;
                    self.marker.removeFromParentNode();
                }
            }
        }
    }

    @objc func cancelFun(_ sender: UIView) {
        _ = navigationController?.popViewController(animated: true)
    }

    func calculateRoute() {
        _ = simd_distance(startingPoint.simdPosition, endingPoint.simdPosition);
        let direction = simd_normalize(endingPoint.simdPosition - startingPoint.simdPosition)
        print(tan(computeDeltaYaw(pose: startingPoint.position, goalPose: endingPoint.position)))
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder();
        return true
    }

    @objc func dismissKeyboard() {
        view.endEditing(true)
    }

    func computeDeltaYaw(pose: SCNVector3, goalPose: SCNVector3) -> Float {
        let dotProduct = SCNVector3DotProduct(pose, goalPose)
        let crossProduct = SCNVector3CrossProduct(pose, goalPose)
        let magnitude = sqrt(pow(crossProduct.x, 2) + pow(crossProduct.y, 2) + pow(crossProduct.z, 2))
        let goal = SCNVector3(goalPose.x - pose.x, 0, goalPose.z - pose.z)
        // compute cross product and dot product
        let cross = SCNVector3CrossProduct(pose, goal)
        let dot = SCNVector3DotProduct(pose, goal)

        // compute angle using atan2
        let angle = atan2(magnitude, dot);
        // compute sign of angle using cross product
        let sign = signum(cross.y)
        print(angle * sign);
        return angle * sign
    }


// Utility functions for dot and cross products
    func SCNVector3DotProduct(_ a: SCNVector3, _ b: SCNVector3) -> Float {
        return a.x * b.x + a.y * b.y + a.z * b.z
    }

    func SCNVector3CrossProduct(_ a: SCNVector3, _ b: SCNVector3) -> SCNVector3 {
        return SCNVector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x)
    }

    func signum(_ x: Float) -> Float {
        if x > 0 {
            return 1
        } else if x < 0 {
            return -1
        } else {
            return 0
        }
    }


}

extension SCNVector3 {
    var simdVector: simd_float3 {
        return simd_float3(x, y, z)
    }
}




