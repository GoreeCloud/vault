import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/main.dart';
import 'package:goreecloud_vault/vault_backup.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_store.dart';

class _MemoryVaultStore extends VaultStore {
  VaultEnvelope? value;

  @override
  Future<VaultEnvelope?> load() async => value;

  @override
  Future<VaultEnvelope?> loadForUnlock(
      {VaultEnvelope? previouslyObserved}) async {
    if (previouslyObserved != null && value == null) {
      throw const FormatException('Missing encrypted destination');
    }
    return value;
  }

  @override
  Future<void> save(VaultEnvelope envelope) async {
    value = envelope;
  }
}

Future<void> _finishKdf(WidgetTester tester) async {
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(seconds: 5)),
  );
  await tester.pumpAndSettle();
}

void main() {
  const backupPassword = 'fake-backup-password-for-widget-only';
  final note = [
    const VaultEntry(
      id: 'synthetic-backup-entry',
      kind: 'note',
      title: 'Synthetic recovery note',
      username: '',
      password: '',
      website: '',
      notes: 'FAKE-BACKUP-NOTE-NOT-SECRET',
    )
  ];

  testWidgets(
      'restore fails closed if encrypted destination changed at consent',
      (tester) async {
    final store = _MemoryVaultStore();
    final originalResult = await tester
        .runAsync(() => VaultCrypto.initialize('synthetic-old-vault-password'));
    expect(originalResult, isNotNull);
    final (oldKey, oldEnvelope) = originalResult!;
    store.value = oldEnvelope;
    final backupResult =
        await tester.runAsync(() => VaultCrypto.initialize(backupPassword));
    expect(backupResult, isNotNull);
    final (backupKey, backupInit) = backupResult!;
    final backup = await tester
        .runAsync(() => VaultCrypto.seal(note, backupKey, backupInit.salt));
    final picker = Completer<Uint8List?>();
    try {
      await tester.pumpWidget(
          VaultApp(store: store, selectJsonBytes: () => picker.future));
      await tester.pumpAndSettle();
      expect(find.text('Unlock your vault'), findsOneWidget);
      await tester.tap(find.text('Restore encrypted backup'));
      await tester.pump();

      // The picker is allowed to background the app. Further lock-epoch
      // transitions after it returns must invalidate the restore attempt.
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      picker.complete(VaultBackupCodec.exportEncrypted(backup!));
      await tester.pumpAndSettle();
      expect(find.text('Unlock encrypted backup'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, backupPassword);
      await tester.tap(find.text('Validate backup'));
      await _finishKdf(tester);
      expect(find.text('Replace local encrypted vault?'), findsOneWidget);

      final newer = await tester
          .runAsync(() => VaultCrypto.seal(note, oldKey, oldEnvelope.salt));
      store.value = newer;
      final untouchedBytes = newer!.serialize();
      await tester.tap(find.text('Replace local vault'));
      await tester.pumpAndSettle();
      expect(store.value!.serialize(), untouchedBytes);
      expect(store.value!.serialize(), isNot(backup.serialize()));
      expect(find.text('Unlock your vault'), findsOneWidget);
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });

  testWidgets('restore an encrypted backup into empty synthetic vault and lock',
      (tester) async {
    final store = _MemoryVaultStore();
    final result =
        await tester.runAsync(() => VaultCrypto.initialize(backupPassword));
    expect(result, isNotNull);
    final (key, env) = result!;
    final backup =
        await tester.runAsync(() => VaultCrypto.seal(note, key, env.salt));
    final bytes = VaultBackupCodec.exportEncrypted(backup!);
    try {
      await tester.pumpWidget(
          VaultApp(store: store, selectJsonBytes: () async => bytes));
      await tester.pumpAndSettle();
      expect(find.text('Create your encrypted vault'), findsOneWidget);
      await tester.tap(find.text('Restore encrypted backup'));
      await tester.pumpAndSettle();
      expect(find.text('Unlock encrypted backup'), findsOneWidget);
      await tester.enterText(find.byType(TextField).last, backupPassword);
      await tester.tap(find.text('Validate backup'));
      await _finishKdf(tester);
      expect(find.text('Replace local encrypted vault?'), findsOneWidget);
      await tester.tap(find.text('Replace local vault'));
      await tester.pumpAndSettle();
      expect(find.text('Unlock your vault'), findsOneWidget);
      expect(store.value?.serialize(), backup.serialize());
      final ciphertext = store.value!.serialize();
      expect(ciphertext, isNot(contains('FAKE-BACKUP-NOTE-NOT-SECRET')));
      final decrypted =
          await tester.runAsync(() => VaultCrypto.decrypt(key, store.value!));
      expect(decrypted?.single.title, 'Synthetic recovery note');
    } finally {
      await tester.pumpWidget(const SizedBox.shrink());
    }
  });
}
