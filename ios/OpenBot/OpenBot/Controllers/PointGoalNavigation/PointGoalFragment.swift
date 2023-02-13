//
// Created by Nitish Yadav on 13/02/23.
//

import Foundation
import UIKit
import SceneKit
import ARCore
import ARKit

class PointGoalFragment: UIViewController {

    private var arView: ARSCNView!
    private var anchor: ARAnchor!
    private var node: SCNNode!

    override func viewDidLoad() {
        super.viewDidLoad()

        arView = ARSCNView(frame: view.bounds)
        view.addSubview(arView)

        // Add a tap gesture recognizer to the ARView
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(tapGesture(_:)))
        arView.addGestureRecognizer(tapGesture)
    }

    @objc func tapGesture(_ gesture: UITapGestureRecognizer) {
        let location = gesture.location(in: arView)
        let results = arView.hitTest(location, types: [.featurePoint])

        // If a hit test result is found, create an ARAnchor at that location
        if let result = results.first {
            anchor = ARAnchor(transform: result.worldTransform)
            arView.session.add(anchor: anchor)
            arView.backgroundColor = .red
        }
    }

    func renderer(_ renderer: SCNSceneRenderer, nodeFor anchor: ARAnchor) -> SCNNode? {
        // If the anchor is the one we created earlier, create a node and add it to the scene
        if anchor == self.anchor {
            node = SCNNode()
            node.geometry = SCNBox(width: 0.1, height: 0.1, length: 0.1, chamferRadius: 0)
            node.geometry?.firstMaterial?.diffuse.contents = UIColor.red
            print(node.geometry)
            return node
        } else {
            return nil
        }
    }

}


