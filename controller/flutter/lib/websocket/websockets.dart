import 'dart:async';
import 'dart:convert';
import 'dart:io';

class WebSocketService {
  final String url;

  WebSocketService({required this.url});

  WebSocket? _socket;
  final StreamController<String> _messageController =
      StreamController.broadcast();

  /// Connect to the WebSocket server
  Future<void> connect() async {
    try {
      _socket = await WebSocket.connect(url);
      print('Connected to WebSocket server');
      _socket?.listen(
        (message) {
          _messageController
              .add(message); // Add incoming messages to the stream
        },
        onDone: () {
          print('WebSocket connection closed');
        },
        onError: (error) {
          print('WebSocket error: $error');
        },
      );
    } catch (e) {
      print('Failed to connect to WebSocket: $e');
    }
  }

  /// Send a message to the WebSocket server
  void sendMessage(String message) {
    if (_socket != null && _socket!.readyState == WebSocket.open) {
      _socket!.add(jsonEncode({"text": message}));
    } else {
      print('WebSocket is not connected');
    }
  }

  /// Close the WebSocket connection
  void close() {
    _socket?.close();
    _messageController.close();
  }

  /// Stream for incoming messages
  Stream<String> get messages => _messageController.stream;
}
