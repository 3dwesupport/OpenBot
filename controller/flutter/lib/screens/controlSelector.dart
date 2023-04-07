import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:openbot_controller/globals.dart';
import 'package:openbot_controller/screens/tiltingPhoneMode.dart';

import 'onScreenMode.dart';

class ControlSelector extends StatefulWidget {
  final dynamic updateMirrorView;
  final bool indicatorLeft;
  final bool indicatorRight;

  const ControlSelector(
      this.updateMirrorView, this.indicatorLeft, this.indicatorRight,
      {super.key});

  @override
  State<StatefulWidget> createState() {
    return ControlSelectorState();
  }
}

class ControlSelectorState extends State<ControlSelector> {
  bool isTiltingPhoneMode = false;
  bool isScreenMode = false;

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
            widget.indicatorRight),
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
                    child: Container(
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
                              offset: Offset(
                                -1,
                                -1,
                              ),
                            ),
                            BoxShadow(
                              blurRadius: 1,
                              spreadRadius: 0.1,
                              color: Color(0xFF000000),
                              offset: Offset(
                                -1,
                                -1,
                              ),
                            ),
                          ]),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Image.asset(
                              "images/controller_icon.png",
                              height: 18,
                              width: 18,
                            ),
                            const SizedBox(
                              height: 20,
                            ),
                            const Text(
                              "Use On-Screen Controls to Drive",
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFFffffff),
                              ),
                            ),
                            const SizedBox(
                              height: 55,
                            ),
                            Container(
                              alignment: Alignment.bottomRight,
                              child: Image.asset(
                                "images/arrow_icon.png",
                                width: 50,
                              ),
                            ),
                          ]),
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
                    child: Container(
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
                              offset: Offset(
                                -1,
                                -1,
                              ),
                            ),
                            BoxShadow(
                              blurRadius: 1,
                              spreadRadius: 0.1,
                              color: Color(0xFF000000),
                              offset: Offset(
                                -1,
                                -1,
                              ),
                            ),
                          ]),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Image.asset(
                              "images/tilting_phone_icon.png",
                              height: 18,
                              width: 18,
                            ),
                            const SizedBox(
                              height: 20,
                            ),
                            const Text(
                              "Drive by tilting\nthe phone",
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFFffffff),
                              ),
                            ),
                            const SizedBox(
                              height: 55,
                            ),
                            Container(
                              alignment: Alignment.bottomRight,
                              child: Image.asset(
                                "images/arrow_icon.png",
                                width: 50,
                              ),
                            ),
                          ]),
                    ),
                  ),
                ],
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  GestureDetector(
                      onTap: () {
                        clientSocket?.writeln("{command: LOGS}");
                      },
                      child: Container(
                        height: 30,
                        width: 85,
                        margin: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(3)),
                          color: Color(0xFF0071C5),
                        ),
                        child: const Center(
                          child: Text(
                            "Logs",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFFffffff),
                            ),
                          ),
                        ),
                      )),
                  GestureDetector(
                      onTap: () {
                        clientSocket?.writeln("{command: NOISE}");
                      },
                      child: Container(
                        height: 30,
                        width: 85,
                        margin: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(3)),
                          color: Color(0xFF0071C5),
                        ),
                        child: const Center(
                          child: Text(
                            "Noise",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFFffffff),
                            ),
                          ),
                        ),
                      )),
                  GestureDetector(
                      onTap: () {
                        clientSocket?.writeln("{command: NETWORK}");
                      },
                      child: Container(
                        height: 30,
                        width: 85,
                        margin: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(3)),
                          color: Color(0xFF0071C5),
                        ),
                        child: const Center(
                          child: Text(
                            "Network",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFFffffff),
                            ),
                          ),
                        ),
                      )),
                  GestureDetector(
                      onTap: () {
                        clientSocket?.writeln("{command: DRIVE_MODE}");
                      },
                      child: Container(
                        height: 30,
                        width: 85,
                        margin: const EdgeInsets.all(20),
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(3)),
                          color: Color(0xFF0071C5),
                        ),
                        child: const Center(
                          child: Text(
                            "Game",
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFFffffff),
                            ),
                          ),
                        ),
                      ))
                ],
              )
            ],
          ) // color: const Color(0xFF292929),

              ));
    }
  }
}