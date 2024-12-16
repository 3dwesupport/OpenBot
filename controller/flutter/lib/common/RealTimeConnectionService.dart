import 'dart:typed_data';
import 'package:openai_realtime_dart/openai_realtime_dart.dart';
import 'package:openbot_controller/utils/constants.dart';

class RealTimeConnectionService {
  Uint8List? finalAudio;
  late Function(Uint8List) onAudioCompleted = (Uint8List audio) {};

  final client = RealtimeClient(
    apiKey: apiKey,
  );

  final RealtimeConversation conversation = RealtimeConversation();
  static const String apiKey = Constants.openAIKey;

  Future<void> realTimeConnect() async {
    try {
      await client.connect();
      print('Successfully connected to OpenAI Realtime API');
    } catch (e) {
      print('Error connecting to the OpenAI Realtime API: $e');
    }
    await client.updateSession(instructions: 'You are a great, upbeat friend.');
    await client.updateSession(voice: Voice.verse);

    await client.updateSession(
      inputAudioFormat: AudioFormat.pcm16,
      outputAudioFormat: AudioFormat.pcm16,
    );
    await client.updateSession(
      inputAudioTranscription: InputAudioTranscriptionConfig(
        model: 'whisper-1',
      ),
    );
    client.on(RealtimeEventType.conversationUpdated, (event) {
      final result = (event as RealtimeEventConversationUpdated).result;
      final content = result.item?.formatted?.transcript;
      final audio = result.item?.formatted?.audio;
      if (result.item?.item.status == ItemStatus.completed) {
        if (audio != null) {
          onAudioCompleted(audio);
        } else {
        }
      }
    });
  }

  Future<void> sendUserMessage(String buffer) async {
    await client.sendUserMessageContent([
      ContentPart.inputAudio(audio: buffer),
    ]);
    client.createResponse();
  }

  createResponse() {
    client.createResponse();
  }

  disconnect() async {
  await  client.disconnect();
  }
}
