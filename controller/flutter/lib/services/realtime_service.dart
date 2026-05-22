import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:openbot_controller/buttonCommands/buttonCommands.dart';
import 'package:openbot_controller/globals.dart';
import 'package:permission_handler/permission_handler.dart';

enum RealtimeState { idle, listening, processing }

/// Mic → websocket → AI drives the robot from voice.
class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  static const _wsUrl = 'ws://192.168.1.19:8000/ws/realtime';

  WebSocket? _ws;
  StreamSubscription? _wsSub;

  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  bool _recorderOpened = false;
  StreamController<Uint8List>? _audioCtrl;
  StreamSubscription? _audioSub;
  final List<Uint8List> _audioBatch = [];
  Timer? _batchTimer;
  Timer? _driveTimer;               // auto-stops robot after drive(seconds: N)
  Timer? _lightsTimer;              // auto-dims lights after lights(seconds: N)

  bool _commitPending = false;
  bool _stopping = false;
  bool _routineCancelled = false;

  static const int _minCommitBytes = 4800;
  int _audioBytesSinceResponse = 0;

  RealtimeState _state = RealtimeState.idle;

  VoidCallback? onStateChange;
  VoidCallback? onResponseDone;
  /// Called with brightness 0–100 so the torch button stays in sync.
  void Function(int percent)? onLightsChanged;

  RealtimeState get state => _state;
  bool get isIdle => _state == RealtimeState.idle;
  bool get isListening => _state == RealtimeState.listening;
  bool get isProcessing => _state == RealtimeState.processing;

  void print(String message) {
    if (kDebugMode) debugPrint('[RealtimeService] $message');
  }

  void _setState(RealtimeState s) {
    _state = s;
    onStateChange?.call();
  }

  Future<bool> _ensureMicPermission() async {
    if (!Platform.isAndroid && !Platform.isIOS) return true;
    var status = await Permission.microphone.status;
    if (status.isGranted) return true;

    if (status.isPermanentlyDenied || status.isRestricted) {
      print('microphone permission denied: $status');
      Fluttertoast.showToast(
        msg: Platform.isIOS
            ? 'Microphone blocked. Open Settings → Openbot Controller → Microphone.'
            : 'Microphone blocked. Enable it in Settings → Apps → OpenBot Controller.',
      );
      await openAppSettings();
      return false;
    }

    status = await Permission.microphone.request();
    if (status.isGranted) return true;

    print('microphone permission denied: $status');
    if (status.isPermanentlyDenied || status.isRestricted) {
      Fluttertoast.showToast(
        msg: Platform.isIOS
            ? 'Microphone blocked. Open Settings → Openbot Controller → Microphone.'
            : 'Microphone blocked. Enable it in Settings → Apps → OpenBot Controller.',
      );
      await openAppSettings();
    } else {
      Fluttertoast.showToast(
        msg: 'Microphone permission is required for voice control.',
      );
    }
    return false;
  }

  /// Open mic and start streaming (PTT or always-on).
  Future<bool> start() async {
    if (!isIdle) return false;
    _stopping = false;
    _audioBytesSinceResponse = 0;
    print('start requested');
    try {
      if (!await _ensureMicPermission()) return false;
      await _ensureRecorderOpen();
      await _startMic();
      _setState(RealtimeState.listening);
      _connectWs();
      print('mic started, connecting websocket to $_wsUrl');
      return true;
    } catch (e) {
      print('start failed: $e');
      await _stopMic();
      _setState(RealtimeState.idle);
      return false;
    }
  }

  Future<void> _connectWs() async {
    if (_ws != null) {
      print('websocket already connected');
      return;
    }
    print('websocket connect attempt');
    try {
      final ws = await WebSocket.connect(_wsUrl)
          .timeout(const Duration(seconds: 5));
      print('websocket after attempt@@@@@@');

      if (_stopping) {
        print('websocket opened while stopping, closing');
        await ws.close();
        return;
      }
      _ws = ws;
      print('websocket connected');
      _wsSub = _ws!.listen(
        _onMessage,
        onError: (err) {
          print('websocket error: $err');
          _closeWs('stream error');
        },
        onDone: () {
          print('websocket stream done');
          _closeWs('stream done');
        },
      );
      if (_commitPending) {
        print('sending queued commit after websocket connect');
        _commitPending = false;
        commit();
      }
    } catch (e) {
      print('websocket connect error: $e');
    }
  }

  void _closeWs([String reason = 'manual']) {
    print('closing websocket ($reason)');
    _wsSub?.cancel();
    _wsSub = null;
    _ws?.close();
    _ws = null;
    print('websocket closed');
  }

  /// PTT released — send audio and wait for reply.
  Future<void> commitAndStop() async {
    if (isIdle) return;
    print('commitAndStop requested (audio since last response: $_audioBytesSinceResponse bytes)');
    _commitPending = false;
    if (_audioBytesSinceResponse >= _minCommitBytes) {
      _send({'type': 'commit'});
    } else {
      print('skip commit on release — no new speech after last response');
      _send({'type': 'clear'});
    }
    await _stopMic();
    _setState(RealtimeState.idle);
  }

  /// Send commit to the voice backend (queued if websocket not ready).
  void commit() {
    if (isListening) {
      _setState(RealtimeState.processing);
      _send({'type': 'commit'});
    } else if (!isIdle) {
      _commitPending = true;
    }
  }

  /// Stop mic; optional full backend teardown.
  Future<void> stop({bool disconnectBackend = false}) async {
    if (isIdle) return;
    print('stop requested');
    _stopping = disconnectBackend;
    _commitPending = false;
    if (disconnectBackend) _closeWs('stop');
    await _stopMic();
    _driveTimer?.cancel();
    _lightsTimer?.cancel();
    _setState(RealtimeState.idle);
  }

  /// Connect websocket when video session is live.
  Future<void> connectBackend() async {
    print('connectBackend requested');
    _stopping = false;
    await _connectWs();
  }

  /// Drop websocket when robot disconnects.
  Future<void> disconnectBackend() async {
    print('disconnectBackend requested');
    _stopping = true;
    _commitPending = false;
    _closeWs('device disconnected');
  }

  void _onMessage(dynamic raw) {
    if (raw is! String) return;
    try {
      final msg = jsonDecode(raw) as Map<String, dynamic>;
      print(' websocket message@@@@@@: $msg');

      final type = msg['type'] as String? ?? '';
      print('incoming websocket message: $type');
      switch (type) {
        case 'robot_command':
          _audioBytesSinceResponse = 0;
          _executeCommand(msg);
          break;
        case 'response_done':
          _audioBytesSinceResponse = 0;
          if (isProcessing) _setState(RealtimeState.listening);
          onResponseDone?.call();
          break;
      }
    } catch (e) {
      print('message parse/handle error: $e');
    }
  }

  /// Parses r/l from [m], sends drive JSON.
  void _driveFromMap(Map<String, dynamic> m, {required bool manageAutoStopTimer}) {
    final r = ((m['r'] as num?) ?? 0).toDouble().clamp(-1.0, 1.0);
    final l = ((m['l'] as num?) ?? 0).toDouble().clamp(-1.0, 1.0);
    if (manageAutoStopTimer) _driveTimer?.cancel();
    _sendDriveJsonToRobot(r, l, multiplier: m['multiplier']);
    if (manageAutoStopTimer) {
      final secs = (m['seconds'] as num?)?.toInt();
      if (secs != null) {
        _driveTimer = Timer(Duration(seconds: secs), () {
          _sendDriveJsonToRobot(0, 0);
        });
      }
    }
  }

  void _sendIndicatorSide(String side) {
    if (side == 'left') {
      clientSocket?.writeln('{command: INDICATOR_LEFT}');
    } else if (side == 'right') {
      clientSocket?.writeln('{command: INDICATOR_RIGHT}');
    } else {
      clientSocket?.writeln('{command: INDICATOR_STOP}');
    }
  }

  void _applyLightsLevel(int percent) {
    final level = percent.clamp(0, 100);
    ButtonCommands.setLedBrightness(level);
    onLightsChanged?.call(level);
  }

  /// Sends LIGHT:percent; optional `seconds` turns off after N seconds.
  void _lightsFromMap(Map<String, dynamic> m, {required bool scheduleAutoStop}) {
    final percent = ((m['percent'] as num?) ?? 0).round().clamp(0, 100);
    _lightsTimer?.cancel();
    _applyLightsLevel(percent);
    if (scheduleAutoStop) {
      final lightSecs = (m['seconds'] as num?)?.toInt();
      if (lightSecs != null && lightSecs > 0 && percent > 0) {
        _lightsTimer = Timer(Duration(seconds: lightSecs), () {
          _applyLightsLevel(0);
        });
      }
    }
  }

  /// Optional `seconds` schedules INDICATOR_STOP when [scheduleAutoStop] is true.
  void _indicatorFromMap(Map<String, dynamic> m, {required bool scheduleAutoStop}) {
    final side = m['side'] as String? ?? 'stop';
    _sendIndicatorSide(side);
    if (scheduleAutoStop) {
      final indicatorSecs = (m['seconds'] as num?)?.toInt();
      if (indicatorSecs != null && side != 'stop') {
        Timer(Duration(seconds: indicatorSecs), () {
          clientSocket?.writeln('{command: INDICATOR_STOP}');
        });
      }
    }
  }

  /// Stops motors; [cancelRoutine] aborts a running voice routine.
  void _haltMotors({required bool cancelRoutine}) {
    _driveTimer?.cancel();
    _lightsTimer?.cancel();
    if (cancelRoutine) _routineCancelled = true;
    _sendDriveJsonToRobot(0, 0);
  }

  void _applyRoutineStep(Map<String, dynamic> step) {
    switch (step['action'] as String? ?? 'stop') {
      case 'drive':
        _driveFromMap(step, manageAutoStopTimer: false);
        break;
      case 'indicator':
        _indicatorFromMap(step, scheduleAutoStop: false);
        break;
      case 'lights':
        _lightsFromMap(step, scheduleAutoStop: false);
        break;
      default:
        _haltMotors(cancelRoutine: false);
        break;
    }
  }

  /// Handle drive / stop / indicator / lights / camera / routine from voice AI.
  void _executeCommand(Map<String, dynamic> cmd) {
    switch (cmd['action'] as String? ?? '') {
      case 'drive':
        _driveFromMap(cmd, manageAutoStopTimer: true);
        break;
      case 'stop':
        _haltMotors(cancelRoutine: true);
        break;
      case 'indicator':
        _indicatorFromMap(cmd, scheduleAutoStop: true);
        break;
      case 'lights':
        _lightsFromMap(cmd, scheduleAutoStop: true);
        break;
      case 'camera':
        clientSocket?.writeln('{command: SWITCH_CAMERA}');
        break;
      case 'routine':
        final rawSteps = cmd['steps'];
        if (rawSteps is List) {
          _routineCancelled = false;
          _runRoutine(rawSteps.cast<Map<String, dynamic>>());
        }
        break;
    }
  }

  /// Runs routine steps; stops early if voice says stop.
  Future<void> _runRoutine(List<Map<String, dynamic>> steps) async {
    _driveTimer?.cancel();
    _lightsTimer?.cancel();

    for (final step in steps) {
      if (_routineCancelled) break;
      final secs = ((step['seconds'] as num?) ?? 0).toDouble();
      _applyRoutineStep(step);
      if (secs > 0) {
        await Future.delayed(Duration(milliseconds: (secs * 1000).toInt()));
      }
    }

    if (!_routineCancelled) {
      _sendDriveJsonToRobot(0, 0);
      clientSocket?.writeln('{command: INDICATOR_STOP}');
      _applyLightsLevel(0);
    }
  }

  void _sendDriveJsonToRobot(double r, double l, {dynamic multiplier}) {
    final driveCmd = <String, dynamic>{
      'r': double.parse(r.toStringAsFixed(2)),
      'l': double.parse(l.toStringAsFixed(2)),
    };
    final payload = <String, dynamic>{'driveCmd': driveCmd};
    final m = multiplier?.toString().trim();
    if (m == 'S' || m == 'M' || m == 'F') {
      payload['multiplier'] = m;
    }
    clientSocket?.writeln(jsonEncode(payload));
  }

  void _send(Map<String, dynamic> msg) {
    try {
      _ws?.add(jsonEncode(msg));
    } catch (e) {
      print('send failed: $e');
    }
  }

  Future<void> _ensureRecorderOpen() async {
    if (_recorderOpened) return;
    try {
      await _recorder.openRecorder();
      _recorderOpened = true;
    } catch (_) {
      try { await _recorder.closeRecorder(); } catch (_) {}
      try {
        await _recorder.openRecorder();
        _recorderOpened = true;
      } catch (_) {}
    }
  }

  Future<void> _startMic() async {
    _audioCtrl = StreamController<Uint8List>();
    _audioSub = _audioCtrl!.stream.listen((bytes) {
      if (bytes.isNotEmpty) _audioBatch.add(bytes);
    });
    _batchTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (_audioBatch.isEmpty || _ws == null) { _audioBatch.clear(); return; }
      final total  = _audioBatch.fold<int>(0, (s, b) => s + b.length);
      final merged = Uint8List(total);
      var offset   = 0;
      for (final chunk in _audioBatch) {
        merged.setRange(offset, offset + chunk.length, chunk);
        offset += chunk.length;
      }
      _audioBatch.clear();
      _audioBytesSinceResponse += merged.length;
      _send({'type': 'audio', 'data': base64Encode(merged)});
    });
    await _recorder.startRecorder(
      toStream: _audioCtrl!.sink,
      codec: Codec.pcm16,
      sampleRate: 24000,
      numChannels: 1,
    );
  }

  Future<void> _stopMic() async {
    _batchTimer?.cancel();
    _batchTimer = null;
    _audioBatch.clear();
    if (_recorder.isRecording) await _recorder.stopRecorder();
    await _audioSub?.cancel();
    _audioSub = null;
    await _audioCtrl?.close();
    _audioCtrl = null;
  }

  /// Open the recorder early so the first PTT tap is faster.
  Future<void> preWarm() async {
    try { await _ensureRecorderOpen(); } catch (_) {}
  }

  /// Release mic and websocket when the controller screen goes away.
  Future<void> dispose() async {
    await stop(disconnectBackend: true);
    if (_recorderOpened) {
      await _recorder.closeRecorder();
      _recorderOpened = false;
    }
  }
}
