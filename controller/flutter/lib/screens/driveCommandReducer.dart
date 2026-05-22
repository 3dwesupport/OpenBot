import 'package:openbot_controller/globals.dart';
import 'package:openbot_controller/utils/forwardSpeed.dart';

/// Sends left/right drive only when values change enough (less spam on the socket).
class DriveCommandReducer {
  static double lastRight = 0;
  static double lastLeft = 0;
  static double withinRange = .02;

  /// Build driveCmd and write if different from last send.
  static void filter(double rightValue, double leftValue) {
    if (isDifferent(rightValue, leftValue)) {
      lastLeft = leftValue;
      lastRight = rightValue;
      String msg =
          "{driveCmd: {r:${rightValue.toPrecision(2)}, l:${leftValue.toPrecision(2)}}}";
      clientSocket?.writeln(msg);
    }
  }

  static bool isDifferent(double right, double left) {
    if ((left - lastLeft).abs() <= withinRange &&
        (right - lastRight).abs() <= withinRange) {
      return false;
    }
    return true;
  }
}
