package org.openbot.app.robot.voice;

import android.app.Activity;
import android.graphics.Bitmap;
import android.opengl.GLSurfaceView;
import android.os.Handler;
import com.google.ar.core.Pose;
import com.google.ar.core.TrackingFailureReason;
import com.google.ar.core.exceptions.CameraNotAvailableException;
import com.google.ar.core.exceptions.NotTrackingException;
import com.google.ar.core.exceptions.UnavailableApkTooOldException;
import com.google.ar.core.exceptions.UnavailableArcoreNotInstalledException;
import com.google.ar.core.exceptions.UnavailableDeviceNotCompatibleException;
import com.google.ar.core.exceptions.UnavailableSdkTooOldException;
import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.openbot.app.robot.pointGoalNavigation.ArCore;
import org.openbot.app.robot.pointGoalNavigation.ArCoreListener;
import org.openbot.app.robot.pointGoalNavigation.CameraIntrinsics;
import org.openbot.app.robot.pointGoalNavigation.ImageFrame;
import org.openbot.app.robot.pointGoalNavigation.NavigationPoses;
import org.openbot.app.robot.tflite.Model;
import org.openbot.app.robot.tflite.Navigation;
import org.openbot.app.robot.tflite.Network;
import org.openbot.app.robot.vehicle.Control;
import org.openbot.app.robot.vehicle.Vehicle;
import timber.log.Timber;

/**
 * The single camera owner for Voice Control: ARCore's session runs continuously for the whole
 * voice conversation (started once, closed once), rather than being started/stopped per feature.
 *
 * <p>This replaces an earlier design that alternated between CameraX (for periodic vision frames
 * and person-following) and a freshly-created ARCore session per {@code move_distance} call. That
 * was unreliable for two concrete reasons: (1) {@link ArCore#resume()} creates a brand new ARCore
 * {@code Session} every time it's called, which has no tracking history and needs a moment to
 * lock onto a pose — starting one and immediately asking for {@code getStartPose()} is a race that
 * regularly loses ("no ARCore pose yet"); and (2) handing the physical camera back and forth
 * between CameraX and ARCore is itself asynchronous on both sides, which is a plausible source of
 * the reported crashes (each side can try to open the camera while the other hasn't released it
 * yet). Running one ARCore session throughout avoids both problems: by the time the user asks for
 * a precise move, ARCore has typically already been tracking for the whole conversation, and there
 * is never more than one camera owner.
 *
 * <p>Every frame is delivered to {@link Listener#onFrame} for vision/person-following use (skipped
 * while a {@code move_distance} goal is actively driving, since that needs the frame for
 * navigation instead). ARCore's world tracking only supports the rear-facing camera, so unlike the
 * CameraX-based source this replaces, there is no front/back toggle.
 */
public class ArCoreCameraSource implements ArCoreListener {

  private static final float GOAL_REACHED_METERS = 0.15f;
  private static final int kMaxChannelValue = 262143;

  public interface Listener {
    /** One camera frame, native resolution (typically 640x480). Called on a background thread. */
    void onFrame(Bitmap bitmap);

    void onGoalReached();

    void onTrackingLost();

    void onError(String message);
  }

  private final Activity activity;
  private final Vehicle vehicle;
  private final Listener listener;
  private final ArCore arCore;
  private final ExecutorService visionExecutor = Executors.newSingleThreadExecutor();
  private volatile boolean processingVisionFrame;
  private volatile boolean navigating;
  private Navigation navigationPolicy;

  public ArCoreCameraSource(
      Activity activity, Vehicle vehicle, GLSurfaceView surfaceView, Handler mainHandler, Listener listener) {
    this.activity = activity;
    this.vehicle = vehicle;
    this.listener = listener;
    arCore = new ArCore(activity, surfaceView, mainHandler);
    arCore.setArCoreListener(this);
  }

  /** Starts the ARCore session. Call once; returns false if ARCore isn't usable right now. */
  public boolean resume() {
    try {
      arCore.resume();
      return true;
    } catch (SecurityException e) {
      Timber.e(e, "ARCore needs camera permission");
      if (listener != null) listener.onError("Camera permission is required.");
      return false;
    } catch (UnavailableSdkTooOldException
        | UnavailableDeviceNotCompatibleException
        | UnavailableArcoreNotInstalledException
        | UnavailableApkTooOldException
        | CameraNotAvailableException e) {
      Timber.e(e, "ARCore unavailable");
      if (listener != null) listener.onError("ARCore isn't available on this device right now.");
      return false;
    }
  }

