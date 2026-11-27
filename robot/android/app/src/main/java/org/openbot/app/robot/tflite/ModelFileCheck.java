package org.openbot.app.robot.tflite;

import java.io.File;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.tensorflow.lite.Interpreter;

/**
 * Finds the type, classes and input size the app can run a .tflite model with. Keep these rules the
 * same as open-code/src/utils/tfliteModel.js and the iOS ModelFileCheck.
 */
public final class ModelFileCheck {

  /** Name and shape of a model input or output. */
  public static final class TensorInfo {
    final String name;
    final int[] shape;

    public TensorInfo(String name, int[] shape) {
      this.name = name;
      this.shape = shape;
    }
  }

  /** What the app can run the model as. */
  public static final class Settings {
    public final Model.TYPE type;
    public final List<Model.CLASS> classes;
    public final int width;
    public final int height;

    Settings(Model.TYPE type, List<Model.CLASS> classes, int width, int height) {
      this.type = type;
      this.classes = classes;
      this.width = width;
      this.height = height;
    }

    public String getInputSize() {
      return width + "x" + height;
    }
  }

  // Output names the detectors look up.
  private static final List<List<String>> SSD_OUTPUTS =
      Arrays.asList(
          Arrays.asList(
              "TFLite_Detection_PostProcess",
              "TFLite_Detection_PostProcess:1",
              "TFLite_Detection_PostProcess:2",
              "TFLite_Detection_PostProcess:3"),
          Arrays.asList(
              "StatefulPartitionedCall:0",
              "StatefulPartitionedCall:1",
              "StatefulPartitionedCall:2",
              "StatefulPartitionedCall:3"));
  private static final List<List<String>> YOLOV4_OUTPUTS =
      Arrays.asList(
          Arrays.asList("Identity", "Identity_1"),
          Arrays.asList("StatefulPartitionedCall:0", "StatefulPartitionedCall:1"));

  private ModelFileCheck() {}

  /** Reads a model file; returns null when it is not a model the app can run. */
  public static Settings check(File file) {
    try (Interpreter interpreter = new Interpreter(file)) {
      List<TensorInfo> inputs = new ArrayList<>();
      for (int i = 0; i < interpreter.getInputTensorCount(); i++) {
        org.tensorflow.lite.Tensor tensor = interpreter.getInputTensor(i);
        inputs.add(new TensorInfo(tensor.name(), tensor.shape()));
      }
      List<TensorInfo> outputs = new ArrayList<>();
      for (int i = 0; i < interpreter.getOutputTensorCount(); i++) {
        org.tensorflow.lite.Tensor tensor = interpreter.getOutputTensor(i);
        outputs.add(new TensorInfo(tensor.name(), tensor.shape()));
      }
      return check(inputs, outputs);
    } catch (Exception e) {
      return null;
    }
  }

  /** Applies the rules to the model inputs and outputs; returns null when unsupported. */
  public static Settings check(List<TensorInfo> inputs, List<TensorInfo> outputs) {
    TensorInfo image = null;
    for (TensorInfo input : inputs) {
      if (input.shape.length == 4) {
        image = input;
        break;
      }
    }
    if (image == null) return null;
    int width = image.shape[2];
    int height = image.shape[1];

    // Driving models take the camera image plus a command (1 value) or a goal (3 values).
    if (inputs.size() == 2 && outputs.size() == 1) {
      TensorInfo extraInput = inputs.get(0) == image ? inputs.get(1) : inputs.get(0);
      int extraSize = extraInput.shape[extraInput.shape.length - 1];
      if (extraSize == 1) {
        return new Settings(
            Model.TYPE.CMDNAV, Collections.singletonList(Model.CLASS.AUTOPILOT), width, height);
      }
      if (extraSize == 3) {
        return new Settings(
            Model.TYPE.GOALNAV, Collections.singletonList(Model.CLASS.NAVIGATION), width, height);
      }
      return null;
    }
    if (inputs.size() != 1) return null;
    if (outputs.size() == 4 && hasAnyOutputs(outputs, SSD_OUTPUTS)) {
      // Both classes use the same detector, so both work.
      List<Model.CLASS> classes =
          hasOutputs(outputs, SSD_OUTPUTS.get(1))
              ? Arrays.asList(Model.CLASS.EFFICIENTDET, Model.CLASS.MOBILENET)
              : Arrays.asList(Model.CLASS.MOBILENET, Model.CLASS.EFFICIENTDET);
      return new Settings(Model.TYPE.DETECTOR, classes, width, height);
    }
    if (outputs.size() == 2 && hasAnyOutputs(outputs, YOLOV4_OUTPUTS)) {
      return new Settings(
          Model.TYPE.DETECTOR, Collections.singletonList(Model.CLASS.YOLOV4), width, height);
    }
    // YOLOv5 has one output of shape [1, boxes, 5 + number of classes].
    if (outputs.size() == 1 && outputs.get(0).shape.length == 3 && outputs.get(0).shape[2] > 5) {
      return new Settings(
          Model.TYPE.DETECTOR, Collections.singletonList(Model.CLASS.YOLOV5), width, height);
    }
    return null;
  }

  private static boolean hasAnyOutputs(List<TensorInfo> outputs, List<List<String>> nameSets) {
    for (List<String> names : nameSets) {
      if (hasOutputs(outputs, names)) return true;
    }
    return false;
  }

  private static boolean hasOutputs(List<TensorInfo> outputs, List<String> names) {
    for (String name : names) {
      boolean found = false;
      for (TensorInfo output : outputs) {
        if (name.equals(output.name)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }
}
