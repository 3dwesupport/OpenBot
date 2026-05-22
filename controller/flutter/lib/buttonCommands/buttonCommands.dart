import '../globals.dart';

/// JSON commands we send to the bot over the socket.
class ButtonCommands {
  static void toSwitchCamera() {
    clientSocket?.writeln("{command: SWITCH_CAMERA}");
  }

  static void toLeftIndicator() {
    clientSocket?.writeln("{command: INDICATOR_LEFT}");
  }

  static void toRightIndicator() {
    clientSocket?.writeln("{command: INDICATOR_RIGHT}");
  }

  static void toStopIndicator() {
    clientSocket?.writeln("{command: INDICATOR_STOP}");
  }

  /// Robot headlights, 0–100 (same as Robot Info slider).
  static void setLedBrightness(int percent) {
    clientSocket?.writeln("LIGHT:${percent.clamp(0, 100)}");
  }
}
