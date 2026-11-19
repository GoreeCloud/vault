import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'vault_crypto.dart';

/// Local app-support data only; never upload records or keys.
class VaultStore {
  Future<File> _location() async {
    final directory = await getApplicationSupportDirectory();
    await directory.create(recursive: true);
    return File('${directory.path}/vault.enc.json');
  }

  Future<VaultEnvelope?> load() async {
    final file = await _location();
    if (!await file.exists()) return null;
    return VaultEnvelope.parse(await file.readAsString());
  }

  Future<void> save(VaultEnvelope envelope) async {
    final file = await _location();
    final tmp = File('${file.path}.tmp');
    try {
      await tmp.writeAsString(envelope.serialize(), flush: true);
      await tmp.rename(file.path);
    } catch (_) {
      if (await tmp.exists()) await tmp.delete();
      rethrow;
    }
  }
}
