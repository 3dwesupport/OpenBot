//
// Created by Nitish Yadav on 13/02/23.
//

import Foundation
import UIKit
import SceneKit
import ARKit

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

    override func viewDidLoad() {
        super.viewDidLoad()
        sceneView = ARSCNView(frame: view
                .bounds)
        view.addSubview(sceneView)
        let scene = SCNScene()
        sceneView.scene = scene
        let configuration = ARWorldTrackingConfiguration()
        sceneView.session.run(configuration)
        sceneView.delegate = self
        sceneView.debugOptions = [ARSCNDebugOptions.showFeaturePoints]
        createSetGoalRect()
        let tap = UITapGestureRecognizer(target: self, action: #selector(UIInputViewController.dismissKeyboard))
        view.addGestureRecognizer(tap)
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
        let cancelButton = createLabelButtons(title: Strings.canceled, color: "black", selector: #selector(cancelFun(_:)))
        setGoalRect.addSubview(cancelButton);
        cancelButton.translatesAutoresizingMaskIntoConstraints = false;
        cancelButton.leadingAnchor.constraint(equalTo: setGoalText.leadingAnchor, constant: 0).isActive = true;
        cancelButton.bottomAnchor.constraint(equalTo: setGoalRect.bottomAnchor, constant: -15).isActive = true;
        let startButton = createLabelButtons(title: Strings.start, color: "black", selector: #selector(doneFun(_:)))
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

    func createLabelButtons(title: String, color: String, selector: Selector) -> UIButton {
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
        textField.keyboardType = .decimalPad;
        return textField;
    }

    @objc func doneFun(_ sender: UIView) {
        setGoalRect.removeFromSuperview();
        var forwardDistance = (forwardInput == nil ? 0 : Float(forwardInput.text ?? "0")) ?? 0
        let camera = sceneView.pointOfView!
        let cameraTransform = camera.transform
        let cameraOrientation = SCNVector3(-cameraTransform.m31, -cameraTransform.m32, -cameraTransform.m33)
        var forwardPosition = SCNVector3(camera.position.x, camera.position.y, camera.position.z - Float(forwardDistance));
        let LeftDistance = (leftInput == nil ? 0 : Float(leftInput.text ?? "0")) ?? 0
        let cameraRightOrientation = SCNVector3(-cameraTransform.m11, -cameraTransform.m12, -cameraTransform.m13);
        let leftPosition = SCNVector3(camera.position.x + cameraRightOrientation.x * LeftDistance, camera.position.y + cameraRightOrientation.y * LeftDistance, camera.position.z + cameraRightOrientation.z * LeftDistance) // Calculate the marker position based on the right orientation of the camera and the distance
        let marker = SCNNode(geometry: SCNSphere(radius: 0.01))
        let resultantVector = addVectors(leftPosition, forwardPosition);
        marker.position = resultantVector
        marker.geometry?.firstMaterial?.diffuse.contents = UIColor.red
        sceneView.scene.rootNode.addChildNode(marker)
        if startingPoint == nil {
            startingPoint.position = camera.position;
        } else {
            endingPoint = marker
            calculateRoute();
            travelThroughNode();
        }
    }

    func addVectors(_ vector1: SCNVector3, _ vector2: SCNVector3) -> SCNVector3 {
        return SCNVector3(vector1.x + vector2.x, vector1.y + vector2.y, vector1.z + vector2.z)
    }


    @objc func cancelFun(_ sender: UIView) {
        _ = navigationController?.popViewController(animated: true)
    }

    func calculateRoute() {
        let distance = simd_distance(startingPoint.simdPosition, endingPoint.simdPosition)
        let direction = simd_normalize(endingPoint.simdPosition - startingPoint.simdPosition)
        print(distance, direction)
    }

    func travelThroughNode(){
        let path = [startingPoint.position, endingPoint.position]
        let moveAction = SCNAction.sequence([
            SCNAction.move(to: path[0], duration: 0),
            SCNAction.move(to: path[1], duration: 2.0) // Change duration as needed
        ])
        let nodeToMove = SCNNode(geometry: SCNSphere(radius: 0.01))
        nodeToMove.position = startingPoint.position
        nodeToMove.geometry?.firstMaterial?.diffuse.contents = UIColor.blue
        sceneView.scene.rootNode.addChildNode(nodeToMove)
        nodeToMove.runAction(moveAction)
        let logIntervals = [0.0, 0.5, 1.0, 1.5, 2.0]
        nodeToMove.runAction(moveAction, completionHandler: {
            for t in logIntervals {
                let position = nodeToMove.presentation.position
                print("Time: \(t), Position: (\(position.x), \(position.y), \(position.z))")
            }
        })

    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder();
        return true
    }

    @objc func dismissKeyboard() {
        view.endEditing(true)
    }
}




