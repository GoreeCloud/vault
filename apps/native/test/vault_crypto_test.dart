import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_crypto.dart';

void main() {
  test('local encrypted vault roundtrip and wrong password rejection',
      () async {
    final (key, fresh) =
        await VaultCrypto.initialize('a long development test password');
    final entries = [
      const VaultEntry(
          id: '1',
          title: 'Example',
          username: 'test',
          password: 'TEST-SECRET',
          website: 'example.org',
          notes: 'example')
    ];
    final sealed = await VaultCrypto.seal(entries, key, fresh.salt);
    expect(sealed.serialize().contains('TEST-SECRET'), isFalse);
    expect(sealed.nonce, isNot(equals(fresh.nonce)));
    expect(
        (await VaultCrypto.unlock('a long development test password',
                VaultEnvelope.parse(sealed.serialize())))
            .first
            .password,
        'TEST-SECRET');
    expect(() async => VaultCrypto.unlock('wrong password', sealed),
        throwsA(isA<Exception>()));
  });
  test('format validation and generator', () {
    expect(() => VaultEnvelope.parse('{"version":2}'), throwsFormatException);
    expect(generatePassword().length, 24);
  });
  test('decrypts a Node.js AES-GCM/PBKDF2 cross-platform fixture', () async {
    final fixture = File('../../tests/interop/sample-v1.json');
    final env = VaultEnvelope.parse(await fixture.readAsString());
    final items = await VaultCrypto.unlock('interop test password only', env);
    expect(items.single.website, 'example.invalid');
    expect(items.single.password, 'NOT-A-REAL-PASSWORD');
  });
}
