import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_backup.dart';
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

  test('restore snapshot guard protects empty, existing and vanished vaults',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-restore-guard-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      // A restore beginning on a never-created vault must not overwrite one
      // which appears while its encrypted source is being authenticated.
      await expectLater(store.ensureSnapshot(null), completes);
      final (_, original) =
          await VaultCrypto.initialize('synthetic-restore-guard-password');
      await store.save(original);
      final path =
          File([temp.path, 'vault.enc.json'].join(Platform.pathSeparator));
      final before = await path.readAsBytes();
      await expectLater(store.ensureSnapshot(null), throwsFormatException);
      expect(await path.readAsBytes(), before);
      await expectLater(store.ensureSnapshot(original), completes);
      await path.delete();
      await expectLater(store.ensureSnapshot(original), throwsFormatException);
      await expectLater(store.ensureSnapshot(null), completes);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('fresh unlock reloads current ciphertext instead of a cached envelope',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-fresh-unlock-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (key, first) =
          await VaultCrypto.initialize('synthetic-fresh-unlock-password');
      await store.save(first);
      final currentFirst = await store.loadForUnlock();
      expect(currentFirst?.serialize(), first.serialize());
      final newer = await VaultCrypto.seal([
        const VaultEntry(
            id: 'updated-ciphertext',
            title: 'Newer encrypted note',
            kind: 'note',
            username: '',
            password: '',
            website: '',
            notes: 'NON-SECRET-TEST')
      ], key, first.salt);
      await store.save(newer);

      final observed = await store.loadForUnlock(previouslyObserved: first);
      expect(observed?.serialize(), newer.serialize());
      final opened = await VaultCrypto.decrypt(key, observed!);
      expect(opened.single.title, 'Newer encrypted note');
      await expectLater(store.ensureUnchanged(first), throwsFormatException);
      await expectLater(store.ensureUnchanged(newer), completes);

      final path = File('${temp.path}/vault.enc.json');
      await path.delete();
      await expectLater(store.loadForUnlock(previouslyObserved: newer),
          throwsFormatException);
      expect(await store.loadForUnlock(), isNull);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('two concurrent cooperative native mutations cannot both win', () async {
    final temp = await Directory.systemTemp.createTemp('gcv-write-lock-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (key, original) =
          await VaultCrypto.initialize('synthetic-cooperative-write-test');
      await store.save(original);
      final one = await VaultCrypto.seal([
        const VaultEntry(
          id: 'first-writer',
          title: 'One test writer',
          kind: 'note',
          username: '',
          password: '',
          website: '',
          notes: 'NOT-A-REAL-NOTE',
        )
      ], key, original.salt);
      final two = await VaultCrypto.seal([
        const VaultEntry(
          id: 'second-writer',
          title: 'Second test writer',
          kind: 'note',
          username: '',
          password: '',
          website: '',
          notes: 'ANOTHER-FAKE-NOTE',
        )
      ], key, original.salt);
      final outcomes = await Future.wait<bool>([
        store
            .saveIfUnchanged(original, one)
            .then((_) => true, onError: (Object _) => false),
        store
            .saveIfUnchanged(original, two)
            .then((_) => true, onError: (Object _) => false),
      ]);
      expect(outcomes.where((ok) => ok).length, 1);
      final current = (await store.load())!;
      final items = await VaultCrypto.decrypt(key, current);
      expect(items, hasLength(1));
      expect([one.serialize(), two.serialize()], contains(current.serialize()));
      final path =
          File([temp.path, 'vault.enc.json'].join(Platform.pathSeparator));
      expect(await path.readAsString(), isNot(contains('NOT-A-REAL-NOTE')));
      expect(await path.readAsString(), isNot(contains('ANOTHER-FAKE-NOTE')));
      final lockPath =
          File([temp.path, 'vault.enc.json.lock'].join(Platform.pathSeparator));
      expect(await lockPath.exists(), true);
      if (Platform.isLinux) {
        expect((await lockPath.stat()).mode & 0x1ff, 0x180);
      }
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('locked first-run creation refuses a second, already present vault',
      () async {
    final temp = await Directory.systemTemp.createTemp('gcv-first-lock-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (_, first) =
          await VaultCrypto.initialize('synthetic-first-creation');
      final (_, second) =
          await VaultCrypto.initialize('synthetic-second-creation');
      await store.saveIfUnchanged(null, first);
      final bytes = VaultBackupCodec.exportEncrypted(first);
      await expectLater(
          store.saveIfUnchanged(null, second), throwsFormatException);
      expect(VaultBackupCodec.exportEncrypted((await store.load())!), bytes);
      await expectLater(
          store.saveIfUnchanged(first, second, canCommit: () => false),
          throwsStateError);
      expect(VaultBackupCodec.exportEncrypted((await store.load())!), bytes);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('an invalidated session aborts before ciphertext rename', () async {
    final temp = await Directory.systemTemp.createTemp('gcv-revoked-write-');
    try {
      final store = VaultStore(supportDirectory: () async => temp);
      final (key, first) =
          await VaultCrypto.initialize('synthetic-revoked-master-key');
      await store.save(first);
      final next = await VaultCrypto.seal([
        const VaultEntry(
          id: 'never-committed',
          title: 'Canceled after encryption',
          kind: 'note',
          username: '',
          password: '',
          website: '',
          notes: 'FAKE-SECRET-CANCELED',
        )
      ], key, first.salt);
      final path =
          File([temp.path, 'vault.enc.json'].join(Platform.pathSeparator));
      final oldBytes = await path.readAsBytes();
      var checks = 0;
      await expectLater(
          store.saveIfUnchanged(first, next, canCommit: () {
            checks++;
            return checks == 1;
          }),
          throwsStateError);
      expect(checks, 2);
      expect(await path.readAsBytes(), oldBytes);
      expect(await temp.list().where((e) => e.path.endsWith('.tmp')).isEmpty,
          true);
    } finally {
      await temp.delete(recursive: true);
    }
  });

  test('rejects a symlinked native vault lockfile', () async {
    if (!Platform.isLinux) return;
    final temp = await Directory.systemTemp.createTemp('gcv-lock-symlink-');
    try {
      final target =
          File([temp.path, 'target.txt'].join(Platform.pathSeparator));
      await target.writeAsString('KEEP-SYNTHETIC');
      final lock =
          Link([temp.path, 'vault.enc.json.lock'].join(Platform.pathSeparator));
      await lock.create(target.path);
      final store = VaultStore(supportDirectory: () async => temp);
      final (_, env) = await VaultCrypto.initialize('fake-lock-symlink-key');
      await expectLater(store.saveIfUnchanged(null, env),
          throwsA(isA<FileSystemException>()));
      expect(await target.readAsString(), 'KEEP-SYNTHETIC');
      expect(await store.load(), isNull);
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
