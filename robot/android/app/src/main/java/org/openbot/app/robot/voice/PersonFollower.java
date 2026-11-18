package org.openbot.app.robot.voice;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Matrix;
import android.graphics.RectF;
import java.io.IOException;
import java.util.LinkedList;
import java.util.List;
import org.openbot.app.robot.env.ImageUtils;
import org.openbot.app.robot.tflite.Detector;
import org.openbot.app.robot.tflite.Model;
import org.openbot.app.robot.tflite.Network;
import org.openbot.app.robot.tracking.MultiBoxTracker;
import org.openbot.app.robot.vehicle.Control;
import timber.log.Timber;

/**
 * Detects and follows a person using the same TensorFlow Lite detector and tracker the Blockly
 * "follow object" block uses (see {@code BlocklyExecutingFragment.startFollowObject()}), lifted
 * out into a standalone helper so Voice Control can drive it directly instead of through the
 * Blockly/WebView bridge.
 *
 * <p>Always loads the MobileNetV1-300 detector bundled in the APK's assets, since (per
 * assets/config.json) it's the only detector model guaranteed present on-device without a
 * separate model-download step first.
 */
public class PersonFollower {

  private static final float MINIMUM_CONFIDENCE = 0.5f;
  private static final Model DETECTOR_MODEL =
      new Model(
          3,
          Model.CLASS.MOBILENET,
          Model.TYPE.DETECTOR,
          "MobileNetV1-300.tflite",
          Model.PATH_TYPE.ASSET,
          "networks/ssd_mobilenet_v1_1_metadata.tflite",
          "300x300");

  private final Activity activity;
  private Detector detector;
  private MultiBoxTracker tracker;
  private Matrix frameToCropTransform;
  private Matrix cropToFrameTransform;
  private Bitmap croppedBitmap;
  private long frameNum;
  private volatile boolean computing;

  public PersonFollower(Activity activity) {
    this.activity = activity;
  }

  /** Loads the detector and prepares the crop transform for the given analyzed-frame size. */
  public boolean start(int sensorOrientation, int frameWidth, int frameHeight) {
    tracker = new MultiBoxTracker(activity);
    try {
      detector = Detector.create(activity, DETECTOR_MODEL, Network.Device.CPU, 2);
    } catch (IOException e) {
      Timber.e(e, "Failed to load person-follow detector");
      detector = null;
      return false;
    }
    if (detector == null) return false;

    croppedBitmap =
        Bitmap.createBitmap(detector.getImageSizeX(), detector.getImageSizeY(), Bitmap.Config.ARGB_8888);
    frameToCropTransform =
        ImageUtils.getTransformationMatrix(
            frameWidth,
            frameHeight,
            croppedBitmap.getWidth(),
            croppedBitmap.getHeight(),
            sensorOrientation,
            detector.getCropRect(),
            detector.getMaintainAspect());
    cropToFrameTransform = new Matrix();
    frameToCropTransform.invert(cropToFrameTransform);
    tracker.setFrameConfiguration(frameWidth, frameHeight, sensorOrientation);
    return true;
  }

  public boolean isReady() {
    return detector != null;
  }

  /**
   * Runs detection+tracking on one camera frame and returns the {@link Control} to steer toward
   * the tracked person, or {@code null} if a previous frame's detection pass is still running
   * (the caller should just drop this frame rather than queue it up) or nothing was found.
   */
  public Control processFrame(Bitmap bitmap) {
    if (detector == null || computing) return null;
    computing = true;
    try {
      Canvas canvas = new Canvas(croppedBitmap);
      canvas.drawBitmap(bitmap, frameToCropTransform, null);

      List<Detector.Recognition> results = detector.recognizeImage(croppedBitmap, "person");
      List<Detector.Recognition> mapped = new LinkedList<>();
      for (Detector.Recognition result : results) {
        RectF location = result.getLocation();
        if (location != null && result.getConfidence() >= MINIMUM_CONFIDENCE) {
          cropToFrameTransform.mapRect(location);
          result.setLocation(location);
          mapped.add(result);
        }
      }
      tracker.trackResults(mapped, ++frameNum);
      return tracker.updateTarget();
    } finally {
      computing = false;
    }
  }

  public void stop() {
    if (detector != null) {
      detector.close();
      detector = null;
    }
    if (tracker != null) {
      tracker.clearTrackedObjects();
      tracker = null;
    }
  }

  /** Draws the current tracked person's bounding box, scaled to the given canvas' size. */
  public void draw(Canvas canvas) {
    if (tracker != null) tracker.draw(canvas);
  }
}
