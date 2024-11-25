import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:nsd/nsd.dart';
import 'package:openbot_controller/globals.dart';
import 'package:openbot_controller/screens/tiltingPhoneMode.dart';

import 'onScreenMode.dart';

class ControlSelector extends StatefulWidget {
  final dynamic updateMirrorView;
  final bool indicatorLeft;
  final bool indicatorRight;
  final List<Service> networkServices;
  final RTCPeerConnection? peerConnection;

  const ControlSelector(this.updateMirrorView, this.indicatorLeft,
      this.indicatorRight, this.networkServices, this.peerConnection,
      {super.key});

  @override
  State<StatefulWidget> createState() {
    return ControlSelectorState();
  }
}

class ControlSelectorState extends State<ControlSelector> {
  bool isTiltingPhoneMode = false;
  bool isScreenMode = false;

  // Initial Selected Value
  String dropDownValue = 'No server';
  late List<DropdownMenuItem<String>> items = [];

  // New State Variables
  bool isManualMode = true; // Default to Manual Mode

  @override
  void initState() {
    super.initState();
  }

  // Function to generate DropdownMenuItem widgets
  List<DropdownMenuItem<String>> buildDropdownMenuItems() {
    items = [
      DropdownMenuItem(
        value: 'No server',
        child: Container(
          height: 30,
          width: 85,
          decoration: const BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(3)),
            color: Color(0xFF0071C5),
          ),
          alignment: Alignment.center,
          child: const Text(
            'No server',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFFffffff),
            ),
          ),
        ),
      ),
    ];
    items.addAll(widget.networkServices.map((discovery) {
      return DropdownMenuItem(
        value: discovery.name,
        child: Container(
          height: 30,
          width: 85,
          decoration: const BoxDecoration(
            borderRadius: BorderRadius.all(Radius.circular(3)),
            color: Color(0xFF0071C5),
          ),
          alignment: Alignment.center,
          child: Text(
            discovery.name ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFFffffff),
            ),
          ),
        ),
      );
    }));
    return items;
  }

  @override
  Widget build(BuildContext context) {
    if (isTiltingPhoneMode) {
      return GestureDetector(
          onDoubleTap: () {
            setState(() {
              isTiltingPhoneMode = false;
            });
          },
          child: const TiltingPhoneMode());
    } else if (isScreenMode) {
      return GestureDetector(
        onDoubleTap: () {
          setState(() {
            isScreenMode = false;
          });
        },
        child: OnScreenMode(widget.updateMirrorView, widget.indicatorLeft,
            widget.indicatorRight, widget.peerConnection),
      );
    } else {
      return Scaffold(
          backgroundColor: Colors.transparent,
          body: Center(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      GestureDetector(
                        onTap: () {
                          Fluttertoast.showToast(
                              msg: "Double tap on screen to get back",
                              toastLength: Toast.LENGTH_LONG,
                              gravity: ToastGravity.BOTTOM,
                              backgroundColor: Colors.grey,
                              textColor: Colors.white,
                              fontSize: 18);
                          setState(() {
                            isScreenMode = true;
                          });
                        },
                        child: modeOptionContainer(
                          "Use On-Screen Controls to Drive",
                          "images/controller_icon.png",
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          Fluttertoast.showToast(
                              msg: "Double tap on screen to get back",
                              toastLength: Toast.LENGTH_LONG,
                              gravity: ToastGravity.BOTTOM,
                              backgroundColor: Colors.grey,
                              textColor: Colors.white,
                              fontSize: 18);
                          setState(() {
                            isTiltingPhoneMode = true;
                          });
                        },
                        child: modeOptionContainer(
                          "Drive by tilting\nthe phone",
                          "images/tilting_phone_icon.png",
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      DropdownButton(
                        value: dropDownValue,
                        borderRadius: const BorderRadius.all(Radius.circular(3)),
                        underline: Container(),
                        dropdownColor: const Color(0xFF0071C5),
                        style: const TextStyle(
                          fontSize: 13,
                          color: Color(0xFFffffff),
                        ),
                        menuMaxHeight: 150,
                        items: buildDropdownMenuItems(),
                        onChanged: (String? serverName) {
                          setState(() {
                            dropDownValue = serverName!;
                          });
                          if (serverName != "No server") {
                            clientSocket?.writeln("{server: $serverName}");
                          } else {
                            clientSocket?.writeln("{server: noServerFound}");
                          }
                        },
                      ),
                      controlButton("Logs", "{command: LOGS}"),
                      controlButton("Noise", "{command: NOISE}"),
                      controlButton("Network", "{command: NETWORK}"),
                      controlButton("Game", "{command: DRIVE_MODE}"),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isManualMode ? "Manual Mode" : "VAD Mode",
                        style: const TextStyle(fontSize: 16, color: Colors.white),
                      ),
                      Switch(
                        value: isManualMode,
                        onChanged: (value) {
                          setState(() {
                            isManualMode = value;
                          });
                          clientSocket?.writeln(
                            "{mode: ${isManualMode ? 'MANUAL' : 'VAD'}}",
                          );
                        },
                      ),
                    ],
                  ),
                ],
              )));
    }
  }

  Widget modeOptionContainer(String text, String imagePath) {
    return Container(
      height: 180,
      width: 180,
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          color: Color(0xFF292929),
          boxShadow: [
            BoxShadow(
              blurRadius: 0.5,
              spreadRadius: 0.1,
              color: Color(0xFFffffff),
              offset: Offset(-1, -1),
            ),
            BoxShadow(
              blurRadius: 1,
              spreadRadius: 0.1,
              color: Color(0xFF000000),
              offset: Offset(-1, -1),
            ),
          ]),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Image.asset(
            imagePath,
            height: 18,
            width: 18,
          ),
          const SizedBox(height: 20),
          Text(
            text,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w500,
              color: Color(0xFFffffff),
            ),
          ),
          const SizedBox(height: 55),
          Container(
            alignment: Alignment.bottomRight,
            child: Image.asset(
              "images/arrow_icon.png",
              width: 50,
            ),
          ),
        ],
      ),
    );
  }

  Widget controlButton(String label, String command) {
    return GestureDetector(
      onTap: () {
        clientSocket?.writeln(command);
      },
      child: Container(
        height: 30,
        width: 85,
        margin: const EdgeInsets.all(20),
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.all(Radius.circular(3)),
          color: Color(0xFF0071C5),
        ),
        child: Center(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 13,
              color: Color(0xFFffffff),
            ),
          ),
        ),
      ),
    );
  }
}
