//
// Created by Nitish Yadav on 21/07/23.
//

import Foundation
import UIKit

class WebServerFragment: UIViewController {
    @IBOutlet weak var counterLabel: UILabel!
    var mSocket = WebSocketManager.shared.socket

    override func viewDidLoad() {
        super.viewDidLoad()
        // Listen for socket connection status changes
        mSocket?.on(clientEvent: .connect) { (dataArray, ack) in
            print("Socket connected.")
            // Emit events or perform other actions that require a connection
        }

        mSocket?.on(clientEvent: .disconnect) { (dataArray, ack) in
            print("Socket disconnected.")
            // Handle disconnection if needed
        }

        mSocket?.on("counter") { (dataArray, ack) in
            let dataReceived = dataArray[0] as? Int
            print("data received", dataReceived ?? "No data received")
            if let dataReceived = dataReceived {
                self.counterLabel.text = "\(dataReceived)"
            }
        }

        WebSocketManager.shared.connectSocket()

    }
    @IBAction func counterHandler(_ sender: Any) {
        mSocket?.connect()
        mSocket?.emit("counter")
    }
}
