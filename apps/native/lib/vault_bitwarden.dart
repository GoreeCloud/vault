import 'dart:convert';
import 'dart:typed_data';
import 'vault_backup.dart';
import 'vault_crypto.dart';
import 'vault_otp.dart';

class BitwardenImportPreview {
  const BitwardenImportPreview(
      {required this.entries,
      required this.skippedUnsupported,
      required this.skippedOrganization,
      required this.extraUris,
      required this.passwordHistories,
      required this.passkeyReferencesNotImported,
      required this.unimportedAttachments,
      required this.repromptNotImported});
  final List<VaultEntry> entries;
  final int skippedUnsupported,
      skippedOrganization,
      extraUris,
      passwordHistories,
      passkeyReferencesNotImported,
      unimportedAttachments,
      repromptNotImported;

  String warning() =>
      'Import ${entries.length} personal logins/notes? This APPENDS items and can create duplicates. Not migrated: $skippedUnsupported unsupported types, $skippedOrganization organization items, $passkeyReferencesNotImported passkeys, $unimportedAttachments attachments, $passwordHistories password histories, $extraUris extra URLs, $repromptNotImported reprompt policies. Review all entries. The plaintext export remains on your device.';
}

class VaultBitwarden {
  static String _string(Object? v, String label, [int max = 20000]) {
    if (v == null) return '';
    if (v is! String || v.length > max) {
      throw FormatException('Invalid Bitwarden $label');
    }
    return v;
  }

  static Map<String, dynamic>? _map(Object? x) =>
      x is Map<String, dynamic> ? x : null;
  static List<dynamic> _list(Object? x, String label, int max) {
    if (x == null) return [];
    if (x is! List || x.length > max) {
      throw FormatException('Invalid Bitwarden $label');
    }
    return x;
  }

  static String _id() =>
      randomBytes(16).map((v) => v.toRadixString(16).padLeft(2, '0')).join();

  /// Pure bounded in-memory parser; caller handles consent, encryption and IO.
  static BitwardenImportPreview parse(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException('Invalid Bitwarden plaintext file size');
    }
    final raw = _map(jsonDecode(utf8.decode(bytes, allowMalformed: false)));
    if (raw == null ||
        (raw['encrypted'] != null && raw['encrypted'] != false) ||
        raw['items'] is! List ||
        (raw['items'] as List).length > 20000) {
      throw const FormatException('Expected plaintext Bitwarden JSON export');
    }
    final folders = <String, String>{};
    for (final obj in _list(raw['folders'], 'folders', 5000)) {
      final f = _map(obj);
      if (f == null) throw const FormatException('Invalid folder');
      final id = _string(f['id'], 'folder id', 160);
      final name = _string(f['name'], 'folder name', 120);
      if (id.isNotEmpty && name.isNotEmpty) folders[id] = name;
    }
    final entries = <VaultEntry>[];
    var unsupported = 0,
        organizations = 0,
        extraUrls = 0,
        histories = 0,
        passkeys = 0,
        attachments = 0,
        reprompts = 0;
    for (final obj in raw['items'] as List) {
      final item = _map(obj);
      if (item == null) throw const FormatException('Invalid item');
      final type = item['type'];
      if (type != 1 && type != 2) {
        unsupported++;
        continue;
      }
      if (item['organizationId'] != null) {
        organizations++;
        continue;
      }
      final title = _string(item['name'], 'item name').trim();
      if (title.isEmpty) throw const FormatException('Empty item title');
      final fields = <VaultField>[];
      for (final objField in _list(item['fields'], 'custom fields', 30)) {
        final f = _map(objField);
        if (f == null || (f['type'] != 0 && f['type'] != 1)) {
          throw const FormatException('Unsupported custom field type');
        }
        fields.add(VaultField(
            name: _string(f['name'], 'custom name', 150),
            value: _string(f['value'], 'custom value'),
            concealed: f['type'] == 1));
      }
      final folderId = _string(item['folderId'], 'folder id', 160);
      final tags = (folderId.isNotEmpty && folders.containsKey(folderId))
          ? <String>[folders[folderId]!]
          : <String>[];
      var username = '', password = '', website = '';
      VaultOtp? otp;
      if (type == 1) {
        final login = _map(item['login']);
        if (login == null) {
          throw const FormatException('Missing login structure');
        }
        username = _string(login['username'], 'login username');
        password = _string(login['password'], 'login password');
        final uris = _list(login['uris'], 'login URIs', 1000);
        if (uris.isNotEmpty) {
          final first = _map(uris.first);
          if (first == null) throw const FormatException('Invalid URI');
          website = _string(first['uri'], 'login URI');
        }
        if (uris.length > 1) extraUrls += uris.length - 1;
        final secret = _string(login['totp'], 'OTP', 4096);
        if (secret.isNotEmpty) otp = VaultOtp.parse(secret);
        passkeys += _list(login['fido2Credentials'], 'passkeys', 1000).length;
      }
      if (item['reprompt'] == 1) reprompts++;
      if (_list(item['passwordHistory'], 'history', 1000).isNotEmpty) {
        histories++;
      }
      if (_list(item['attachments'], 'attachments', 1000).isNotEmpty) {
        attachments++;
      }
      entries.add(VaultEntry(
          id: _id(),
          title: title,
          username: username,
          password: password,
          website: website,
          notes: _string(item['notes'], 'notes'),
          kind: type == 1 ? 'login' : 'note',
          favorite: item['favorite'] == true,
          tags: tags,
          customFields: fields,
          otp: otp));
    }
    if (entries.isEmpty) {
      throw const FormatException('No representable personal items');
    }
    return BitwardenImportPreview(
        entries: entries,
        skippedUnsupported: unsupported,
        skippedOrganization: organizations,
        extraUris: extraUrls,
        passwordHistories: histories,
        passkeyReferencesNotImported: passkeys,
        unimportedAttachments: attachments,
        repromptNotImported: reprompts);
  }
}
