import 'package:openai_realtime_dart/openai_realtime_dart.dart';
import 'package:openbot_controller/utils/constants.dart';

import 'dart:typed_data';
class RealTimeConnectionService {
  final client = RealtimeClient(
    apiKey: apiKey,
  );

  final RealtimeConversation conversation = RealtimeConversation();
  static const String apiKey =
      Constants.openAIKey;

  Future<void> realTimeConnect() async {

    try {
      await client.connect();
      print('Successfully connected to OpenAI Realtime API');
    } catch (e) {
      print('Error connecting to the OpenAI Realtime API: $e');
    }
    await client.updateSession(instructions: 'You are a great, upbeat friend.');
    await client.updateSession(voice: Voice.alloy);
    await client.updateSession(
      inputAudioTranscription: InputAudioTranscriptionConfig(
        model: 'whisper-1',
      ),
    );
    client.on(RealtimeEventType.conversationUpdated, (event) {
      final result = (event as RealtimeEventConversationUpdated).result;
      final content= result.item?.formatted?.transcript;
      final audio= result.item?.formatted?.audio;
      print("audio::$audio");
      print("content $content");
    });
  }

  Future<void> sendUserMessage(String buffer) async {
    await client.sendUserMessageContent([
      ContentPart.inputAudio(audio: buffer),
      // Base64 encoded audio
    ]);
    client.createResponse();
  }
 createResponse() {
    client.createResponse();
  }
}
