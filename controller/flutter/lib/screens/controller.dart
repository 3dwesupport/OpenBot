import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:nsd/nsd.dart';
import 'package:openbot_controller/globals.dart';
import 'package:openbot_controller/services/realtime_service.dart';
import 'package:openbot_controller/screens/component/lights.dart';
import 'package:openbot_controller/screens/component/mic_button.dart';
import 'package:openbot_controller/screens/controlSelector.dart';
import 'package:openbot_controller/screens/settingsDrawer.dart';
import '../utils/constants.dart';
import 'discoveringDevices.dart';

const String serviceTypeRegister = '_openbot._tcp';

/// Top menu + mic inset from screen edge (gamepad vs tilt).
double _topBarHorizontalInset(bool isTiltingPhoneMode) =>
    isTiltingPhoneMode ? 45.0 : 110.0;

/// Main screen — find robot, socket, video, drive UI.
class Controller extends StatefulWidget {
  const Controller({Key? key}) : super(key: key);

  @override
  State createState() => ControllerState();
}

class ControllerState extends State<Controller> {
  final List<Service> services = [];
  final registrations = <Registration>[];
  ServerSocket? _serverSocket;
  Stream<Uint8List>? _broadcast;
  bool videoView = false;
  bool mirroredVideo = false;
  bool indicatorLeft = false;
  bool indicatorRight = false;
  /// Vehicle lights — torch button + top slider.
  final LightsSession _lights = LightsSession();
  bool isSettings = false;
  bool isTiltingPhoneMode = false;
  bool isScreenMode = false;
  String? _modeMessage;
  Timer? _modeTimer;
  String fragmentType = "";
  var _nextPort = 56360;

  int get nextPort => _nextPort++;

  /// Flip video mirror for the user.
  setMirrorVideo() {
    setState(() {
      mirroredVideo = !mirroredVideo;
    });
  }

  /// Bottom bar torch tap.
  void onLightsIconTap() => setState(_lights.toggle);

  /// Top slider moved.
  void onLightsSliderChanged(int percent) =>
      setState(() => _lights.setBrightness(percent));

  final RTCVideoRenderer _remoteVideoRenderer = RTCVideoRenderer();
  RTCPeerConnection? _peerConnection;

  /// Set up WebRTC renderer and peer connection.
  Future<void> videoConnection() async {
    initRenderers();
    _createPeerConnection().then((pc) {
      _peerConnection = pc;
    });
  }

  initRenderers() async {
    await _remoteVideoRenderer.initialize();
  }

  /// Offer or ICE candidate from the robot over the status socket.
  void handleWebRtcEvent(type, sdp, id, label, candidate) async {
    var description = {
      "type": type,
      "sdp": sdp,
    };
    if (description["type"] == "offer") {
      _setRemoteDescription(description);
    }
    if (description["type"] == "candidate") {
      var candidateValue = {
        "id": id,
        "label": label,
        "candidate": candidate,
      };
      _addCandidate(candidateValue);
    }
  }

  void _setRemoteDescription(doc) async {
    RTCSessionDescription description =
        RTCSessionDescription(doc["sdp"], doc["type"]);
    await _peerConnection
        ?.setRemoteDescription(description)
        .whenComplete(() => createAnswer());
  }

  void _addCandidate(candidateValue) async {
    dynamic candidate = RTCIceCandidate(candidateValue['candidate'],
        candidateValue['id'], candidateValue['label']);
    await _peerConnection?.addCandidate(candidate);
  }

  Future<RTCPeerConnection> _createPeerConnection() async {
    Map<String, dynamic> configuration = Constants.peerConfiguration;
    final Map<String, dynamic> offerSdpConstraints =
        Constants.offerSdpConstraints;

    RTCPeerConnection pc =
        await createPeerConnection(configuration, offerSdpConstraints);

    pc.onIceCandidate = (e) {
      if (e.candidate != null) {
        var output = {
          'type': 'candidate',
          'candidate': e.candidate.toString(),
          'sdpMid': e.sdpMid.toString(),
          'sdpMLineIndex': e.sdpMLineIndex,
        };
        final message = jsonEncode(output);
        sendMessage(message);
      }
    };

    pc.onIceConnectionState = (e) {
      log("onIceConnectionState = $e");
    };

    pc.onAddStream = (MediaStream stream) {
      _remoteVideoRenderer.srcObject = stream;
      setState(() {
        _remoteVideoRenderer;
      });
    };

    return pc;
  }

