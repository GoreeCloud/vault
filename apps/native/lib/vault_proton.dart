import 'dart:convert';
import 'dart:typed_data';
import 'vault_backup.dart';
import 'vault_crypto.dart';
import 'vault_otp.dart';

class ProtonImportPreview {
  const ProtonImportPreview({
    required this.entries,
    required this.skippedUnsupported,
    required this.skippedTrash,
    required this.passkeysNotImported,
    required this.attachmentsNotImported,
    required this.extraUrls,
    required this.unsupportedFields,
    required this.extraSections,
    required this.secondaryEmailsPreserved,
    required this.extraOtpPreserved,
  });
  final List<VaultEntry> entries;
  final int skippedUnsupported,
      skippedTrash,
      passkeysNotImported,
      attachmentsNotImported,
      extraUrls,
      unsupportedFields,
      extraSections,
      secondaryEmailsPreserved,
      extraOtpPreserved;

  /// Count-only preview. Never includes a record title, password or seed.
  String warning() {
    final count = entries.length;
    return 'Append $count supported personal Proton Pass logins/notes? This does NOT replace '
        'or deduplicate the current vault. Not migrated: '
        '$skippedUnsupported unsupported types, $skippedTrash trashed items, '
        '$passkeysNotImported passkeys in supported logins '
        '(other item types may contain more), '
        '$attachmentsNotImported attachments, $extraUrls extra URLs, '
        '$unsupportedFields unknown fields, $extraSections sections. '
        '$extraOtpPreserved additional OTP seeds kept in concealed fields; '
        '$secondaryEmailsPreserved secondary emails kept. '
        'ZIP/PGP, alias forwarding and passkey private keys are not migrated. '
        'Protect the source plaintext data.json; review each migrated record.';
  }
}

/// Bounded, side-effect-free conversion of manually extracted plaintext
/// Proton Pass data.json. Caller authenticates destination, confirms, seals,
/// and writes encrypted records after checking lock epochs and storage.
class VaultProton {
  static Map<String, dynamic> _map(Object? value, String label) {
    if (value is! Map<String, dynamic>) {
      throw FormatException('Invalid Proton Pass $label');
    }
    return value;
  }

  static List<dynamic> _list(Object? value, String label, [int max = 20000]) {
    if (value == null) return [];
    if (value is! List || value.length > max) {
      throw FormatException('Invalid Proton Pass $label');
    }
    return value;
  }

  static String _str(Object? value, String label, [int max = 20000]) {
    if (value == null) return '';
    if (value is! String || value.length > max) {
      throw FormatException('Invalid Proton Pass $label');
    }
    return value;
  }

  static String _id() =>
      randomBytes(16).map((n) => n.toRadixString(16).padLeft(2, '0')).join();