  /**
   * Drives {@code forwardMeters} forward and {@code leftMeters} left (either can be negative)
   * relative to the robot's current pose. Returns false if a goal couldn't be set (tracking not
   * ready yet, policy failed to load, ...) — the caller's function-call response should reflect
   * that. Vision/following frames are paused while a goal is active and resume automatically once
   * it ends, since it's the same camera session throughout.
   */
  public boolean startGoal(float forwardMeters, float leftMeters) {
    // ARCore's coordinate convention here matches PointGoalNavigationFragment.startDriving():
    // x = right, z = backwards, hence the negation of both inputs.
    float goalX = -leftMeters;
    float goalZ = -forwardMeters;
    try {
      arCore.detachAnchors();
      arCore.setStartAnchorAtCurrentPose();
      Pose startPose = arCore.getStartPose();
      if (startPose == null) {
        if (listener != null) {
          listener.onError("Still figuring out where I am, please try again in a moment.");
        }
        return false;
      }
      arCore.setTargetAnchor(startPose.compose(Pose.makeTranslation(goalX, 0.0f, goalZ)));
    } catch (NotTrackingException e) {
      if (listener != null) listener.onError("Lost tracking, please try again.");
      return false;
    }

    if (navigationPolicy == null) {
      Model model =
          new Model(
              0,
              Model.CLASS.NAVIGATION,
              Model.TYPE.GOALNAV,
              "navigation.tflite",
              Model.PATH_TYPE.ASSET,
              "networks/navigation.tflite",
              "160x90");
      try {
        navigationPolicy = new Navigation(activity, model, Network.Device.CPU, 1);
      } catch (IOException e) {
        Timber.e(e, "Failed to load navigation policy");
        if (listener != null) listener.onError("Navigation policy could not be loaded.");
        return false;
      }
    }
    navigating = true;
    return true;
  }

  public boolean isNavigating() {
    return navigating;
  }

  /** Stops driving but keeps the ARCore session (and vision/following) running. */
  public void stopGoal() {
    navigating = false;
    arCore.detachAnchors();
    vehicle.stopBot();
  }

  /**
   * Pauses the underlying ARCore session (releasing the camera) between voice conversations,
   * without tearing down this wrapper. Call {@link #resume()} to pick a fresh session back up.
   *
   * <p>This is deliberately different from {@link #close()}: {@code GLSurfaceView.setRenderer()}
   * (called once, inside {@code ArCore}'s constructor) can only ever be called a single time per
   * view instance — calling it again throws {@code IllegalStateException}. Since the fragment's
   * {@code GLSurfaceView} is reused across every voice-session start/stop within the same screen,
   * this class itself (and the one {@code ArCore}/renderer relationship it owns) must be created
   * exactly once per screen and merely paused/resumed thereafter, never recreated — recreating it
   * per session is what used to crash the app the second time voice was re-enabled.
   */
  public void pause() {
    navigating = false;
    arCore.detachAnchors();
    arCore.pause();
  }

  /** Fully tears down the ARCore session; call once when the whole screen is destroyed. */
  public void close() {
    navigating = false;
    arCore.detachAnchors();
    arCore.removeArCoreListener();
    arCore.closeSession();
    visionExecutor.shutdown();
    if (navigationPolicy != null) {
      navigationPolicy.close();
      navigationPolicy = null;
    }
  }

  @Override
  public void onArCoreUpdate(
      NavigationPoses navigationPoses, ImageFrame rgb, CameraIntrinsics cameraIntrinsics, long timestamp) {
    if (navigating) {
      runNavigationStep(navigationPoses, rgb);
      return;
    }

    if (processingVisionFrame || listener == null) return;
    processingVisionFrame = true;
    visionExecutor.execute(
        () -> {
          try {
            Bitmap bitmap = convertRGBFrameToScaledBitmap(rgb, 1.0f);
            listener.onFrame(bitmap);
          } finally {
            processingVisionFrame = false;
          }
        });
  }