  /// SDP answer after we accept the robot's WebRTC offer.
  void createAnswer() async {
    final Map<String, dynamic> offerSdpConstraints =
        Constants.offerSdpConstraints;
    RTCSessionDescription? description =
        await _peerConnection?.createAnswer(offerSdpConstraints);
    await _peerConnection?.setLocalDescription(description!);
    var data = {
      'type': 'answer',
      'sdp': description?.sdp.toString(),
    };
    sendMessage(data);
  }

  /// Wrap [message] as webrtc_event on the command socket.
  void sendMessage(message) async {
    var newMessage = jsonEncode(message);
    clientSocket?.writeln({"webrtc_event": newMessage});
  }

  ControllerState() {
    enableLogging(LogTopic.calls);
  }

  @override
  void initState() {
    super.initState();
    RealtimeService.instance.onLightsChanged = (percent) {
      if (mounted) setState(() => _lights.applyLevel(percent));
    };
    registerNewService();
    videoConnection();
    getNewDiscoverServices();
  }

  @override
  void dispose() {
    RealtimeService.instance.onLightsChanged = null;
    super.dispose();
  }

  /// Find _openbot-server services for the settings network list.
  Future<void> getNewDiscoverServices() async {
    final discovery = await startDiscovery('_openbot-server._tcp.');
    discovery.addServiceListener((service, status) {
      if (status == ServiceStatus.found) {
        services.add(service);
      }
    });
  }

  /// Listen for the bot and hold the command socket.
  Future<void> registerNewService() async {
    var port = nextPort;
    final service = Service(
        name: 'OPEN_BOT_CONTROLLER',
        host: InternetAddress.anyIPv4.address,
        type: serviceTypeRegister,
        port: port,
        txt: Constants.textAttribute);

    final registration = await register(service);
    _serverSocket = await ServerSocket.bind(service.host, port);
    _serverSocket?.listen((socket) {
      log('Connection from'
          ' ${socket.remoteAddress.address}:${socket.remotePort}');
      if (clientSocket != null) {
        socket.close();
      } else {
        clientSocket = socket;
        _broadcast = clientSocket?.asBroadcastStream();

        _broadcast?.map((data) => String.fromCharCodes(data)).listen(
          (message) {
            Map msgInObject;
            try {
              var jsonArr = message.split("\n");
              for (var element in jsonArr) {
                var jsonMsg = json.encode(element);
                if (jsonMsg.isNotEmpty && jsonMsg != "\"\"") {
                  msgInObject = json.decode(json.decode(jsonMsg));
                  if (msgInObject["status"] != null) {
                    processMessageFromBot(msgInObject["status"]);
                  }
                  if (msgInObject["FRAGMENT_TYPE"] != null) {
                    setState(() {
                      fragmentType = msgInObject["FRAGMENT_TYPE"];
                    });
                  }
                }
              }
            } catch (e) {
              log("error in parsing msg: $e");
            }
          },
          onError: (e) {
            socket.destroy();
            clientSocket?.destroy();
            clientSocket = null;
            if (mounted) setState(() { videoView = false; });
          },
          onDone: () {
            socket.destroy();
            socket.close();
            clientSocket?.destroy();
            clientSocket = null;
            if (mounted) setState(() { videoView = false; });
          },
        );
      }
    });
    setState(() {
      registrations.add(registration);
    });
  }

