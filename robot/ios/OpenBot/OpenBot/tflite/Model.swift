///
/// Created by Sparsh Jain on 29/09/22.
///

import Foundation
import UIKit
import TensorFlowLite

/// The ModelItem structure is a data container for the characteristics of a neural network. It serves as an inerface between the Model class and
/// a JSON parameter file describing the main characteristics of a network.
/// Conforms to the Codable protocol: can be converted to JSON format by encoding it, and it can be converted back to an object by decoding it.
struct ModelItem: Codable {
    var id: Int;
    var `class`: String;
    var type: String;
    var name: String;
    var pathType: String;
    var path: String;
    var inputSize: String;

    enum CodingKeys: String, CodingKey {
        case id, `class`, type, name, pathType, path, inputSize
    }

    /// Write the characteristics of a given model as a JSON file
    ///
    /// - Parameters: a list of model items
    static func toJson(_ models: [ModelItem]) -> Any {
        var result: [Any] = []
        for item in models {
            let jsonObject: Any =
                    [
                        "id": item.id,
                        "class": item.class,
                        "type": item.type,
                        "name": item.name,
                        "pathType": item.pathType,
                        "path": item.path,
                        "inputSize": item.inputSize
                    ];
            result.append(jsonObject)
        }
        return result;
    }

    /// Extract the width of a model input from a JSON string in the format "WxH"
    ///
    /// - Returns: width of the model input
    static func getWidthOfInput(_ inputSize: String) -> String {
        if inputSize != "" {
            let index = inputSize.firstIndex(of: "x")!;
            return String(inputSize.prefix(upTo: index));
        }
        return ""
    }

    /// Extract the height of a model input from a JSON string in the format "WxH"
    ///
    /// - Returns: height of the model input
    static func getHeightOfInput(_ inputSize: String) -> String {
        if inputSize != "" {
            let index = inputSize.firstIndex(of: "x")!;
            let nextIndex = inputSize.index(after: index);
            return String(inputSize.suffix(from: nextIndex));
        }
        return ""
    }

}

/// Decoding that checks every entry of the shared config.json.
/// Kept in an extension so the memberwise initializer stays available.
extension ModelItem {

    private static let pathTypes: Set<String> = ["URL", "ASSET", "FILE"]

    /// Decodes one entry, maps names from older iOS builds, and rejects entries the apps can't use.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let rawClass = try container.decode(String.self, forKey: .class)
        let rawType = try container.decode(String.self, forKey: .type)
        guard let classType = CLASS(configValue: rawClass), let type = TYPE(configValue: rawType) else {
            throw DecodingError.dataCorruptedError(forKey: .type, in: container, debugDescription: "Unknown class \(rawClass) or type \(rawType)")
        }
        let pathType = try container.decode(String.self, forKey: .pathType)
        guard ModelItem.pathTypes.contains(pathType) else {
            throw DecodingError.dataCorruptedError(forKey: .pathType, in: container, debugDescription: "Unknown pathType \(pathType)")
        }
        let name = try container.decode(String.self, forKey: .name)
        guard !name.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .name, in: container, debugDescription: "Empty model name")
        }
        let inputSize = try container.decode(String.self, forKey: .inputSize)
        self.init(id: try container.decode(Int.self, forKey: .id),
                  class: classType.rawValue,
                  type: type.rawValue,
                  name: name,
                  pathType: pathType,
                  path: try container.decodeIfPresent(String.self, forKey: .path) ?? "",
                  inputSize: inputSize)
    }

    /// Decodes a model list and skips bad entries instead of failing the whole list.
    static func decodeList(from data: Data) -> [ModelItem] {
        guard let entries = try? JSONDecoder().decode([LossyModelItem].self, from: data) else {
            print("config.json is not a readable model list")
            return []
        }
        let items = entries.compactMap { $0.item }
        if items.count < entries.count {
            print("Skipped \(entries.count - items.count) invalid model entries in config.json")
        }
        return items
    }

    /// Wraps one entry so a bad entry decodes as nil.
    private struct LossyModelItem: Decodable {
        let item: ModelItem?

        init(from decoder: Decoder) throws {
            item = try? ModelItem(from: decoder)
        }
    }
}

