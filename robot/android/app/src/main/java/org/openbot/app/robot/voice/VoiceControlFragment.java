package org.openbot.app.robot.voice;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.navigation.Navigation;
import androidx.recyclerview.widget.LinearLayoutManager;
import java.io.ByteArrayOutputStream;
import java.util.regex.Pattern;
import org.json.JSONObject;
import org.openbot.app.robot.R;
import org.openbot.app.robot.databinding.FragmentVoiceControlBinding;
import org.openbot.app.robot.env.ImageUtils;
import org.openbot.app.robot.env.SharedPreferencesManager;
import org.openbot.app.robot.main.MainViewModel;
import org.openbot.app.robot.utils.PermissionUtils;
import org.openbot.app.robot.vehicle.Control;
import org.openbot.app.robot.vehicle.Vehicle;
import timber.log.Timber;

/**
 * Lets the user talk to the robot in real time via the Gemini Live API. Speech is streamed to
 * Gemini, which replies with spoken audio and can drive the robot by invoking the function-calling
 * tools declared in {@link RobotToolExecutor} (move, turn, lights, status, ...).
 */
public class VoiceControlFragment extends Fragment {

  private static final String AI_STUDIO_API_KEY_URL = "https://aistudio.google.com/apikey";
  // Google API keys start with "AIza"; lenient on length in case the format changes slightly.
  private static final Pattern API_KEY_PATTERN = Pattern.compile("AIza[0-9A-Za-z_\\-]{20,}");

  private FragmentVoiceControlBinding binding;
  private MainViewModel mViewModel;
  private Vehicle vehicle;
  private SharedPreferencesManager preferencesManager;

  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final VoiceTranscriptAdapter transcriptAdapter = new VoiceTranscriptAdapter();

  // Read from the audio-recorder thread and OkHttp's callback thread as well as the UI thread
  // (e.g. RecorderListener.onAudioChunk, ClientListener.onToolCall), so these need to be
  // volatile to guarantee visibility of the reference written in startSession()/stopSession().
  private volatile GeminiLiveClient client;
  private volatile PcmAudioRecorder recorder;
  private volatile PcmAudioPlayer player;
  private volatile RobotToolExecutor toolExecutor;
  private volatile ArCoreCameraSource arCoreCameraSource;
  private volatile PersonFollower personFollower;
  private volatile boolean followingPerson;
  private volatile long lastVideoFrameSentAtMs;
  // True while a long-running physical action (follow_person, move_distance) is active, so the
  // orb/status keep showing "acting" instead of flipping back to "listening" the moment Gemini's
  // speaking turn ends, even though the robot is still physically moving.
  private volatile boolean physicalActionRunning;

  private boolean sessionActive = false;
  private VoiceOrbView.State orbState = VoiceOrbView.State.IDLE;
  private String pendingTypedText;

  private final ActivityResultLauncher<String> micPermissionLauncher =
      registerForActivityResult(
          new ActivityResultContracts.RequestPermission(),
          granted -> {
            if (granted) startSession();
            else
              Toast.makeText(
                      requireContext(), R.string.voice_mic_permission_required, Toast.LENGTH_LONG)
                  .show();
          });

  // Camera is optional/best-effort: if denied, the voice conversation still works audio-only,
  // it just can't see, follow, or navigate precisely.
  private final ActivityResultLauncher<String> cameraPermissionLauncher =
      registerForActivityResult(
          new ActivityResultContracts.RequestPermission(),
          granted -> {
            if (granted) startArCoreCameraSource();
          });

  // Location is requested lazily, only the first time get_weather is actually called.
  private volatile WeatherService.Callback pendingWeatherCallback;
  private WeatherService weatherService;
  private final ActivityResultLauncher<String> locationPermissionLauncher =
      registerForActivityResult(
          new ActivityResultContracts.RequestPermission(),
          granted -> {
            WeatherService.Callback callback = pendingWeatherCallback;
            pendingWeatherCallback = null;
            if (callback == null) return;
            if (granted) {
              getOrCreateWeatherService().fetchCurrentWeather(callback);
            } else {
              callback.onError("Location permission was not granted.");
            }
          });

