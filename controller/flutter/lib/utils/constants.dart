import 'dart:typed_data';

import '../screens/Controller.dart';

class Constants {
  static Map<String, Uint8List?> textAttribute = <String, Uint8List?>{
    'a-string': utf8encoder.convert('κόσμε'),
    'a-blank': Uint8List(0),
    'a-null': null,
  };

  static Map<String, dynamic> peerConfiguration = {
    "iceServers": [
      {"url": "stun:stun.l.google.com:19302"},
    ]
  };

  static Map<String, dynamic> offerSdpConstraints = {
    "mandatory": {
      "OfferToReceiveAudio": "false",
      "OfferToReceiveVideo": "true",
    },
    "optional": [],
  };

  /// Shortens the id for display on-screen.
  static String shorten(String? id) {
    return id?.toString().substring(0, 4) ?? 'unknown';
  }
  static const openAIKey = ""; //Enter your Open Ai key here
  static const String instructions = '''
System settings:
Tool use: enabled.

Instructions:
- You are an artificial intelligence agent responsible for helping test realtime voice capabilities
- Please make sure to respond with a helpful voice via audio
- Be kind, helpful, and courteous
- It is okay to ask the user questions
- Use tools and functions you have available liberally, it is part of the training apparatus
- Be open to exploration and conversation
- Remember: this is just for fun and testing!

Personality:
- Be upbeat and genuine
- Try speaking quickly as if excited
''';
}
