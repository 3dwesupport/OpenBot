import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:openbot_controller/services/realtime_service.dart';

/// Voice control — hold to talk or tap for always-on.
class MicButton extends StatefulWidget {
  const MicButton({super.key});
  @override
  State<MicButton> createState() => _MicButtonState();
}

class _MicButtonState extends State<MicButton> with TickerProviderStateMixin {
  final _rt = RealtimeService.instance;

  /// Tap-on keeps listening; otherwise hold for push-to-talk.
  bool _alwaysOn = false;
  /// "Tap On/Off • Hold to talk" — auto-hides after 5 seconds.
  bool _showTooltip = true;
  Timer? _tooltipTimer;

  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;
  late final AnimationController _waveCtrl;

  @override
  void initState() {
    super.initState();

    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 900));
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.12)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _waveCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1800));

    _tooltipTimer = Timer(const Duration(seconds: 5), () {
      if (mounted) setState(() => _showTooltip = false);
    });

    _rt.onStateChange = _onStateChange;
    _rt.onResponseDone = _onResponseDone;
    _rt.preWarm();
  }

  @override
  void dispose() {
    _longPressTimer?.cancel();
    _pulseCtrl.dispose();
    _waveCtrl.dispose();
    _tooltipTimer?.cancel();
    _rt.onStateChange = null;
    _rt.onResponseDone = null;
    super.dispose();
  }

  /// On while always-on mode or the realtime session is active.
  bool get _isOn => _alwaysOn || !_rt.isIdle;

  void _onStateChange() {
    if (!mounted) return;
    setState(() {});
    if (_isOn) {
      if (!_pulseCtrl.isAnimating) _pulseCtrl.repeat(reverse: true);
      if (!_waveCtrl.isAnimating) _waveCtrl.repeat();
    } else {
      _pulseCtrl.stop();
      _pulseCtrl.reset();
      _waveCtrl.stop();
      _waveCtrl.reset();
    }
  }

  /// Always-on: refresh UI when AI finishes so listening can resume.
  void _onResponseDone() {
    if (_alwaysOn && mounted) setState(() {});
  }

  /// Raw pointers — reliable PTT without gesture-arena cancel.
  bool _pointerDown = false;
  bool _pttActive = false;
  Timer? _longPressTimer;

  /// Short tap toggles always-on; hold 350ms starts push-to-talk.
  void _onPointerDown(PointerDownEvent _) {
    _pointerDown = true;
    _longPressTimer?.cancel();
    _longPressTimer = Timer(const Duration(milliseconds: 350), () async {
      if (_pointerDown && !_alwaysOn && _rt.isIdle) {
        _pttActive = true;
        HapticFeedback.lightImpact();
        await _rt.start();
        if (mounted) setState(() {});
      }
    });
  }

  void _onPointerUp(PointerUpEvent _) {
    final timerStillActive = _longPressTimer?.isActive ?? false;
    _longPressTimer?.cancel();
    _pointerDown = false;

    if (_pttActive) {
      _pttActive = false;
      _rt.commitAndStop();
      setState(() {});
    } else if (timerStillActive) {
      _onTap();
    }
  }

  void _onPointerCancel(PointerCancelEvent _) {
    _longPressTimer?.cancel();
    _pointerDown = false;
    if (_pttActive) {
      _pttActive = false;
      _rt.stop();
      setState(() {});
    }
  }

  Future<void> _onTap() async {
    if (_isOn) {
      HapticFeedback.lightImpact();
      setState(() => _alwaysOn = false);
      _pulseCtrl.stop(); _pulseCtrl.reset();
      _waveCtrl.stop(); _waveCtrl.reset();
      await _rt.stop();
    } else {
      HapticFeedback.lightImpact();
      setState(() => _alwaysOn = true);
      final ok = await _rt.start();
      if (!ok && mounted) setState(() => _alwaysOn = false);
    }
  }

  static const _blue = Color(0xFF0071C5);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      mainAxisSize: MainAxisSize.min,
      children: [
        Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            if (_isOn)
              Positioned(
                left: -22, right: -22, top: -22, bottom: -22,
                child: AnimatedBuilder(
                  animation: _waveCtrl,
                  builder: (_, __) =>
                      CustomPaint(painter: _WaveRingPainter(_waveCtrl.value)),
                ),
              ),
            Listener(
              onPointerDown: _onPointerDown,
              onPointerUp: _onPointerUp,
              onPointerCancel: _onPointerCancel,
              child: AnimatedBuilder(
                animation: _pulseCtrl,
                builder: (_, child) => Transform.scale(
                  scale: _isOn ? _pulseAnim.value : 1.0,
                  child: child,
                ),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _isOn
                        ? _blue.withValues(alpha: 0.92)
                        : Colors.white.withValues(alpha: 0.5),
                    boxShadow: [
                      if (_isOn)
                        BoxShadow(
                          color: _blue.withValues(alpha: 0.5),
                          blurRadius: 18,
                          spreadRadius: 4,
                        ),
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: _isOn
                        ? Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(3),
                            ),
                          )
                        : const Icon(Icons.mic_none, color: _blue, size: 28),
                  ),
                ),
              ),
            ),
          ],
        ),
        AnimatedOpacity(
          opacity: _showTooltip ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 600),
          child: AnimatedSlide(
            offset: _showTooltip ? Offset.zero : const Offset(0, 0.3),
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOut,
            child: Container(
              margin: const EdgeInsets.only(top: 6),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              constraints: const BoxConstraints(maxWidth: 160),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.55),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'Tap On/Off  •  Hold to talk',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  decoration: TextDecoration.none,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// Pulsing rings around the mic while recording.
class _WaveRingPainter extends CustomPainter {
  final double progress;
  static const _blue = Color(0xFF0071C5);
  const _WaveRingPainter(this.progress);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    for (int i = 0; i < 3; i++) {
      final t = ((progress + i / 3) % 1.0);
      final radius = 28.0 + 22.0 * t;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = _blue.withOpacity((1.0 - t) * 0.6)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.0,
      );
    }
  }

  @override
  bool shouldRepaint(_WaveRingPainter old) => old.progress != progress;
}
