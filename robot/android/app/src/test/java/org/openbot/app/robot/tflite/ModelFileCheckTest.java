package org.openbot.app.robot.tflite;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;
import org.openbot.app.robot.tflite.ModelFileCheck.Settings;
import org.openbot.app.robot.tflite.ModelFileCheck.TensorInfo;

/** Inputs and outputs below are taken from the real OpenBot model files. */
public class ModelFileCheckTest {

  private static TensorInfo tensor(String name, int... shape) {
    return new TensorInfo(name, shape);
  }

  private static void assertSettings(
      Settings settings, Model.TYPE type, List<Model.CLASS> classes, String inputSize) {
    assertEquals(type, settings.type);
    assertEquals(classes, settings.classes);
    assertEquals(inputSize, settings.getInputSize());
  }

  @Test
  public void autopilot() {
    Settings settings =
        ModelFileCheck.check(
            Arrays.asList(tensor("cmd_input", 1, 1), tensor("img_input", 1, 96, 256, 3)),
            Collections.singletonList(tensor("Identity", 1, 2)));
    assertSettings(
        settings, Model.TYPE.CMDNAV, Collections.singletonList(Model.CLASS.AUTOPILOT), "256x96");
  }

  @Test
  public void navigation() {
    Settings settings =
        ModelFileCheck.check(
            Arrays.asList(
                tensor("serving_default_img_input:0", 1, 90, 160, 3),
                tensor("serving_default_goal_input:0", 1, 3)),
            Collections.singletonList(tensor("StatefulPartitionedCall:0", 1, 2)));
    assertSettings(
        settings, Model.TYPE.GOALNAV, Collections.singletonList(Model.CLASS.NAVIGATION), "160x90");
  }

  @Test
  public void mobileNet() {
    Settings settings =
        ModelFileCheck.check(
            Collections.singletonList(tensor("normalized_input_image_tensor", 1, 300, 300, 3)),
            Arrays.asList(
                tensor("TFLite_Detection_PostProcess"),
                tensor("TFLite_Detection_PostProcess:1"),
                tensor("TFLite_Detection_PostProcess:2"),
                tensor("TFLite_Detection_PostProcess:3")));
    assertSettings(
        settings,
        Model.TYPE.DETECTOR,
        Arrays.asList(Model.CLASS.MOBILENET, Model.CLASS.EFFICIENTDET),
        "300x300");
  }

  @Test
  public void efficientDet() {
    Settings settings =
        ModelFileCheck.check(
            Collections.singletonList(tensor("input", 1, 320, 320, 3)),
            Arrays.asList(
                tensor("StatefulPartitionedCall:0", 1, 25),
                tensor("StatefulPartitionedCall:1", 1, 25),
                tensor("StatefulPartitionedCall:2", 1, 25),
                tensor("StatefulPartitionedCall:3", 1)));
    assertSettings(
        settings,
        Model.TYPE.DETECTOR,
        Arrays.asList(Model.CLASS.EFFICIENTDET, Model.CLASS.MOBILENET),
        "320x320");
  }

  @Test
  public void yoloV4() {
    Settings settings =
        ModelFileCheck.check(
            Collections.singletonList(tensor("input_1", 1, 224, 224, 3)),
            Arrays.asList(tensor("Identity", 1, 1, 4), tensor("Identity_1", 1, 1, 80)));
    assertSettings(
        settings, Model.TYPE.DETECTOR, Collections.singletonList(Model.CLASS.YOLOV4), "224x224");
  }

  @Test
  public void yoloV5() {
    Settings settings =
        ModelFileCheck.check(
            Collections.singletonList(tensor("serving_default_input_1:0", 1, 320, 320, 3)),
            Collections.singletonList(tensor("StatefulPartitionedCall:0", 1, 6300, 85)));
    assertSettings(
        settings, Model.TYPE.DETECTOR, Collections.singletonList(Model.CLASS.YOLOV5), "320x320");
  }

  @Test
  public void unsupportedModelsAreRejected() {
    // Image classifier: one 2D output.
    assertNull(
        ModelFileCheck.check(
            Collections.singletonList(tensor("input", 1, 224, 224, 3)),
            Collections.singletonList(tensor("probs", 1, 1000))));
    // Unknown detector with 3 outputs.
    assertNull(
        ModelFileCheck.check(
            Collections.singletonList(tensor("input", 1, 224, 224, 3)),
            Arrays.asList(tensor("a", 1), tensor("b", 1), tensor("c", 1))));
    // No image input.
    assertNull(
        ModelFileCheck.check(
            Collections.singletonList(tensor("x", 1, 10)),
            Collections.singletonList(tensor("y", 1, 2))));
  }
}
