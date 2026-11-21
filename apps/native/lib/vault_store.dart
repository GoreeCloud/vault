import 'dart:async';
import 'dart:io';
import 'dart:math';
import 'package:path_provider/path_provider.dart';
import 'vault_backup.dart';
import 'vault_crypto.dart';

/// App-private encrypted storage, without network access or plaintext files.
/// A caller may inject a disposable directory for tests; production always
/// uses the platform application-support directory.
class VaultStore {
  VaultStore({Future<Directory> Function()? supportDirectory})
      : _supportDirectory = supportDirectory ?? getApplicationSupportDirectory;

  final Future<Directory> Function() _supportDirectory;

  // Per-isolate FIFO synchronization complements OS advisory file locking:
  // POSIX record locks can be process-scoped rather than file-descriptor
  // scoped. Separate isolates/processes must also cooperate with the OS lock.
  static final Map<String, Future<void>> _localQueues = {};

  Future<File> _location() async {
    final directory = await _supportDirectory();
    await directory.create(recursive: true);
    return File('${directory.path}/vault.enc.json');
  }

  static Future<void> _restrictLinuxPermissions(String path) async {
    if (!Platform.isLinux) return;
    // Fixed OS binary, argv (never a shell) and private, controlled path.
    // Ciphertext should not be world-readable even without the master key.
    final result = await Process.run('/usr/bin/chmod', ['0600', path]);
    if (result.exitCode != 0) {
      throw FileSystemException('Unable to secure encrypted vault file');
    }
  }

  static Future<void> _verifyPath(File file) async {
    final type = await FileSystemEntity.type(file.path, followLinks: false);
    if (type != FileSystemEntityType.notFound &&
        type != FileSystemEntityType.file) {
      throw FileSystemException('Unsafe encrypted vault storage path');
    }
  }

  Future<VaultEnvelope?> load() async {
    final file = await _location();
    await _verifyPath(file);
    if (!await file.exists()) return null;
    final length = await file.length();
    if (length == 0 || length > maxEncryptedBackupBytes) {
      throw const FormatException('Encrypted vault exceeds allowed size');
    }
    await _restrictLinuxPermissions(file.path);
    return VaultEnvelope.parse(await file.readAsString());
  }

  /// Every new master-password unlock must use the authoritative on-disk
  /// ciphertext, never an in-memory envelope cached before a backgrounded
  /// operation or another process's authorized replacement.
  ///
  /// If a previously observed vault disappeared, fail closed rather than
  /// silently creating a new empty vault with the user's next password.
  Future<VaultEnvelope?> loadForUnlock(
      {VaultEnvelope? previouslyObserved}) async {
    final current = await load();
    if (current == null && previouslyObserved != null) {
      throw const FormatException('Previously opened vault is missing');
    }
    return current;
  }

  /// Checks that encrypted storage is still EXACTLY the state observed before
  /// an operation. A null expected value means there must still be no vault.
  ///
  /// This is best-effort freshness detection, not an interprocess transaction.
  /// Another writer can race between this check and the subsequent rename.
  Future<void> ensureSnapshot(VaultEnvelope? expected) async {
    final current = await load();
    if (expected == null && current == null) return;
    if (expected == null ||
        current == null ||
        current.serialize() != expected.serialize()) {
      throw const FormatException('Encrypted vault changed during operation');
    }
  }

  /// Reject a migration based on an outdated encrypted snapshot.
  ///
  /// This only detects changes *before* the final save: it is not a
  /// cross-process lock or a guarantee against filesystem-level races.
  Future<void> ensureUnchanged(VaultEnvelope expected) =>
      ensureSnapshot(expected);

  Future<T> _withEncryptedFileLock<T>(
      Future<T> Function(File destination) operation) async {
    final destination = await _location();
    final lockFile = File('${destination.path}.lock');
    final lockPath = lockFile.path;
    final predecessor = _localQueues[lockPath] ?? Future<void>.value();
    final release = Completer<void>();
    _localQueues[lockPath] = release.future;
    try {
      await predecessor;
      await _verifyPath(lockFile);
      // This empty lockfile has no secrets. Restrict permissions before any
      // sensitive operation; keep it stable across ciphertext atomic renames.
      final channel = await lockFile.open(mode: FileMode.append);
      try {
        await _restrictLinuxPermissions(lockPath);
        await channel.lock(FileLock.exclusive);
        try {
          return await operation(destination);
        } finally {
          await channel.unlock();
        }
      } finally {
        await channel.close();
      }
    } finally {
      release.complete();
      if (identical(_localQueues[lockPath], release.future)) {
        _localQueues.remove(lockPath);
      }
    }
  }

  /// All native encrypted writers must use the same lockfile, including
  /// vault initialization. This method is kept for compatibility/tests;
  /// user-visible operations must use the compare-and-replace method below.
  Future<void> save(VaultEnvelope envelope) async {
    await _withEncryptedFileLock((file) => _writeUnderLock(file, envelope));
  }

  /// Serializes check and ciphertext replacement for cooperating native
  /// writers. A null expected value means no previous encrypted file.
  /// canCommit checks a caller's lock epoch after any lock wait AND again
  /// after the temporary ciphertext file is flushed, before rename. Advisory
  /// locks cannot defend against a noncooperating filesystem writer or
  /// guarantee crash durability or ciphertext antirollback.
  Future<void> saveIfUnchanged(VaultEnvelope? expected, VaultEnvelope next,
      {bool Function()? canCommit}) async {
    await _withEncryptedFileLock((file) async {
      await ensureSnapshot(expected);
      if (canCommit != null && !canCommit()) {
        throw StateError('Native vault session invalidated before commit');
      }
      await _writeUnderLock(file, next, canCommit: canCommit);
    });
  }

  Future<void> _writeUnderLock(File file, VaultEnvelope envelope,
      {bool Function()? canCommit}) async {
    await _verifyPath(file);
    // Reject invalid/oversized output BEFORE touching the old file.
    final bytes = VaultBackupCodec.exportEncrypted(envelope);
    final generator = Random.secure();
    final suffix = List<int>.generate(16, (_) => generator.nextInt(256))
        .map((v) => v.toRadixString(16).padLeft(2, '0'))
        .join();
    final temp = File('${file.path}.$suffix.tmp');
    try {
      // Create exclusively, then set 0600 BEFORE writing any ciphertext.
      // The brief default-mode window contains an empty file only.
      await temp.create(exclusive: true);
      await _restrictLinuxPermissions(temp.path);
      await temp.writeAsBytes(bytes, flush: true);
      // Invalidate a stale in-flight operation before its atomic rename.
      // There remains a small race between this callback and the OS rename.
      if (canCommit != null && !canCommit()) {
        throw StateError('Native vault session invalidated before rename');
      }
      await temp.rename(file.path);
    } catch (_) {
      if (await FileSystemEntity.type(temp.path, followLinks: false) !=
          FileSystemEntityType.notFound) {
        await temp.delete();
      }
      rethrow;
    }
  }
}
