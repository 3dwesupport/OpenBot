package org.openbot.app.robot.voice;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Looper;
import androidx.core.content.ContextCompat;
import java.io.IOException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONException;
import org.json.JSONObject;
import timber.log.Timber;

/**
 * Looks up the current weather at the robot's last-known location using Open-Meteo
 * (open-meteo.com), which is free and requires no API key. All work happens on a background
 * thread; the result is delivered via {@link Callback}, which may be invoked from that thread.
 */
public class WeatherService {

  public interface Callback {
    void onResult(JSONObject weather);

    void onError(String message);
  }

  private static final String FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
  private static final long LOCATION_TIMEOUT_MS = 5000;

  private static final OkHttpClient httpClient =
      new OkHttpClient.Builder()
          .connectTimeout(10, TimeUnit.SECONDS)
          .readTimeout(10, TimeUnit.SECONDS)
          .build();

  private final Context context;

  public WeatherService(Context context) {
    this.context = context.getApplicationContext();
  }

  /** Caller is responsible for checking/requesting location permission before calling this. */
  public void fetchCurrentWeather(Callback callback) {
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
            != PackageManager.PERMISSION_GRANTED
        && ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION)
            != PackageManager.PERMISSION_GRANTED) {
      callback.onError("Location permission is required to check the weather.");
      return;
    }
    new Thread(() -> fetchLocationAndWeather(callback), "WeatherService").start();
  }

  @SuppressLint("MissingPermission") // permission already checked in fetchCurrentWeather()
  private void fetchLocationAndWeather(Callback callback) {
    LocationManager locationManager =
        (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    if (locationManager == null) {
      callback.onError("Location service is unavailable.");
      return;
    }

    Location location = getBestLastKnownLocation(locationManager);
    if (location != null) {
      requestForecast(location, callback);
      return;
    }

    // No cached fix yet: ask for a single fresh update with a short timeout.
    String provider = bestProvider(locationManager);
    if (provider == null) {
      callback.onError("No location provider is available.");
      return;
    }

    CountDownLatch latch = new CountDownLatch(1);
    Location[] result = new Location[1];
    LocationListener listener =
        new LocationListener() {
          @Override
          public void onLocationChanged(Location loc) {
            result[0] = loc;
            latch.countDown();
          }

          @Override
          public void onProviderDisabled(String provider) {}

          @Override
          public void onProviderEnabled(String provider) {}

          @Override
          public void onStatusChanged(String provider, int status, Bundle extras) {}
        };

    try {
      locationManager.requestLocationUpdates(provider, 0, 0, listener, Looper.getMainLooper());
      latch.await(LOCATION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    } finally {
      locationManager.removeUpdates(listener);
    }

    if (result[0] != null) {
      requestForecast(result[0], callback);
    } else {
      callback.onError("Could not determine the robot's location.");
    }
  }

  private Location getBestLastKnownLocation(LocationManager locationManager) {
    Location best = null;
    for (String provider : locationManager.getAllProviders()) {
      try {
        Location candidate = locationManager.getLastKnownLocation(provider);
        if (candidate != null && (best == null || candidate.getTime() > best.getTime())) {
          best = candidate;
        }
      } catch (SecurityException ignored) {
        // permission was already checked upfront; be defensive anyway
      }
    }
    return best;
  }

  private String bestProvider(LocationManager locationManager) {
    if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
      return LocationManager.GPS_PROVIDER;
    }
    if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
      return LocationManager.NETWORK_PROVIDER;
    }
    return null;
  }

  private void requestForecast(Location location, Callback callback) {
    String url =
        FORECAST_URL
            + "?latitude="
            + location.getLatitude()
            + "&longitude="
            + location.getLongitude()
            + "&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh";
    Request request = new Request.Builder().url(url).build();
    try (Response response = httpClient.newCall(request).execute()) {
      ResponseBody body = response.body();
      String bodyText = body != null ? body.string() : "";
      if (!response.isSuccessful()) {
        callback.onError("Weather service error: " + response.code());
        return;
      }
      JSONObject root = new JSONObject(bodyText);
      JSONObject current = root.optJSONObject("current_weather");
      if (current == null) {
        callback.onError("Weather data was unavailable.");
        return;
      }
      JSONObject result = new JSONObject();
      result.put("temperature_celsius", current.optDouble("temperature"));
      result.put("windspeed_kmh", current.optDouble("windspeed"));
      result.put("condition", describeWeatherCode(current.optInt("weathercode")));
      callback.onResult(result);
    } catch (IOException | JSONException e) {
      Timber.e(e, "Failed to fetch weather");
      callback.onError(e.getMessage() != null ? e.getMessage() : "Network error");
    }
  }

  /** WMO weather codes, per Open-Meteo's documentation. */
  private static String describeWeatherCode(int code) {
    switch (code) {
      case 0:
        return "clear sky";
      case 1:
      case 2:
      case 3:
        return "partly cloudy";
      case 45:
      case 48:
        return "fog";
      case 51:
      case 53:
      case 55:
        return "drizzle";
      case 56:
      case 57:
        return "freezing drizzle";
      case 61:
      case 63:
      case 65:
        return "rain";
      case 66:
      case 67:
        return "freezing rain";
      case 71:
      case 73:
      case 75:
        return "snow";
      case 77:
        return "snow grains";
      case 80:
      case 81:
      case 82:
        return "rain showers";
      case 85:
      case 86:
        return "snow showers";
      case 95:
        return "thunderstorm";
      case 96:
      case 99:
        return "thunderstorm with hail";
      default:
        return "unknown";
    }
  }
}
