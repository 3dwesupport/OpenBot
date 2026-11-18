package org.openbot.app.robot.voice;

import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import java.util.concurrent.LinkedBlockingQueue;
import timber.log.Timber;

/**
 * Streams Gemini Live's 24kHz mono 16-bit PCM audio replies out through the phone speaker. Chunks
 * are queued and drained on a dedicated thread so network callbacks never block on audio I/O.
 */
public class PcmAudioPlayer {

  public static final int SAMPLE_RATE = 24000;

  public interface Listener {
    /** Normalized 0..1 amplitude of the chunk currently being played, for UI visualization. */
    void onAmplitude(float level);

    /** Fired once the queued audio has fully drained (the model finished speaking). */
    void onPlaybackIdle();
  }

  // Minimum quiet time after playback ends before it's safe to forward mic audio to Gemini
  // again. AudioTrack/speaker/room acoustics have a short decay tail after the last chunk is
  // written, so without this, residual playback can still leak into the mic for a moment.
  private static final long ECHO_COOLDOWN_MS = 400;

  private final Listener listener;
  private final LinkedBlockingQueue<byte[]> queue = new LinkedBlockingQueue<>();
  // flush() can be called from a different thread (the Gemini WebSocket callback thread) than
  // start()/stop() (the UI thread), so this needs to be volatile for visibility.
  private volatile AudioTrack audioTrack;
  private Thread playbackThread;
  private volatile boolean running = false;
  // Read from the mic-recorder thread (isSafeForMicInput()) as well as this class's own
  // playback thread, so these need to be volatile.
  private volatile boolean playing;
  private volatile long idleSinceMs;

  public PcmAudioPlayer(Listener listener) {
    this.listener = listener;
  }

  public void start() {
    if (running) return;

    int minBufferSize =
        AudioTrack.getMinBufferSize(
            SAMPLE_RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);

    // Uses the classic constructor (rather than AudioTrack.Builder, API 23+) since this app
    // supports API 21+. Routed to STREAM_MUSIC so the robot's voice comes out of the loudspeaker
    // like a normal media/notification sound, not the earpiece.
    audioTrack =
        new AudioTrack(
            AudioManager.STREAM_MUSIC,
            SAMPLE_RATE,
            AudioFormat.CHANNEL_OUT_MONO,
            AudioFormat.ENCODING_PCM_16BIT,
            Math.max(minBufferSize, SAMPLE_RATE),
            AudioTrack.MODE_STREAM);

    running = true;
    audioTrack.play();

    playbackThread =
        new Thread(
            () -> {
              boolean wasPlaying = false;
              while (running) {
                try {
                  byte[] chunk = queue.poll(100, java.util.concurrent.TimeUnit.MILLISECONDS);
                  if (chunk != null) {
                    playing = true;
                    wasPlaying = true;
                    audioTrack.write(chunk, 0, chunk.length);
                    listener.onAmplitude(computeAmplitude(chunk));
                  } else if (queue.isEmpty()) {
                    if (wasPlaying) {
                      idleSinceMs = System.currentTimeMillis();
                      wasPlaying = false;
                    }
                    playing = false;
                    listener.onPlaybackIdle();
                  }
                } catch (InterruptedException e) {
                  Thread.currentThread().interrupt();
                } catch (Exception e) {
                  Timber.e(e, "Error during audio playback");
                }
              }
            },
            "PcmAudioPlayer");
    playbackThread.start();
  }

  public void write(byte[] pcm24) {
    if (running) queue.offer(pcm24);
  }

  /**
   * False while the robot's own voice is still audibly coming out of the speaker (plus a short
   * cooldown after). The mic must not be forwarded to Gemini while this is false, or the phone
   * hears its own playback as "the user talking" and the conversation loops forever interrupting
   * itself.
   */
  public boolean isSafeForMicInput() {
    return !playing && (System.currentTimeMillis() - idleSinceMs) >= ECHO_COOLDOWN_MS;
  }

  /** Drops any queued/buffered audio immediately, used when the user barges in on the model. */
  public void flush() {
    queue.clear();
    if (audioTrack != null) {
      try {
        audioTrack.pause();
        audioTrack.flush();
        audioTrack.play();
      } catch (IllegalStateException ignored) {
        // track not in a state that supports flush, safe to ignore
      }
    }
  }

  public void stop() {
    running = false;
    queue.clear();
    if (playbackThread != null) {
      try {
        playbackThread.join(500);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
      playbackThread = null;
    }
    if (audioTrack != null) {
      try {
        audioTrack.stop();
      } catch (IllegalStateException ignored) {
        // already stopped
      }
      audioTrack.release();
      audioTrack = null;
    }
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
