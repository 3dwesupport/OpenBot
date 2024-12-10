import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:uuid/uuid.dart';

class WebSocketService {
  final String url;
  final String clientId = const Uuid().v4();

  WebSocketService({required this.url});

  WebSocket? _socket;
  final StreamController<String> _messageController =
      StreamController.broadcast();

  /// Connect to the WebSocket server
  Future<void> connect() async {
    try {
      _socket = await WebSocket.connect(url);
      print('Connected to WebSocket server');
      // Listen for incoming messages
      _socket?.listen(
        (message) {
          _handleMessage(message);
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

  /// Handle incoming WebSocket messages
  void _handleMessage(String message) {
    try {
      final decodedMessage = jsonDecode(message);

      // Check the type of the message
      if (decodedMessage['type'] == 'transcript') {
        final transcript = decodedMessage['transcript'];
        _messageController.add(transcript); // Add transcript to the stream
        print('Received transcript: $transcript');
      } else {
        _messageController.add(message); // Add other messages to the stream
        print('Received other message: $message');
      }
    } catch (e) {
      print('Error decoding message: $e');
    }
  }
  /// Send a message to the WebSocket server
  void sendMessage(String message) {
    if (_socket != null && _socket!.readyState == WebSocket.open) {
      final payload = jsonEncode({
        "clientId": clientId,
        "audio": message,
      });
      _socket!.add(payload);
      print('Message sent: $message');
    } else {
      print('WebSocket is not connected or not open: ${_socket?.readyState}');
    }
  }

  void registerClient() {
    if (_socket != null && _socket!.readyState == WebSocket.open) {
      final payload = jsonEncode({
        "clientId": clientId,
      });
      _socket!.add(payload);
      print('Client registered with ID: $clientId');
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
