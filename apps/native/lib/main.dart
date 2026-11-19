import 'dart:math';
import 'package:cryptography/cryptography.dart';
import 'package:flutter/material.dart';
import 'vault_crypto.dart';
import 'vault_store.dart';

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

  Future<void> _persist(List<VaultEntry> next) async {
    if (_key == null || _envelope == null || _busy) return;
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
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Save failed. The previous encrypted vault was retained.';
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
              if (_entries != null)
                IconButton(
                    tooltip: 'Lock vault',
                    onPressed: _lock,
                    icon: const Icon(Icons.lock_outline))
            ]),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _entries == null
                ? _lockScreen()
                : _vaultScreen(),
        floatingActionButton: _entries == null
            ? null
            : FloatingActionButton.extended(
                onPressed: _busy ? null : () => _openEditor(),
                icon: const Icon(Icons.add),
                label: const Text('New login')),
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
                      const Text('Encrypted locally · no sync configured',
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
                                                child: Text(
                                                    e.title.isNotEmpty
                                                        ? e.title[0]
                                                            .toUpperCase()
                                                        : '•',
                                                    style: const TextStyle(
                                                        color: iris))),
                                            title: Text(e.title.isEmpty
                                                ? 'Untitled login'
                                                : e.title),
                                            subtitle: Text(e.username.isEmpty
                                                ? e.website
                                                : e.username),
                                            trailing:
                                                const Icon(Icons.chevron_right),
                                            onTap: () => _openEditor(e)));
                                  }))
                    ]))));
  }

  Future<void> _openEditor([VaultEntry? original]) async {
    final title = TextEditingController(text: original?.title ?? '');
    final username = TextEditingController(text: original?.username ?? '');
    final password = TextEditingController(text: original?.password ?? '');
    final website = TextEditingController(text: original?.website ?? '');
    final notes = TextEditingController(text: original?.notes ?? '');
    var reveal = false;
    try {
      await showDialog<void>(
          context: context,
          builder: (ctx) => StatefulBuilder(
              builder: (ctx, refresh) => AlertDialog(
                      backgroundColor: surface,
                      title:
                          Text(original == null ? 'New login' : 'Edit login'),
                      content: SizedBox(
                          width: min(MediaQuery.sizeOf(ctx).width * 0.85, 480),
                          child: SingleChildScrollView(
                              child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                _input(title, 'Title', required: true),
                                _input(username, 'Username'),
                                Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: TextField(
                                        controller: password,
                                        obscureText: !reveal,
                                        enableSuggestions: false,
                                        autocorrect: false,
                                        maxLength: 20000,
                                        decoration: InputDecoration(
                                            labelText: 'Password',
                                            suffixIcon: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  IconButton(
                                                      tooltip: reveal
                                                          ? 'Hide password'
                                                          : 'Reveal password',
                                                      onPressed: () => refresh(
                                                          () =>
                                                              reveal = !reveal),
                                                      icon: Icon(reveal
                                                          ? Icons.visibility_off
                                                          : Icons.visibility)),
                                                  IconButton(
                                                      tooltip:
                                                          'Generate a secure password',
                                                      onPressed: () => refresh(
                                                          () => password.text =
                                                              generatePassword()),
                                                      icon: const Icon(
                                                          Icons.autorenew))
                                                ])))),
                                _input(website, 'Website'),
                                _input(notes, 'Notes', lines: 3),
                              ]))),
                      actions: [
                        if (original != null)
                          TextButton(
                              onPressed: () async {
                                final confirm = await showDialog<bool>(
                                    context: ctx,
                                    builder: (c) => AlertDialog(
                                            title: const Text('Delete login?'),
                                            content: const Text(
                                                'This will remove the item from your local vault.'),
                                            actions: [
                                              TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(c, false),
                                                  child: const Text('Cancel')),
                                              TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(c, true),
                                                  child: const Text('Delete'))
                                            ]));
                                if (confirm == true && ctx.mounted) {
                                  Navigator.pop(ctx);
                                  await _persist(_entries!
                                      .where((x) => x.id != original.id)
                                      .toList());
                                }
                              },
                              child: const Text('Delete')),
                        TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Cancel')),
                        FilledButton(
                            onPressed: () => () async {
                                  if (title.text.trim().isEmpty) return;
                                  final e = VaultEntry(
                                      id: original?.id ?? _newId(),
                                      title: title.text,
                                      username: username.text,
                                      password: password.text,
                                      website: website.text,
                                      notes: notes.text);
                                  Navigator.pop(ctx);
                                  await _persist(original == null
                                      ? [..._entries!, e]
                                      : _entries!
                                          .map((x) => x.id == e.id ? e : x)
                                          .toList());
                                }(),
                            child: const Text('Save encrypted')),
                      ])));
    } finally {
      title.dispose();
      username.dispose();
      password.dispose();
      website.dispose();
      notes.dispose();
    }
  }

  String _newId() =>
      randomBytes(16).map((n) => n.toRadixString(16).padLeft(2, '0')).join();
  Widget _input(TextEditingController controller, String label,
          {int lines = 1, bool required = false}) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: TextField(
              controller: controller,
              maxLines: lines,
              maxLength: 20000,
              decoration:
                  InputDecoration(labelText: required ? '$label *' : label)));
}
