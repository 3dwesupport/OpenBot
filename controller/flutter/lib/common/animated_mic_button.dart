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
  String? _audioPath;

  @override
  void initState() {
    super.initState();
    _initializeRecorder();
  }

  Future<void> _initializeRecorder() async {
    var status = await Permission.microphone.request();
    if (status.isGranted) {
      await _recorder.openRecorder();
    } else {
      throw Exception("Microphone permission not granted");
    }
  }

  Future<void> _startRecording() async {
    final dir = Directory.systemTemp;
    _audioPath = '${dir.path}/audio.wav';
    await _recorder.startRecorder(toFile: _audioPath);
    setState(() => _isRecording = true);
  }

  Future<void> _stopRecording() async {
    await _recorder.stopRecorder();
    setState(() => _isRecording = false);

    if (_audioPath != null) {
      widget.onAudioCaptured(_audioPath!);

    }
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
              print("details::$details");
              _startRecording();
              // Start recording when the button is pressed
              print("Start Recording");
            },
            onTapUp: (details) {
              _stopRecording();
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
