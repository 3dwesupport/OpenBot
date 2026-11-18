package org.openbot.app.robot.voice;

import android.content.Context;
import android.graphics.Canvas;
import android.util.AttributeSet;
import android.view.View;
import androidx.annotation.Nullable;

/**
 * Transparent overlay drawn on top of the camera view, showing the bounding box of whoever
 * {@link PersonFollower} is currently tracking. A plain pass-through onto {@link
 * org.openbot.app.robot.tracking.MultiBoxTracker#draw}, which already scales the box to whatever canvas
 * size it's given.
 */
public class TrackingOverlayView extends View {

  @Nullable private PersonFollower personFollower;

  public TrackingOverlayView(Context context) {
    super(context);
  }

  public TrackingOverlayView(Context context, @Nullable AttributeSet attrs) {
    super(context, attrs);
  }

  public void setPersonFollower(@Nullable PersonFollower personFollower) {
    this.personFollower = personFollower;
    invalidate();
  }

  @Override
  protected void onDraw(Canvas canvas) {
    super.onDraw(canvas);
    if (personFollower != null) personFollower.draw(canvas);
  }
}
