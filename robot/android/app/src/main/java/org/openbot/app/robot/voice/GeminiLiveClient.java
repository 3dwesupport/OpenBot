package org.openbot.app.robot.voice;

import android.util.Base64;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import timber.log.Timber;

/**
 * Thin client for the Gemini Live API (BidiGenerateContent over WebSocket). Speaks the
 * setup/realtimeInput/toolResponse client messages and parses the setupComplete/serverContent
 * /toolCall server messages. All {@link Listener} callbacks arrive on OkHttp's WebSocket thread,
 * not the main thread.
 */
public class GeminiLiveClient {

  /**
   * Fallback Gemini Live model, used only until the Settings screen's model list finishes
   * fetching the models this API key actually has access to. Live models are updated/retired
   * often, so this is intentionally just a reasonable seed value, not a hardcoded source of truth.
   */
  public static final String DEFAULT_MODEL = "models/gemini-3.1-flash-live-preview";

  private static final String ENDPOINT =
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
  private static final String INPUT_MIME_TYPE = "audio/pcm;rate=16000";
  private static final String VIDEO_MIME_TYPE = "image/jpeg";
  /** The API only processes realtime video at up to this rate; sending faster wastes bandwidth. */
  public static final long MAX_VIDEO_FRAME_INTERVAL_MS = 1000;

  public interface Listener {
    void onSetupComplete();

    void onInputTranscript(String text);

    void onOutputTranscript(String text);

    void onAudioChunk(byte[] pcm24);

    void onToolCall(String callId, String name, JSONObject args);

    void onTurnComplete();

    void onInterrupted();

    void onError(String message);

    /** The session ended. {@code code} is 1000 for a normal, expected close. */
    void onClosed(int code, String reason);

    /**
     * The server will force-close the underlying connection in about {@code timeLeftMillis}
     * (the Live API caps a single connection to roughly 10 minutes). The client should
     * reconnect proactively using {@link #getResumptionHandle()} so the conversation continues
     * without the user noticing.
     */
    void onGoAway(long timeLeftMillis);
  }

  private final OkHttpClient httpClient;
  private final Listener listener;
  private volatile WebSocket webSocket;
  private volatile boolean setupComplete = false;
  private volatile String resumptionHandle;

