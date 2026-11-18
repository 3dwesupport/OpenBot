package org.openbot.app.robot.voice;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.openbot.app.robot.utils.Enums;
import org.openbot.app.robot.vehicle.Vehicle;
import timber.log.Timber;

/**
 * Executes the robot-control functions that are exposed to Gemini Live as function-calling tools.
 * The available actions mirror {@link org.openbot.app.robot.projects.BotFunctions}, the equivalent bridge
 * used by the Blockly playground, so a voice command and a Blockly block result in the same
 * underlying {@link Vehicle} calls.
 *
 * <p>Every drive action is bounded by a safety watchdog: if no follow-up command (including an
 * explicit stop) arrives within {@link #SAFETY_TIMEOUT_MS}, the robot is stopped automatically.
 * This protects against the robot continuing to move if the voice session drops mid-command.
 */
public class RobotToolExecutor {

  private static final int MAX_DURATION_MS = 6000;
  private static final long SAFETY_TIMEOUT_MS = 4000;
  private static final int DEFAULT_SPEED_PERCENT = 60;
  private static final int DEFAULT_TURN_MS = 1500;
  private static final int DEFAULT_FLASH_COUNT = 3;
  private static final int DEFAULT_FLASH_INTERVAL_MS = 250;

  /** Reports a human-readable description of an executed action, for the on-screen transcript. */
  public interface ActionListener {
    void onActionExecuted(String description);
  }

  /**
   * Delegates the camera/ARCore-backed tools (following a person, driving a specific distance)
   * to the Fragment, since only it can own the camera/ARCore lifecycle. May be null if the vision
   * subsystem isn't available (e.g. camera permission denied); in that case those tools report
   * an error instead of silently doing nothing.
   */
  public interface VisionController {
    void startFollowingPerson();

    void stopFollowingPerson();

    /** Kicks off an async drive-to-goal maneuver; completion is reported out-of-band. */
    void moveDistance(float forwardMeters, float leftMeters);
  }

  /** Delegates the location-based weather lookup, since only the Fragment can request the
   * location permission and hold a WeatherService instance. May be null if unavailable. */
  public interface EnvironmentController {
    void fetchWeather(WeatherService.Callback callback);
  }

  /** Sends a deferred tool response for a function whose result isn't ready synchronously
   * (e.g. get_weather, which needs a location fix and a network round-trip). */
  public interface ToolResponseSender {
    void sendToolResponse(String callId, String name, JSONObject response);
  }

  private final Vehicle vehicle;
  private final ActionListener actionListener;
  private final VisionController visionController;
  private final EnvironmentController environmentController;
  private final ToolResponseSender toolResponseSender;
  private final Handler handler = new Handler(Looper.getMainLooper());
  private Runnable pendingSafetyStop;
  private Runnable pendingDurationStop;

  public RobotToolExecutor(
      Vehicle vehicle,
      ActionListener actionListener,
      VisionController visionController,
      EnvironmentController environmentController,
      ToolResponseSender toolResponseSender) {
    this.vehicle = vehicle;
    this.actionListener = actionListener;
    this.visionController = visionController;
    this.environmentController = environmentController;
    this.toolResponseSender = toolResponseSender;
  }