  @Nullable
  @Override
  public View onCreateView(
      @NonNull LayoutInflater inflater,
      @Nullable ViewGroup container,
      @Nullable Bundle savedInstanceState) {
    binding = FragmentVoiceControlBinding.inflate(inflater, container, false);
    return binding.getRoot();
  }

  @Override
  public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
    super.onViewCreated(view, savedInstanceState);

    mViewModel = new ViewModelProvider(requireActivity()).get(MainViewModel.class);
    vehicle = mViewModel.getVehicle().getValue();
    preferencesManager = new SharedPreferencesManager(requireContext());

    binding.transcriptRecycler.setLayoutManager(new LinearLayoutManager(requireContext()));
    binding.transcriptRecycler.setAdapter(transcriptAdapter);

    binding.saveKeyButton.setOnClickListener(v -> saveApiKeyAndContinue());
    binding.getApiKeyLink.setOnClickListener(v -> openAiStudioApiKeyPage());
    binding.settingsButton.setOnClickListener(
        v -> Navigation.findNavController(requireView()).navigate(R.id.open_settings_fragment));
    // The orb itself is the mic control (tap to start/stop talking); the small icon centered on
    // top of it just indicates state (mic vs. stop), it isn't a separate tap target.
    binding.voiceOrbContainer.setOnClickListener(v -> toggleSession());
    binding.sendButton.setOnClickListener(v -> sendTypedText());

    binding.textInput.setOnEditorActionListener(
        (v, actionId, event) -> {
          if (actionId == EditorInfo.IME_ACTION_SEND) {
            sendTypedText();
            return true;
          }
          return false;
        });

