package org.openbot.app.robot.voice;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.util.AttributeSet;
import android.view.View;
import android.view.animation.LinearInterpolator;
import androidx.annotation.Nullable;

/**
 * A pulsing circular "voice orb" that visualizes the state of the Gemini Live session:
 * idle breathing while connected, growing with microphone input while listening, and pulsing
 * with playback amplitude while the robot speaks.
 */
public class VoiceOrbView extends View {

  public enum State {
    IDLE,
    CONNECTING,
    LISTENING,
    THINKING,
    SPEAKING,
    ACTING
  }

  private State state = State.IDLE;
  private float breathePhase = 0f; // 0..1 idle animation phase

  private final Paint corePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private final Paint ringPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
  private ValueAnimator breatheAnimator;
  private ValueAnimator levelAnimator;
  private float displayedLevel = 0f;

  public VoiceOrbView(Context context) {
    super(context);
    init();
  }

  public VoiceOrbView(Context context, @Nullable AttributeSet attrs) {
    super(context, attrs);
    init();
  }

  private void init() {
    ringPaint.setStyle(Paint.Style.STROKE);
    ringPaint.setStrokeWidth(6f);

    breatheAnimator = ValueAnimator.ofFloat(0f, 1f);
    breatheAnimator.setDuration(2600);
    breatheAnimator.setRepeatCount(ValueAnimator.INFINITE);
    breatheAnimator.setRepeatMode(ValueAnimator.REVERSE);
    breatheAnimator.setInterpolator(new LinearInterpolator());
    breatheAnimator.addUpdateListener(
        anim -> {
          breathePhase = (float) anim.getAnimatedValue();
          invalidate();
        });
    breatheAnimator.start();
  }

  public void setState(State newState) {
    this.state = newState;
    invalidate();
  }

  /** Smoothly animates toward the given 0..1 amplitude level. */
  public void setLevel(float targetLevel) {
    if (levelAnimator != null) levelAnimator.cancel();
    levelAnimator = ValueAnimator.ofFloat(displayedLevel, Math.max(0f, Math.min(1f, targetLevel)));
    levelAnimator.setDuration(120);
    levelAnimator.addUpdateListener(
        anim -> {
          displayedLevel = (float) anim.getAnimatedValue();
          invalidate();
        });
    levelAnimator.start();
  }

  @Override
  protected void onDetachedFromWindow() {
    super.onDetachedFromWindow();
    if (breatheAnimator != null) breatheAnimator.cancel();
    if (levelAnimator != null) levelAnimator.cancel();
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);

    float cx = getWidth() / 2f;
    float cy = getHeight() / 2f;
    float maxRadius = Math.min(getWidth(), getHeight()) / 2f - ringPaint.getStrokeWidth();

    int color = colorForState();
    float breatheBoost = 0.04f * (float) Math.sin(breathePhase * Math.PI);
    float baseRadius = maxRadius * (0.55f + breatheBoost);
    float activeRadius = maxRadius * (0.55f + displayedLevel * 0.4f);
    float coreRadius = state == State.IDLE || state == State.CONNECTING ? baseRadius : activeRadius;

    corePaint.setShader(
        new RadialGradient(
            cx,
            cy,
            Math.max(coreRadius, 1f),
            new int[] {color, withAlpha(color, 140)},
            new float[] {0.4f, 1f},
            Shader.TileMode.CLAMP));
    canvas.drawCircle(cx, cy, coreRadius, corePaint);

    ringPaint.setColor(withAlpha(color, 90));
    canvas.drawCircle(cx, cy, maxRadius, ringPaint);
  }

  private int colorForState() {
    switch (state) {
      case LISTENING:
        return Color.parseColor("#93C47D"); // green
      case THINKING:
        return Color.parseColor("#7268A6"); // purple
      case SPEAKING:
        return Color.parseColor("#4B7BFF"); // openbot blue
      case ACTING:
        return Color.parseColor("#FFAB00"); // amber
      case CONNECTING:
        return Color.parseColor("#98999B"); // gray
      case IDLE:
      default:
        return Color.parseColor("#4B7BFF"); // openbot blue, consistent with the rest of the theme
    }
  }

  private static int withAlpha(int color, int alpha) {
    return Color.argb(alpha, Color.red(color), Color.green(color), Color.blue(color));
  }
}
