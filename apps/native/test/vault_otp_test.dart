import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_otp.dart';

void main() {
  test('RFC 6238 TOTP with SHA1/SHA256/SHA512', () async {
    final fixtures = [
      ('12345678901234567890', 'SHA1', '94287082'),
      ('12345678901234567890123456789012', 'SHA256', '46119246'),
      (
        '1234567890123456789012345678901234567890123456789012345678901234',
        'SHA512',
        '90693936'
      ),
    ];
    for (final (key, algo, expected) in fixtures) {
      final otp = VaultOtp(
          type: 'totp',
          secret: base32Encode(utf8.encode(key)),
          algorithm: algo,
          digits: 8);
      expect(await otp.generate(unixMs: 59000), expected);
    }
  });
  test('RFC 4226 HOTP increments', () async {
    final otp = VaultOtp(
        type: 'hotp',
        secret: base32Encode(utf8.encode('12345678901234567890')));
    expect(await otp.generate(), '755224');
    expect(await otp.advance().generate(), '287082');
  });
  test('URI parser rejects insecure parameters', () {
    final otp = VaultOtp.parse(
        'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&issuer=GoreeCloud');
    expect(otp.issuer, 'GoreeCloud');
    expect(() => VaultOtp.parse('otpauth://totp/Test?secret=bad!'),
        throwsFormatException);
    expect(
        () => VaultOtp.parse(
            'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP&algorithm=MD5'),
        throwsFormatException);
  });
}