/// The Model class encapsulates the main properties of a neural network in the context of an OpenBot application.
class Model {
    var id: Int;
    var classType: CLASS; // AUTOPILOT_F, MOBILENET, YOLOV4, YOLOV5, EFFICIENTDET or NAVIGATION
    var type: TYPE; // AUTOPILOT, DETECTOR or NAVIGATION
    var name: String;
    var pathType: PATH_TYPE; // URL, FILE or ASSET
    var path: String;
    var inputSize: String;

    /// Initialization routine
    ///
    /// - Parameters:
    ///     - id: id of the model
    ///     - classType: AUTOPILOT_F, MOBILENET, YOLOV4, YOLOV5, EFFICIENTDET or NAVIGATION
    ///     - type: AUTOPILOT, DETECTOR or NAVIGATION
    ///     - name: the name of the model
    ///     - pathType: URL, FILE or ASSET
    ///     - path: relative to ...
    ///     - inputSize: the model input dimensionality
    ///     - id:
    init(id: Int, classType: CLASS, type: TYPE, name: String, pathType: PATH_TYPE, path: String, inputSize: String) {
        self.id = id;
        self.classType = classType;
        self.type = type;
        self.name = name;
        self.pathType = pathType;
        self.path = path;
        self.inputSize = inputSize;
    }

    /// Getter method to return name
    ///
    /// - Returns: name of the model
    func getName() -> String {
        name;
    }

    /// Getter method to return the input size of a model
    ///
    /// - Returns: input size of the model
    func getInputSize() -> CGSize {
        CGSize.parseSize(inputSize);
    }

    /// Setter method to set path
    ///
    /// - Parameters: path of the model
    func setPath(path: String) {
        self.path = path;
    }

    /// Setter method to set path type
    ///
    /// - Parameters: whether the path of the policy is of type URL, FILE or ASSET
    func setPathType(pathType: PATH_TYPE) {
        self.pathType = pathType;
    }

    /// Setter method to set input size of the model
    ///
    /// - Parameters: input size of the model
    func setInputSize(inputSize: String) {
        self.inputSize = inputSize;
    }

    /// Setter method to set the name of the model
    ///
    /// - Parameters: name of the model
    func setName(name: String) {
        self.name = name;
    }

    /// Setter method to set the model class
    ///
    /// - Parameters: type enum (e.g. AUTOPILOT_F, MOBILENET, YOLOV4, YOLOV5, EFFICIENTDET or NAVIGATION )
    func setClassType(classType: CLASS) {
        self.classType = classType;
    }

    /// Setter method to set the type of the model
    ///
    /// - Parameters: type enum (e.g. AUTOPILOT, DETECTOR or NAVIGATION )
    func setType(type: TYPE) {
        self.type = type;
    }
}

/// Extension of the CGSize class
extension CGSize {

    /// Converts an input string into CGSize object
    ///
    /// - Parameters: input size of the model, as a string in the format "WxH"
    /// - Returns: a CGSize struct
    static func parseSize(_ input: String) -> CGSize {
        let out = input.split(separator: "x");
        let width = Int(out[0]) ?? 0;
        let height = Int(out[1]) ?? 0;
        return CGSize(width: width, height: height);
    }
}

/// Extension of the Model class
extension Model {

    /// Converts an array of ModelItem objects to an array of Model objects.
    ///
    /// - Parameter list: The list of ModelItem objects to be converted.
    /// - Returns: An array of Model objects.
    static func fromModelItems(list: [ModelItem]) -> [Model] {
        var models: [Model] = [];
        for item in list {
            let model: Model = Model(
                    id: item.id,
                    classType: CLASS(configValue: item.class) ?? CLASS.AUTOPILOT_F,
                    type: TYPE(configValue: item.type) ?? TYPE.AUTOPILOT,
                    name: item.name,
                    pathType: PATH_TYPE(rawValue: item.pathType) ?? PATH_TYPE.ASSET,
                    path: item.path,
                    inputSize: item.inputSize);
            models.append(model);
        }
        return models;
    }

