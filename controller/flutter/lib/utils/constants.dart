import 'dart:convert';
import 'dart:typed_data';

final utf8encoder = Utf8Encoder();

/// WebRTC and NSD registration defaults.
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
}