  static ProtonImportPreview parse(Uint8List bytes) {
    if (bytes.isEmpty || bytes.length > maxEncryptedBackupBytes) {
      throw const FormatException('Invalid plaintext Proton Pass file size');
    }
    final root =
        _map(jsonDecode(utf8.decode(bytes, allowMalformed: false)), 'export');
    if (_str(root['version'], 'version', 80).isEmpty) {
      throw const FormatException('Missing Proton Pass export version');
    }
    final vaults = _map(root['vaults'], 'vaults');
    if (vaults.length > 500) throw const FormatException('Too many vaults');
    final entries = <VaultEntry>[];
    var unsupported = 0,
        trash = 0,
        passkeys = 0,
        attachments = 0,
        extraUrls = 0,
        unknownFields = 0,
        sections = 0,
        emails = 0,
        extraOtp = 0,
        total = 0;
    for (final rawVault in vaults.values) {
      final vault = _map(rawVault, 'vault');
      final tag = _str(vault['name'], 'vault name', 120).trim();
      for (final raw in _list(vault['items'], 'items')) {
        if (++total > 20000) throw const FormatException('Too many items');
        final item = _map(raw, 'item');
        if (item['state'] == 2) {
          trash++;
          continue;
        }
        if (item['state'] != 1) {
          throw const FormatException('Unsupported item state');
        }
        final cv = item['contentFormatVersion'];
        if (cv is! int || cv < 1 || cv > 8) {
          throw const FormatException('Unsupported content version');
        }
        final data = _map(item['data'], 'data');
        final type = data['type'];
        if (type != 'login' && type != 'note') {
          unsupported++;
          continue;
        }
        final metadata = _map(data['metadata'], 'metadata');
        final title = _str(metadata['name'], 'title').trim();
        if (title.isEmpty) throw const FormatException('Missing title');
        final content = _map(data['content'], 'content');
        final fields = <VaultField>[];
        VaultOtp? otp;
        if (type == 'login') {
          final secret = _str(content['totpUri'], 'primary OTP', 4096);
          if (secret.isNotEmpty) otp = VaultOtp.parse(secret);
        }
        for (final rawField
            in _list(data['extraFields'], 'custom fields', 30)) {
          final field = _map(rawField, 'field');
          final kind = _str(field['type'], 'field type', 30);
          final name = _str(field['fieldName'], 'field name', 150);
          final body = _map(field['data'], 'field body');
          if (kind == 'text' || kind == 'hidden') {
            fields.add(VaultField(
                name: name,
                value: _str(body['content'], 'field content'),
                concealed: kind == 'hidden'));
          } else if (kind == 'totp') {
            final secret = _str(body['totpUri'], 'extra OTP', 4096);
            if (secret.isNotEmpty) {
              if (otp == null) {
                otp = VaultOtp.parse(secret);
              } else {
                final label = 'Extra OTP: $name';
                if (label.length > 150) {
                  throw const FormatException('OTP field title too long');
                }
                fields.add(
                    VaultField(name: label, value: secret, concealed: true));
                extraOtp++;
              }
            }
          } else {
            unknownFields++;
          }
        }
        sections += _list(data['extraSections'], 'sections', 100).length;
        attachments += _list(item['files'], 'attachments', 1000).length;
        var username = '', password = '', website = '';
        if (type == 'login') {
          final user = _str(content['itemUsername'], 'username');
          final email = _str(content['itemEmail'], 'email');
          username = user.isEmpty ? email : user;
          password = _str(content['password'], 'password');
          final urls = _list(content['urls'], 'URLs', 1000);
          if (urls.isNotEmpty) {
            website = _str(urls.first, 'URL');
            if (urls.length > 1) extraUrls += urls.length - 1;
          }
          if (email.isNotEmpty && user.isNotEmpty && email != user) {
            if (fields.length >= 30) {
              throw const FormatException('Too many custom fields');
            }
            fields.add(VaultField(
                name: 'Proton Pass email', value: email, concealed: false));
            emails++;
          }
          passkeys += _list(content['passkeys'], 'passkeys', 1000).length;
        }
        if (fields.length > 30) {
          throw const FormatException('Too many custom fields');
        }
        entries.add(VaultEntry(
            id: _id(),
            title: title,
            username: username,
            password: password,
            website: website,
            notes: _str(metadata['note'], 'notes'),
            kind: type == 'login' ? 'login' : 'note',
            favorite: item['pinned'] == true,
            tags: tag.isEmpty ? const [] : [tag],
            customFields: fields,
            otp: otp));
      }
    }
    if (entries.isEmpty) {
      throw const FormatException('No supported active Proton Pass entries');
    }
    return ProtonImportPreview(
        entries: entries,
        skippedUnsupported: unsupported,
        skippedTrash: trash,
        passkeysNotImported: passkeys,
        attachmentsNotImported: attachments,
        extraUrls: extraUrls,
        unsupportedFields: unknownFields,
        extraSections: sections,
        secondaryEmailsPreserved: emails,
        extraOtpPreserved: extraOtp);
  }
}
