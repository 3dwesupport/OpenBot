import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:openbot_controller/globals.dart';

enum RealtimeState { idle, listening, processing }

class RealtimeService {
  RealtimeService._();
  static final RealtimeService instance = RealtimeService._();

  static const _wsUrl = 'ws://192.168.1.44:8000/ws/realtime';
  // String.fromEnvironment(
  //   'BACKEND_WS_URL',
  //   defaultValue: 'ws://localhost:8000/ws/realtime',
  // );

  WebSocket? _ws;
  StreamSubscription? _wsSub;

  final FlutterSoundRecorder _recorder = FlutterSoundRecorder();
  bool _recorderOpened = false;
  StreamController<Uint8List>? _audioCtrl;
  StreamSubscription? _audioSub;
  final List<Uint8List> _audioBatch = [];
  Timer? _batchTimer;
  Timer? _driveTimer;

  bool _commitPending = false;
  bool _stopping = false;
  RealtimeState _state = RealtimeState.idle;

  VoidCallback? onStateChange;
  VoidCallback? onResponseDone;

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

  // Opens mic only. Backend websocket is connected separately via
  // connectBackend()/disconnectBackend() (driven by device status).
  Future<bool> start() async {
    if (!isIdle) return false;
    _stopping = false;
    print('start requested');
    try {
      await _ensureRecorderOpen();
      await _startMic();
      _setState(RealtimeState.listening);
      _connectWs(); // fire-and-forget if not already connected
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

  // PTT release: stop mic immediately (UI goes idle), send commit to WS if connected.
  Future<void> commitAndStop() async {
    if (isIdle) return;
    print('commitAndStop requested');
    _commitPending = false;
    _send({'type': 'commit'}); // send before stopping mic
    await _stopMic();
    _setState(RealtimeState.idle);
    // Keep WS connection alive; backend connect/disconnect is managed by device status.
  }

  void commit() {
    if (isListening) {
      _setState(RealtimeState.processing);
      _send({'type': 'commit'});
    } else if (!isIdle) {
      _commitPending = true;
    }
  }

  Future<void> stop({bool disconnectBackend = false}) async {
    if (isIdle) return;
    print('stop requested');
    _stopping = disconnectBackend;
    _commitPending = false;
    if (disconnectBackend) _closeWs('stop');
    await _stopMic();
    _driveTimer?.cancel();
    _setState(RealtimeState.idle);
  }

  Future<void> connectBackend() async {
    print('connectBackend requested');
    _stopping = false;
    await _connectWs();
  }

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
          _executeCommand(msg);
          break;
        case 'response_done':
          if (isProcessing) _setState(RealtimeState.listening);
          onResponseDone?.call();
          break;
      }
    } catch (e) {
      print('message parse/handle error: $e');
    }
  }

  void _executeCommand(Map<String, dynamic> cmd) {
    switch (cmd['action'] as String? ?? '') {
      case 'drive':
        final r = ((cmd['r'] as num?) ?? 0).toDouble().clamp(-1.0, 1.0);
        final l = ((cmd['l'] as num?) ?? 0).toDouble().clamp(-1.0, 1.0);
        final secs = (cmd['seconds'] as num?)?.toInt();
        _driveTimer?.cancel();
        clientSocket?.writeln('{driveCmd: {r:${r.toStringAsFixed(2)}, l:${l.toStringAsFixed(2)}}}');
        if (secs != null) {
          _driveTimer = Timer(Duration(seconds: secs), () {
            clientSocket?.writeln('{driveCmd: {r:0.00, l:0.00}}');
          });
        }
        break;
      case 'stop':
        _driveTimer?.cancel();
        clientSocket?.writeln('{driveCmd: {r:0.00, l:0.00}}');
        break;
      case 'indicator':
        final side = cmd['side'] as String? ?? 'stop';
        if (side == 'left') clientSocket?.writeln('{command: INDICATOR_LEFT}');
        else if (side == 'right') clientSocket?.writeln('{command: INDICATOR_RIGHT}');
        else clientSocket?.writeln('{command: INDICATOR_STOP}');
        break;
      case 'camera':
        clientSocket?.writeln('{command: SWITCH_CAMERA}');
        break;
    }
  }

  void _send(Map<String, dynamic> msg) {
    try {
      final type = msg['type'] ?? 'unknown';
      print('sending websocket message: $type');
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
      final total = _audioBatch.fold<int>(0, (s, b) => s + b.length);
      final merged = Uint8List(total);
      var offset = 0;
      for (final chunk in _audioBatch) {
        merged.setRange(offset, offset + chunk.length, chunk);
        offset += chunk.length;
      }
      _audioBatch.clear();
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

  Future<void> preWarm() async {
    try { await _ensureRecorderOpen(); } catch (_) {}
  }

  Future<void> dispose() async {
    await stop(disconnectBackend: true);
    if (_recorderOpened) {
      await _recorder.closeRecorder();
      _recorderOpened = false;
    }
  }
}
