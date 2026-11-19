import 'dart:convert';
import 'dart:math';
import 'package:cryptography/cryptography.dart';
import 'vault_otp.dart';

const vaultKdfIterations = 600000;
const maxVaultFileLength = 5000000;
final _rng = Random.secure();
final _kdf = Pbkdf2(
    macAlgorithm: Hmac.sha256(), iterations: vaultKdfIterations, bits: 256);
final _cipher = AesGcm.with256bits();

List<int> randomBytes(int size) =>
    List<int>.generate(size, (_) => _rng.nextInt(256));
String generatePassword([int length = 24]) {
  const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#\$%^&*()-_=+';
  final limit = (256 ~/ chars.length) * chars.length;
  final buffer = StringBuffer();
  var count = 0;
  while (count < length) {
    final n = _rng.nextInt(256);
    if (n < limit) {
      buffer.write(chars[n % chars.length]);
      count++;
    }
  }
  return buffer.toString();
}

class VaultField {
  const VaultField(
      {required this.name, required this.value, required this.concealed});
  final String name, value;
  final bool concealed;
  factory VaultField.fromJson(Object? raw) {
    if (raw is! Map<String, dynamic> ||
        raw['name'] is! String ||
        raw['value'] is! String ||
        raw['concealed'] is! bool ||
        (raw['name'] as String).length > 150 ||
        (raw['value'] as String).length > 20000) {
      throw const FormatException('Invalid custom field');
    }
    return VaultField(
        name: raw['name'] as String,
        value: raw['value'] as String,
        concealed: raw['concealed'] as bool);
  }
  Map<String, dynamic> toJson() =>
      {'name': name, 'value': value, 'concealed': concealed};
}

class VaultEntry {
  const VaultEntry({
    required this.id,
    required this.title,
    required this.username,
    required this.password,
    required this.website,
    required this.notes,
    this.kind = 'login',
    this.favorite = false,
    this.tags = const [],
    this.customFields = const [],
    this.otp,
    this.passkey,
  });
  final String id, title, username, password, website, notes, kind;
  final bool favorite;
  final List<String> tags;
  final List<VaultField> customFields;
  final VaultOtp? otp;
  final Map<String, String>? passkey;

  factory VaultEntry.fromJson(Object? raw) {
    if (raw is! Map<String, dynamic>) {
      throw const FormatException('Invalid entry');
    }
    String field(String k) {
      final v = raw[k];
      if (v is! String || v.length > 20000) {
        throw const FormatException('Invalid entry field');
      }
      return v;
    }

    final kind = raw['kind'] ?? 'login';
    if (!['login', 'note', 'otp', 'passkey'].contains(kind)) {
      throw const FormatException('Invalid kind');
    }
    final favorite = raw['favorite'] ?? false;
    final tags = raw['tags'] ?? <dynamic>[];
    final customFields = raw['customFields'] ?? <dynamic>[];
    final passkey = raw['passkey'];
    if (favorite is! bool ||
        tags is! List ||
        tags.length > 30 ||
        tags.any((t) => t is! String || t.length > 120) ||
        customFields is! List ||
        customFields.length > 30 ||
        (passkey != null &&
            (passkey is! Map<String, dynamic> ||
                passkey['rpId'] is! String ||
                passkey['credentialId'] is! String ||
                passkey['userHandle'] is! String ||
                (passkey['rpId'] as String).length > 253 ||
                !RegExp(r'^[a-z0-9.-]+$').hasMatch(passkey['rpId'] as String) ||
                (passkey['credentialId'] as String).length > 4096 ||
                (passkey['userHandle'] as String).length > 4096))) {
      throw const FormatException('Invalid extended entry fields');
    }
    return VaultEntry(
        id: field('id'),
        title: field('title'),
        username: field('username'),
        password: field('password'),
        website: field('website'),
        notes: field('notes'),
        kind: kind as String,
        favorite: favorite,
        tags: List<String>.from(tags),
        customFields: customFields.map((e) => VaultField.fromJson(e)).toList(),
        otp: raw['otp'] == null ? null : VaultOtp.fromJson(raw['otp']),
        passkey: passkey == null ? null : Map<String, String>.from(passkey));
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'username': username,
        'password': password,
        'website': website,
        'notes': notes,
        'kind': kind,
        'favorite': favorite,
        'tags': tags,
        'customFields': customFields.map((e) => e.toJson()).toList(),
        if (otp != null) 'otp': otp!.toJson(),
        if (passkey != null) 'passkey': passkey
      };
}

