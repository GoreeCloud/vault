# GoreeCloud Vault — Native Application

This folder is the **native Flutter** Linux/Android implementation of GoreeCloud Vault. Its approved Flutter UI is separate from the React browser app and Firefox extension.

Currently available in source: encrypted local vault create/unlock, login CRUD, secure-note and authenticator editors, OTP generation (TOTP/HOTP), tags, favorites, custom encrypted fields, and passkey **reference metadata**. No credential sign-in via passkeys, cloud sync, authenticated autofill, or production release is implemented.

Build and test using Flutter 3.27.4 / Dart 3.6.2:

```sh
flutter pub get
flutter analyze
flutter test
flutter build linux --release
# With a full Java 17 JDK and Android SDK:
flutter build apk --debug
```

The Android debug APK is **not** a signed production release. The Linux bundle is a development build. The native app includes encrypted JSON backup export and validated import with an explicit replacement confirmation; it remains a development preview. Android uses a Storage Access Framework create-document action for exports and the system picker for imports. Linux uses a native file chooser for both. These flows still need physical-device and recovery acceptance. Real device acceptance, KDF migration, hardening and security review are outstanding. See the repository [README](../../README.md) and [threat model](../../docs/THREAT-MODEL.md).

Source: first-party code under root AGPL-3.0-only; Flutter and `cryptography` are separate appropriately attributed upstream dependencies.
