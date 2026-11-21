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

  test('canonical issuer/account label and explicit HOTP counter', () {
    const secret = 'JBSWY3DPEHPK3PXP';
    final full = VaultOtp.parse(
        'otpauth://totp/GoreeCloud:fake%40example.invalid?secret=$secret&issuer=GoreeCloud');
    expect(full.issuer, 'GoreeCloud');
    expect(full.account, 'fake@example.invalid');
    expect(
        VaultOtp.parse('otpauth://totp/GoreeCloud:fake?secret=$secret').issuer,
        'GoreeCloud');
    final hotp = VaultOtp.parse(
        'otpauth://hotp/Trusted:fake?secret=$secret&issuer=Trusted&counter=0007&digits=8');
    expect(hotp.counter, 7);
    expect(hotp.digits, 8);
    expect(hotp.account, 'fake');
  });

  test('refuses duplicated, conflicting, or ambiguous OTP provisioning', () {
    const secret = 'JBSWY3DPEHPK3PXP';
    final rejected = [
      'otpauth://totp/Fake?secret=$secret&secret=$secret',
      'otpauth://totp/Fake?secret=$secret&issuer=A&issuer=B',
      'otpauth://totp/Trusted:fake?secret=$secret&issuer=Other',
      'otpauth://hotp/Fake?secret=$secret',
      'otpauth://totp/:fake?secret=$secret',
      'otpauth://totp/Trusted:?secret=$secret',
      'otpauth://totp/foo/bar?secret=$secret',
      'otpauth://totp/fake?secret=$secret#fragment',
      'otpauth://totp/fake?secret=$secret#',
      'otpauth://user@totp/fake?secret=$secret',
      'otpauth://totp:444/fake?secret=$secret',
      'otpauth://totp/fake?secret=$secret&digits=6.0',
      'otpauth://totp/fake?secret=$secret&period=-30',
      'otpauth://totp/fake?secret=$secret&counter=NaN',
    ];
    for (final source in rejected) {
      expect(() => VaultOtp.parse(source), throwsFormatException,
          reason: 'Reject potentially ambiguous synthetic provisioning URI');
    }
  });
}
