import 'package:flutter/material.dart';
import 'vault_crypto.dart';
import 'vault_otp.dart';

class VaultEditResult {
  const VaultEditResult({this.entry, this.delete = false});
  final VaultEntry? entry;
  final bool delete;
}

/// Platform-native editor for logins, notes, authenticators and passkey metadata.
/// No plaintext is written from this dialog; caller handles encryption and persistence.
Future<VaultEditResult?> showVaultEditor(BuildContext context,
    VaultEntry? original, String newKind, String newId) async {
  final title = TextEditingController(text: original?.title ?? '');
  final username = TextEditingController(text: original?.username ?? '');
  final password = TextEditingController(text: original?.password ?? '');
  final website = TextEditingController(text: original?.website ?? '');
  final notes = TextEditingController(text: original?.notes ?? '');
  final otp = TextEditingController(text: original?.otp?.secret ?? '');
  final rp = TextEditingController(text: original?.passkey?['rpId'] ?? '');
  final tags = TextEditingController(text: (original?.tags ?? []).join(', '));
  final names = <TextEditingController>[];
  final values = <TextEditingController>[];
  final hidden = <bool>[];
  for (final field in original?.customFields ?? <VaultField>[]) {
    names.add(TextEditingController(text: field.name));
    values.add(TextEditingController(text: field.value));
    hidden.add(field.concealed);
  }
  var kind = original?.kind ?? newKind;
  var favorite = original?.favorite ?? false;
  var reveal = false;
  String? error;

  Widget input(TextEditingController controller, String label,
          {bool obscure = false, int lines = 1}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          controller: controller,
          maxLength: 20000,
          obscureText: obscure && lines == 1,
          maxLines: lines,
          autocorrect: !obscure,
          enableSuggestions: !obscure,
          decoration: InputDecoration(labelText: label),
        ),
      );

  try {
    return await showDialog<VaultEditResult>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, refresh) => AlertDialog(
          title: Text(
              original == null ? 'New encrypted item' : 'Edit encrypted item'),
          content: SizedBox(
            width: 470,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    value: kind,
                    decoration: const InputDecoration(labelText: 'Item type'),
                    items: const [
                      DropdownMenuItem(value: 'login', child: Text('Login')),
                      DropdownMenuItem(
                          value: 'note', child: Text('Secure note')),
                      DropdownMenuItem(
                          value: 'otp', child: Text('Authenticator')),
                      DropdownMenuItem(
                          value: 'passkey', child: Text('Passkey reference')),
                    ],
                    onChanged: (v) {
                      if (v != null) refresh(() => kind = v);
                    },
                  ),
                  const SizedBox(height: 14),
                  input(title, 'Title'),
                  if (kind == 'login') ...[
                    input(username, 'Username / email'),
                    Row(children: [
                      Expanded(
                          child: input(password, 'Password', obscure: !reveal)),
                      IconButton(
                          tooltip: reveal ? 'Hide' : 'Reveal',
                          icon: const Icon(Icons.visibility),
                          onPressed: () => refresh(() => reveal = !reveal)),
                      IconButton(
                          tooltip: 'Generate password',
                          icon: const Icon(Icons.autorenew),
                          onPressed: () => refresh(
                              () => password.text = generatePassword())),
                    ]),
                    input(website, 'Website'),
                  ],
                  if (kind == 'otp' || kind == 'login') ...[
                    input(otp, 'Base32 OTP secret / otpauth URI',
                        obscure: !reveal),
                    const Text(
                        'Supports TOTP SHA1/SHA256/SHA512 and HOTP. Secrets remain encrypted.',
                        style: TextStyle(fontSize: 11)),
                  ],
                  if (kind == 'passkey') ...[
                    const Text(
                        'Reference only. Browser or OS authenticators perform actual passkey sign-in.',
                        style: TextStyle(fontSize: 12)),
                    input(rp, 'Relying-party domain'),
                  ],
                  input(notes, kind == 'note' ? 'Secure note' : 'Notes',
                      lines: kind == 'note' ? 8 : 3),
                  input(tags, 'Tags (comma-separated)'),
                  CheckboxListTile(
                    title: const Text('Favorite'),
                    value: favorite,
                    contentPadding: EdgeInsets.zero,
                    onChanged: (v) => refresh(() => favorite = v ?? false),
                  ),
                  const Text('Custom encrypted fields'),
                  for (var i = 0; i < names.length; i++) ...[
                    input(names[i], 'Custom field ${i + 1} name'),
                    input(values[i], 'Custom field ${i + 1} value',
                        obscure: hidden[i] && !reveal),
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Conceal custom value'),
                      value: hidden[i],
                      onChanged: (v) => refresh(() => hidden[i] = v ?? false),
                    ),
                  ],
                  TextButton.icon(
                    onPressed: names.length >= 30
                        ? null
                        : () => refresh(() {
                              names.add(TextEditingController());
                              values.add(TextEditingController());
                              hidden.add(true);
                            }),
                    icon: const Icon(Icons.add),
                    label: const Text('Add custom field'),
                  ),
                  if (error != null)
                    Text(error!,
                        style: const TextStyle(color: Color(0xFFFFB4AB))),
                ],
              ),
            ),
          ),
          actions: [
            if (original != null)
              TextButton(
                  onPressed: () =>
                      Navigator.pop(ctx, const VaultEditResult(delete: true)),
                  child: const Text('Delete')),
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () {
                  try {
                    if (title.text.trim().isEmpty) {
                      throw const FormatException('Title is required');
                    }
                    VaultOtp? parsed;
                    if (otp.text.trim().isNotEmpty) {
                      parsed = original?.otp?.secret == otp.text.trim()
                          ? original!.otp
                          : VaultOtp.parse(otp.text.trim());
                    } else if (kind == 'otp') {
                      throw const FormatException('OTP secret is required');
                    }
                    final rpDomain = rp.text.trim().toLowerCase();
                    if (kind == 'passkey' &&
                        (rpDomain.isEmpty ||
                            rpDomain.length > 253 ||
                            !RegExp(r'^[a-z0-9.-]+$').hasMatch(rpDomain))) {
                      throw const FormatException(
                          'Valid relying-party domain required');
                    }
                    final fields = <VaultField>[];
                    for (var i = 0; i < names.length; i++) {
                      if (names[i].text.length > 150 ||
                          values[i].text.length > 20000) {
                        throw const FormatException('Custom field too long');
                      }
                      fields.add(VaultField(
                          name: names[i].text,
                          value: values[i].text,
                          concealed: hidden[i]));
                    }
                    final newItem = VaultEntry(
                      id: original?.id ?? newId,
                      title: title.text.trim(),
                      username: username.text,
                      password: password.text,
                      website: website.text,
                      notes: notes.text,
                      kind: kind,
                      otp: parsed,
                      favorite: favorite,
                      tags: tags.text
                          .split(',')
                          .map((t) => t.trim())
                          .where((t) => t.isNotEmpty)
                          .take(30)
                          .toList(),
                      customFields: fields,
                      passkey: kind == 'passkey'
                          ? {
                              'rpId': rpDomain,
                              'credentialId':
                                  original?.passkey?['credentialId'] ?? '',
                              'userHandle':
                                  original?.passkey?['userHandle'] ?? ''
                            }
                          : original?.passkey,
                    );
                    Navigator.pop(ctx, VaultEditResult(entry: newItem));
                  } catch (e) {
                    refresh(() => error =
                        'Invalid item: ${e is FormatException ? e.message : 'check encrypted fields'}');
                  }
                },
                child: const Text('Save encrypted')),
          ],
        ),
      ),
    );
  } finally {
    for (final controller in [
      title,
      username,
      password,
      website,
      notes,
      otp,
      rp,
      tags,
      ...names,
      ...values
    ]) {
      controller.dispose();
    }
  }
}