  /// Center overlay when switching tilt vs gamepad (clears after 3s).
  void _showModeMessage(String msg) {
    _modeTimer?.cancel();
    setState(() => _modeMessage = msg);
    _modeTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _modeMessage = null);
    });
  }

  /// Bot said we're connected — show video + voice backend.
  setDeviceConnected(status) {
    if (status == "true") {
      setState(() {
        videoView = true;
      });
      RealtimeService.instance.connectBackend();
    } else if (status == "false") {
      setState(() {
        videoView = false;
      });
      RealtimeService.instance.disconnectBackend();
    }
  }

  /// Remove registration entry without waiting on dismiss animation.
  Future<void> dismissRegistration(Registration registration) async {
    setState(() {
      registrations.remove(registration);
    });

    await unregister(registration);
  }

  @override
  Widget build(BuildContext context) {
    if (videoView) {
      return MaterialApp(
        home: Stack(
          children: [
            RTCVideoView(
              _remoteVideoRenderer,
              objectFit: RTCVideoViewObjectFit.RTCVideoViewObjectFitCover,
              mirror: mirroredVideo,
            ),
            ControlSelector(
                setMirrorVideo,
                indicatorLeft,
                indicatorRight,
                _lights.active,
                onLightsIconTap,
                services,
                _peerConnection,
                isTiltingPhoneMode,
                isScreenMode,
                fragmentType),
            Positioned(
              top: 36,
              left: 72,
              right: 72,
              child: Center(
                child: LightsSlider(
                  visible: _lights.showSlider,
                  level: _lights.brightness,
                  onDismissed: () => setState(_lights.hideSlider),
                  onLevelChanged: onLightsSliderChanged,
                ),
              ),
            ),
            Positioned(
              top: 16,
              left: 0,
              right: 0,
              child: Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: _topBarHorizontalInset(isTiltingPhoneMode),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    SizedBox(
                      width: 56,
                      height: 56,
                      child: FloatingActionButton(
                        backgroundColor: Colors.white.withOpacity(0.5),
                        onPressed: () {
                          setState(() {
                            isSettings = true;
                          });
                        },
                        child: const Icon(Icons.menu),
                      ),
                    ),
                    const MicButton(),
                  ],
                ),
              ),
            ),
            if (_modeMessage != null)
              Positioned.fill(
                child: Center(
                  child: Text(
                    _modeMessage!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      decoration: TextDecoration.none,
                      shadows: [
                        Shadow(blurRadius: 6, color: Colors.black54),
                      ],
                    ),
                  ),
                ),
              ),
            if (isSettings)
              Stack(
                children: [
                  GestureDetector(
                    onTap: () {
                      setState(() {
                        isSettings = false;
                      });
                    },
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                  SettingsDrawer(
                    services,
                    (bool newTiltingMode, bool newScreenMode) {
                      setState(() {
                        isTiltingPhoneMode = newTiltingMode;
                        isScreenMode = newScreenMode;
                      });
                      if (newTiltingMode) {
                        _showModeMessage('Switching to Tilting Mode');
                      } else {
                        _showModeMessage('Switching to Gamepad Mode');
                      }
                    },
                  ),
                ],
              ),
          ],
        ),
        debugShowCheckedModeBanner: false,
      );
    } else {
      return const MaterialApp(
        home: DiscoveringDevice(),
        debugShowCheckedModeBanner: false,
      );
    }
  }

  /// Status JSON from the robot (indicators, lights, webrtc, etc).
  void processMessageFromBot(items) {
    String sdp = "";
    String type = "";
    String id = "";
    int label = 0;
    String candidate = "";
    if (items["CONNECTION_ACTIVE"] != null) {
      setDeviceConnected(items["CONNECTION_ACTIVE"]);
    }

    if (items["VIDEO_PROTOCOL"] != null) {
      if (items["VIDEO_PROTOCOL"] == "RTSP") {
        Fluttertoast.showToast(
            msg:
                "RTSP not supported by this controller. For video, set your main app to use WebRTC.",
            toastLength: Toast.LENGTH_LONG,
            gravity: ToastGravity.BOTTOM,
            backgroundColor: Colors.grey,
            textColor: Colors.white,
            fontSize: 14);
        log("RTSP not supported by this controller. For video, set your main app to use WebRTC.");
      }
    }

    if (items["INDICATOR_LEFT"] != null) {
      if (items["INDICATOR_LEFT"] == "true") {
        setState(() {
          indicatorLeft = true;
        });
      } else {
        setState(() {
          indicatorLeft = false;
        });
      }
    }

    if (items["INDICATOR_RIGHT"] != null) {
      if (items["INDICATOR_RIGHT"] == "true") {
        setState(() {
          indicatorRight = true;
        });
      } else {
        setState(() {
          indicatorRight = false;
        });
      }
    }

    if (items["LED_BRIGHTNESS"] != null) {
      final parsed = int.tryParse(items["LED_BRIGHTNESS"].toString());
      if (parsed != null) {
        final value = parsed.clamp(0, 100);
        setState(() => _lights.applyLevel(value));
      }
    }

    if (items["WEB_RTC_EVENT"] != null) {
      var webRTCResponse;
      if (items["WEB_RTC_EVENT"] is String) {
        webRTCResponse = json.decode(items["WEB_RTC_EVENT"]);
      } else {
        webRTCResponse = items["WEB_RTC_EVENT"];
      }
      if (webRTCResponse["type"].toString() == "offer") {
        setState(() {
          type = webRTCResponse["type"];
          sdp = webRTCResponse["sdp"];
        });
      }
      if (webRTCResponse["type"].toString() == "candidate") {
        setState(() {
          type = webRTCResponse["type"];
          id = webRTCResponse["id"];
          label = webRTCResponse["label"];
          candidate = webRTCResponse["candidate"].toString();
        });
      }
      handleWebRtcEvent(type, sdp, id, label, candidate);
    }
  }
}
