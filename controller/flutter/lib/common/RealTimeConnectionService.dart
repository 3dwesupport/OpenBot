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
        final int speed = params.containsKey('speed') ? params['speed'] : 100;

        int l = 0;
        int r = 0;

        switch (direction) {
          case 'forward':
            l = speed.clamp(128, 255);
            r = speed.clamp(128, 255);
            break;

          case 'backward':
            l = (-speed).clamp(-255, -128);
            r = (-speed).clamp(-255, -128);
            break;

          case 'circular':
            l = 192;
            r = 255;
            break;

          case 'stop':
            l = 0;
            r = 0;
            break;

          default:
            throw Exception(
                'Invalid direction. Use forward, backward, circular, or stop.');
        }

        print("l value $l");
        print("r value $r");

        left = l.toDouble();
        right = r.toDouble();
        // Return values
        return {'l': l, 'r': r};
      },
    );

    await client.updateSession(instructions: 'You are a great, upbeat friend.');
    await client.updateSession(voice: Voice.verse);

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
      print("content::: $content");
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
    const int intervalMilliseconds = 100; // Call every 100 ms
    const int durationMilliseconds = 3000; // Run for 3 seconds
    int elapsedTime = 0;

    // Start periodic timer
    driveCommandTimer = Timer.periodic(
      Duration(milliseconds: intervalMilliseconds),
          (timer) {
        // Call the drive command function
            print("left::$left");
            print("right::$right");

            DriveCommandReducer.filter(right, left);

        // Update elapsed time
        elapsedTime += intervalMilliseconds;

        // Stop after 3 seconds
        if (elapsedTime >= durationMilliseconds) {
          timer.cancel();
          print("Stopped processing drive commands after 3 seconds.");
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
