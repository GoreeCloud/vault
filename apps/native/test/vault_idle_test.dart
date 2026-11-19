import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_idle.dart';

void main() {
  testWidgets('locks after five minutes without local input', (tester) async {
    var locks = 0;
    final idle = VaultIdleTimer(onExpired: () => locks++);
    idle.start();
    await tester.pump(const Duration(minutes: 4));
    expect(locks, 0);
    await tester.pump(const Duration(minutes: 1, seconds: 1));
    expect(locks, 1);
    expect(idle.isActive, isFalse);
    await tester.pump(const Duration(minutes: 6));
    expect(locks, 1);
  });

  testWidgets('local activity restarts countdown, lock stops timer',
      (tester) async {
    var locks = 0;
    final idle = VaultIdleTimer(onExpired: () => locks++);
    idle.start();
    await tester.pump(const Duration(minutes: 4));
    idle.touch();
    await tester.pump(const Duration(minutes: 2));
    expect(locks, 0);
    idle.stop();
    await tester.pump(const Duration(minutes: 9));
    expect(locks, 0);
    idle.start();
    await tester.pump(const Duration(minutes: 5, seconds: 1));
    expect(locks, 1);
  });
}
