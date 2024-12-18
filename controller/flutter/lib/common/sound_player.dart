import 'dart:typed_data';
import 'package:flutter_sound/public/flutter_sound_player.dart';

class SoundPlayer {
  final FlutterSoundPlayer _soundPlayer = FlutterSoundPlayer();

  Future<void> init() async {
    try {
      await _soundPlayer.openPlayer();
    } catch (e) {
      print('Error initializing SoundPlayer: $e');
    }
  }
  Future<void> play(Uint8List audio) async {
    await _soundPlayer.startPlayerFromStream(sampleRate: 26000);
    await _soundPlayer.feedFromStream(audio);
    await _soundPlayer.stopPlayer();
  }

  //Todo not in usage
  Future<void> dispose() async {
  }

}