  /** Builds the Gemini `functionDeclarations` schema for every tool this executor supports. */
  public static JSONArray buildFunctionDeclarations() {
    JSONArray declarations = new JSONArray();
    try {
      declarations.put(
          declaration(
              "move_forward",
              "Drives the robot straight forward.",
              speedAndDurationParams()));
      declarations.put(
          declaration(
              "move_backward",
              "Drives the robot straight backward.",
              speedAndDurationParams()));
      declarations.put(
          declaration(
              "turn_left",
              "Pivots the robot in place to the left (counter-clockwise).",
              speedAndDurationParams()));
      declarations.put(
          declaration(
              "turn_right",
              "Pivots the robot in place to the right (clockwise).",
              speedAndDurationParams()));
      declarations.put(
          declaration(
              "turn_around",
              "Spins the robot roughly 180 degrees in place, then stops automatically.",
              speedOnlyParams()));
      declarations.put(
          declaration("stop", "Immediately stops all robot movement.", emptyParams()));
      declarations.put(
          declaration(
              "set_speed_mode",
              "Sets the overall drive speed preset used for subsequent movement commands.",
              new JSONObject()
                  .put("type", "OBJECT")
                  .put(
                      "properties",
                      new JSONObject()
                          .put(
                              "mode",
                              new JSONObject()
                                  .put("type", "STRING")
                                  .put("enum", new JSONArray().put("slow").put("normal").put("fast"))
                                  .put("description", "Speed preset.")))
                  .put("required", new JSONArray().put("mode"))));
      declarations.put(
          declaration(
              "set_lights",
              "Turns the robot's headlights fully on or off.",
              new JSONObject()
                  .put("type", "OBJECT")
                  .put(
                      "properties",
                      new JSONObject()
                          .put(
                              "on",
                              new JSONObject()
                                  .put("type", "BOOLEAN")
                                  .put("description", "true to turn lights on, false to turn off.")))
                  .put("required", new JSONArray().put("on"))));
      declarations.put(
          declaration(
              "flash_lights",
              "Flashes/blinks the robot's lights a number of times, useful for getting attention"
                  + " or signaling.",
              new JSONObject()
                  .put("type", "OBJECT")
                  .put(
                      "properties",
                      new JSONObject()
                          .put(
                              "count",
                              new JSONObject()
                                  .put("type", "INTEGER")
                                  .put("description", "Number of flashes, defaults to 3.")))));
      declarations.put(
          declaration(
              "set_turn_signal",
              "Sets the left/right turn-signal indicator lights.",
              new JSONObject()
                  .put("type", "OBJECT")
                  .put(
                      "properties",
                      new JSONObject()
                          .put(
                              "direction",
                              new JSONObject()
                                  .put("type", "STRING")
                                  .put("enum", new JSONArray().put("left").put("right").put("off"))
                                  .put("description", "Which indicator to activate.")))
                  .put("required", new JSONArray().put("direction"))));
      declarations.put(
          declaration(
              "get_robot_status",
              "Reads back the robot's current sensor status: battery voltage, drive speed and,"
                  + " if available, sonar distance to the nearest obstacle in front.",
              emptyParams()));
      declarations.put(
          declaration(
              "follow_person",
              "Uses the camera to find a person and drive toward/track them continuously, until"
                  + " stop_following or stop is called.",
              emptyParams()));
      declarations.put(
          declaration(
              "stop_following",
              "Stops following a person (but does not otherwise stop the robot).",
              emptyParams()));
      declarations.put(
          declaration(
              "move_distance",
              "Precisely drives a specific distance in meters using visual-inertial navigation,"
                  + " e.g. \"move 1 meter forward\" or \"go 2 meters forward and 1 meter left\"."
                  + " More accurate than move_forward for a requested distance. Takes a while to"
                  + " complete; the robot will announce when it arrives.",
              new JSONObject()
                  .put("type", "OBJECT")
                  .put(
                      "properties",
                      new JSONObject()
                          .put(
                              "forward_m",
                              new JSONObject()
                                  .put("type", "NUMBER")
                                  .put(
                                      "description",
                                      "Meters to drive forward; negative means backward."))
                          .put(
                              "left_m",
                              new JSONObject()
                                  .put("type", "NUMBER")
                                  .put(
                                      "description",
                                      "Meters to drive left; negative means right. Defaults to"
                                          + " 0.")))
                  .put("required", new JSONArray().put("forward_m"))));
      declarations.put(
          declaration(
              "get_current_time",
              "Reads back the current date and time (device local time).",
              emptyParams()));
      declarations.put(
          declaration(
              "get_weather",
              "Looks up the current weather conditions at the robot's location (temperature,"
                  + " wind, and general conditions). Requires location access; if unavailable,"
                  + " say so instead of guessing.",
              emptyParams()));
    } catch (JSONException e) {
      Timber.e(e, "Failed to build Gemini tool declarations");
    }
    return declarations;
  }

  /**
   * Executes one function call and returns the JSON `response` payload to send back to Gemini,
   * or {@code null} if the response will be sent later via {@link ToolResponseSender} (currently
   * only get_weather, which needs a location fix and a network round-trip).
   */
  public JSONObject execute(String callId, String name, JSONObject args) {
    if (args == null) args = new JSONObject();
    try {
      switch (name) {
        case "move_forward":
          return drive(args, "Moving forward", 1, 1);
        case "move_backward":
          return drive(args, "Moving backward", -1, -1);
        case "turn_left":
          return drive(args, "Turning left", 0, 1);
        case "turn_right":
          return drive(args, "Turning right", 1, 0);
        case "turn_around":
          return turnAround(args);
        case "stop":
          return stop();
        case "set_speed_mode":
          return setSpeedMode(args.optString("mode", "normal"));
        case "set_lights":
          return setLights(args.optBoolean("on", true));
        case "flash_lights":
          return flashLights(args.optInt("count", DEFAULT_FLASH_COUNT));
        case "set_turn_signal":
          return setTurnSignal(args.optString("direction", "off"));
        case "get_robot_status":
          return getRobotStatus();
        case "follow_person":
          return followPerson();
        case "stop_following":
          return stopFollowing();
        case "move_distance":
          return moveDistance(args);
        case "get_current_time":
          return getCurrentTime();
        case "get_weather":
          return getWeather(callId);
        default:
          return error("Unknown function: " + name);
      }
    } catch (Exception e) {
      Timber.e(e, "Error executing voice tool %s", name);
      return error(e.getMessage() != null ? e.getMessage() : "execution failed");
    }
  }

