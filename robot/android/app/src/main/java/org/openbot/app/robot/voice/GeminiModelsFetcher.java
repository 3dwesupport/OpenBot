package org.openbot.app.robot.voice;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import timber.log.Timber;

/**
 * Looks up which Gemini models a given API key can actually use for the Live API, by calling
 * ListModels and keeping only entries whose {@code supportedGenerationMethods} include
 * {@code bidiGenerateContent}. Live models are added/retired fairly often, so the app asks Google
 * directly instead of relying on a hardcoded, quickly-stale model list.
 */
public class GeminiModelsFetcher {

  private static final String LIST_MODELS_URL = "https://generativelanguage.googleapis.com/v1beta/models";
  private static final String LIVE_METHOD = "bidiGenerateContent";
  private static final int PAGE_SIZE = 1000;
  private static final int MAX_PAGES = 10; // safety bound against a runaway pagination loop

  private static final OkHttpClient httpClient =
      new OkHttpClient.Builder()
          .connectTimeout(10, TimeUnit.SECONDS)
          .readTimeout(10, TimeUnit.SECONDS)
          .build();

  public static class ModelInfo {
    public final String name; // e.g. "models/gemini-3.1-flash-live-preview"
    public final String displayName;

    public ModelInfo(String name, String displayName) {
      this.name = name;
      this.displayName = displayName;
    }
  }

  public interface Callback {
    /** Called on a background thread; the caller is responsible for posting to the UI thread. */
    void onSuccess(List<ModelInfo> liveModels);

    /** Called on a background thread. */
    void onError(String message);
  }

  private GeminiModelsFetcher() {}

  /** Performs a blocking network call; must not be invoked on the main thread. */
  public static void fetchLiveModels(String apiKey, Callback callback) {
    List<ModelInfo> result = new ArrayList<>();
    String pageToken = null;
    try {
      for (int page = 0; page < MAX_PAGES; page++) {
        String url =
            LIST_MODELS_URL
                + "?key="
                + apiKey
                + "&pageSize="
                + PAGE_SIZE
                + (pageToken != null ? "&pageToken=" + pageToken : "");
        Request request = new Request.Builder().url(url).build();

        try (Response response = httpClient.newCall(request).execute()) {
          ResponseBody body = response.body();
          String bodyText = body != null ? body.string() : "";
          if (!response.isSuccessful()) {
            callback.onError(response.code() + ": " + bodyText);
            return;
          }

          JSONObject root = new JSONObject(bodyText);
          JSONArray models = root.optJSONArray("models");
          if (models != null) {
            for (int i = 0; i < models.length(); i++) {
              JSONObject model = models.getJSONObject(i);
              if (supportsLive(model)) {
                String name = model.optString("name", "");
                if (!name.isEmpty()) {
                  result.add(new ModelInfo(name, model.optString("displayName", name)));
                }
              }
            }
          }

          pageToken = root.optString("nextPageToken", "");
          if (pageToken.isEmpty()) break;
        }
      }
      callback.onSuccess(result);
    } catch (IOException | JSONException e) {
      Timber.e(e, "Failed to fetch Gemini model list");
      callback.onError(e.getMessage() != null ? e.getMessage() : "Network error");
    }
  }

  private static boolean supportsLive(JSONObject model) {
    JSONArray methods = model.optJSONArray("supportedGenerationMethods");
    if (methods == null) return false;
    for (int i = 0; i < methods.length(); i++) {
      if (LIVE_METHOD.equals(methods.optString(i))) return true;
    }
    return false;
  }
}
