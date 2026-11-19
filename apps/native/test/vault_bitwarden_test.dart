import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_bitwarden.dart';
import 'package:goreecloud_vault/vault_crypto.dart';

Uint8List data(Object x) => Uint8List.fromList(utf8.encode(jsonEncode(x)));

void main() {
  test('converts synthetic logins and notes and encrypts only ciphertext',
      () async {
    final preview = VaultBitwarden.parse(data({
      'encrypted': false,
      'folders': [
        {'id': 'folder', 'name': 'Test folder'}
      ],
      'items': [
        {
          'type': 1,
          'name': 'Synthetic login',
          'folderId': 'folder',
          'favorite': true,
          'reprompt': 1,
          'fields': [
            {'name': 'Fake answer', 'value': 'NOT-REAL-SECRET', 'type': 1}
          ],
          'login': {
            'username': 'fake',
            'password': 'NOT-REAL-PASSWORD',
            'uris': [
              {'uri': 'https://example.invalid'},
              {'uri': 'https://extra.invalid'}
            ],
            'totp': 'JBSWY3DPEHPK3PXP',
            'fido2Credentials': [
              {'id': 'FAKE-PASSKEY'}
            ]
          },
          'passwordHistory': [
            {'password': 'FAKE-OLD'}
          ],
          'attachments': [
            {'id': 'FAKE-ATTACHMENT'}
          ]
        },
        {'type': 2, 'name': 'Synthetic note', 'notes': 'NOT-A-PRIVATE-NOTE'},
        {'type': 3, 'name': 'Unsupported card'},
        {'type': 1, 'name': 'Org', 'organizationId': 'org', 'login': {}}
      ]
    }));
    expect(preview.entries.length, 2);
    expect(preview.entries.first.tags, ['Test folder']);
    expect(preview.entries.first.customFields.single.concealed, true);
    expect(preview.entries.first.otp?.secret, 'JBSWY3DPEHPK3PXP');
    expect(preview.skippedUnsupported, 1);
    expect(preview.skippedOrganization, 1);
    expect(preview.extraUris, 1);
    expect(preview.passwordHistories, 1);
    expect(preview.passkeyReferencesNotImported, 1);
    expect(preview.unimportedAttachments, 1);
    expect(preview.repromptNotImported, 1);
    expect(preview.warning(), isNot(contains('NOT-REAL-PASSWORD')));
    final (key, env) =
        await VaultCrypto.initialize('synthetic-only-password-long');
    final sealed = await VaultCrypto.seal(preview.entries, key, env.salt);
    expect(sealed.serialize(), isNot(contains('NOT-REAL-PASSWORD')));
    expect((await VaultCrypto.decrypt(key, sealed)).length, 2);
  });
  test('rejects encrypted, malformed and oversized sources', () {
    expect(() => VaultBitwarden.parse(data({'encrypted': true, 'items': []})),
        throwsFormatException);
    expect(
        () => VaultBitwarden.parse(data({
              'items': [
                {
                  'type': 1,
                  'name': 'X',
                  'login': {},
                  'fields': [
                    {'type': 3}
                  ]
                }
              ]
            })),
        throwsFormatException);
    expect(
        () => VaultBitwarden.parse(Uint8List(5000001)), throwsFormatException);
    expect(
        () => VaultBitwarden.parse(data({
              'items': [
                {
                  'type': 1,
                  'name': 'X',
                  'login': {'totp': 'not a valid OTP !!!'}
                }
              ]
            })),
        throwsA(isA<Exception>()));
    expect(
        () => VaultBitwarden.parse(data({
              'items': [
                {'type': 3, 'name': 'Card'}
              ]
            })),
        throwsFormatException);
  });
}
