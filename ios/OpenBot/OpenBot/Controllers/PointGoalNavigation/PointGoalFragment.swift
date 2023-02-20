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
    private var isReached : Bool = false;
    var marker = SCNNode();
    let infoMessageRect = UIView();

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
        startingPoint.position = camera.position;
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

    func renderer(_ renderer: SCNSceneRenderer, updateAtTime time: TimeInterval) {
        guard let camera = sceneView.pointOfView else {
            return
        }
        checkCameraPosition(position: camera.presentation.simdPosition);
    }


// Define a distance threshold for triggering the event
    let distanceThreshold: Float = 0.05 // adjust this value as needed

    func checkCameraPosition(position: simd_float3) {
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
        _ = simd_distance(startingPoint.simdPosition, endingPoint.simdPosition)
        let direction = simd_normalize(endingPoint.simdPosition - startingPoint.simdPosition)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder();
        return true
    }

    @objc func dismissKeyboard() {
        view.endEditing(true)
    }

}




