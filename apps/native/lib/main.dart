import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'vault_crypto.dart';
import 'vault_store.dart';
import 'vault_editor.dart';
import 'vault_backup.dart';
import 'vault_backup_files.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VaultApp());
}

const canvas = Color(0xFF0D121D),
    surface = Color(0xFF171D2A),
    tonal = Color(0xFF252D3D),
    iris = Color(0xFFBFB8FF),
    textSoft = Color(0xFFCED5E5),
    ink = Color(0xFFF2F4FB);

class VaultApp extends StatelessWidget {
  const VaultApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
      title: 'GoreeCloud Vault',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: canvas,
          colorScheme: ColorScheme.fromSeed(
              seedColor: iris,
              brightness: Brightness.dark,
              surface: surface,
              primary: iris,
              onPrimary: const Color(0xFF272057)),
          cardTheme: CardTheme(
              color: surface,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18))),
          inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: tonal,
              border:
                  OutlineInputBorder(borderRadius: BorderRadius.circular(14))),
          appBarTheme:
              const AppBarTheme(backgroundColor: canvas, foregroundColor: ink)),
      home: const VaultHome());
}

class VaultHome extends StatefulWidget {
  const VaultHome({super.key});
  @override
  State<VaultHome> createState() => _VaultHomeState();
}

