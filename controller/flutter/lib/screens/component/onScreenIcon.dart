import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:openbot_controller/buttonCommands/buttonCommands.dart';
import 'package:openbot_controller/screens/component/blinkingButton.dart';
import 'package:openbot_controller/globals.dart';

/// Bottom row: mirror, speaker, camera, indicators, logs, network, lights.
class OnScreenIcon extends StatefulWidget {
  final dynamic updateMirrorView;
  final bool indicatorLeft;
  final bool indicatorRight;
  final bool lightsActive;
  final VoidCallback onLightsTap;
  final RTCPeerConnection? peerConnection;
  final String fragmentType;

  const OnScreenIcon(
      this.updateMirrorView,
      this.indicatorLeft,
      this.indicatorRight,
      this.lightsActive,
      this.onLightsTap,
      this.peerConnection,
      this.fragmentType,
      {super.key});

  @override
  State<StatefulWidget> createState() {
    return OnScreenIconState();
  }
}

class OnScreenIconState extends State<OnScreenIcon> {
  bool mirrorView = false;
  bool speaker = false;
  bool leftIndicator = false;
  bool rightIndicator = false;
  String typeOfFragment = "";

  @override
  void initState() {
    super.initState();
    leftIndicator = widget.indicatorLeft;
    rightIndicator = widget.indicatorRight;
    typeOfFragment = widget.fragmentType;
  }

  @override
  void didUpdateWidget(covariant OnScreenIcon oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.indicatorLeft != widget.indicatorLeft ||
        oldWidget.indicatorRight != widget.indicatorRight ||
        oldWidget.fragmentType != widget.fragmentType) {
      setState(() {
        leftIndicator = widget.indicatorLeft;
        rightIndicator = widget.indicatorRight;
        typeOfFragment = widget.fragmentType;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    /// SD logs only in data-collection mode.
    final bool isLogsEnabled = typeOfFragment == "DataCollection";
    /// Network picker only in autopilot / object-detection modes.
    final bool isNetworkEnabled =
        typeOfFragment == "Autopilot" || typeOfFragment == "ObjectDetection";
    return SizedBox(
      child: Row(
        children: [
          GestureDetector(
              onTap: () {
                setState(() {
                  mirrorView = !mirrorView;
                  widget.updateMirrorView.call();
                });
              },
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: mirrorView
                      ? const Color(0xFF0071C5).withOpacity(0.5)
                      : Colors.white.withOpacity(0.5),
                ),
                child: Image.asset(
                  mirrorView
                      ? "images/mirror_view_icon_white.png"
                      : "images/mirror_view_icon_blue.png",
                  height: 23,
                  width: 23,
                ),
              )),
          const SizedBox(
            width: 15,
          ),
          GestureDetector(
              onTap: () async {
                setState(() {
                  speaker = !speaker;
                });
                if (widget.peerConnection != null) {
                  List<RTCRtpReceiver> receivers =
                      await widget.peerConnection!.receivers;
                  RTCRtpReceiver firstReceiver = receivers[0];
                  if (receivers.isNotEmpty) {
                    if (speaker) {
                      firstReceiver.track!.enabled = false;
                    } else {
                      firstReceiver.track!.enabled = true;
                    }
                  }
                }
              },
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: speaker
                      ? const Color(0xFF0071C5).withOpacity(0.5)
                      : Colors.white.withOpacity(0.5),
                ),
                child: Image.asset(
                  speaker
                      ? "images/speaker_icon_white.png"
                      : "images/speaker_icon_blue.png",
                  height: 23,
                  width: 23,
                ),
              )),
          const SizedBox(
            width: 15,
          ),
          InkWell(
              borderRadius: const BorderRadius.all(Radius.circular(45)),
              onTap: () {
                ButtonCommands.toSwitchCamera();
              },
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: Colors.white.withOpacity(0.5),
                ),
                child: Image.asset(
                  "images/camera_icon_blue.png",
                  height: 23,
                  width: 23,
                ),
              )),
          const SizedBox(
            width: 15,
          ),
          GestureDetector(
              onTap: () {
                if (rightIndicator) {
                  ButtonCommands.toStopIndicator();
                  ButtonCommands.toLeftIndicator();
                } else {
                  if (leftIndicator) {
                    ButtonCommands.toStopIndicator();
                  } else {
                    ButtonCommands.toLeftIndicator();
                  }
                }
              },
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: leftIndicator
                      ? const Color(0xFF0071C5).withOpacity(0.5)
                      : Colors.white.withOpacity(0.5),
                ),
                child: leftIndicator
                    ? const MyBlinkingButton(isLeft: true)
                    : Image.asset(
                        "images/left_indicator_icon_blue.png",
                        height: 23,
                        width: 23,
                      ),
              )),
          const SizedBox(
            width: 15,
          ),
          GestureDetector(
              onTap: () {
                if (leftIndicator) {
                  ButtonCommands.toStopIndicator();
                  ButtonCommands.toRightIndicator();
                } else {
                  if (rightIndicator) {
                    ButtonCommands.toStopIndicator();
                  } else {
                    ButtonCommands.toRightIndicator();
                  }
                }
              },
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: rightIndicator
                      ? const Color(0xFF0071C5).withOpacity(0.5)
                      : Colors.white.withOpacity(0.5),
                ),
                child: rightIndicator
                    ? const MyBlinkingButton(isLeft: false)
                    : Image.asset(
                        "images/right_indicator_icon_blue.png",
                        height: 23,
                        width: 23,
                      ),
              )),
          const SizedBox(
            width: 15,
          ),
          Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(45),
                splashColor: Colors.white.withOpacity(0.2),
                highlightColor: Colors.white.withOpacity(0.12),
                onTap: isLogsEnabled
                    ? () {
                        clientSocket?.writeln("{command: LOGS}");
                      }
                    : null,
                child: Ink(
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(45),
                    color: isLogsEnabled
                        ? const Color(0xFF0071C5).withOpacity(0.5)
                        : Colors.grey.withOpacity(0.5),
                  ),
                  child: Icon(
                    Icons.sd_card,
                    color: isLogsEnabled ? Colors.white : Colors.blue,
                  ),
                ),
              )),
          const SizedBox(
            width: 15,
          ),
          Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(45),
                splashColor: Colors.white.withOpacity(0.2),
                highlightColor: Colors.white.withOpacity(0.12),
                onTap: isNetworkEnabled
                    ? () {
                        clientSocket?.writeln("{command: NETWORK}");
                      }
                    : null,
                child: Ink(
                  padding: const EdgeInsets.all(15),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(45),
                    color: isNetworkEnabled
                        ? const Color(0xFF0071C5).withOpacity(0.5)
                        : Colors.grey.withOpacity(0.5),
                  ),
                  child: Icon(Icons.person_search_outlined,
                      color: isNetworkEnabled
                          ? Colors.white
                          : Colors.blue),
                ),
              )),
          const SizedBox(width: 15),
          GestureDetector(
              onTap: widget.onLightsTap,
              child: Container(
                padding: const EdgeInsets.all(15),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(45),
                  color: widget.lightsActive
                      ? const Color(0xFF0071C5).withOpacity(0.5)
                      : Colors.white.withOpacity(0.5),
                ),
                child: Icon(
                  widget.lightsActive
                      ? Icons.flashlight_on
                      : Icons.flashlight_on_outlined,
                  size: 23,
                  color: widget.lightsActive ? Colors.white : Colors.blue,
                ),
              )),
        ],
      ),
    );
  }
}
