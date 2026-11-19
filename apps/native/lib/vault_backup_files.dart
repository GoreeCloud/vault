import 'dart:convert';
import 'dart:io';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/services.dart';
import 'vault_backup.dart';

/// The OS picker runs only after a visible user action. The external file
/// contains the authenticated ciphertext envelope, NEVER a plaintext vault.
class VaultBackupFiles {
  static const _android = MethodChannel('goreecloud.vault/backup');
  static const _types = [
    XTypeGroup(
        label: 'JSON file for encrypted backup or migration',
        extensions: ['json'],
        mimeTypes: ['application/json']),
  ];
  static const defaultName = 'goreecloud-vault-encrypted.json';

  static Future<Uint8List?> importEncrypted() => selectLocalJsonBytes();

  /// Bounded local JSON selection for either encrypted backup or explicit
  /// plaintext Bitwarden migration. Caller owns validation, authentication,
  /// confirmation and encryption. No bytes are sent by this helper.
  static Future<Uint8List?> selectLocalJsonBytes() async {
    final XFile? file = await openFile(acceptedTypeGroups: _types);
    if (file == null) return null;
    final length = await file.length();
    if (length == 0 || length > maxEncryptedBackupBytes) {
      throw const FormatException('Selected JSON file size is invalid');
    }
    final bytes = await file.readAsBytes();
    if (bytes.length != length ||
        bytes.isEmpty ||
        bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException(
          'Selected JSON file changed or exceeds size limit');
    }
    return bytes;
  }

  /// Returns false on user cancellation, and throws if a platform save failed.
  static Future<bool> exportEncrypted(Uint8List bytes) async {
    if (bytes.isEmpty || bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException('Invalid encrypted backup size');
    }
    if (Platform.isAndroid) {
      final value = await _android.invokeMethod<bool>('saveEncryptedBackup', {
        'fileName': defaultName,
        'base64': base64Encode(bytes),
      });
      return value == true;
    }
    if (Platform.isLinux) {
      final location = await getSaveLocation(
          suggestedName: defaultName, acceptedTypeGroups: _types);
      if (location == null) return false;
      final file = XFile.fromData(bytes,
          name: defaultName, mimeType: 'application/json');
      await file.saveTo(location.path);
      return true;
    }
    throw UnsupportedError(
        'Only Linux and Android backup export is implemented');
  }
}
