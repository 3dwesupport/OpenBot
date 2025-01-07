import 'dart:typed_data';
import 'package:flutter_sound/public/flutter_sound_player.dart';

class SoundPlayer {
  final FlutterSoundPlayer _soundPlayer = FlutterSoundPlayer();
  bool _isPlayerInitialized = false;

  Future<void> init() async {
    try {
      await _soundPlayer.openPlayer();
      _isPlayerInitialized = true;
    } catch (e) {
      print('Error initializing SoundPlayer: $e');
      _isPlayerInitialized = false;
    }
  }

  Future<void> play(Uint8List audio) async {
    if (!_isPlayerInitialized) {
      print('Player not initialized. Call init() first.');
      return;
    }

    try {
      // Make sure player is stopped before starting new playback
      if (_soundPlayer.isPlaying) {
        await _soundPlayer.stopPlayer();
      }

      // Configure the audio stream
      await _soundPlayer.startPlayerFromStream(sampleRate: 26000);

      // Feed the audio data
      await _soundPlayer.feedFromStream(audio);
    } catch (e) {
      print('Error playing audio: $e');
    }
  }

  Future<void> dispose() async {
    if (_isPlayerInitialized) {
      await _soundPlayer.closePlayer();
      _isPlayerInitialized = false;
    }
  }

  bool get isPlaying => _soundPlayer.isPlaying;
}