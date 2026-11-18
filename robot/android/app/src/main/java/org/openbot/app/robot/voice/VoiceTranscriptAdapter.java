package org.openbot.app.robot.voice;

import android.graphics.Typeface;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import java.util.ArrayList;
import java.util.List;
import org.openbot.app.robot.R;

/** Renders the voice conversation as chat-style bubbles: user (right), robot (left), and
 * lightweight system/action notices (centered). */
public class VoiceTranscriptAdapter extends RecyclerView.Adapter<VoiceTranscriptAdapter.ViewHolder> {

  private final List<ChatMessage> messages = new ArrayList<>();

  public void addMessage(ChatMessage message) {
    messages.add(message);
    notifyItemInserted(messages.size() - 1);
  }

  /** Appends to the last message if it has the same role (used for streamed transcripts). */
  public void appendToLast(ChatMessage.Role role, String text) {
    if (!messages.isEmpty() && messages.get(messages.size() - 1).getRole() == role) {
      messages.get(messages.size() - 1).appendText(text);
      notifyItemChanged(messages.size() - 1);
    } else {
      addMessage(new ChatMessage(role, text));
    }
  }

  public void clear() {
    int size = messages.size();
    messages.clear();
    notifyItemRangeRemoved(0, size);
  }

  public int getLastIndex() {
    return messages.size() - 1;
  }

  @NonNull
  @Override
  public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
    View view =
        LayoutInflater.from(parent.getContext())
            .inflate(R.layout.item_chat_message, parent, false);
    return new ViewHolder(view);
  }

  @Override
  public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
    ChatMessage message = messages.get(position);
    holder.bind(message);
  }

  @Override
  public int getItemCount() {
    return messages.size();
  }

  static class ViewHolder extends RecyclerView.ViewHolder {
    private final TextView bubble;

    ViewHolder(@NonNull View itemView) {
      super(itemView);
      bubble = itemView.findViewById(R.id.bubble_text);
    }

    void bind(ChatMessage message) {
      bubble.setText(message.getText());
      FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) bubble.getLayoutParams();

      switch (message.getRole()) {
        case USER:
          params.gravity = Gravity.END;
          bubble.setBackgroundResource(R.drawable.bg_chat_bubble_user);
          bubble.setTextColor(0xFFFFFFFF);
          bubble.setTypeface(Typeface.DEFAULT);
          break;
        case MODEL:
          params.gravity = Gravity.START;
          bubble.setBackgroundResource(R.drawable.bg_chat_bubble_model);
          bubble.setTextColor(0xFF292929);
          bubble.setTypeface(Typeface.DEFAULT);
          break;
        case ACTION:
          params.gravity = Gravity.CENTER_HORIZONTAL;
          bubble.setBackgroundResource(R.drawable.bg_chat_bubble_action);
          bubble.setTextColor(0xFF292929);
          bubble.setTypeface(Typeface.DEFAULT, Typeface.ITALIC);
          break;
        case SYSTEM:
        default:
          params.gravity = Gravity.CENTER_HORIZONTAL;
          bubble.setBackground(null);
          bubble.setTextColor(0xFF98999B);
          bubble.setTypeface(Typeface.DEFAULT, Typeface.ITALIC);
          break;
      }
      bubble.setLayoutParams(params);
    }
  }
}