class _VaultHomeState extends State<VaultHome> with WidgetsBindingObserver {
  final _store = VaultStore();
  final _master = TextEditingController(), _search = TextEditingController();
  VaultEnvelope? _envelope;
  SecretKey? _key;
  List<VaultEntry>? _entries;
  bool _loading = true, _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _master.dispose();
    _search.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused ||
        state == AppLifecycleState.hidden ||
        state == AppLifecycleState.detached) {
      _lock();
    }
  }

  Future<void> _load() async {
    try {
      final env = await _store.load();
      if (mounted) {
        setState(() {
          _envelope = env;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Vault file could not be opened. Existing data was not changed.';
          _loading = false;
        });
      }
    }
  }

  void _lock() {
    _key = null;
    _master.clear();
    if (mounted) {
      setState(() {
        _entries = null;
      });
    }
  }

  Future<void> _unlock() async {
    if (_busy || _error != null && _envelope == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final password = _master.text;
      if (_envelope == null) {
        final (key, env) = await VaultCrypto.initialize(password);
        await _store.save(env);
        _master.clear();
        if (mounted) {
          setState(() {
            _key = key;
            _envelope = env;
            _entries = [];
          });
        }
      } else {
        final key = await VaultCrypto.derive(password, _envelope!.salt);
        final items = await VaultCrypto.decrypt(key, _envelope!);
        _master.clear();
        if (mounted) {
          setState(() {
            _key = key;
            _entries = items;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Unable to unlock. Check your password or vault integrity.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<bool> _persist(List<VaultEntry> next) async {
    if (_key == null || _envelope == null || _busy) return false;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final sealed = await VaultCrypto.seal(next, _key!, _envelope!.salt);
      await _store.save(sealed);
      if (mounted) {
        setState(() {
          _envelope = sealed;
          _entries = next;
        });
      }
      return true;
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Save failed. The previous encrypted vault was retained.';
        });
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<String?> _requestBackupPassword() async {
    final controller = TextEditingController();
    try {
      return await showDialog<String>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Unlock encrypted backup'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Enter the master password used to encrypt this backup. '
                'The backup is validated before your local vault can be replaced.'),
            const SizedBox(height: 14),
            TextField(
              autofocus: true,
              controller: controller,
              obscureText: true,
              autocorrect: false,
              enableSuggestions: false,
              maxLength: 1024,
              decoration:
                  const InputDecoration(labelText: 'Backup master password'),
              onSubmitted: (_) {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(ctx, controller.text);
                }
              },
            )
          ]),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  Navigator.pop(ctx, controller.text);
                }
              },
              child: const Text('Validate backup'),
            ),
          ],
        ),
      );
    } finally {
      controller.clear();
      controller.dispose();
    }
  }

  Future<void> _exportBackup() async {
    if (_busy || _entries == null || _envelope == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ciphertext = VaultBackupCodec.exportEncrypted(_envelope!);
      final saved = await VaultBackupFiles.exportEncrypted(ciphertext);
      if (!mounted) return;
      if (saved) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text(
                'Encrypted backup saved. Keep the master password safe.')));
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Could not export encrypted backup. No vault data changed.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _importBackup() async {
    if (_busy || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final encrypted = await VaultBackupFiles.importEncrypted();
      if (!mounted || encrypted == null) return;
      final password = await _requestBackupPassword();
      if (!mounted || password == null) return;
      final candidate = await VaultBackupCodec.inspect(encrypted, password);
      if (!mounted) return;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Replace local encrypted vault?'),
          content: Text(
              'This authenticated backup contains ${candidate.entries.length} encrypted items. Importing replaces the current local vault and its master password. Export a backup of your current vault first. This operation cannot be automatically undone.'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Keep current vault')),
            FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Replace local vault')),
          ],
        ),
      );
      if (confirm != true || !mounted) return;
      // The encrypted store uses a temporary file plus rename. The in-memory
      // key/items are updated only AFTER the encrypted file write succeeds.
      await _store.save(candidate.envelope);
      if (!mounted) return;
      _master.clear();
      _search.clear();
      setState(() {
        _envelope = candidate.envelope;
        _key = candidate.key;
        _entries = candidate.entries;
        _error = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content:
              Text('Encrypted backup imported. Verify the restored items.')));
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Import rejected or save failed. Existing encrypted vault was not replaced.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            title: Row(children: [
              Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                      color: const Color(0xFF413974),
                      borderRadius: BorderRadius.circular(13)),
                  child: const Center(
                      child: Text('◇',
                          style: TextStyle(color: iris, fontSize: 28)))),
              const SizedBox(width: 12),
              const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('GoreeCloud Vault',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.w700)),
                    Text('OFFLINE · ENCRYPTED',
                        style: TextStyle(
                            fontSize: 9, letterSpacing: 1.5, color: textSoft))
                  ])
            ]),
            actions: [
              if (_entries != null) ...[
                PopupMenuButton<String>(
                  tooltip: 'Encrypted backup options',
                  enabled: !_busy,
                  onSelected: (value) {
                    if (value == 'export') {
                      _exportBackup();
                    }
                    if (value == 'import') {
                      _importBackup();
                    }
                  },
                  itemBuilder: (ctx) => const [
                    PopupMenuItem(
                        value: 'export',
                        child: Text('Export encrypted backup')),
                    PopupMenuItem(
                        value: 'import',
                        child: Text('Restore encrypted backup')),
                  ],
                  icon: const Icon(Icons.backup_outlined),
                ),
                IconButton(
                    tooltip: 'Lock vault',
                    onPressed: _lock,
                    icon: const Icon(Icons.lock_outline))
              ]
            ]),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _entries == null
                ? _lockScreen()
                : _vaultScreen(),
        floatingActionButton: _entries == null
            ? null
            : PopupMenuButton<String>(
                tooltip: 'Create encrypted item',
                onSelected: (kind) => _openEditor(null, kind),
                itemBuilder: (_) => const [
                      PopupMenuItem(value: 'login', child: Text('New login')),
                      PopupMenuItem(
                          value: 'note', child: Text('New secure note')),
                      PopupMenuItem(
                          value: 'otp', child: Text('New authenticator')),
                      PopupMenuItem(
                          value: 'passkey',
                          child: Text('New passkey reference'))
                    ],
                child: Container(
                    decoration: BoxDecoration(
                        color: iris, borderRadius: BorderRadius.circular(18)),
                    padding: const EdgeInsets.symmetric(
                        vertical: 15, horizontal: 18),
                    child: const Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.add, color: Color(0xFF272057)),
                      SizedBox(width: 8),
                      Text('New item',
                          style: TextStyle(
                              color: Color(0xFF272057),
                              fontWeight: FontWeight.bold))
                    ]))),
      );
  Widget _lockScreen() => Center(
      child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                  child: Padding(
                      padding: const EdgeInsets.all(27),
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Icon(Icons.shield_outlined,
                                color: iris, size: 44),
                            const SizedBox(height: 20),
                            Text(
                                _envelope == null
                                    ? 'Create your encrypted vault'
                                    : 'Unlock your vault',
                                style:
                                    Theme.of(context).textTheme.headlineSmall,
                                textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                            Text(
                                _envelope == null
                                    ? 'Choose a unique password (12+ characters). It cannot be recovered.'
                                    : 'Your encryption key is derived on this device. No server required.',
                                style: const TextStyle(
                                    color: textSoft, height: 1.5),
                                textAlign: TextAlign.center),
                            const SizedBox(height: 24),
                            TextField(
                                controller: _master,
                                autofillHints: null,
                                enableSuggestions: false,
                                autocorrect: false,
                                obscureText: true,
                                maxLength: 1024,
                                decoration: const InputDecoration(
                                    labelText: 'Master password'),
                                onSubmitted: (_) => _unlock()),
                            const SizedBox(height: 10),
                            FilledButton(
                                onPressed: _busy ? null : _unlock,
                                child: Text(_busy
                                    ? 'Working…'
                                    : _envelope == null
                                        ? 'Create vault'
                                        : 'Unlock securely')),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: _busy ? null : _importBackup,
                              icon: const Icon(Icons.settings_backup_restore),
                              label: const Text('Restore encrypted backup'),
                            ),
                            if (_error != null)
                              Padding(
                                  padding: const EdgeInsets.only(top: 12),
                                  child: Text(_error!,
                                      style: const TextStyle(
                                          color: Color(0xFFFFB4AB)))),
                            const SizedBox(height: 16),
                            const Text(
                                'Development preview · no sync or autofill',
                                style: TextStyle(fontSize: 11, color: textSoft),
                                textAlign: TextAlign.center),
                          ]))))));

  Widget _vaultScreen() {
    final entries = _entries!;
    final filtered = entries
        .where((e) => [e.title, e.username, e.website]
            .any((v) => v.toLowerCase().contains(_search.text.toLowerCase())))
        .toList();
    return Center(
        child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1000),
            child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 22, vertical: 24),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text('All items  ${entries.length}',
                          style: Theme.of(context).textTheme.headlineMedium),
                      const SizedBox(height: 8),
                      const Text(
                          'Logins · Notes · OTP · Passkey references · Local only',
                          style: TextStyle(color: textSoft)),
                      const SizedBox(height: 25),
                      TextField(
                          controller: _search,
                          onChanged: (_) => setState(() {}),
                          decoration: const InputDecoration(
                              prefixIcon: Icon(Icons.search),
                              hintText: 'Search items')),
                      if (_error != null)
                        Padding(
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            child: Text(_error!,
                                style:
                                    const TextStyle(color: Color(0xFFFFB4AB)))),
                      const SizedBox(height: 18),
                      Expanded(
                          child: filtered.isEmpty
                              ? Center(
                                  child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                      const Icon(Icons.key_outlined,
                                          color: iris, size: 50),
                                      const SizedBox(height: 12),
                                      Text(
                                          _search.text.isNotEmpty
                                              ? 'No matching items'
                                              : 'Your vault starts here',
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleLarge),
                                      const SizedBox(height: 8),
                                      const Text(
                                          'Add a login to keep it encrypted.',
                                          style: TextStyle(color: textSoft))
                                    ]))
                              : ListView.separated(
                                  itemCount: filtered.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(height: 10),
                                  itemBuilder: (ctx, i) {
                                    final e = filtered[i];
                                    return Card(
                                        child: ListTile(
                                            contentPadding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 18,
                                                    vertical: 9),
                                            leading: CircleAvatar(
                                                backgroundColor:
                                                    const Color(0xFF413974),
                                                child: Icon(
                                                    e.kind == 'note'
                                                        ? Icons.note_outlined
                                                        : e.kind == 'otp'
                                                            ? Icons
                                                                .timer_outlined
                                                            : e.kind ==
                                                                    'passkey'
                                                                ? Icons
                                                                    .fingerprint
                                                                : Icons
                                                                    .key_outlined,
                                                    color: iris)),
                                            title: Text(e.title.isEmpty
                                                ? 'Untitled login'
                                                : e.title),
                                            subtitle: Text(e.username.isEmpty
                                                ? e.website
                                                : e.username),
                                            trailing: e.otp == null
                                                ? const Icon(
                                                    Icons.chevron_right)
                                                : IconButton(
                                                    icon: const Icon(
                                                        Icons.timer_outlined),
                                                    tooltip:
                                                        'Use one-time code',
                                                    onPressed: () =>
                                                        _copyOtp(e)),
                                            onTap: () => _openEditor(e)));
                                  }))
                    ]))));
  }

  Future<void> _copyOtp(VaultEntry entry) async {
    final otp = entry.otp;
    if (otp == null) return;
    try {
      if (otp.type == 'hotp') {
        final yes = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
                    title: const Text('Use HOTP code?'),
                    content: const Text(
                        'The HOTP counter will advance in encrypted storage before copy.'),
                    actions: [
                      TextButton(
                          onPressed: () => Navigator.pop(ctx, false),
                          child: const Text('Cancel')),
                      FilledButton(
                          onPressed: () => Navigator.pop(ctx, true),
                          child: const Text('Use code'))
                    ]));
        if (yes != true) return;
      }
      final code = await otp.generate();
      if (otp.type == 'hotp') {
        final next = _entries!
            .map((x) => x.id == entry.id
                ? VaultEntry(
                    id: x.id,
                    title: x.title,
                    username: x.username,
                    password: x.password,
                    website: x.website,
                    notes: x.notes,
                    kind: x.kind,
                    favorite: x.favorite,
                    tags: x.tags,
                    customFields: x.customFields,
                    passkey: x.passkey,
                    otp: otp.advance())
                : x)
            .toList();
        if (!await _persist(next)) return;
      }
      if (!mounted) return;
      await showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
                  title:
                      Text(otp.type == 'totp' ? 'Current TOTP' : 'Used HOTP'),
                  content: SelectableText(code,
                      style: const TextStyle(
                          fontSize: 32, letterSpacing: 3, color: iris)),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Close')),
                    FilledButton(
                        onPressed: () async {
                          await Clipboard.setData(ClipboardData(text: code));
                          if (ctx.mounted) Navigator.pop(ctx);
                        },
                        child: const Text('Copy'))
                  ]));
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not generate one-time code.');
    }
  }

  Future<void> _openEditor(
      [VaultEntry? original, String kind = 'login']) async {
    final result = await showVaultEditor(context, original, kind, _newId());
    if (result == null || !mounted) return;
    if (result.delete && original != null) {
      final confirmed = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
                  title: const Text('Delete encrypted item?'),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(ctx, false),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Delete'))
                  ]));
      if (confirmed == true) {
        await _persist(_entries!.where((x) => x.id != original.id).toList());
      }
    } else if (result.entry != null) {
      final e = result.entry!;
      await _persist(original == null
          ? [..._entries!, e]
          : _entries!.map((x) => x.id == e.id ? e : x).toList());
    }
  }

  String _newId() =>
      randomBytes(16).map((n) => n.toRadixString(16).padLeft(2, '0')).join();
}