  /** Called when the voice session ends, to guarantee the robot does not keep moving. */
  public void shutdown() {
    cancelPending();
    vehicle.stopBot();
  }

  // region actions

  private JSONObject drive(JSONObject args, String description, int leftSign, int rightSign)
      throws JSONException {
    float speed = clampSpeed(args.optInt("speed_percent", DEFAULT_SPEED_PERCENT)) / 100f;
    int durationMs = clampDuration(args.optInt("duration_ms", 0));

    vehicle.setControl(leftSign * speed, rightSign * speed);
    armSafetyStop();
    if (durationMs > 0) {
      armDurationStop(durationMs);
    }

    report(description + " at " + (int) (speed * 100) + "% speed");
    return ok();
  }

  private JSONObject turnAround(JSONObject args) throws JSONException {
    float speed = clampSpeed(args.optInt("speed_percent", DEFAULT_SPEED_PERCENT)) / 100f;
    vehicle.setControl(speed, -speed);
    armSafetyStop();
    armDurationStop(DEFAULT_TURN_MS);
    report("Turning around");
    return ok();
  }

  private JSONObject stop() throws JSONException {
    cancelPending();
    vehicle.stopBot();
    report("Stopped");
    return ok();
  }

  private JSONObject setSpeedMode(String mode) throws JSONException {
    Enums.SpeedMode speedMode;
    switch (mode.toLowerCase()) {
      case "slow":
        speedMode = Enums.SpeedMode.SLOW;
        break;
      case "fast":
        speedMode = Enums.SpeedMode.FAST;
        break;
      default:
        speedMode = Enums.SpeedMode.NORMAL;
        break;
    }
    vehicle.setSpeedMultiplier(speedMode.getValue());
    report("Speed set to " + mode);
    return ok();
  }

  private JSONObject setLights(boolean on) throws JSONException {
    vehicle.sendLightIntensity(on ? 1f : 0f, on ? 1f : 0f);
    report(on ? "Lights on" : "Lights off");
    return ok();
  }

  private JSONObject flashLights(int count) throws JSONException {
    int flashes = Math.max(1, Math.min(count, 10));
    for (int i = 0; i < flashes; i++) {
      int onDelay = i * 2 * DEFAULT_FLASH_INTERVAL_MS;
      int offDelay = onDelay + DEFAULT_FLASH_INTERVAL_MS;
      handler.postDelayed(() -> vehicle.sendLightIntensity(1f, 1f), onDelay);
      handler.postDelayed(() -> vehicle.sendLightIntensity(0f, 0f), offDelay);
    }
    report("Flashing lights " + flashes + " times");
    return ok();
  }

  private JSONObject setTurnSignal(String direction) throws JSONException {
    int value;
    switch (direction.toLowerCase()) {
      case "left":
        value = -1;
        break;
      case "right":
        value = 1;
        break;
      default:
        value = 0;
        break;
    }
    vehicle.setIndicator(value);
    report("Turn signal: " + direction);
    return ok();
  }

  private JSONObject getRobotStatus() throws JSONException {
    JSONObject status = new JSONObject();
    status.put("battery_voltage", vehicle.getBatteryVoltage());
    status.put("drive_gear", vehicle.getDriveGear());
    status.put("speed_percent", vehicle.getSpeedPercent());
    if (vehicle.isHasSonar()) {
      status.put("sonar_distance_cm", vehicle.getSonarReading());
    }
    report("Reporting robot status");
    JSONObject response = new JSONObject();
    response.put("status", "ok");
    response.put("result", status);
    return response;
  }

  private JSONObject followPerson() throws JSONException {
    if (visionController == null) return error("Camera isn't available for following.");
    cancelPending();
    visionController.startFollowingPerson();
    report("Following person");
    return ok();
  }

  private JSONObject stopFollowing() throws JSONException {
    if (visionController == null) return error("Camera isn't available for following.");
    visionController.stopFollowingPerson();
    report("Stopped following");
    return ok();
  }

