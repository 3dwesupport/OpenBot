import 'dart:async';

import 'package:flutter/material.dart';
import 'package:openbot_controller/buttonCommands/buttonCommands.dart';

/// Holds lights on/off and brightness for the drive screen.
class LightsSession {
  int brightness = 0;
  bool active = false;
  bool showSlider = false;

  static const int defaultLevel = 50;

  /// Tap the torch — off if on, otherwise on at 50%.
  void toggle() {
    if (active) {
      active = false;
      brightness = 0;
      showSlider = false;
      ButtonCommands.setLedBrightness(0);
      return;
    }
    active = true;
    brightness = defaultLevel;
    showSlider = true;
    ButtonCommands.setLedBrightness(defaultLevel);
  }

  /// Local level only; [LightsSlider] sends LIGHT:n while dragging.
  void setBrightness(int percent) {
    brightness = _clamp(percent);
  }

  /// Bar faded out on its own.
  void hideSlider() {
    showSlider = false;
  }

  /// Robot status, voice AI, or any external LIGHT:n — keeps torch in sync.
  void applyLevel(int percent) {
    brightness = _clamp(percent);
    if (percent > 0) {
      active = true;
    } else {
      active = false;
      showSlider = false;
    }
  }

  /// Robot sent LED_BRIGHTNESS over the socket.
  void applyFromRobot(int percent) => applyLevel(percent);

  static int _clamp(int percent) => percent.clamp(0, 100);
}

/// Vehicle lights — Material icon, same style as logs/network in the bottom row.
class LightsBarButton extends StatelessWidget {
  const LightsBarButton({
    super.key,
    required this.active,
    required this.onTap,
  });

  /// Session on until second tap; stays true at 0% until user taps off.
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(45),
        onTap: onTap,
        child: Ink(
          padding: const EdgeInsets.all(15),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(45),
            color: active
                ? const Color(0xFF0071C5).withOpacity(0.5)
                : Colors.white.withOpacity(0.5),
          ),
          child: Icon(
            active ? Icons.flashlight_on : Icons.flashlight_on_outlined,
            size: 23,
            color: active ? Colors.white : Colors.blue,
          ),
        ),
      ),
    );
  }
}

/// Slider knob — bigger while you drag, track stays still.
class _LightsThumbShape extends SliderComponentShape {
  const _LightsThumbShape({required this.enlarged});

  final bool enlarged;

  @override
  Size getPreferredSize(bool isEnabled, bool isDiscrete) {
    return const Size(24, 24);
  }

  @override
  void paint(
    PaintingContext context,
    Offset center, {
    required Animation<double> activationAnimation,
    required Animation<double> enableAnimation,
    required bool isDiscrete,
    required TextPainter labelPainter,
    required RenderBox parentBox,
    required SliderThemeData sliderTheme,
    required TextDirection textDirection,
    required double value,
    required double textScaleFactor,
    required Size sizeWithOverflow,
  }) {
    final radius = enlarged ? 10.0 : 5.0;
    context.canvas.drawCircle(
      center,
      radius,
      Paint()..color = sliderTheme.thumbColor ?? const Color(0xFF0071C5),
    );
  }
}

/// Brightness bar at the top of the video screen.
class LightsSlider extends StatefulWidget {
  const LightsSlider({
    super.key,
    required this.visible,
    required this.level,
    this.onDismissed,
    this.onLevelChanged,
  });

  final bool visible;
  final int level;
  final VoidCallback? onDismissed;
  final ValueChanged<int>? onLevelChanged;

  @override
  State<LightsSlider> createState() => _LightsSliderState();
}

class _LightsSliderState extends State<LightsSlider>
    with SingleTickerProviderStateMixin {
  late double _value;
  bool _dragging = false;

  late final AnimationController _fade;
  late final Animation<double> _fadeAnim;
  Timer? _hideTimer;

  @override
  void initState() {
    super.initState();
    _value = widget.level.clamp(0, 100).toDouble();
    _fade = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 280),
    );
    _fadeAnim = CurvedAnimation(parent: _fade, curve: Curves.easeInOut);
    if (widget.visible) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openBar());
    }
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    _fade.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(LightsSlider old) {
    super.didUpdateWidget(old);
    if (widget.visible && !old.visible) {
      final level =
          widget.level > 0 ? widget.level : LightsSession.defaultLevel;
      _value = level.clamp(0, 100).toDouble();
      _openBar();
    } else if (!widget.visible && old.visible) {
      _hideTimer?.cancel();
      _fade.value = 0;
    } else if (!_dragging && old.level != widget.level) {
      final next = widget.level.clamp(0, 100).toDouble();
      if ((_value - next).abs() >= 0.5) {
        setState(() => _value = next);
      }
    }
  }

  /// Fade the bar in.
  void _openBar() {
    _hideTimer?.cancel();
    _fade.forward();
    _armHideTimer();
  }

  /// Start the 3s timer before we hide again.
  void _armHideTimer() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 3), _closeBar);
  }

  /// Fade out and tell the parent we're done.
  void _closeBar() {
    if (_dragging || !mounted) return;
    _fade.reverse().then((_) {
      if (mounted && !_dragging) {
        widget.onDismissed?.call();
      }
    });
  }

  /// Send LIGHT:n to the bot and update parent state.
  void _sendLevel(int percent) {
    final level = percent.clamp(0, 100);
    ButtonCommands.setLedBrightness(level);
    widget.onLevelChanged?.call(level);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.visible && _fade.value == 0) {
      return const SizedBox.shrink();
    }

    return SizedBox(
      width: 200,
      height: 32,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          clipBehavior: Clip.none,
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: Colors.black.withOpacity(0.45),
          ),
          child: Material(
            color: Colors.transparent,
            clipBehavior: Clip.none,
            child: SliderTheme(
              data: SliderTheme.of(context).copyWith(
                activeTrackColor: const Color(0xFF0071C5),
                inactiveTrackColor: Colors.white.withOpacity(0.25),
                thumbColor: const Color(0xFF0071C5),
                overlayColor: Colors.transparent,
                trackHeight: 2.5,
                thumbShape: _LightsThumbShape(enlarged: _dragging),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
              ),
              child: Slider(
                value: _value,
                min: 0,
                max: 100,
                onChangeStart: (_) {
                  setState(() => _dragging = true);
                  _hideTimer?.cancel();
                },
                onChanged: (v) {
                  setState(() => _value = v);
                  _sendLevel(v.round());
                },
                onChangeEnd: (_) {
                  setState(() => _dragging = false);
                  _armHideTimer();
                },
              ),
            ),
          ),
        ),
      ),
    );
  }
}
