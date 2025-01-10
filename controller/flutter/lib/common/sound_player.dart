import 'dart:typed_data';
import 'package:flutter/services.dart';
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

  //Function to play audio on mode selection
  Future<void> playFromAsset(String assetPath) async {
    if (!_isPlayerInitialized) {
      print('Player not initialized. Call init() first.');
      return;
    }
    try {
      ByteData data = await rootBundle.load(assetPath);
      Uint8List audioData = data.buffer.asUint8List();
      await _soundPlayer.startPlayer(
        fromDataBuffer: audioData,
      );
    } catch (e) {
      print('Error playing WAV audio: $e');
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
      audio = Uint8List(0);
    } catch (e) {
      print('Error playing audio: $e');
    }
  }
  
  Future<void> close() async {
    if (_isPlayerInitialized) {
    _soundPlayer.closePlayer();
    }
  }

  bool get isPlaying => _soundPlayer.isPlaying;
}