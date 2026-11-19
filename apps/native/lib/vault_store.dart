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

  Future<void> save(VaultEnvelope envelope) async {
    final file = await _location();
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
