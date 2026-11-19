import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_store.dart';

void main() {
  test('encrypted file uses private permissions and survives replacement',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-store-test-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (key, original) =
          await VaultCrypto.initialize('synthetic-store-master-password');
      await store.save(original);
      final file = File('${temp.path}/vault.enc.json');
      expect(await file.exists(), isTrue);
      if (Platform.isLinux) {
        expect((await file.stat()).mode & 0x1ff, 0x180); // POSIX 0600
      }
      final loaded = await store.load();
      expect(loaded, isNotNull);
      expect((await VaultCrypto.decrypt(key, loaded!)).length, 0);
      final second = await VaultCrypto.seal([
        const VaultEntry(
            id: 'synthetic-only',
            title: 'Test only',
            username: 'fake',
            password: 'NOT-A-REAL-PASSWORD',
            website: 'https://example.invalid',
            notes: 'SYNTHETIC NOTE')
      ], key, original.salt);
      await store.save(second);
      expect((await VaultCrypto.decrypt(key, (await store.load())!)).length, 1);
      expect(await temp.list().where((e) => e.path.endsWith('.tmp')).isEmpty,
          isTrue);
      final content = await file.readAsString();
      expect(content, isNot(contains('NOT-A-REAL-PASSWORD')));
      expect(content, isNot(contains('SYNTHETIC NOTE')));
      if (Platform.isLinux) {
        expect((await file.stat()).mode & 0x1ff, 0x180);
      }
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('rejects oversized storage and preserves previous encrypted file',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-store-invalid-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (_, original) =
          await VaultCrypto.initialize('synthetic-store-master-password');
      await store.save(original);
      final file = File('${temp.path}/vault.enc.json');
      final previous = await file.readAsBytes();
      final huge = VaultEnvelope(
          original.salt, original.nonce, List<int>.filled(4_000_000, 12));
      await expectLater(store.save(huge), throwsFormatException);
      expect(await file.readAsBytes(), previous);
      await file.writeAsString('x' * 5_000_001, flush: true);
      await expectLater(store.load(), throwsFormatException);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('detects stale encrypted snapshots without replacing the current file',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-store-stale-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (key, original) =
          await VaultCrypto.initialize('synthetic-stale-test-password');
      await store.save(original);
      await expectLater(store.ensureUnchanged(original), completes);
      // Another successful save changes the authenticated envelope and nonce.
      final newest = await VaultCrypto.seal([
        const VaultEntry(
            id: 'newer',
            title: 'Newer synthetic entry',
            username: '',
            password: 'NOT-A-REAL-SECRET',
            website: '',
            notes: '')
      ], key, original.salt);
      await store.save(newest);
      final file = File('${temp.path}/vault.enc.json');
      final unchangedBytes = await file.readAsBytes();
      await expectLater(store.ensureUnchanged(original), throwsFormatException);
      expect(await file.readAsBytes(), unchangedBytes);
      await expectLater(store.ensureUnchanged(newest), completes);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('refuses symlink as local ciphertext target', () async {
    if (!Platform.isLinux) return;
    final temp = await Directory.systemTemp.createTemp('gcv-store-symlink-');
    try {
      final target = File('${temp.path}/not-a-vault.txt');
      await target.writeAsString('KEEP');
      final link = Link('${temp.path}/vault.enc.json');
      await link.create(target.path);
      final store = VaultStore(supportDirectory: () async => temp);
      await expectLater(store.load(), throwsA(isA<FileSystemException>()));
      final (_, env) = await VaultCrypto.initialize('synthetic-password-long');
      await expectLater(store.save(env), throwsA(isA<FileSystemException>()));
      expect(await target.readAsString(), 'KEEP');
    } finally {
      await temp.delete(recursive: true);
    }
  });
}
