/**
 * Reads the input and output tensors of a .tflite model file.
 * A .tflite file is a FlatBuffer, so only the few fields needed here are read.
 * @param {ArrayBuffer} buffer
 * @returns {{inputs: {name: string, shape: number[]}[], outputs: {name: string, shape: number[]}[]}}
 */
export function readTfliteModel(buffer) {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 8 || new TextDecoder().decode(bytes.subarray(4, 8)) !== "TFL3") {
        throw new Error("Not a TensorFlow Lite model");
    }

    // Position of a table field, or 0 when the field is not set.
    const field = (table, index) => {
        const vtable = table - view.getInt32(table, true);
        const slot = 4 + index * 2;
        if (slot >= view.getUint16(vtable, true)) {
            return 0;
        }
        const offset = view.getUint16(vtable + slot, true);
        return offset ? table + offset : 0;
    };
    const follow = (position) => position + view.getUint32(position, true);
    const vector = (table, index) => {
        const position = field(table, index);
        if (!position) {
            return {start: 0, length: 0};
        }
        const start = follow(position);
        return {start: start + 4, length: view.getUint32(start, true)};
    };
    const readString = (table, index) => {
        const position = field(table, index);
        if (!position) {
            return "";
        }
        const start = follow(position);
        return new TextDecoder().decode(bytes.subarray(start + 4, start + 4 + view.getUint32(start, true)));
    };
    const readInts = ({start, length}) => Array.from({length}, (_, i) => view.getInt32(start + i * 4, true));

    // Model.subgraphs is field 2; the first subgraph is the model itself.
    const subgraphs = vector(follow(0), 2);
    if (!subgraphs.length) {
        throw new Error("Model has no subgraph");
    }
    const subgraph = follow(subgraphs.start);
    // SubGraph fields: tensors 0, inputs 1, outputs 2. Tensor fields: shape 0, name 3.
    const tensors = vector(subgraph, 0);
    const tensorAt = (index) => {
        const tensor = follow(tensors.start + index * 4);
        return {name: readString(tensor, 3), shape: readInts(vector(tensor, 0))};
    };
    return {
        inputs: readInts(vector(subgraph, 1)).map(tensorAt),
        outputs: readInts(vector(subgraph, 2)).map(tensorAt),
    };
}

// Output names the Android and iOS detectors look up.
const SSD_OUTPUTS = [
    ["TFLite_Detection_PostProcess", "TFLite_Detection_PostProcess:1", "TFLite_Detection_PostProcess:2", "TFLite_Detection_PostProcess:3"],
    ["StatefulPartitionedCall:0", "StatefulPartitionedCall:1", "StatefulPartitionedCall:2", "StatefulPartitionedCall:3"],
];
const YOLOV4_OUTPUTS = [
    ["Identity", "Identity_1"],
    ["StatefulPartitionedCall:0", "StatefulPartitionedCall:1"],
];

const hasOutputs = (outputs, names) => names.every((name) => outputs.some((output) => output.name === name));

/**
 * Finds the type, classes and input size the robot apps can run a model with.
 * @param {{inputs: {name: string, shape: number[]}[], outputs: {name: string, shape: number[]}[]}} model
 * @returns {{type: string, classes: string[], width: number, height: number} | null} null when the apps can't run it
 */
export function getModelSettings(model) {
    const {inputs, outputs} = model;
    const image = inputs.find((input) => input.shape.length === 4);
    if (!image) {
        return null;
    }
    const settings = (type, classes) => ({type, classes, width: image.shape[2], height: image.shape[1]});

    // Driving models take the camera image plus a command (1 value) or a goal (3 values).
    if (inputs.length === 2 && outputs.length === 1) {
        const extraInput = inputs.find((input) => input !== image);
        const extraSize = extraInput.shape[extraInput.shape.length - 1];
        if (extraSize === 1) {
            return settings("CMDNAV", ["AUTOPILOT"]);
        }
        if (extraSize === 3) {
            return settings("NAVIGATION", ["NAVIGATION"]);
        }
        return null;
    }
    if (inputs.length !== 1) {
        return null;
    }
    if (outputs.length === 4 && SSD_OUTPUTS.some((names) => hasOutputs(outputs, names))) {
        // Both classes use the same reader, so both work.
        return hasOutputs(outputs, SSD_OUTPUTS[1])
            ? settings("DETECTOR", ["EFFICIENTDET", "MOBILENET"])
            : settings("DETECTOR", ["MOBILENET", "EFFICIENTDET"]);
    }
    if (outputs.length === 2 && YOLOV4_OUTPUTS.some((names) => hasOutputs(outputs, names))) {
        return settings("DETECTOR", ["YOLOV4"]);
    }
    // YOLOv5 has one output of shape [1, boxes, 5 + number of classes].
    if (outputs.length === 1 && outputs[0].shape.length === 3 && outputs[0].shape[2] > 5) {
        return settings("DETECTOR", ["YOLOV5"]);
    }
    return null;
}
