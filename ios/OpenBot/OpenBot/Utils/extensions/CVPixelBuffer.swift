//
// Created by Sparsh Jain on 18/11/22.
//

import Foundation
import Accelerate
import UIKit

extension CVPixelBuffer {
    /// Returns thumbnail by cropping pixel buffer to biggest square and scaling the cropped image to model dimensions.
    func resized(to size: CGSize) -> CVPixelBuffer? {
        let imageWidth = CVPixelBufferGetWidth(self)
        let imageHeight = CVPixelBufferGetHeight(self)
        let pixelBufferType = CVPixelBufferGetPixelFormatType(self)
        let inputImageRowBytes = CVPixelBufferGetBytesPerRow(self)
        let imageChannels = 4

        CVPixelBufferLockBaseAddress(self, CVPixelBufferLockFlags(rawValue: 0))

        // Finds the biggest square in the pixel buffer and advances rows based on it.
        guard let inputBaseAddress = CVPixelBufferGetBaseAddress(self) else {
            return nil
        }

        // Gets vImage Buffer from input image
        var inputVImageBuffer = vImage_Buffer(data: inputBaseAddress, height: UInt(imageHeight), width: UInt(imageWidth), rowBytes: inputImageRowBytes)

        let scaledImageRowBytes = Int(size.width) * imageChannels
        guard let scaledImageBytes = malloc(Int(size.height) * scaledImageRowBytes) else {
            return nil
        }

        // Allocates a vImage buffer for scaled image.
        var scaledVImageBuffer = vImage_Buffer(data: scaledImageBytes, height: UInt(size.height), width: UInt(size.width), rowBytes: scaledImageRowBytes)

        // Performs the scale operation on input image buffer and stores it in scaled image buffer.
        let scaleError = vImageScale_ARGB8888(&inputVImageBuffer, &scaledVImageBuffer, nil, vImage_Flags(0))

        CVPixelBufferUnlockBaseAddress(self, CVPixelBufferLockFlags(rawValue: 0))

        guard scaleError == kvImageNoError else {
            return nil
        }

        let releaseCallBack: CVPixelBufferReleaseBytesCallback = { mutablePointer, pointer in

            if let pointer = pointer {
                free(UnsafeMutableRawPointer(mutating: pointer))
            }
        }
        var scaledPixelBuffer: CVPixelBuffer?

        // Converts the scaled vImage buffer to CVPixelBuffer
        let conversionStatus = CVPixelBufferCreateWithBytes(nil, Int(size.width), Int(size.height), pixelBufferType, scaledImageBytes, scaledImageRowBytes, releaseCallBack, nil, nil, &scaledPixelBuffer)

        guard conversionStatus == kCVReturnSuccess else {

            free(scaledImageBytes)
            return nil
        }
        return scaledPixelBuffer
    }

    ///
    /// cropping the image by top 30 with given size this function is used by point goal navigation
    /// - Parameters:
    ///   - pixelBuffer: pixel of images
    ///   - width:
    ///   - height:
    ///   - cropSize: size to be cropped
    func resizePixelBuffer(_ pixelBuffer: CVPixelBuffer, width: Int, height: Int) -> CVPixelBuffer? {
        var resizedPixelBuffer: CVPixelBuffer?
        let options = [kCVPixelBufferCGImageCompatibilityKey: true,
                       kCVPixelBufferCGBitmapContextCompatibilityKey: true] as CFDictionary

        CVPixelBufferCreate(nil, width, height, CVPixelBufferGetPixelFormatType(pixelBuffer), options, &resizedPixelBuffer)
        guard let outputPixelBuffer = resizedPixelBuffer else {
            return nil
        }

        let inputImage = CIImage(cvPixelBuffer: pixelBuffer)
        let ciContext = CIContext()
        let scaleX = CGFloat(width) / CGFloat(CVPixelBufferGetWidth(pixelBuffer))
        let scaleY = CGFloat(height) / CGFloat(CVPixelBufferGetHeight(pixelBuffer))
        let scaleTransform = CGAffineTransform(scaleX: scaleX, y: scaleY)

        ciContext.render(inputImage.transformed(by: scaleTransform),
                to: outputPixelBuffer,
                bounds: CGRect(x: 0, y: 0, width: width, height: height),
                colorSpace: CGColorSpaceCreateDeviceRGB())

        return outputPixelBuffer
    }
/**
 generating buffer from UIImage
 - Parameter image:
 - Returns: CVPixelBuffer
 */
    func buffer(from image: UIImage) -> CVPixelBuffer? {
        let attrs = [kCVPixelBufferCGImageCompatibilityKey: kCFBooleanTrue, kCVPixelBufferCGBitmapContextCompatibilityKey: kCFBooleanTrue] as CFDictionary
        var pixelBuffer : CVPixelBuffer?
        let status = CVPixelBufferCreate(kCFAllocatorDefault, Int(image.size.width), Int(image.size.height), kCVPixelFormatType_32ARGB, attrs, &pixelBuffer)
        guard (status == kCVReturnSuccess) else {
            return nil
        }

        CVPixelBufferLockBaseAddress(pixelBuffer!, CVPixelBufferLockFlags(rawValue: 0))
        let pixelData = CVPixelBufferGetBaseAddress(pixelBuffer!)
        let rgbColorSpace = CGColorSpaceCreateDeviceRGB()
        let context = CGContext(data: pixelData, width: Int(image.size.width), height: Int(image.size.height), bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer!), space: rgbColorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)
        context?.translateBy(x: 0, y: image.size.height)
        context?.scaleBy(x: 1.0, y: -1.0)
        UIGraphicsPushContext(context!)
        image.draw(in: CGRect(x: 0, y: 0, width: image.size.width, height: image.size.height))
        UIGraphicsPopContext()
        CVPixelBufferUnlockBaseAddress(pixelBuffer!, CVPixelBufferLockFlags(rawValue: 0))
        return pixelBuffer
    }

    /***
     function to create UIImage from cvpixelbuffer
     - Parameters:
       - pixelBuffer:
       - colorSpace:
     - Returns:
     */
    func createUIImage(fromPixelBuffer pixelBuffer: CVPixelBuffer, colorSpace: CGColorSpace?) -> UIImage? {
        // Create a CIImage from the pixel buffer
        let ciImage = CIImage(cvPixelBuffer: pixelBuffer, options: [CIImageOption.colorSpace: colorSpace])

        // Create a UIImage from the CIImage
        let context = CIContext()
        if let cgImage = context.createCGImage(ciImage, from: ciImage.extent) {
            let uiImage = UIImage(cgImage: cgImage)
            return uiImage
        }

        return nil
    }

}
