import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/main.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_store.dart';

// Isolated in-memory store: validates widget state transitions without
// accessing an installed Android vault or any user's real filesystem.
class SyntheticVaultStore extends VaultStore {
  VaultEnvelope? value;

  @override
  Future<VaultEnvelope?> load() async => value;

  @override
  Future<VaultEnvelope?> loadForUnlock(
      {VaultEnvelope? previouslyObserved}) async {
    if (value == null && previouslyObserved != null) {
      throw const FormatException('Expected encrypted vault went missing');
    }
    return value;
  }

  @override
  Future<void> ensureUnchanged(VaultEnvelope expected) async {
    if (value?.serialize() != expected.serialize()) {
      throw const FormatException('Synthetic ciphertext changed');
    }
  }

  @override
  Future<void> save(VaultEnvelope envelope) async {
    value = envelope;
  }
}

Uint8List fakeProtonFile() => Uint8List.fromList(utf8.encode(jsonEncode({
      'version': '1.40.2',
      'vaults': {
        'SYNTHETIC': {
          'name': 'Synthetic demo',
          'items': [
            {
              'state': 1,
              'contentFormatVersion': 8,
              'data': {
                'type': 'login',
                'metadata': {
                  'name': 'Synthetic Proton login',
                  'note': 'NOT-REAL-NOTES'
                },
                'content': {
                  'itemUsername': 'fake-user',
                  'password': 'NOT-A-REAL-PASSWORD',
                  'urls': ['https://example.invalid']
                }
              }
            },
          ],
        }
      }
    })));

Future<void> advanceNativeCryptography(WidgetTester tester) async {
  // Give PBKDF2 and encryption real wall-clock time to finish, then
  // flush the asynchronous UI/frame updates under Flutter's test binding.
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(seconds: 5)),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
      'native Proton picker lifecycle locks, reauthenticates and encrypts',
      (tester) async {
    const password = 'synthetic-proton-master-password-for-test';
    final store = SyntheticVaultStore();
    final picker = Completer<Uint8List?>();
    try {
      final initialized =
          await tester.runAsync(() => VaultCrypto.initialize(password));
      expect(initialized, isNotNull);
      final (key, initial) = initialized!;
      await tester.runAsync(() => store.save(initial));

      await tester.pumpWidget(
          VaultApp(store: store, selectJsonBytes: () => picker.future));
      await tester.pumpAndSettle();
      expect(find.text('Unlock your vault'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, password);
      await tester.tap(find.text('Unlock securely'));
      await advanceNativeCryptography(tester);
      expect(find.byTooltip('Encrypted backup options'), findsOneWidget);

      await tester.tap(find.byTooltip('Encrypted backup options'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Import Proton Pass data.json'));
      await tester.pump();

      // Simulate the Android system picker leaving the app foreground.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      picker.complete(fakeProtonFile());
      await tester.pumpAndSettle();

      expect(find.text('Authenticate local vault'), findsOneWidget);
      expect(find.text('Import Proton Pass extracted plaintext data.json?'),
          findsNothing);
      await tester.enterText(find.byType(TextField).last, password);
      await tester.tap(find.text('Authenticate'));
      await advanceNativeCryptography(tester);
      expect(find.text('Import Proton Pass extracted plaintext data.json?'),
          findsOneWidget);
      expect(find.text('Encrypt and append'), findsOneWidget);

      await tester.tap(find.text('Encrypt and append'));
      await advanceNativeCryptography(tester);
      expect(find.text('Unlock your vault'), findsOneWidget);

      final saved = await tester.runAsync(() => store.load());
      expect(saved, isNotNull);
      final ciphertext = saved!.serialize();
      expect(ciphertext, isNot(contains('NOT-A-REAL-PASSWORD')));
      expect(ciphertext, isNot(contains('NOT-REAL-NOTES')));
      final unsealed =
          await tester.runAsync(() => VaultCrypto.decrypt(key, saved));
      expect(unsealed, isNotNull);
      expect(unsealed, hasLength(1));
      expect(unsealed!.single.title, 'Synthetic Proton login');
      expect(unsealed.single.username, 'fake-user');
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}
