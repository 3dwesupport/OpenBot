import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:nsd/nsd.dart';
import 'package:openbot_controller/screens/tiltingPhoneMode.dart';

import 'onScreenMode.dart';

/// Picks tilt mode or on-screen dual sliders + bottom icons.
class ControlSelector extends StatefulWidget {
  final dynamic updateMirrorView;
  final bool indicatorLeft;
  final bool indicatorRight;
  final bool lightsActive;
  final VoidCallback onLightsTap;
  final List<Service> networkServices;
  final RTCPeerConnection? peerConnection;
  final bool isTiltingPhoneMode;
  final bool isScreenMode;
  final String fragmentType;

  const ControlSelector(
      this.updateMirrorView,
      this.indicatorLeft,
      this.indicatorRight,
      this.lightsActive,
      this.onLightsTap,
      this.networkServices,
      this.peerConnection,
      this.isTiltingPhoneMode,
      this.isScreenMode,
      this.fragmentType,
      {super.key});

  @override
  State<StatefulWidget> createState() {
    return ControlSelectorState();
  }
}

class ControlSelectorState extends State<ControlSelector> {
  String dropDownValue = 'No server';
  late List<DropdownMenuItem<String>> items = [];

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isTiltingPhoneMode) {
      return TiltingPhoneMode(
        fragmentType: widget.fragmentType,
        lightsActive: widget.lightsActive,
        onLightsTap: widget.onLightsTap,
      );
    } else if (widget.isScreenMode) {
      return OnScreenMode(
          widget.updateMirrorView,
          widget.indicatorLeft,
          widget.indicatorRight,
          widget.lightsActive,
          widget.onLightsTap,
          widget.peerConnection,
          widget.fragmentType);
    } else {
      return OnScreenMode(
          widget.updateMirrorView,
          widget.indicatorLeft,
          widget.indicatorRight,
          widget.lightsActive,
          widget.onLightsTap,
          widget.peerConnection,
          widget.fragmentType);
    }
  }
}