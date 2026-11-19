import 'package:cryptography/cryptography.dart';

/// Offline RFC 4226 / RFC 6238 generator; interoperable with apps/web/src/otp.ts.
class VaultOtp {
  const VaultOtp({
    required this.type,
    required this.secret,
    this.algorithm = 'SHA1',
    this.digits = 6,
    this.period = 30,
    this.counter = 0,
    this.issuer = '',
    this.account = '',
  });
  final String type, secret, algorithm, issuer, account;
  final int digits, period, counter;

  static const _alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  static List<int> base32(String text) {
    final input = text
        .toUpperCase()
        .replaceAll(RegExp(r'[\s-]'), '')
        .replaceFirst(RegExp(r'=+$'), '');
    if (input.isEmpty ||
        input.length > 1024 ||
        RegExp(r'[^A-Z2-7]').hasMatch(input) ||
        const [1, 3, 6].contains(input.length % 8)) {
      throw const FormatException('Invalid Base32 secret');
    }
    var buffer = 0, bits = 0;
    final result = <int>[];
    for (final c in input.split('')) {
      buffer = (buffer << 5) | _alphabet.indexOf(c);
      bits += 5;
      if (bits >= 8) {
        bits -= 8;
        result.add((buffer >> bits) & 255);
        buffer &= (1 << bits) - 1;
      }
    }
    if (result.isEmpty || buffer != 0) {
      throw const FormatException('Invalid Base32 padding');
    }
    return result;
  }

  void validate() {
    if (type != 'totp' && type != 'hotp') {
      throw const FormatException('Unknown OTP type');
    }
    if (!['SHA1', 'SHA256', 'SHA512'].contains(algorithm) ||
        ![6, 8].contains(digits) ||
        period < 15 ||
        period > 300 ||
        counter < 0 ||
        issuer.length > 255 ||
        account.length > 255 ||
        base32(secret).length < 10) {
      throw const FormatException('Invalid OTP parameters');
    }
  }

  factory VaultOtp.parse(String source) {
    if (!source.startsWith('otpauth://')) {
      final otp = VaultOtp(type: 'totp', secret: source.trim().toUpperCase());
      otp.validate();
      return otp;
    }
    if (source.length > 2500) throw const FormatException('OTP URI too large');
    final uri = Uri.parse(source);
    if (uri.scheme != 'otpauth' || !['totp', 'hotp'].contains(uri.host)) {
      throw const FormatException('Unsupported OTP URI');
    }
    final p = uri.queryParameters;
    final otp = VaultOtp(
        type: uri.host,
        secret: (p['secret'] ?? '').toUpperCase().replaceAll(RegExp(r'\s'), ''),
        algorithm: (p['algorithm'] ?? 'SHA1').toUpperCase(),
        digits: int.parse(p['digits'] ?? '6'),
        period: int.parse(p['period'] ?? '30'),
        counter: int.parse(p['counter'] ?? '0'),
        issuer: p['issuer'] ?? '',
        account: uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '');
    otp.validate();
    return otp;
  }

  factory VaultOtp.fromJson(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      throw const FormatException('Invalid OTP metadata');
    }
    final otp = VaultOtp(
        type: raw['type'] as String,
        secret: raw['secret'] as String,
        algorithm: raw['algorithm'] as String,
        digits: raw['digits'] as int,
        period: raw['period'] as int,
        counter: raw['counter'] as int,
        issuer: raw['issuer'] as String,
        account: raw['account'] as String);
    otp.validate();
    return otp;
  }
  Map<String, dynamic> toJson() => {
        'type': type,
        'secret': secret,
        'algorithm': algorithm,
        'digits': digits,
        'period': period,
        'counter': counter,
        'issuer': issuer,
        'account': account
      };
  VaultOtp advance() => VaultOtp(
      type: type,
      secret: secret,
      algorithm: algorithm,
      digits: digits,
      period: period,
      counter: counter + 1,
      issuer: issuer,
      account: account);

  Future<String> generate({int? unixMs}) async {
    validate();
    final milliseconds = unixMs ?? DateTime.now().millisecondsSinceEpoch;
    if (milliseconds < 0) throw const FormatException('Invalid OTP time');
    var count = type == 'totp' ? milliseconds ~/ (period * 1000) : counter;
    final data = List<int>.filled(8, 0);
    for (var i = 7; i >= 0; i--) {
      data[i] = count & 255;
      count >>= 8;
    }
    final mac = Hmac(switch (algorithm) {
      'SHA256' => Sha256(),
      'SHA512' => Sha512(),
      _ => Sha1(),
    });
    final signature =
        (await mac.calculateMac(data, secretKey: SecretKey(base32(secret))))
            .bytes;
    final offset = signature.last & 15;
    final value = ((signature[offset] & 127) << 24) |
        (signature[offset + 1] << 16) |
        (signature[offset + 2] << 8) |
        signature[offset + 3];
    final result = value % (digits == 8 ? 100000000 : 1000000);
    return result.toString().padLeft(digits, '0');
  }
}

/// Test support: unpadded Base32 for known RFC ASCII key material.
String base32Encode(List<int> bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var buffer = 0, bits = 0;
  final out = StringBuffer();
  for (final byte in bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out.write(alphabet[(buffer >> bits) & 31]);
      buffer &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out.write(alphabet[(buffer << (5 - bits)) & 31]);
  return out.toString();
}
