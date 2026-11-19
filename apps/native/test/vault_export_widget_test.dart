import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/main.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_store.dart';

class _MemoryVaultStore extends VaultStore {
  VaultEnvelope? value;

  @override
  Future<VaultEnvelope?> load() async => value;

  @override
  Future<VaultEnvelope?> loadForUnlock(
      {VaultEnvelope? previouslyObserved}) async {
    if (value == null && previouslyObserved != null) {
      throw const FormatException('Expected vault disappeared');
    }
    return value;
  }

  @override
  Future<void> save(VaultEnvelope envelope) async {
    value = envelope;
  }
}

void main() {
  testWidgets('encrypted export refuses stale local snapshot before OS picker',
      (tester) async {
    const password = 'synthetic-export-master-password';
    final store = _MemoryVaultStore();
    final init = await tester.runAsync(() => VaultCrypto.initialize(password));
    expect(init, isNotNull);
    final (key, original) = init!;
    store.value = original;
    final exported = <Uint8List>[];
    try {
      await tester.pumpWidget(VaultApp(
        store: store,
        exportEncryptedBytes: (ciphertext) async {
          // The OS destination would read bytes before this callback ends.
          exported.add(Uint8List.fromList(ciphertext));
          return true;
        },
      ));
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField).first, password);
      await tester.tap(find.text('Unlock securely'));
      await tester
          .runAsync(() => Future<void>.delayed(const Duration(seconds: 5)));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Encrypted backup options'), findsOneWidget);

      await tester.tap(find.byTooltip('Encrypted backup options'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Export encrypted backup'));
      await tester.pumpAndSettle();
      expect(exported, hasLength(1));
      expect(String.fromCharCodes(exported.single),
          isNot(contains('NOT-A-REAL-SECRET')));

      // A different authorized writer updates encrypted storage while this
      // instance is still unlocked. Old ciphertext must not be exported.
      final current = await tester.runAsync(() => VaultCrypto.seal([
            const VaultEntry(
              id: 'newer',
              title: 'Updated recovery entry',
              username: '',
              password: 'NOT-A-REAL-SECRET',
              website: '',
              notes: '',
            ),
          ], key, original.salt));
      store.value = current;
      await tester.tap(find.byTooltip('Encrypted backup options'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Export encrypted backup'));
      await tester.pumpAndSettle();
      expect(exported, hasLength(1));
      expect(store.value?.serialize(), current?.serialize());
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}