  private JSONObject moveDistance(JSONObject args) throws JSONException {
    if (visionController == null) return error("Precise navigation isn't available right now.");
    float forward = (float) args.optDouble("forward_m", 0);
    float left = (float) args.optDouble("left_m", 0);
    cancelPending();
    visionController.moveDistance(forward, left);
    report(String.format("Moving %.1fm forward, %.1fm left", forward, left));
    return ok();
  }

  private JSONObject getCurrentTime() throws JSONException {
    java.text.SimpleDateFormat format =
        new java.text.SimpleDateFormat("EEEE, MMM d, yyyy h:mm a", java.util.Locale.getDefault());
    JSONObject result = new JSONObject();
    result.put("current_time", format.format(new java.util.Date()));
    result.put("timezone", java.util.TimeZone.getDefault().getID());
    report("Checked the time");
    JSONObject response = new JSONObject();
    response.put("status", "ok");
    response.put("result", result);
    return response;
  }

  /** Returns null: the response is sent later via {@link #toolResponseSender} once ready. */
  private JSONObject getWeather(String callId) {
    if (environmentController == null || toolResponseSender == null) {
      return error("Weather isn't available right now.");
    }
    report("Checking the weather");
    environmentController.fetchWeather(
        new WeatherService.Callback() {
          @Override
          public void onResult(JSONObject weather) {
            JSONObject response;
            try {
              response = new JSONObject().put("status", "ok").put("result", weather);
            } catch (JSONException e) {
              response = error("Failed to read weather data");
            }
            toolResponseSender.sendToolResponse(callId, "get_weather", response);
          }

          @Override
          public void onError(String message) {
            toolResponseSender.sendToolResponse(callId, "get_weather", error(message));
          }
        });
    return null;
  }

  // endregion

  private void armSafetyStop() {
    cancelSafetyStop();
    pendingSafetyStop = vehicle::stopBot;
    handler.postDelayed(pendingSafetyStop, SAFETY_TIMEOUT_MS);
  }

  private void armDurationStop(int durationMs) {
    cancelDurationStop();
    pendingDurationStop = vehicle::stopBot;
    handler.postDelayed(pendingDurationStop, durationMs);
  }

  private void cancelSafetyStop() {
    if (pendingSafetyStop != null) {
      handler.removeCallbacks(pendingSafetyStop);
      pendingSafetyStop = null;
    }
  }

  private void cancelDurationStop() {
    if (pendingDurationStop != null) {
      handler.removeCallbacks(pendingDurationStop);
      pendingDurationStop = null;
    }
  }

  private void cancelPending() {
    cancelSafetyStop();
    cancelDurationStop();
  }

  private int clampSpeed(int speedPercent) {
    return Math.max(10, Math.min(speedPercent, 100));
  }

  private int clampDuration(int durationMs) {
    return Math.max(0, Math.min(durationMs, MAX_DURATION_MS));
  }

  private void report(String description) {
    if (actionListener != null) actionListener.onActionExecuted(description);
  }

  private static JSONObject ok() throws JSONException {
    return new JSONObject().put("status", "ok");
  }

  private static JSONObject error(String message) {
    try {
      return new JSONObject().put("status", "error").put("message", message);
    } catch (JSONException e) {
      return new JSONObject();
    }
  }

  private static JSONObject declaration(String name, String description, JSONObject parameters)
      throws JSONException {
    return new JSONObject()
        .put("name", name)
        .put("description", description)
        .put("parameters", parameters);
  }

  private static JSONObject speedAndDurationParams() throws JSONException {
    return new JSONObject()
        .put("type", "OBJECT")
        .put(
            "properties",
            new JSONObject()
                .put(
                    "speed_percent",
                    new JSONObject()
                        .put("type", "INTEGER")
                        .put(
                            "description",
                            "Speed from 10-100 percent of max speed. Defaults to 60 if omitted."))
                .put(
                    "duration_ms",
                    new JSONObject()
                        .put("type", "INTEGER")
                        .put(
                            "description",
                            "Optional: how long to move in milliseconds before auto-stopping."
                                + " If omitted, the robot keeps moving until a stop command is"
                                + " issued (capped at a few seconds for safety).")));
  }

  private static JSONObject speedOnlyParams() throws JSONException {
    return new JSONObject()
        .put("type", "OBJECT")
        .put(
            "properties",
            new JSONObject()
                .put(
                    "speed_percent",
                    new JSONObject()
                        .put("type", "INTEGER")
                        .put("description", "Speed from 10-100 percent. Defaults to 60.")));
  }

  private static JSONObject emptyParams() throws JSONException {
    return new JSONObject().put("type", "OBJECT").put("properties", new JSONObject());
  }
}
