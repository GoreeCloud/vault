import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'vault_crypto.dart';

/// Format v1 remains identical across React, Firefox and native Flutter.
const maxEncryptedBackupBytes = 5000000;

/// A fully authenticated, validated candidate before *any* local vault is replaced.
class ValidatedVaultBackup {
  const ValidatedVaultBackup(this.envelope, this.key, this.entries);
  final VaultEnvelope envelope;
  final SecretKey key;
  final List<VaultEntry> entries;
}

/// Pure service: no file, network, plugin, or state changes during validation.
/// The caller MUST require explicit confirmation and persist only after success.
class VaultBackupCodec {
  static Future<ValidatedVaultBackup> inspect(
      Uint8List bytes, String masterPassword) async {
    if (bytes.isEmpty || bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException('Encrypted backup exceeds allowed size');
    }
    if (masterPassword.isEmpty || masterPassword.length > 1024) {
      throw const FormatException('Invalid master password');
    }
    final raw = utf8.decode(bytes, allowMalformed: false);
    final envelope = VaultEnvelope.parse(raw);
    final key = await VaultCrypto.derive(masterPassword, envelope.salt);
    final entries = await VaultCrypto.decrypt(key, envelope);
    return ValidatedVaultBackup(envelope, key, entries);
  }

  static Uint8List exportEncrypted(VaultEnvelope envelope) {
    final bytes = Uint8List.fromList(utf8.encode(envelope.serialize()));
    if (bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException('Encrypted vault exceeds backup size limit');
    }
    return bytes;
  }
}