    /// Converts a single ModelItem object to a Model object.
    ///
    ///- Parameter item: The ModelItem object to be converted.
    ///- Returns: A Model object.
    static func fromModelItem(item: ModelItem) -> Model {
        let model: Model = Model(
                id: item.id,
                classType: CLASS(configValue: item.class) ?? CLASS.AUTOPILOT_F,
                type: TYPE(configValue: item.type) ?? TYPE.AUTOPILOT,
                name: item.name,
                pathType: PATH_TYPE(rawValue: item.pathType) ?? PATH_TYPE.ASSET,
                path: item.path,
                inputSize: item.inputSize);
        return model;
    }
}

/// What the app can run a .tflite model file as. Keep these rules the same as
/// open-code/src/utils/tfliteModel.js and Android's ModelFileCheck.
struct ModelFileCheck {
    let type: String
    let classes: [String]
    let width: Int
    let height: Int

    var inputSize: String {
        "\(width)x\(height)"
    }

    // Output names the detectors look up.
    private static let ssdOutputs = [
        ["TFLite_Detection_PostProcess", "TFLite_Detection_PostProcess:1", "TFLite_Detection_PostProcess:2", "TFLite_Detection_PostProcess:3"],
        ["StatefulPartitionedCall:0", "StatefulPartitionedCall:1", "StatefulPartitionedCall:2", "StatefulPartitionedCall:3"],
    ]
    private static let yoloV4Outputs = [
        ["Identity", "Identity_1"],
        ["StatefulPartitionedCall:0", "StatefulPartitionedCall:1"],
    ]

    /// Reads a model file; returns nil when it is not a model the app can run.
    static func check(fileAt path: String) -> ModelFileCheck? {
        do {
            let interpreter = try Interpreter(modelPath: path)
            try interpreter.allocateTensors()
            let inputs = try (0..<interpreter.inputTensorCount).map { try interpreter.input(at: $0) }
            let outputs = try (0..<interpreter.outputTensorCount).map { try interpreter.output(at: $0) }
            return check(inputs: inputs.map { ($0.name, $0.shape.dimensions) },
                    outputs: outputs.map { ($0.name, $0.shape.dimensions) })
        } catch {
            return nil
        }
    }

    /// Reads a model file off the main thread, then calls back on the main thread.
    static func check(fileAt path: String, completion: @escaping (ModelFileCheck?) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            let result = check(fileAt: path)
            DispatchQueue.main.async {
                completion(result)
            }
        }
    }

    /// Applies the rules to the model inputs and outputs; returns nil when unsupported.
    static func check(inputs: [(name: String, shape: [Int])], outputs: [(name: String, shape: [Int])]) -> ModelFileCheck? {
        guard let image = inputs.first(where: { $0.shape.count == 4 }) else {
            return nil
        }
        func settings(_ type: TYPE, _ classes: [CLASS]) -> ModelFileCheck {
            ModelFileCheck(type: type.rawValue, classes: classes.map { $0.rawValue }, width: image.shape[2], height: image.shape[1])
        }
        func hasOutputs(_ names: [String]) -> Bool {
            names.allSatisfy { name in outputs.contains { $0.name == name } }
        }

        // Driving models take the camera image plus a command (1 value) or a goal (3 values).
        if inputs.count == 2 && outputs.count == 1 {
            let extraInput = inputs[0].shape.count == 4 ? inputs[1] : inputs[0]
            switch extraInput.shape.last {
            case 1: return settings(.AUTOPILOT, [.AUTOPILOT_F])
            case 3: return settings(.NAVIGATION, [.NAVIGATION])
            default: return nil
            }
        }
        guard inputs.count == 1 else {
            return nil
        }
        if outputs.count == 4 && ssdOutputs.contains(where: hasOutputs) {
            // Both classes use the same detector, so both work.
            return hasOutputs(ssdOutputs[1]) ? settings(.DETECTOR, [.EFFICIENTDET, .MOBILENET]) : settings(.DETECTOR, [.MOBILENET, .EFFICIENTDET])
        }
        if outputs.count == 2 && yoloV4Outputs.contains(where: hasOutputs) {
            return settings(.DETECTOR, [.YOLOV4])
        }
        // YOLOv5 has one output of shape [1, boxes, 5 + number of classes].
        if outputs.count == 1 && outputs[0].shape.count == 3 && outputs[0].shape[2] > 5 {
            return settings(.DETECTOR, [.YOLOV5])
        }
        return nil
    }
}
