# GoreeCloud Vault — Native Application

This folder is the **native Flutter** Linux/Android implementation of GoreeCloud Vault. Its approved Flutter UI is separate from the React browser app and Firefox extension.

Currently available in source: encrypted local vault create/unlock with a five-minute inactivity lock (local pointer/keyboard gestures reset the timer), login CRUD, secure-note and authenticator editors, OTP generation (TOTP/HOTP), tags, favorites, custom encrypted fields, and passkey **reference metadata**. No credential sign-in via passkeys, cloud sync, authenticated autofill, or production release is implemented.

Build and test using Flutter 3.27.4 / Dart 3.6.2:

```sh
flutter pub get
flutter analyze
flutter test
flutter build linux --release
# With a full Java 17 JDK and Android SDK:
flutter build apk --debug
```

The Android debug APK is **not** a signed production release. An Android 16 phone accepted a debug APK, launched the app, created a synthetic empty vault and exposed the secure-note editor through accessibility. Screen capture was blocked by FLAG_SECURE; full item-save and native recovery were not accepted. The Flutter debug manifest includes Internet permission for developer tooling, unlike the primary manifest. The Linux bundle is a development build. Local Linux encrypted files use mode 0600 before ciphertext writing, reject symlink targets and oversized input, and use random exclusive temporary files and rename. This does not prove crash durability. The native app includes encrypted JSON backup export/validated restore, and bounded plaintext Bitwarden JSON import of personal logins/notes with destination reauthentication, omission preview and encrypted append; it remains a development preview. Android uses a Storage Access Framework create-document action for exports and the system picker for imports. Linux uses a native file chooser for both. These flows still need physical-device and recovery acceptance. Real device acceptance, KDF migration, hardening and security review are outstanding. See the repository [README](../../README.md) and [threat model](../../docs/THREAT-MODEL.md).

Source: first-party code under root AGPL-3.0-only; Flutter and `cryptography` are separate appropriately attributed upstream dependencies.


### Untrusted system document providers

User-selected JSON is read in bounded chunks rather than through an unbounded whole-file read. The 5 MB cap is checked against both reported metadata and every incoming chunk; inconsistent lengths fail closed. The source still requires cryptographic backup validation or strict Bitwarden migration parsing. Tests cover inaccurate sizes and read faults. Physical-device document-provider acceptance remains outstanding.


## Authoritative encrypted storage on unlock

Each local native unlock reads the latest validated encrypted envelope from
app-private storage before deriving a key. A previously observed vault that
disappears fails closed, rather than being replaced with a new empty vault.
Writes check the last observed encrypted snapshot before committing, and
lifecycle lock epochs invalidate pending unlocks and saves. These are
best-effort checks; there is no cross-process file locking, directory fsync
or independent crash-consistency proof. Use encrypted backups before testing
other writers or migrations.


## Limited local Proton Pass migration (development preview)

Linux and Android sources now expose **Import Proton Pass data.json** using the
same OS document picker and explicit destination master-password validation as
the Bitwarden import. Choose only manually extracted **plaintext data.json**
from a Proton Pass unencrypted ZIP; ZIP, PGP, CSV, attachments, alias forwarding
and usable passkey credentials are not imported. The bounded parser presents
count-only omission warnings and appends supported active personal logins/notes
only after explicit user confirmation. Imported records are encrypted before
local storage; the current encrypted envelope is compared before replacement,
and unlock is required to inspect results. See
[import boundaries](../../docs/IMPORTING-PROTON-PASS.md). The real Linux/Android
file-picker experience and actual Proton exports have **not** been verified;
the test suite uses fake fixtures only. Keep independently recoverable backups.


## Synthetic picker lifecycle regression

The Flutter widget regression injects an in-memory, bounded synthetic JSON
picker and in-memory encrypted storage. It simulates app inactivity while a
Proton import picker is pending, asserts that a fresh destination password is
required before the omission-confirmation dialog, and verifies encrypted append
plus locked completion. Master-password dialog text controllers are owned by
their dialog widget states and cleared only on actual route disposal, preventing
use-after-dispose while the pop animation still renders. These are test-only
injection points; production continues to call the existing OS document picker
and app-private encrypted store. **This is not real Android SAF or Linux GTK
picker acceptance**, nor proof of renderer accessibility or crash recovery.
