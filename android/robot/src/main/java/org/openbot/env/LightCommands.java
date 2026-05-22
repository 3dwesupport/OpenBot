package org.openbot.env;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONException;
import org.json.JSONObject;
import org.openbot.common.ControlsFragment;
import org.openbot.utils.ConnectionUtils;
import org.openbot.utils.Constants;
import org.openbot.vehicle.Vehicle;
import timber.log.Timber;

/**
 * Handles LED brightness commands from the phone controller. Uses the same logic as {@link
 * org.openbot.robot.RobotInfoFragment}: {@code vehicle.sendLightIntensity(value / 100, value /
 * 100)}.
 */
public final class LightCommands {

  private static final Pattern BRIGHTNESS_VALUE =
      Pattern.compile("^LIGHT:(\\d+(?:\\.\\d+)?)\\s*$", Pattern.CASE_INSENSITIVE);

  private static int lastBroadcastPercent = -1;

  private LightCommands() {}

  /**
   * @return true if the message set LED brightness on the vehicle
   */
  public static boolean setVehicleBrightness(String message, Vehicle vehicle) {
    if (message == null || vehicle == null) {
      return false;
    }
    String trimmed = message.trim();
    if (trimmed.isEmpty()) {
      return false;
    }

    Matcher brightness = BRIGHTNESS_VALUE.matcher(trimmed);
    if (brightness.matches()) {
      float level = Float.parseFloat(brightness.group(1));
      int percent = Math.round(Math.max(0f, Math.min(100f, level)));
      applyPercentSliderValue(vehicle, percent);
      Timber.d("Light command: %s", trimmed);
      return true;
    }

    if (trimmed.contains("LED_ON") || trimmed.contains(Constants.CMD_LED_ON)) {
      applyPercentSliderValue(vehicle, 100);
      return true;
    }
    if (trimmed.contains("LED_OFF") || trimmed.contains(Constants.CMD_LED_OFF)) {
      applyPercentSliderValue(vehicle, 0);
      return true;
    }

    try {
      JSONObject event = new JSONObject(trimmed);
      if (event.has("ledCmd")) {
        JSONObject ledValue = event.getJSONObject("ledCmd");
        float front = ControlsFragment.parseMotorJsonField(ledValue, "f");
        float back = ControlsFragment.parseMotorJsonField(ledValue, "b");
        int percent =
            (front > 1f || back > 1f)
                ? Math.round((front + back) / 2f)
                : Math.round(((front + back) / 2f) * 100f);
        applyPercentSliderValue(vehicle, percent);
        return true;
      }
      if (event.has("command")) {
        String command = event.getString("command");
        if (Constants.CMD_LED_ON.equals(command)) {
          applyPercentSliderValue(vehicle, 100);
          return true;
        }
        if (Constants.CMD_LED_OFF.equals(command)) {
          applyPercentSliderValue(vehicle, 0);
          return true;
        }
        if (Constants.CMD_LED_BRIGHTNESS.equals(command) && event.has("value")) {
          int percent;
          try {
            percent = (int) Math.round(event.getDouble("value"));
          } catch (JSONException e) {
            percent = event.optInt("value", 0);
          }
          applyPercentSliderValue(vehicle, percent);
          return true;
        }
      }
    } catch (JSONException ignored) {
      // Not JSON
    }
    return false;
  }

  /** Robot Info slider: 0–100 → {@code sendLightIntensity(percent/100, percent/100)}. */
  public static void applyPercentSliderValue(Vehicle vehicle, int sliderValue0To100) {
    int percent = Math.max(0, Math.min(100, sliderValue0To100));
    float fraction = percent / 100f;
    vehicle.sendLightIntensity(fraction, fraction);
    broadcastBrightnessToController(percent);
  }

  /** Keeps the controller lights slider in sync (same pattern as indicator status). */
  public static void broadcastBrightnessToController(int percent0To100) {
    int percent = Math.max(0, Math.min(100, percent0To100));
    if (percent == lastBroadcastPercent) {
      return;
    }
    lastBroadcastPercent = percent;
    BotToControllerEventBus.emitEvent(
        ConnectionUtils.createStatus(Constants.STATUS_LED_BRIGHTNESS, String.valueOf(percent)));
  }
}
