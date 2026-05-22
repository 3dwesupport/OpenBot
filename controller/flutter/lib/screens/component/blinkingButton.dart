import 'package:flutter/material.dart';

/// Left/right blinker icon when indicator is on.
class MyBlinkingButton extends StatefulWidget {
  const MyBlinkingButton({required this.isLeft, super.key});

  /// True for left blinker asset, false for right.
  final bool isLeft;

  @override
  State<MyBlinkingButton> createState() => _MyBlinkingButtonState();
}

class _MyBlinkingButtonState extends State<MyBlinkingButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fade;

  @override
  void initState() {
    super.initState();
    _fade = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _fade.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final asset = widget.isLeft
        ? 'images/left_indicator_icon_white.png'
        : 'images/right_indicator_icon_white.png';

    return FadeTransition(
      opacity: _fade,
      child: Image.asset(asset, height: 23, width: 23),
    );
  }
}
