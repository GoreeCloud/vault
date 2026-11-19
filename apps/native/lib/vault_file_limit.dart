import 'dart:typed_data';

import 'vault_backup.dart';

/// Read only a bounded amount of user-selected JSON in memory.
///
/// A document provider's length is advisory: check it once as a fast rejection
/// and enforce the cap independently for every incoming stream chunk. Never
/// trust a provider reporting a small file but returning arbitrarily many
/// bytes. The caller validates its JSON and encrypts imported secrets.
Future<Uint8List> readBoundedJsonFile(
  Stream<List<int>> chunks, {
  required int expectedLength,
  int maxLength = maxEncryptedBackupBytes,
}) async {
  if (maxLength <= 0 || expectedLength <= 0 || expectedLength > maxLength) {
    throw const FormatException('Selected JSON file size is invalid');
  }
  final accumulator = BytesBuilder(copy: false);
  var actualLength = 0;
  await for (final chunk in chunks) {
    // Subtract first: avoid integer arithmetic overflow and never allocate
    // an oversized chunk within our accumulator.
    if (chunk.length > maxLength - actualLength) {
      throw const FormatException('Selected JSON file exceeds size limit');
    }
    actualLength += chunk.length;
    accumulator.add(chunk);
  }
  if (actualLength != expectedLength) {
    throw const FormatException(
        'Selected JSON file size changed while reading');
  }
  return accumulator.takeBytes();
}
