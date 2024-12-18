import 'dart:async';
import 'dart:typed_data';
import 'package:openai_realtime_dart/openai_realtime_dart.dart';
import 'package:openbot_controller/utils/constants.dart';

import '../screens/driveCommandReducer.dart';

double left = 0.0;
double right = 0.0;

class RealTimeConnectionService {
  Uint8List? finalAudio;
  late Function(Uint8List) onAudioCompleted = (Uint8List audio) {};

  final client = RealtimeClient(
    apiKey: apiKey,
  );

  final RealtimeConversation conversation = RealtimeConversation();
  static const String apiKey = Constants.openAIKey;
  Timer? driveCommandTimer;

  Future<void> realTimeConnect() async {
    try {
      await client.connect();
      print('Successfully connected to OpenAI Realtime API');
    } catch (e) {
      print('Error connecting to the OpenAI Realtime API: $e');
    }

    await client.addTool(
      ToolDefinition(
        name: 'control_robot',
        description:
        'Use this function to control the movement of the robot and give the value of l and r',
        parameters: {
          'type': 'object',
          'properties': {
            'direction': {
              'type': 'string',
              'description': 'Direction: forward, backward, circular, stop.',
            },
            'speed': {
              'type': 'number',
              'description':
              'Speed of the robot (0 to 255 for forward, -255 to 0 for backward).',
            },
          },
          'required': ['direction'],
        },
      ),
          (Map<String, dynamic> params) {
        final String direction = params['direction'];
        final int speedInput = params.containsKey('speed') ? params['speed'] : 150;

        // Normalize speed and ensure floating-point division
        final double normalizedSpeed = (speedInput / 192.0).clamp(-1.0, 1.0);

        double l = 0.0;
        double r = 0.0;

        switch (direction) {
          case 'forward':
            l = normalizedSpeed;
            r = normalizedSpeed;
            break;

          case 'backward':
            l = normalizedSpeed;
            r = normalizedSpeed;
            break;

          case 'circular':
            l = 0.8;
            r = 1.0;
            break;

          case 'stop':
            l = 0.0;
            r = 0.0;
            break;

          default:
            throw Exception(
                'Invalid direction. Use forward, backward, circular, or stop.');
        }
        l = double.parse(l.toStringAsFixed(2));
        r = double.parse(r.toStringAsFixed(2));
        left=l;
        right=r;

        return {'l': l, 'r': r};
      },
    );

    await client.updateSession(instructions: Constants.instructions);

    await client.updateSession(
      inputAudioFormat: AudioFormat.pcm16,
      outputAudioFormat: AudioFormat.pcm16,
    );
    await client.updateSession(
        inputAudioTranscription: InputAudioTranscriptionConfig(
      model: 'whisper-1',
    ));
    client.on(RealtimeEventType.conversationUpdated, (event) {
      final result = (event as RealtimeEventConversationUpdated).result;
      final content = result.item?.formatted?.transcript;
      final audio = result.item?.formatted?.audio;
      if (result.item?.item.status == ItemStatus.completed) {
        if (audio != null) {
          onAudioCompleted(audio);
        } else {}
      }
    });
  }

  Future<void> sendUserMessage(String buffer) async {
    await client.sendUserMessageContent([
      ContentPart.inputAudio(audio: buffer),
    ]);
    client.createResponse();
  }

  void processAIGeneratedDriveCommands() {
    const int intervalMilliseconds = 100;
    const int durationMilliseconds = 3000;
    int elapsedTime = 0;

    driveCommandTimer = Timer.periodic(
      Duration(milliseconds: intervalMilliseconds),
          (timer) {

            DriveCommandReducer.filter(right,left);

        elapsedTime += intervalMilliseconds;
        if (elapsedTime >= durationMilliseconds) {
          timer.cancel();
        }
      },
    );
  }

  createResponse() {
    client.createResponse();
  }

  disconnect() async {
    await client.disconnect();
  }
}
