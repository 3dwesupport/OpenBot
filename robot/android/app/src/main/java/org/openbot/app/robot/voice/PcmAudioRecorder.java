package org.openbot.app.robot.voice;

import android.annotation.SuppressLint;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.media.audiofx.AcousticEchoCanceler;
import android.media.audiofx.NoiseSuppressor;
import timber.log.Timber;

/**
 * Captures microphone audio as 16kHz mono 16-bit PCM, the format Gemini Live expects for
 * realtime input, and streams it to a callback in small chunks.
 */
public class PcmAudioRecorder {

  public static final int SAMPLE_RATE = 16000;

  public interface Listener {
    /** One chunk of raw little-endian PCM16 mono audio. */
    void onAudioChunk(byte[] pcm16);

    /** Normalized 0..1 amplitude of the chunk just captured, for UI visualization. */
    void onAmplitude(float level);
  }

  private final Listener listener;
  private AudioRecord audioRecord;
  private Thread recordingThread;
  private volatile boolean recording = false;
  // Defense in depth alongside PcmAudioPlayer.isSafeForMicInput(): on devices that support it,
  // this suppresses residual speaker bleed the mic picks up even during the "safe" window.
  // Not all devices support these effects, hence the isAvailable() checks.
  private AcousticEchoCanceler echoCanceler;
  private NoiseSuppressor noiseSuppressor;

  public PcmAudioRecorder(Listener listener) {
    this.listener = listener;
  }

  @SuppressLint("MissingPermission") // caller is required to check RECORD_AUDIO before starting
  public void start() {
    if (recording) return;

    int minBufferSize =
        AudioRecord.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT);
    if (minBufferSize <= 0) {
      Timber.e("Unable to determine AudioRecord buffer size");
      return;
    }
    int bufferSize = minBufferSize * 2;

    audioRecord =
        new AudioRecord(
            MediaRecorder.AudioSource.VOICE_COMMUNICATION,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            bufferSize);

    if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
      Timber.e("AudioRecord failed to initialize");
      audioRecord.release();
      audioRecord = null;
      return;
    }

    if (AcousticEchoCanceler.isAvailable()) {
      echoCanceler = AcousticEchoCanceler.create(audioRecord.getAudioSessionId());
      if (echoCanceler != null) echoCanceler.setEnabled(true);
    }
    if (NoiseSuppressor.isAvailable()) {
      noiseSuppressor = NoiseSuppressor.create(audioRecord.getAudioSessionId());
      if (noiseSuppressor != null) noiseSuppressor.setEnabled(true);
    }

    recording = true;
    audioRecord.startRecording();

    recordingThread =
        new Thread(
            () -> {
              byte[] buffer = new byte[bufferSize];
              int consecutiveErrors = 0;
              while (recording) {
                try {
                  int read = audioRecord.read(buffer, 0, buffer.length);
                  if (read > 0) {
                    consecutiveErrors = 0;
                    byte[] chunk = new byte[read];
                    System.arraycopy(buffer, 0, chunk, 0, read);
                    listener.onAudioChunk(chunk);
                    listener.onAmplitude(computeAmplitude(chunk));
                  } else {
                    // Negative values are AudioRecord.ERROR_* codes (e.g. the recording session
                    // was invalidated by an audio route change). Without this, a single bad read
                    // used to spin the CPU forever producing no audio and no visible error.
                    consecutiveErrors++;
                    Timber.w("AudioRecord.read returned %d", read);
                    if (consecutiveErrors > 50) {
                      Timber.e("AudioRecord failing repeatedly, stopping mic capture");
                      break;
                    }
                    Thread.sleep(20);
                  }
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                  break;
                } catch (Exception e) {
                  // A single bad chunk (or a transient error from the listener callback) must
                  // never silently kill this thread forever with no visible symptom other than
                  // "the mic stopped working" — log and keep capturing.
                  Timber.e(e, "Error in audio recording loop");
                }
              }
            },
            "PcmAudioRecorder");
    recordingThread.start();
  }

  public void stop() {
    recording = false;
    if (recordingThread != null) {
      try {
        recordingThread.join(500);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      recordingThread = null;
    }
    if (echoCanceler != null) {
      echoCanceler.release();
      echoCanceler = null;
    }
    if (noiseSuppressor != null) {
      noiseSuppressor.release();
      noiseSuppressor = null;
    }
    if (audioRecord != null) {
      try {
        audioRecord.stop();
      } catch (IllegalStateException ignored) {
        // already stopped
      }
      audioRecord.release();
      audioRecord = null;
    }
  }

  public boolean isRecording() {
    return recording;
  }

  private static float computeAmplitude(byte[] pcm16) {
    long sum = 0;
    int sampleCount = pcm16.length / 2;
    if (sampleCount == 0) return 0f;
    for (int i = 0; i < pcm16.length - 1; i += 2) {
      short sample = (short) ((pcm16[i] & 0xFF) | (pcm16[i + 1] << 8));
      sum += Math.abs(sample);
    }
    float mean = sum / (float) sampleCount;
    return Math.min(1f, mean / 8000f);
  }
}
