import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_crypto.dart';
import 'package:goreecloud_vault/vault_proton.dart';

Uint8List source(Object doc) =>
    Uint8List.fromList(utf8.encode(jsonEncode(doc)));

Map<String, dynamic> item(String type,
        {int state = 1, int version = 8, Map<String, dynamic>? content}) =>
    {
      'state': state,
      'contentFormatVersion': version,
      'data': {
        'type': type,
        'metadata': {'name': 'Synthetic item', 'note': 'NOT-A-REAL-NOTE'},
        'content': content ?? {},
      }
    };

Object exported(List<Object> items) => {
      'version': '1.40.2',
      'vaults': {
        'TEST': {'name': 'Synthetic personal', 'items': items}
      }
    };

void main() {
  test(
      'bounded plaintext login/note import preserves representable values and counts omissions',
      () async {
    final login = item('login', content: {
      'itemUsername': 'fake-user',
      'itemEmail': 'fake@example.invalid',
      'password': 'NOT-A-REAL-PASSWORD',
      'urls': ['https://example.invalid', 'https://other.invalid'],
      'totpUri': 'JBSWY3DPEHPK3PXP',
      'passkeys': [
        {'id': 'FAKE-PASSKEY-ID'}
      ],
    });
    login['pinned'] = true;
    login['files'] = ['FAKE-ATTACHMENT'];
    final data = login['data'] as Map<String, dynamic>;
    data['extraFields'] = [
      {
        'type': 'hidden',
        'fieldName': 'Synthetic secret',
        'data': {'content': 'NOT-A-REAL-FIELD'}
      },
      {
        'type': 'text',
        'fieldName': 'Visible',
        'data': {'content': 'FAKE-TEXT'}
      },
      {
        'type': 'totp',
        'fieldName': 'Additional OTP',
        'data': {'totpUri': 'JBSWY3DPEHPK3PXP'}
      },
      {
        'type': 'timestamp',
        'fieldName': 'Unmigratable',
        'data': {'timestamp': '2026-11-19'}
      },
    ];
    data['extraSections'] = [
      {'name': 'FAKE-SECTION'}
    ];
    final preview = VaultProton.parse(source(exported([
      login,
      item('note'),
      item('creditCard'),
      {'state': 2, 'contentFormatVersion': 8},
    ])));
    expect(preview.entries, hasLength(2));
    final first = preview.entries.first;
    expect(first.kind, 'login');
    expect(first.username, 'fake-user');
    expect(first.website, 'https://example.invalid');
    expect(first.password, 'NOT-A-REAL-PASSWORD');
    expect(first.favorite, true);
    expect(first.tags, ['Synthetic personal']);
    expect(first.otp?.secret, 'JBSWY3DPEHPK3PXP');
    expect(first.customFields.where((f) => f.concealed), hasLength(2));
    expect(first.customFields.where((f) => f.name == 'Proton Pass email'),
        hasLength(1));
    expect(preview.entries.last.kind, 'note');
    expect(preview.skippedUnsupported, 1);
    expect(preview.skippedTrash, 1);
    expect(preview.passkeysNotImported, 1);
    expect(preview.attachmentsNotImported, 1);
    expect(preview.extraUrls, 1);
    expect(preview.unsupportedFields, 1);
    expect(preview.extraSections, 1);
    expect(preview.secondaryEmailsPreserved, 1);
    expect(preview.extraOtpPreserved, 1);
    expect(preview.warning(), isNot(contains('NOT-A-REAL-PASSWORD')));
    expect(preview.warning(), isNot(contains('NOT-A-REAL-FIELD')));
    expect(preview.warning(), isNot(contains('NOT-A-REAL-NOTE')));
    final (key, env) = await VaultCrypto.initialize('synthetic-proton-master');
    final sealed = await VaultCrypto.seal(preview.entries, key, env.salt);
    expect(sealed.serialize(), isNot(contains('NOT-A-REAL-PASSWORD')));
    expect(sealed.serialize(), isNot(contains('NOT-A-REAL-NOTE')));
    final decrypted = await VaultCrypto.decrypt(key, sealed);
    expect(decrypted.length, 2);
    expect(decrypted.first.username, 'fake-user');
    expect(decrypted.last.kind, 'note');
  });

  test('unsupported formats, future versions and malformed OTP refuse import',
      () {
    for (final candidate in [
      {'version': '1.0'},
      {'version': '1.0', 'vaults': <String, Object>{}},
      exported([item('login', version: 9)]),
      exported([item('login', state: 7)]),
      exported([item('alias')]),
      exported([
        item('login', content: {'totpUri': 'bad-otp-!!!'})
      ]),
    ]) {
      expect(() => VaultProton.parse(source(candidate)),
          throwsA(isA<Exception>()));
    }
    expect(
        () => VaultProton.parse(Uint8List(5_000_001)), throwsFormatException);
    expect(() => VaultProton.parse(Uint8List.fromList([255, 254])),
        throwsA(isA<Exception>()));
  });

  test('accepts email-only synthetic login without an OTP', () {
    final login = item('login', content: {
      'itemEmail': 'fake@example.invalid',
      'urls': <String>[],
    });
    final preview = VaultProton.parse(source(exported([login])));
    expect(preview.entries.single.username, 'fake@example.invalid');
    expect(preview.entries.single.password, '');
    expect(preview.entries.single.otp, isNull);
    expect(preview.passkeysNotImported, 0);
    expect(preview.warning(), contains('other item types may contain more'));
  });

  test('rejects unsupported-only and corrupted custom field data', () {
    expect(() => VaultProton.parse(source(exported([item('alias')]))),
        throwsFormatException);
    final malformed = item('login');
    (malformed['data'] as Map<String, dynamic>)['extraFields'] = [
      {'type': 'hidden', 'fieldName': 'Fake', 'data': 'corrupt'}
    ];
    expect(() => VaultProton.parse(source(exported([malformed]))),
        throwsFormatException);
  });
}
