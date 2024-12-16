import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:avatar_glow/avatar_glow.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:path_provider/path_provider.dart';

class AnimatedMicButton extends StatefulWidget {
  final bool animate;
  final Function sendAudioBuffer;
  final Function createClientResponse;

  const AnimatedMicButton(
      {required this.sendAudioBuffer,
      required this.animate,
      super.key,
      required this.createClientResponse});

  @override
  AnimatedMicButtonState createState() => AnimatedMicButtonState();
}

class AnimatedMicButtonState extends State<AnimatedMicButton> {
  bool _isListening = false;
  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  bool _hasPermission = false;
  String? _audioFilePath;

  @override
  void initState() {
    super.initState();
    _requestPermission();
  }

  Future<void> _requestPermission() async {
    final status = await Permission.microphone.request();
    setState(() {
      _hasPermission = status.isGranted;
    });
  }

  Future<void> _startRecording() async {
    if (_hasPermission) {
      await _recorder.openRecorder();
      setState(() {
        _isListening = true;
      });
      Directory tempDir = await getTemporaryDirectory();
      _audioFilePath = '${tempDir.path}/audio.wav';

      await _recorder.startRecorder(
        toFile: _audioFilePath,
        codec: Codec.pcm16WAV,
      );
    }
  }

  Future<void> _stopRecording() async {
    if (_isListening) {
      await _recorder.stopRecorder();
      await _recorder.closeRecorder();

      setState(() {
        _isListening = false;
      });

      // After stopping, send the audio file.
      if (_audioFilePath != null) {
        File audioFile = File(_audioFilePath!);
        List<int> audioBytes = await audioFile.readAsBytes();

        // Convert the audio byte data to a base64 string
        String base64Audio = base64Encode(audioBytes);

        // Send the base64 audio to the server
        await _sendAudioToServer(base64Audio);
      }
    }
  }

  Future<void> _sendAudioToServer(String base64Audio) async {
    // Send the base64-encoded audio buffer to the parent widget
    widget.sendAudioBuffer(base64Audio);

    // Call the response creation function
    widget.createClientResponse();
  }

  @override
  void dispose() {
    _recorder.closeRecorder();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AvatarGlow(
      glowColor: Colors.white,
      duration: const Duration(milliseconds: 2000),
      repeat: true,
      animate: _isListening,
      // Trigger the animation when listening
      child: Material(
        elevation: 8.0,
        shape: const CircleBorder(),
        color: const Color(0xFF0071C5),
        child: CircleAvatar(
          backgroundColor: Colors.transparent,
          child: GestureDetector(
            onLongPressStart: (_) {
              _startRecording();
            },
            onLongPressEnd: (_) {
              _stopRecording();
            },
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.blue,
                shape: BoxShape.circle,
              ),
              child: Icon(
                _isListening ? Icons.stop : Icons.mic,
                color: Colors.white,
                size: 25,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
