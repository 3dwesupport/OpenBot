package org.openbot.app.robot.voice;

/** One entry in the on-screen voice conversation transcript. */
public class ChatMessage {

  public enum Role {
    USER,
    MODEL,
    ACTION,
    SYSTEM
  }

  private final Role role;
  private String text;

  public ChatMessage(Role role, String text) {
    this.role = role;
    this.text = text;
  }

  public Role getRole() {
    return role;
  }

  public String getText() {
    return text;
  }

  public void appendText(String more) {
    this.text = this.text + more;
  }
}