class VaultEnvelope {
  VaultEnvelope(this.salt, this.nonce, this.ciphertext);
  final List<int> salt, nonce, ciphertext;
  factory VaultEnvelope.parse(String text) {
    if (text.length > maxVaultFileLength) {
      throw const FormatException('Oversized vault');
    }
    final raw = jsonDecode(text);
    if (raw is! Map<String, dynamic> ||
        raw['format'] != 'goreecloud-vault' ||
        raw['version'] != 1) {
      throw const FormatException('Unsupported vault');
    }
    final kdf = raw['kdf'], cipher = raw['cipher'];
    if (kdf is! Map<String, dynamic> ||
        cipher is! Map<String, dynamic> ||
        kdf['name'] != 'pbkdf2-sha256' ||
        kdf['iterations'] != vaultKdfIterations ||
        cipher['name'] != 'aes-256-gcm') {
      throw const FormatException('Unsupported cryptography');
    }
    try {
      final salt = base64Decode(kdf['salt'] as String);
      final nonce = base64Decode(cipher['nonce'] as String);
      final data = base64Decode(cipher['data'] as String);
      if (salt.length != 16 || nonce.length != 12 || data.length < 17) {
        throw const FormatException('Invalid ciphertext');
      }
      return VaultEnvelope(salt, nonce, data);
    } on TypeError {
      throw const FormatException('Invalid cryptographic fields');
    }
  }
  Map<String, dynamic> toJson() => {
        'format': 'goreecloud-vault',
        'version': 1,
        'kdf': {
          'name': 'pbkdf2-sha256',
          'iterations': vaultKdfIterations,
          'salt': base64Encode(salt)
        },
        'cipher': {
          'name': 'aes-256-gcm',
          'nonce': base64Encode(nonce),
          'data': base64Encode(ciphertext)
        }
      };
  String serialize() => jsonEncode(toJson());
}

class VaultCrypto {
  static Future<SecretKey> derive(String password, List<int> salt) =>
      _kdf.deriveKey(secretKey: SecretKey(utf8.encode(password)), nonce: salt);

  static Future<(SecretKey, VaultEnvelope)> initialize(String master) async {
    if (master.length < 12 || master.length > 1024) {
      throw const FormatException(
          'Master password length must be 12-1024 characters');
    }
    final salt = randomBytes(16);
    final key = await derive(master, salt);
    final env = await seal([], key, salt);
    return (key, env);
  }

  static Future<List<VaultEntry>> unlock(
      String master, VaultEnvelope env) async {
    final key = await derive(master, env.salt);
    return decrypt(key, env);
  }

  static Future<List<VaultEntry>> decrypt(
      SecretKey key, VaultEnvelope env) async {
    final end = env.ciphertext.length - 16;
    final box = SecretBox(env.ciphertext.sublist(0, end),
        nonce: env.nonce, mac: Mac(env.ciphertext.sublist(end)));
    final clear = await _cipher.decrypt(box, secretKey: key);
    final body = jsonDecode(utf8.decode(clear));
    if (body is! Map<String, dynamic> ||
        body['version'] != 1 ||
        body['entries'] is! List) {
      throw const FormatException('Invalid decrypted vault');
    }
    final items = body['entries'] as List;
    if (items.length > 20000) throw const FormatException('Too many entries');
    return items.map((e) => VaultEntry.fromJson(e)).toList();
  }

  static Future<VaultEnvelope> seal(
      List<VaultEntry> entries, SecretKey key, List<int> salt) async {
    if (entries.length > 20000) throw const FormatException('Too many entries');
    final plain = utf8.encode(jsonEncode(
        {'version': 1, 'entries': entries.map((e) => e.toJson()).toList()}));
    if (plain.length > 2500000) throw const FormatException('Vault too large');
    final nonce = randomBytes(12);
    final box = await _cipher.encrypt(plain, secretKey: key, nonce: nonce);
    return VaultEnvelope(salt, nonce, [...box.cipherText, ...box.mac.bytes]);
  }
}
