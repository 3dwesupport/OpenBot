//
// Created by Nitish Yadav on 03/03/23.
//

import Foundation
class Pose {
    var tx: Float
    var ty: Float
    var tz: Float
    var qx: Float
    var qy: Float
    var qz: Float
    var qw: Float

    init(tx: Float, ty: Float, tz: Float, qx: Float, qy: Float, qz: Float, qw: Float) {
        self.tx = tx
        self.ty = ty
        self.tz = tz
        self.qx = qx
        self.qy = qy
        self.qz = qz
        self.qw = qw
    }

    // rotate a vector by this pose's orientation
    func rotateVector(vector: [Float]) -> [Float] {
        let x = vector[0]
        let y = vector[1]
        let z = vector[2]

        let x2 = qw * x + qy * z - qz * y
        let y2 = qw * y - qx * z + qz * x
        let z2 = qw * z + qx * y - qy * x
        let w2 = -qx * x - qy * y - qz * z

        return [
            qy * z2 - qz * y2 + qw * x2 + qx * w2,
            qz * x2 - qx * z2 + qw * y2 + qy * w2,
            qx * y2 - qy * x2 + qw * z2 + qz * w2
        ]
    }
}

