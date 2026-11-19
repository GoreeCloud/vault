import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:goreecloud_vault/vault_file_limit.dart';

void main() {
  test('reads nonempty streamed JSON in order and validates its length',
      () async {
    const json = '{"items":[],"encrypted":false}';
    final actual = await readBoundedJsonFile(
      Stream<List<int>>.fromIterable([
        json.codeUnits.sublist(0, 4),
        json.codeUnits.sublist(4, 11),
        json.codeUnits.sublist(11)
      ]),
      expectedLength: json.length,
    );
    expect(String.fromCharCodes(actual), json);
  });

  test('refuses zero, overstated or undersized declared lengths', () async {
    final source = Stream<List<int>>.value([123, 125]);
    await expectLater(
        readBoundedJsonFile(source, expectedLength: 0), throwsFormatException);
    await expectLater(
      readBoundedJsonFile(Stream<List<int>>.value([123, 125]),
          expectedLength: 3),
      throwsFormatException,
    );
    await expectLater(
      readBoundedJsonFile(Stream<List<int>>.value([123, 125]),
          expectedLength: 1),
      throwsFormatException,
    );
    await expectLater(
      readBoundedJsonFile(Stream<List<int>>.empty(), expectedLength: 1),
      throwsFormatException,
    );
  });

  test('rejects oversized document metadata before opening stream', () async {
    var streamOpened = false;
    final stream = Stream<List<int>>.multi((controller) {
      streamOpened = true;
      controller.add([123, 125]);
      controller.close();
    });
    await expectLater(
      readBoundedJsonFile(stream, expectedLength: 5000001),
      throwsFormatException,
    );
    expect(streamOpened, isFalse);
  });

  test('rejects stream exceeding cap despite lying document metadata',
      () async {
    await expectLater(
      readBoundedJsonFile(
        Stream<List<int>>.fromIterable([
          Uint8List(4),
          Uint8List(5),
        ]),
        expectedLength: 5,
        maxLength: 8,
      ),
      throwsFormatException,
    );
  });

  test('accepts exact maximum but rejects one byte beyond it', () async {
    const max = 64;
    final bytes = await readBoundedJsonFile(
      Stream<List<int>>.fromIterable([Uint8List(31), Uint8List(33)]),
      expectedLength: max,
      maxLength: max,
    );
    expect(bytes.length, max);
    await expectLater(
      readBoundedJsonFile(
        Stream<List<int>>.value(Uint8List(65)),
        expectedLength: 65,
        maxLength: max,
      ),
      throwsFormatException,
    );
  });

  test('propagates document read errors without returning partial content',
      () async {
    final source = Stream<List<int>>.multi((controller) {
      controller.add([123, 125]);
      controller.addError(const FileSystemExceptionForTest());
      controller.close();
    });
    await expectLater(
      readBoundedJsonFile(source, expectedLength: 2),
      throwsA(isA<FileSystemExceptionForTest>()),
    );
  });
}

class FileSystemExceptionForTest implements Exception {
  const FileSystemExceptionForTest();
}
