import 'package:flutter/material.dart';
import 'package:avatar_glow/avatar_glow.dart';

// Custom widget for the animated mic button
class AnimatedMicButton extends StatelessWidget {
  final bool animate;
  final VoidCallback onPressed;

  const AnimatedMicButton({
    super.key,
    required this.animate,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return AvatarGlow(
      startDelay: Duration(milliseconds: 1000),
      glowColor: Colors.white,
      glowShape: BoxShape.circle,
      animate: animate,
      curve: Curves.fastOutSlowIn,
      child: Material(
        elevation: 8.0,
        shape: CircleBorder(),
        color:  Color(0xFF0071C5),
        child: CircleAvatar(
          backgroundColor: Colors.transparent,
          child: IconButton(
            icon: Icon(Icons.mic, color: Colors.white),
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}