  public GeminiLiveClient(Listener listener) {
    this.listener = listener;
    this.httpClient =
        new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS) // streaming connection, no read timeout
            .pingInterval(20, TimeUnit.SECONDS)
            .build();
  }

  public boolean isSetupComplete() {
    return setupComplete;
  }

  /**
   * A handle that can resume this conversation (including everything the model has seen/said
   * so far) on a fresh connection, valid for about 2 hours after the connection closes. Null
   * until the server has sent at least one {@code sessionResumptionUpdate}.
   */
  @Nullable
  public String getResumptionHandle() {
    return resumptionHandle;
  }

  /** Forgets any resumption handle, so the next {@link #connect} starts a brand new session. */
  public void clearResumptionHandle() {
    resumptionHandle = null;
  }

  public void connect(
      String apiKey, String model, String systemInstruction, JSONArray functionDeclarations) {
    setupComplete = false;
    Request request = new Request.Builder().url(ENDPOINT + "?key=" + apiKey).build();
    webSocket = httpClient.newWebSocket(request, new SocketListener(model, systemInstruction, functionDeclarations));
  }

  public void disconnect() {
    if (webSocket != null) {
      webSocket.close(1000, "client_closed");
      webSocket = null;
    }
    setupComplete = false;
  }

  /** Streams one chunk of 16kHz mono 16-bit PCM microphone audio to the model. */
  public void sendAudioChunk(byte[] pcm16) {
    if (webSocket == null || !setupComplete) return;
    try {
      // "audio" is the current field; the older "mediaChunks" array is deprecated and is
      // silently ignored by the API, which previously made every mic chunk sent here a no-op.
      JSONObject audio = new JSONObject();
      audio.put("mimeType", INPUT_MIME_TYPE);
      audio.put("data", Base64.encodeToString(pcm16, Base64.NO_WRAP));

      JSONObject realtimeInput = new JSONObject();
      realtimeInput.put("audio", audio);

      JSONObject message = new JSONObject();
      message.put("realtimeInput", realtimeInput);
      webSocket.send(message.toString());
    } catch (JSONException e) {
      Timber.e(e, "Failed to encode audio chunk");
    }
  }

  /**
   * Sends one JPEG still frame as visual context (e.g. a periodic camera snapshot). The API
   * only processes video at up to 1 fps, so callers should throttle to roughly
   * {@link #MAX_VIDEO_FRAME_INTERVAL_MS} between calls rather than sending continuously.
   */
  public void sendVideoFrame(byte[] jpegBytes) {
    if (webSocket == null || !setupComplete) return;
    try {
      JSONObject video = new JSONObject();
      video.put("mimeType", VIDEO_MIME_TYPE);
      video.put("data", Base64.encodeToString(jpegBytes, Base64.NO_WRAP));

      JSONObject realtimeInput = new JSONObject();
      realtimeInput.put("video", video);

      JSONObject message = new JSONObject();
      message.put("realtimeInput", realtimeInput);
      webSocket.send(message.toString());
    } catch (JSONException e) {
      Timber.e(e, "Failed to encode video frame");
    }
  }

  /** Sends a typed text turn from the user (fallback / accessibility input path). */
  public void sendText(String text) {
    if (webSocket == null || !setupComplete) return;
    try {
      JSONObject part = new JSONObject().put("text", text);
      JSONObject content =
          new JSONObject().put("role", "user").put("parts", new JSONArray().put(part));
      JSONObject clientContent =
          new JSONObject()
              .put("turns", new JSONArray().put(content))
              .put("turnComplete", true);
      JSONObject message = new JSONObject().put("clientContent", clientContent);
      webSocket.send(message.toString());
    } catch (JSONException e) {
      Timber.e(e, "Failed to encode text turn");
    }
  }

  /** Replies to a model function call so the conversation can continue. */
  public void sendToolResponse(String callId, String name, JSONObject response) {
    if (webSocket == null) return;
    try {
      JSONObject functionResponse = new JSONObject();
      functionResponse.put("id", callId);
      functionResponse.put("name", name);
      functionResponse.put("response", response);

      JSONObject toolResponse = new JSONObject();
      toolResponse.put("functionResponses", new JSONArray().put(functionResponse));

      JSONObject message = new JSONObject().put("toolResponse", toolResponse);
      webSocket.send(message.toString());
    } catch (JSONException e) {
      Timber.e(e, "Failed to encode tool response");
    }
  }

  private class SocketListener extends WebSocketListener {
    private final String model;
    private final String systemInstruction;
    private final JSONArray functionDeclarations;

    SocketListener(String model, String systemInstruction, JSONArray functionDeclarations) {
      this.model = model;
      this.systemInstruction = systemInstruction;
      this.functionDeclarations = functionDeclarations;
    }

    @Override
    public void onOpen(@NonNull WebSocket ws, @NonNull Response response) {
      try {
        JSONObject generationConfig = new JSONObject();
        generationConfig.put("responseModalities", new JSONArray().put("AUDIO"));

        JSONObject setup = new JSONObject();
        setup.put("model", model);
        setup.put("generationConfig", generationConfig);
        setup.put(
            "systemInstruction",
            new JSONObject().put("parts", new JSONArray().put(new JSONObject().put("text", systemInstruction))));
        setup.put(
            "tools", new JSONArray().put(new JSONObject().put("functionDeclarations", functionDeclarations)));
        setup.put("inputAudioTranscription", new JSONObject());
        setup.put("outputAudioTranscription", new JSONObject());
        // Without this, a session is hard-capped at 2 minutes once video is involved (15 minutes
        // for audio-only); the sliding window lets the server truncate/summarize old turns
        // instead of ending the conversation, which is what "have a conversation with the robot"
        // actually requires.
        setup.put(
            "contextWindowCompression",
            new JSONObject().put("slidingWindow", new JSONObject()));
        // Requests a handle we can use to resume this exact conversation on a new connection,
        // since the underlying connection itself is force-closed after ~10 minutes regardless.
        JSONObject sessionResumption = new JSONObject();
        if (resumptionHandle != null) sessionResumption.put("handle", resumptionHandle);
        setup.put("sessionResumption", sessionResumption);

        JSONObject message = new JSONObject().put("setup", setup);
        Timber.d("Gemini Live sending setup: %s", message);
        ws.send(message.toString());
      } catch (JSONException e) {
        Timber.e(e, "Failed to build setup message");
        listener.onError("Failed to start session: " + e.getMessage());
      }
    }

    @Override
    public void onMessage(@NonNull WebSocket ws, @NonNull String text) {
      handleServerMessage(text);
    }

    @Override
    public void onMessage(@NonNull WebSocket ws, @NonNull ByteString bytes) {
      // Gemini Live sends JSON text frames; binary frames are not expected in this protocol.
      handleServerMessage(bytes.utf8());
    }

    @Override
    public void onClosing(@NonNull WebSocket ws, int code, @NonNull String reason) {
      ws.close(1000, null);
    }

    @Override
    public void onClosed(@NonNull WebSocket ws, int code, @NonNull String reason) {
      setupComplete = false;
      Timber.d("Gemini Live closed: code=%d reason=%s", code, reason);
      listener.onClosed(code, reason);
    }

    @Override
    public void onFailure(@NonNull WebSocket ws, @NonNull Throwable t, @Nullable Response response) {
      setupComplete = false;
      String detail = t.getMessage() != null ? t.getMessage() : "Connection failed";
      if (response != null) {
        // Auth/model errors (bad API key, unknown model, quota, ...) surface as an HTTP error
        // response to the websocket upgrade request rather than a normal close frame; the body
        // usually contains Google's actual error message, which is far more useful than the
        // generic okhttp exception message above.
        try (okhttp3.ResponseBody body = response.body()) {
          if (body != null) {
            String bodyText = body.string();
            if (!bodyText.isEmpty()) detail = response.code() + ": " + bodyText;
          }
        } catch (java.io.IOException ignored) {
          // fall back to the exception message already captured above
        }
      }
      Timber.e(t, "Gemini Live socket failure: %s", detail);
      listener.onError(detail);
    }

    private void handleServerMessage(String text) {
      try {
        Timber.d("Gemini Live received: %s", text);
        JSONObject json = new JSONObject(text);

        if (json.has("error")) {
          listener.onError(json.getJSONObject("error").toString());
          return;
        }

        if (json.has("setupComplete")) {
          setupComplete = true;
          listener.onSetupComplete();
          return;
        }

        if (json.has("sessionResumptionUpdate")) {
          JSONObject update = json.getJSONObject("sessionResumptionUpdate");
          if (update.optBoolean("resumable", false)) {
            resumptionHandle = update.optString("newHandle", resumptionHandle);
          }
          return;
        }

        if (json.has("goAway")) {
          // timeLeft is a protobuf Duration string like "9.5s"; strip the trailing "s" for millis.
          String timeLeft = json.getJSONObject("goAway").optString("timeLeft", "0s");
          double seconds;
          try {
            seconds = Double.parseDouble(timeLeft.endsWith("s") ? timeLeft.substring(0, timeLeft.length() - 1) : timeLeft);
          } catch (NumberFormatException e) {
            seconds = 0;
          }
          listener.onGoAway((long) (seconds * 1000));
          return;
        }

        if (json.has("serverContent")) {
          JSONObject serverContent = json.getJSONObject("serverContent");

          if (serverContent.has("inputTranscription")) {
            String t = serverContent.getJSONObject("inputTranscription").optString("text", "");
            if (!t.isEmpty()) listener.onInputTranscript(t);
          }

          if (serverContent.has("outputTranscription")) {
            String t = serverContent.getJSONObject("outputTranscription").optString("text", "");
            if (!t.isEmpty()) listener.onOutputTranscript(t);
          }

          if (serverContent.has("modelTurn")) {
            JSONArray parts = serverContent.getJSONObject("modelTurn").optJSONArray("parts");
            if (parts != null) {
              for (int i = 0; i < parts.length(); i++) {
                JSONObject part = parts.getJSONObject(i);
                if (part.has("inlineData")) {
                  JSONObject inlineData = part.getJSONObject("inlineData");
                  byte[] pcm = Base64.decode(inlineData.getString("data"), Base64.NO_WRAP);
                  listener.onAudioChunk(pcm);
                }
              }
            }
          }

          if (serverContent.optBoolean("interrupted", false)) {
            listener.onInterrupted();
          }

          if (serverContent.optBoolean("turnComplete", false)) {
            listener.onTurnComplete();
          }
          return;
        }

        if (json.has("toolCall")) {
          JSONArray calls = json.getJSONObject("toolCall").optJSONArray("functionCalls");
          if (calls != null) {
            for (int i = 0; i < calls.length(); i++) {
              JSONObject call = calls.getJSONObject(i);
              listener.onToolCall(
                  call.optString("id", ""), call.optString("name", ""), call.optJSONObject("args"));
            }
          }
        }
      } catch (JSONException e) {
        Timber.e(e, "Failed to parse Gemini Live message: %s", text);
      }
    }
  }
}
