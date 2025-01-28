import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'dart:convert';

class VADService {
  final Function(String)? onAudioRecorded;
  final Function? onVoiceStart;
  final Function? onVoiceStop;
  final Function(String)? sendAudioBuffer;

  late FlutterSoundRecorder _recorder;
  bool _isRecording = false;
  bool _isVoiceActive = false;

  StreamSubscription<RecordingDisposition>? _recordingProgressSubscription;

  Timer? _silenceTimer;
  Timer? _noiseCalibrationTimer;

  // Noise floor and voice detection parameters
  double _noiseFloor = 40.0;
  bool _isCalibrated = false;
  final List<double> _decibelHistory = [];
  final int _historySize = 20; // Larger history for better smoothing
  final double _voiceThreshold = 10.0; // dB above noise floor to detect voice
  final Duration _silenceDuration =
      const Duration(seconds: 2); // Silence duration to stop recording

  VADService({
    this.onAudioRecorded,
    this.onVoiceStart,
    this.onVoiceStop,
    this.sendAudioBuffer,
  }) {
    _recorder = FlutterSoundRecorder();
  }

  Future<void> initRecorder() async {
    try {
      print("[VADService] Initializing recorder...");
      await _recorder.openRecorder();
      await _recorder
          .setSubscriptionDuration(const Duration(milliseconds: 100));
      print("[VADService] Recorder initialized successfully");
    } catch (e) {
      print("[VADService] Error initializing recorder: $e");
    }
  }

  Future<void> startRecording() async {
    if (_isRecording) {
      print("[VADService] Recording is already in progress");
      return;
    }

    try {
      final directory = await getApplicationDocumentsDirectory();
      final filePath = '${directory.path}/recording.wav';
      print("[VADService] Recording file path: $filePath");

      print("[VADService] Starting recorder...");
      await _recorder.startRecorder(
        toFile: filePath,
        codec: Codec.pcm16WAV,
      );

      _isRecording = true;
      print("[VADService] Recording started");

      // Calibrate noise floor during the first few seconds
      _noiseCalibrationTimer = Timer(const Duration(seconds: 2), () {
        if (!_isCalibrated && _decibelHistory.isNotEmpty) {
          _noiseFloor =
              _decibelHistory.reduce((a, b) => a + b) / _decibelHistory.length;
          _isCalibrated = true;
          print("[VADService] Noise floor calibrated: $_noiseFloor");
        }
      });

      // Listen to recording progress for VAD
      _recordingProgressSubscription =
          _recorder.onProgress?.listen((disposition) async {
        final decibels = disposition.decibels ?? _noiseFloor;

        // Smooth decibel values using a moving average
        _decibelHistory.add(decibels);
        if (_decibelHistory.length > _historySize) {
          _decibelHistory.removeAt(0);
        }
        final double averageDecibels =
            _decibelHistory.reduce((a, b) => a + b) / _decibelHistory.length;

        // Voice detection logic
        if (averageDecibels > (_noiseFloor + _voiceThreshold)) {
          if (!_isVoiceActive) {
            _isVoiceActive = true;
            print("[VADService] Voice detected. Starting recording...");
            onVoiceStart?.call();
          }

          // Reset the silence timer
          _silenceTimer?.cancel();
          _silenceTimer = Timer(_silenceDuration, () {
            if (_isVoiceActive) {
              _isVoiceActive = false;
              print("[VADService] Silence detected. Stopping recording...");
              onVoiceStop?.call();
              stopRecording();
            }
          });
        }
      });
    } catch (e) {
      print("[VADService] Error starting recording: $e");
    }
  }

  Future<void> stopRecording() async {
    if (!_isRecording) {
      print("[VADService] No recording in progress to stop");
      return;
    }

    try {
      print("[VADService] Stopping recorder...");
      final filePath = await _recorder.stopRecorder();
      _isRecording = false;
      print("[VADService] Recording stopped");

      _recordingProgressSubscription?.cancel();
      _noiseCalibrationTimer?.cancel();
      _silenceTimer?.cancel();

      if (filePath != null) {
        final file = File(filePath);
        final audioData = await file.readAsBytes();
        print("[VADService] Audio file size: ${audioData.length} bytes");

        final base64Audio = base64Encode(audioData);
        print("[VADService] Audio encoded to base64: $base64Audio");

        onAudioRecorded?.call(base64Audio);
        sendAudioBuffer?.call(base64Audio);

        await file.delete();
        initRecorder();
        startRecording();
        print("[VADService] Temporary audio file deleted");
      }
    } catch (e) {
      print("[VADService] Error stopping recording: $e");
    }
  }

  Future<void> dispose() async {
    try {
      print("[VADService] Disposing recorder...");
      await _recorder.stopRecorder();
      _recordingProgressSubscription?.cancel();
      _silenceTimer?.cancel();
      _noiseCalibrationTimer?.cancel();
      print("[VADService] Recorder disposed");
    } catch (e) {
      print("[VADService] Error disposing recorder: $e");
    }
  }
}
