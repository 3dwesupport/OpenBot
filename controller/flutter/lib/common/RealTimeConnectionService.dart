import 'dart:async';
import 'dart:typed_data';
import 'package:openai_realtime_dart/openai_realtime_dart.dart';
import 'package:openbot_controller/utils/constants.dart';

import '../screens/driveCommandReducer.dart';

class RealTimeConnectionService {
  Uint8List? finalAudio;
  late Function(Uint8List) onAudioCompleted = (Uint8List audio) {};
  double left = 0.0;
  double right = 0.0;
  late List<Map<String, dynamic>> fullScript = [];

  final client = RealtimeClient(
    apiKey: apiKey,
  );

  final RealtimeConversation conversation = RealtimeConversation();
  static const String apiKey = Constants.openAIKey;
  Timer? driveCommandTimer;
  bool isScriptFound = false;

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
            'Use this function to generate a structured output for robot commands with speeds and wait times.',
        parameters: {
          'type': 'object',
          'properties': {
            'commands': {
              'type': 'array',
              'items': {
                'type': 'object',
                'properties': {
                  'direction': {
                    'type': 'string',
                    'description':
                        'Direction: forward, backward, circular, stop.',
                  },
                  'speed': {
                    'type': 'number',
                    'description':
                        'Speed of the robot (0 to 255 positive value for forward, -255 to 0 negative for backward).',
                  },
                  'duration': {
                    'type': 'number',
                    'description':
                        'Duration in seconds for which the robot should execute the command.',
                  },
                },
                'required': ['direction', 'duration'],
              },
            },
          },
          'required': ['commands'],
        },
      ),
      (Map<String, dynamic> params) {
        final List<dynamic> commands = params['commands']; // List of commands

        for (var command in commands) {
          final String direction = command['direction'];
          final int speedInput =
              command.containsKey('speed') ? command['speed'] : 150;
          final int duration = command['duration'];

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

          // Add the structured command to the fullScript list with the command name and values
          fullScript.add({
            'command': direction,
            // The specific command like 'forward', 'backward', etc.
            'values': {
              'left_speed': l,
              'right_speed': r,
            },
            'wait': duration,
          });
        }

        print("Generated Full Script:\n$fullScript");

        // Return the final result as a Map<String, dynamic>
        return {
          'script': fullScript, // The structured script with all commands
        };
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
        } else {
          print("Audio is not available");
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

  Future<void> processAIGeneratedDriveCommands() async {
    // Ensure the script is only processed once
    if (!isScriptFound && fullScript.isNotEmpty) {
      isScriptFound = true; // Mark the script as found

      try {
        // Iterate over the fullScript to process each command in order
        for (var command in fullScript) {
          // Ensure the command has 'values' with left_speed and right_speed
          if (command.containsKey('values') &&
              command['values'] is Map<String, dynamic>) {
            final Map<String, dynamic> values = command['values'];

            if (values.containsKey('left_speed') &&
                values.containsKey('right_speed')) {
              final double leftSpeed = values['left_speed'];
              final double rightSpeed = values['right_speed'];

              DriveCommandReducer.filter(rightSpeed, leftSpeed);

              // Wait for the specified time before processing the next command
              if (command.containsKey('wait')) {
                final int waitTime = command['wait'];
                print("Waiting for $waitTime seconds...");
                await Future.delayed(Duration(seconds: waitTime));
              } else {
                print("No 'wait' specified. Proceeding to the next command.");
              }
            } else {
              print(
                  "Skipping command: 'values' missing required keys (left_speed, right_speed)");
            }
          } else {
            print("Skipping command: invalid or missing 'values'");
          }
        }
      } catch (e) {
        print("Error processing commands: $e");
      } finally {
        // Mark script processing as complete after all commands are processed
        isScriptFound = false;
        fullScript = [];
      }
    } else {
      print("Script already processed or empty.");
    }
  }

  createResponse() {
    client.createResponse();
  }

  disconnect() async {
    await client.disconnect();
    client.removeTool("control_robot");
  }
}