  private void runNavigationStep(NavigationPoses navigationPoses, ImageFrame rgb) {
    float goalDistance =
        computeDistance(navigationPoses.getTargetPose(), navigationPoses.getCurrentPose());
    if (goalDistance < GOAL_REACHED_METERS) {
      stopGoal();
      if (listener != null) listener.onGoalReached();
      return;
    }

    float deltaYaw =
        computeDeltaYaw(navigationPoses.getCurrentPose(), navigationPoses.getTargetPose());
    Bitmap bitmap = convertRGBFrameToScaledBitmap(rgb, 160.f / 480.f);
    bitmap = Bitmap.createBitmap(bitmap, 0, 30, 160, 90);
    Control control =
        navigationPolicy.recognizeImage(
            bitmap, goalDistance, (float) Math.sin(deltaYaw), (float) Math.cos(deltaYaw));
    vehicle.setControl(control);
  }

  @Override
  public void onArCoreTrackingFailure(long timestamp, TrackingFailureReason trackingFailureReason) {
    if (navigating) {
      stopGoal();
      if (listener != null) listener.onTrackingLost();
    }
  }

  @Override
  public void onArCoreSessionPaused(long timestamp) {
    if (navigating) stopGoal();
  }

  private static float computeDistance(Pose goalPose, Pose robotPose) {
    float dx = Math.abs(goalPose.tx() - robotPose.tx());
    float dz = Math.abs(goalPose.tz() - robotPose.tz());
    return (float) Math.sqrt(dx * dx + dz * dz);
  }

  private static float computeDeltaYaw(Pose pose, Pose goalPose) {
    float[] forward = new float[] {0.f, 0.f, -1.f};
    float[] forwardRotated = pose.rotateVector(forward);

    float dx = goalPose.tx() - pose.tx();
    float dz = goalPose.tz() - pose.tz();

    double yaw = Math.atan2(forwardRotated[2], forwardRotated[0]) - Math.atan2(dz, dx);
    if (yaw > Math.PI) {
      yaw -= 2 * Math.PI;
    } else if (yaw <= -Math.PI) {
      yaw += 2 * Math.PI;
    }
    return (float) yaw;
  }

  private static Bitmap convertRGBFrameToScaledBitmap(ImageFrame image, float resizeFactor) {
    int previewHeight = image.getHeight();
    int previewWidth = image.getWidth();
    if (previewHeight == 0 || previewWidth == 0 || resizeFactor < 0) {
      throw new IllegalArgumentException();
    }

    int width = (int) (resizeFactor * previewWidth);
    int height = (int) (resizeFactor * previewHeight);

    Bitmap rgbFrameBitmap =
        Bitmap.createBitmap(previewWidth, previewHeight, Bitmap.Config.ARGB_8888);
    int[] rgbBytes = new int[previewWidth * previewHeight];

    convertYuv420ToArgb8888(
        image.getYuvBytes()[0],
        image.getYuvBytes()[1],
        image.getYuvBytes()[2],
        previewWidth,
        previewHeight,
        image.getYRowStride(),
        image.getUvRowStride(),
        image.getUvPixelStride(),
        rgbBytes);

    rgbFrameBitmap.setPixels(rgbBytes, 0, previewWidth, 0, 0, previewWidth, previewHeight);
    return Bitmap.createScaledBitmap(rgbFrameBitmap, width, height, true);
  }

  private static void convertYuv420ToArgb8888(
      byte[] yData,
      byte[] uData,
      byte[] vData,
      int width,
      int height,
      int yRowStride,
      int uvRowStride,
      int uvPixelStride,
      int[] out) {
    int yp = 0;
    for (int j = 0; j < height; j++) {
      int pY = yRowStride * j;
      int pUV = uvRowStride * (j >> 1);
      for (int i = 0; i < width; i++) {
        int uvOffset = pUV + (i >> 1) * uvPixelStride;
        out[yp++] = yuvToRgb(0xff & yData[pY + i], 0xff & uData[uvOffset], 0xff & vData[uvOffset]);
      }
    }
  }

  private static int yuvToRgb(int y, int u, int v) {
    y = Math.max((y - 16), 0);
    u -= 128;
    v -= 128;

    int y1192 = 1192 * y;
    int r = (y1192 + 1634 * v);
    int g = (y1192 - 833 * v - 400 * u);
    int b = (y1192 + 2066 * u);

    r = r > kMaxChannelValue ? kMaxChannelValue : (Math.max(r, 0));
    g = g > kMaxChannelValue ? kMaxChannelValue : (Math.max(g, 0));
    b = b > kMaxChannelValue ? kMaxChannelValue : (Math.max(b, 0));

    return 0xff000000 | ((r << 6) & 0xff0000) | ((g >> 2) & 0xff00) | ((b >> 10) & 0xff);
  }
}
