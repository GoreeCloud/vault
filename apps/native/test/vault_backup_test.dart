import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_backup.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_otp.dart';

void main() {
  test('export -> inspect -> re-encrypt retains multi-type private data',
      () async {
    const password = 'synthetic-only-development-password';
    final (key, initialized) = await VaultCrypto.initialize(password);
    final data = <VaultEntry>[
      const VaultEntry(
          id: 'login-id',
          title: 'Synthetic login',
          username: 'fake',
          password: 'NOT-A-REAL-PASSWORD',
          website: 'https://example.invalid',
          notes: 'Only test data',
          tags: ['test'],
          favorite: true),
      const VaultEntry(
          id: 'note-id',
          title: 'Synthetic private note',
          username: '',
          password: '',
          website: '',
          notes: 'PRIVATE TEST CONTENT',
          kind: 'note',
          customFields: [
            VaultField(
                name: 'Synthetic custom',
                value: 'FAKE-CUSTOM-VALUE',
                concealed: true)
          ]),
      VaultEntry(
          id: 'otp-id',
          title: 'Synthetic OTP',
          username: '',
          password: '',
          website: '',
          notes: '',
          kind: 'otp',
          otp: VaultOtp.parse('JBSWY3DPEHPK3PXP')),
    ];
    final sealed = await VaultCrypto.seal(data, key, initialized.salt);
    final bytes = VaultBackupCodec.exportEncrypted(sealed);
    for (final secret in [
      'NOT-A-REAL-PASSWORD',
      'PRIVATE TEST CONTENT',
      'FAKE-CUSTOM-VALUE',
      'JBSWY3DPEHPK3PXP'
    ]) {
      expect(utf8.decode(bytes).contains(secret), false);
    }
    final backup = await VaultBackupCodec.inspect(bytes, password);
    expect(backup.entries.length, 3);
    expect(backup.entries[1].customFields.single.value, 'FAKE-CUSTOM-VALUE');
    expect(backup.entries[2].otp?.type, 'totp');
    final rewritten = await VaultCrypto.seal(
        backup.entries, backup.key, backup.envelope.salt);
    expect(rewritten.nonce, isNot(equals(sealed.nonce)));
    expect((await VaultCrypto.decrypt(backup.key, rewritten)).length, 3);
  });

  test('wrong password, tampering, unsupported and oversized data rejected',
      () async {
    final (key, created) =
        await VaultCrypto.initialize('synthetic-only-password-long');
    final sealed = await VaultCrypto.seal([], key, created.salt);
    final valid = VaultBackupCodec.exportEncrypted(sealed);
    expect(() => VaultBackupCodec.inspect(valid, 'incorrect-password'),
        throwsA(isA<Exception>()));
    final tampered = sealed.toJson();
    final cipher = Map<String, dynamic>.from(tampered['cipher'] as Map);
    final raw = base64Decode(cipher['data'] as String);
    raw[0] ^= 1;
    cipher['data'] = base64Encode(raw);
    tampered['cipher'] = cipher;
    expect(
        () => VaultBackupCodec.inspect(
            Uint8List.fromList(utf8.encode(jsonEncode(tampered))),
            'synthetic-only-password-long'),
        throwsA(isA<Exception>()));
    expect(
        () => VaultBackupCodec.inspect(
            Uint8List(5_000_001), 'synthetic-only-password-long'),
        throwsFormatException);
    expect(
        () => VaultBackupCodec.inspect(
            Uint8List.fromList(utf8.encode('{"version":999}')),
            'synthetic-only-password-long'),
        throwsFormatException);
  });
}