    refreshSetupState();
  }

  @Override
  public void onResume() {
    super.onResume();
    // Locked to landscape only while this screen is visible (restored in onPause): the robot
    // mounts the phone landscape, and the camera thumbnail's ARCore session and MultiBoxTracker's
    // overlay math both assume the viewport matches the device's actual current rotation. Neither
    // is set up to reshape live if the phone rotates mid-conversation, so rather than build and
    // rely on untested rotation-handling for a small thumbnail, it's simpler and more robust to
    // lock to the orientation the robot actually uses — other screens are unaffected since this
    // app has no other orientation restrictions.
    requireActivity().setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
    // Returning from the AI Studio "create key" page: if the user copied their new key, offer
    // it up automatically instead of making them switch apps and paste it in by hand.
    maybeAutoFillApiKeyFromClipboard();
  }

  private void refreshSetupState() {
    boolean hasKey = !preferencesManager.getGeminiApiKey().trim().isEmpty();
    binding.setupCard.setVisibility(hasKey ? View.GONE : View.VISIBLE);
    binding.mainContent.setVisibility(hasKey ? View.VISIBLE : View.GONE);
  }

  private void maybeAutoFillApiKeyFromClipboard() {
    if (binding == null || binding.setupCard.getVisibility() != View.VISIBLE) return;
    if (binding.apiKeyInput.getText() != null && binding.apiKeyInput.getText().length() > 0) return;

    ClipboardManager clipboard =
        (ClipboardManager) requireContext().getSystemService(Context.CLIPBOARD_SERVICE);
    if (clipboard == null || !clipboard.hasPrimaryClip()) return;
    ClipData clip = clipboard.getPrimaryClip();
    if (clip == null || clip.getItemCount() == 0) return;

    CharSequence text = clip.getItemAt(0).coerceToText(requireContext());
    if (text == null) return;
    String candidate = text.toString().trim();
    if (API_KEY_PATTERN.matcher(candidate).matches()) {
      binding.apiKeyInput.setText(candidate);
      Toast.makeText(requireContext(), R.string.voice_setup_key_detected, Toast.LENGTH_SHORT)
          .show();
    }
  }

  private void openAiStudioApiKeyPage() {
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(AI_STUDIO_API_KEY_URL)));
    } catch (android.content.ActivityNotFoundException e) {
      Toast.makeText(requireContext(), AI_STUDIO_API_KEY_URL, Toast.LENGTH_LONG).show();
    }
  }

  private void saveApiKeyAndContinue() {
    String key =
        binding.apiKeyInput.getText() != null ? binding.apiKeyInput.getText().toString().trim() : "";
    if (key.isEmpty()) {
      binding.apiKeyInputLayout.setError(getString(R.string.voice_setup_api_key_required));
      return;
    }
    binding.apiKeyInputLayout.setError(null);
    preferencesManager.setGeminiApiKey(key);
    refreshSetupState();
  }

  private void sendTypedText() {
    String text =
        binding.textInput.getText() != null ? binding.textInput.getText().toString().trim() : "";
    if (text.isEmpty()) return;
    binding.textInput.setText("");

    if (!sessionActive) {
      pendingTypedText = text;
      startSession();
      return;
    }
    transcriptAdapter.addMessage(new ChatMessage(ChatMessage.Role.USER, text));
    scrollToBottom();
    client.sendText(text);
  }

  private void toggleSession() {
    if (sessionActive) {
      stopSession();
    } else if (PermissionUtils.hasAudioPermission(requireActivity())) {
      startSession();
    } else {
      micPermissionLauncher.launch(android.Manifest.permission.RECORD_AUDIO);
    }
  }

  private void startSession() {
    if (sessionActive) return;
    String apiKey = preferencesManager.getGeminiApiKey().trim();
    if (apiKey.isEmpty()) {
      refreshSetupState();
      return;
    }

    sessionActive = true;
    setOrbState(VoiceOrbView.State.CONNECTING);
    binding.statusText.setText(R.string.voice_status_connecting);
    updateMicButton();

    toolExecutor =
        new RobotToolExecutor(
            vehicle,
            description ->
                mainHandler.post(
                    () -> {
                      if (!isAdded()) return;
                      transcriptAdapter.addMessage(new ChatMessage(ChatMessage.Role.ACTION, description));
                      scrollToBottom();
                    }),
            new VisionControllerImpl(),
            new EnvironmentControllerImpl(),
            (responseCallId, responseName, response) -> {
              GeminiLiveClient currentClient = client;
              if (currentClient != null) currentClient.sendToolResponse(responseCallId, responseName, response);
            });

    player = new PcmAudioPlayer(new PlayerListener());
    player.start();

    client = new GeminiLiveClient(new ClientListener());
    client.connect(
        apiKey,
        preferencesManager.getGeminiModel(),
        getString(R.string.voice_system_instruction),
        RobotToolExecutor.buildFunctionDeclarations());

    if (PermissionUtils.hasCameraPermission(requireActivity())) {
      startArCoreCameraSource();
    } else {
      cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA);
    }
  }

  private void stopSession() {
    sessionActive = false;
    pendingTypedText = null;
    physicalActionRunning = false;

    if (recorder != null) {
      recorder.stop();
      recorder = null;
    }
    if (player != null) {
      player.stop();
      player = null;
    }
    if (client != null) {
      client.disconnect();
      client = null;
    }
    if (toolExecutor != null) {
      toolExecutor.shutdown();
      toolExecutor = null;
    }
    followingPerson = false;
    if (personFollower != null) {
      personFollower.stop();
      personFollower = null;
    }
    // Pause, don't close: ArCoreCameraSource must only ever be constructed once per fragment
    // view, since its underlying GLSurfaceView.setRenderer() call can't be repeated on the same
    // view instance (recreating it here is what used to crash the app on re-enabling voice).
    // It's fully torn down in onDestroyView() instead, when the view is actually going away.
    if (arCoreCameraSource != null) {
      arCoreCameraSource.pause();
    }
    if (binding != null) {
      binding.cameraPreviewContainer.setVisibility(View.GONE);
      binding.trackingOverlayView.setPersonFollower(null);
    }

    setOrbState(VoiceOrbView.State.IDLE);
    if (isAdded()) binding.statusText.setText(R.string.voice_status_idle);
    updateMicButton();
  }

  /**
   * Starts the single ARCore session that stays alive for the whole voice conversation (see
   * {@link ArCoreCameraSource} for why: a fresh session per move_distance call raced against
   * ARCore's own pose-tracking startup and was unreliable). Camera is best-effort; if ARCore
   * isn't usable, the thumbnail just stays hidden and the conversation continues audio-only.
   */
  private void startArCoreCameraSource() {
    if (binding == null || !sessionActive) return;
    if (arCoreCameraSource == null) {
      arCoreCameraSource =
          new ArCoreCameraSource(
              requireActivity(), vehicle, binding.arCoreSurfaceView, mainHandler, new ArCoreSourceListener());
    }
    binding.cameraPreviewContainer.setVisibility(arCoreCameraSource.resume() ? View.VISIBLE : View.GONE);
  }

  private byte[] jpegEncode(Bitmap bitmap) {
    ByteArrayOutputStream stream = new ByteArrayOutputStream();
    bitmap.compress(Bitmap.CompressFormat.JPEG, 70, stream);
    return stream.toByteArray();
  }

  private void startDistanceGoal(float forwardMeters, float leftMeters) {
    if (binding == null || !sessionActive || arCoreCameraSource == null) return;
    followingPerson = false;
    if (!arCoreCameraSource.startGoal(forwardMeters, leftMeters)) {
      return; // ArCoreSourceListener.onError already reported why
    }
    physicalActionRunning = true;
    setOrbState(VoiceOrbView.State.ACTING);
  }

  /** The same ARCore session keeps running throughout, so vision/following just resume on the
   * next frame automatically — no camera hand-off needed here, unlike the old CameraX design. */
  private void onDistanceNavigationEnded() {
    physicalActionRunning = false;
    if (sessionActive) {
      setOrbState(VoiceOrbView.State.LISTENING);
      if (binding != null) binding.statusText.setText(R.string.voice_status_listening);
    }
  }

  private void updateMicButton() {
    if (binding == null) return;
    binding.micStateIcon.setImageResource(sessionActive ? R.drawable.ic_stop : R.drawable.ic_voice_over);
  }

  private void setOrbState(VoiceOrbView.State state) {
    orbState = state;
    if (binding != null) binding.voiceOrb.setState(state);
  }

  private void scrollToBottom() {
    int last = transcriptAdapter.getLastIndex();
    if (last >= 0) binding.transcriptRecycler.smoothScrollToPosition(last);
  }

  @Override
  public void onPause() {
    super.onPause();
    // Safety: never leave the robot moving if the user backgrounds or leaves this screen.
    stopSession();
    requireActivity().setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
  }

  @Override
  public void onDestroyView() {
    super.onDestroyView();
    stopSession();
    // Only here, when the view (and its GLSurfaceView) is actually being destroyed, is it safe
    // to fully tear down ArCoreCameraSource — see the comment in stopSession().
    if (arCoreCameraSource != null) {
      arCoreCameraSource.close();
      arCoreCameraSource = null;
    }
    binding = null;
  }

  private class ClientListener implements GeminiLiveClient.Listener {
    @Override
    public void onSetupComplete() {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            setOrbState(VoiceOrbView.State.LISTENING);
            binding.statusText.setText(R.string.voice_status_listening);
            recorder = new PcmAudioRecorder(new RecorderListener());
            recorder.start();
            if (pendingTypedText != null) {
              String text = pendingTypedText;
              pendingTypedText = null;
              transcriptAdapter.addMessage(new ChatMessage(ChatMessage.Role.USER, text));
              scrollToBottom();
              client.sendText(text);
            }
          });
    }

    @Override
    public void onInputTranscript(String text) {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            transcriptAdapter.appendToLast(ChatMessage.Role.USER, text);
            scrollToBottom();
          });
    }

    @Override
    public void onOutputTranscript(String text) {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            transcriptAdapter.appendToLast(ChatMessage.Role.MODEL, text);
            scrollToBottom();
            setOrbState(VoiceOrbView.State.SPEAKING);
            binding.statusText.setText(R.string.voice_status_speaking);
          });
    }

    @Override
    public void onAudioChunk(byte[] pcm24) {
      if (player != null) player.write(pcm24);
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            setOrbState(VoiceOrbView.State.SPEAKING);
            binding.statusText.setText(R.string.voice_status_speaking);
          });
    }

    @Override
    public void onToolCall(String callId, String name, JSONObject args) {
      mainHandler.post(() -> setOrbState(VoiceOrbView.State.ACTING));
      JSONObject response = toolExecutor != null ? toolExecutor.execute(callId, name, args) : new JSONObject();
      // A null response means the tool is async (e.g. get_weather) and will send its own
      // response later via the ToolResponseSender passed into RobotToolExecutor.
      if (response != null && client != null) client.sendToolResponse(callId, name, response);
    }

    @Override
    public void onTurnComplete() {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            if (physicalActionRunning) return;
            setOrbState(VoiceOrbView.State.LISTENING);
            binding.statusText.setText(R.string.voice_status_listening);
          });
    }

    @Override
    public void onInterrupted() {
      if (player != null) player.flush();
      mainHandler.post(() -> setOrbState(VoiceOrbView.State.LISTENING));
    }

    @Override
    public void onError(String message) {
      Timber.e("Gemini Live error: %s", message);
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show();
            binding.statusText.setText(R.string.voice_status_error);
            stopSession();
          });
    }

    @Override
    public void onClosed(int code, String reason) {
      mainHandler.post(
          () -> {
            if (!isAdded() || !sessionActive) return;
            if (code != 1000) {
              // An unexpected close (bad API key, unknown/retired model, quota exceeded, ...);
              // without this the mic would just silently stop responding with no explanation.
              String detail = reason == null || reason.isEmpty() ? "code " + code : reason;
              Toast.makeText(requireContext(), detail, Toast.LENGTH_LONG).show();
              binding.statusText.setText(R.string.voice_status_error);
            }
            stopSession();
          });
    }

    @Override
    public void onGoAway(long timeLeftMillis) {
      Timber.d("Gemini Live connection closing in %dms, reconnecting", timeLeftMillis);
      mainHandler.post(
          () -> {
            if (!isAdded() || !sessionActive || client == null) return;
            // Reconnect on the same client instance (not a new one) so its saved session
            // resumption handle carries over and the conversation continues seamlessly instead
            // of restarting from scratch every ~10 minutes.
            if (recorder != null) {
              recorder.stop();
              recorder = null;
            }
            setOrbState(VoiceOrbView.State.CONNECTING);
            binding.statusText.setText(R.string.voice_status_connecting);
            client.connect(
                preferencesManager.getGeminiApiKey().trim(),
                preferencesManager.getGeminiModel(),
                getString(R.string.voice_system_instruction),
                RobotToolExecutor.buildFunctionDeclarations());
          });
    }
  }

  private class RecorderListener implements PcmAudioRecorder.Listener {
    @Override
    public void onAudioChunk(byte[] pcm16) {
      GeminiLiveClient currentClient = client;
      PcmAudioPlayer currentPlayer = player;
      // Never forward mic audio while the robot's own voice is still coming out of the speaker
      // (or its short echo tail): otherwise the phone hears itself, the server's turn-detection
      // treats that as the user talking, and the conversation interrupts and restarts forever.
      if (currentClient != null && (currentPlayer == null || currentPlayer.isSafeForMicInput())) {
        currentClient.sendAudioChunk(pcm16);
      }
    }

    @Override
    public void onAmplitude(float level) {
      mainHandler.post(
          () -> {
            if (binding != null && orbState == VoiceOrbView.State.LISTENING) {
              binding.voiceOrb.setLevel(level);
            }
          });
    }
  }

  private class PlayerListener implements PcmAudioPlayer.Listener {
    @Override
    public void onAmplitude(float level) {
      mainHandler.post(
          () -> {
            if (binding != null && orbState == VoiceOrbView.State.SPEAKING) {
              binding.voiceOrb.setLevel(level);
            }
          });
    }

    @Override
    public void onPlaybackIdle() {
      mainHandler.post(
          () -> {
            if (!isAdded() || !sessionActive) return;
            if (physicalActionRunning) return;
            if (orbState == VoiceOrbView.State.SPEAKING) {
              setOrbState(VoiceOrbView.State.LISTENING);
              binding.statusText.setText(R.string.voice_status_listening);
            }
          });
    }
  }

  /** {@link ArCoreCameraSource.Listener#onFrame} runs on its own background thread; the other
   * three callbacks arrive already posted to the main thread (see {@code ArCore.runOnMainThread}). */
  private class ArCoreSourceListener implements ArCoreCameraSource.Listener {
    @Override
    public void onFrame(Bitmap bitmap) {
      GeminiLiveClient currentClient = client;
      if (currentClient != null) {
        long now = System.currentTimeMillis();
        if (now - lastVideoFrameSentAtMs >= GeminiLiveClient.MAX_VIDEO_FRAME_INTERVAL_MS) {
          lastVideoFrameSentAtMs = now;
          currentClient.sendVideoFrame(jpegEncode(bitmap));
        }
      }

      if (followingPerson && isAdded()) {
        PersonFollower follower = personFollower;
        if (follower == null) {
          follower = new PersonFollower(requireActivity());
          int sensorOrientation = 90 - ImageUtils.getScreenOrientation(requireActivity());
          follower.start(sensorOrientation, bitmap.getWidth(), bitmap.getHeight());
          personFollower = follower;
        }
        if (follower.isReady()) {
          Control control = follower.processFrame(bitmap);
          if (control != null) vehicle.setControl(control);
          PersonFollower finalFollower = follower;
          mainHandler.post(
              () -> {
                if (binding != null) binding.trackingOverlayView.setPersonFollower(finalFollower);
              });
        }
      }
    }

    @Override
    public void onGoalReached() {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            transcriptAdapter.addMessage(
                new ChatMessage(ChatMessage.Role.ACTION, "Reached destination"));
            scrollToBottom();
            if (client != null) client.sendText("(The robot has reached its destination.)");
            onDistanceNavigationEnded();
          });
    }

    @Override
    public void onTrackingLost() {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            Toast.makeText(requireContext(), "Lost tracking, stopping", Toast.LENGTH_SHORT).show();
            onDistanceNavigationEnded();
          });
    }

    @Override
    public void onError(String message) {
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show();
            if (physicalActionRunning) onDistanceNavigationEnded();
          });
    }
  }

  private WeatherService getOrCreateWeatherService() {
    if (weatherService == null) weatherService = new WeatherService(requireContext());
    return weatherService;
  }

  private class EnvironmentControllerImpl implements RobotToolExecutor.EnvironmentController {
    @Override
    public void fetchWeather(WeatherService.Callback callback) {
      // Runs on the OkHttp callback thread; permission checks and the ActivityResultLauncher
      // must happen on the main thread.
      mainHandler.post(
          () -> {
            if (!isAdded()) {
              callback.onError("Not available right now.");
              return;
            }
            if (PermissionUtils.hasLocationPermission(requireActivity())) {
              getOrCreateWeatherService().fetchCurrentWeather(callback);
            } else {
              pendingWeatherCallback = callback;
              locationPermissionLauncher.launch(android.Manifest.permission.ACCESS_FINE_LOCATION);
            }
          });
    }
  }

  private class VisionControllerImpl implements RobotToolExecutor.VisionController {
    @Override
    public void startFollowingPerson() {
      followingPerson = true;
      physicalActionRunning = true;
      mainHandler.post(() -> setOrbState(VoiceOrbView.State.ACTING));
    }

    @Override
    public void stopFollowingPerson() {
      followingPerson = false;
      physicalActionRunning = false;
      if (personFollower != null) {
        personFollower.stop();
        personFollower = null;
      }
      vehicle.stopBot();
      mainHandler.post(
          () -> {
            if (!isAdded()) return;
            binding.trackingOverlayView.setPersonFollower(null);
            setOrbState(VoiceOrbView.State.LISTENING);
            binding.statusText.setText(R.string.voice_status_listening);
          });
    }

    @Override
    public void moveDistance(float forwardMeters, float leftMeters) {
      mainHandler.post(() -> startDistanceGoal(forwardMeters, leftMeters));
    }
  }
}
