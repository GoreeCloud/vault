import 'dart:async';

/// Fail-closed session inactivity controller. No telemetry or persistent state.
/// A Flutter widget can feed pointer, keyboard and trusted local actions into
/// touch(); stop() disables the timer when the vault is locked/backgrounded.
class VaultIdleTimer {
  VaultIdleTimer({
    required this.onExpired,
    this.timeout = const Duration(minutes: 5),
  }) : assert(timeout > Duration.zero);

  final void Function() onExpired;
  final Duration timeout;
  Timer? _timer;
  bool _active = false;

  bool get isActive => _active;

  void start() {
    _active = true;
    touch();
  }

  void touch() {
    if (!_active) return;
    _timer?.cancel();
    _timer = Timer(timeout, () {
      _active = false;
      _timer = null;
      onExpired();
    });
  }

  void stop() {
    _active = false;
    _timer?.cancel();
    _timer = null;
  }
}
