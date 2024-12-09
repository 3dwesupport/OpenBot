import 'package:flutter/material.dart';
import 'package:avatar_glow/avatar_glow.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'dart:io';

import 'package:permission_handler/permission_handler.dart';

class AnimatedMicButton extends StatefulWidget {
  final bool animate;
  final Function(String audioPath) onAudioCaptured;

  const AnimatedMicButton({
    super.key,
    required this.animate,
    required this.onAudioCaptured,
  });

  @override
  _AnimatedMicButtonState createState() => _AnimatedMicButtonState();
}

class _AnimatedMicButtonState extends State<AnimatedMicButton> {
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  FlutterSound flutterSound = FlutterSound();

  bool _isRecording = false;


  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return AvatarGlow(
      startDelay: const Duration(milliseconds: 1000),
      glowColor: Colors.white,
      glowShape: BoxShape.circle,
      animate: widget.animate,
      child: Material(
        elevation: 8.0,
        shape: const CircleBorder(),
        color: const Color(0xFF0071C5),
        child: CircleAvatar(
          backgroundColor: Colors.transparent,
          child: GestureDetector(
            onTapDown: (details) {
              // Start recording when the button is pressed
              print("Start Recording");
            },
            onTapUp: (details) {
              // Stop recording when the button is released
              print("Stop Recording");
            },
            onTapCancel: () {
              // Handle case where touch is canceled
              print("Recording Cancelled");
            },
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isRecording ? Icons.stop : Icons.mic,
                color: Colors.white,
                size: 25,
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _recorder.closeRecorder();
    super.dispose();
  }
}
