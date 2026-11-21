# GoreeCloud Vault

An **open-source, offline-first encrypted vault development preview** for web, Linux, Android and Firefox. Inspired by the user-owned privacy principles of Bitwarden and Proton Pass, without importing their proprietary or restricted source. **Not independently security audited; do not entrust irreplaceable credentials to this preview.**

**Project state:** Source implementation and automated checks in progress. No stable release, hosted service, production deployment, cloud sync, Android system autofill, usable/passkey-authenticator support, email aliases, or device-security audit is claimed. Passkey *references* are not passkeys. Web/Firefox editors validate new RP reference domains using a Public Suffix List-aware parser; this does not authorize WebAuthn signing.

## Applications

| Target | Technology | Current behavior |
| --- | --- | --- |
| Browser | React 19 + TypeScript + Vite | Encrypted local vault with login CRUD, secure notes, custom fields, OTP generators, tags, favorites, passkey metadata references, Bitwarden plaintext-JSON and extracted Proton Pass data.json login/note migration, backup export/import with fresh unlock, lock on tab hidden and in-flight unlock invalidation, five-minute idle auto-lock |
| Linux desktop | Flutter native Linux | Five-minute idle auto-lock; local encrypted vault, login/notes/OTP editors and crypto, tags, custom fields, passkey metadata references, native app-private storage with Linux encrypted-file mode 0600, user-confirmed encrypted backup import/export and limited Bitwarden/Proton Pass plaintext-JSON login/note migration via Linux file chooser |
| Android | Flutter native Android | Same native Flutter client with five-minute idle auto-lock; Android FLAG_SECURE, limited Android 16 device install/launch and synthetic first-run; full device acceptance pending; backup plus bounded Bitwarden/Proton Pass plaintext-JSON migration in source |
| Firefox add-on | Firefox WebExtensions Manifest V3 + React | Isolated encrypted local vault with five-minute idle auto-lock, encrypted backup, login/notes/OTP/passkey metadata references, custom fields/tags/favorites, local Bitwarden plaintext-JSON and extracted Proton Pass data.json login/note migration, locked restore, user-triggered exact-HTTPS-origin autofill; unsigned, temporary developer installation only |

**Not a WebView wrapper.** Flutter is an approved native Linux and Android UI framework under the current GoreeCloud project standards.

## Security design, scope and limitations

All clients are **local-only**; the Firefox extension has its own isolated encrypted store, and cross-client transfer requires an explicit encrypted backup import. Its encrypted JSON format is the same across platforms: PBKDF2-HMAC-SHA-256 (600,000 iterations, 16-byte random salt) derives an AES-256-GCM key; each write uses a fresh 96-bit nonce, with a 128-bit authentication tag. Only ciphertext, non-secret cryptographic parameters and the format version are persisted. Passwords and records are not sent to a server by this code. The browser keeps encrypted data in localStorage; native clients store an encrypted file in their application support directory. Passwords, notes, OTP secrets and metadata (including custom fields) are encrypted. There is no recovery escrow: **losing your master password permanently prevents decryption**.

PBKDF2 is a conservative interoperable initial choice, not the final password-manager KDF decision. Investigate memory-hard Argon2id, rigorous security review, OS-backed key handling, secure memory, device and browser threat models, data recovery, backup import and cross-platform migration *before* accepting real-world secrets. Neither TLS/identity integration nor multi-device synchronization is implemented.

The web application uses a restrictive production CSP and does not connect to a cloud API. Web and native clients invalidate in-flight unlock operations when locked or backgrounded. Encrypted backup replacement requires a fresh unlock. Web, native and Firefox popup sessions automatically lock after five minutes without local activity; local pointer, keyboard and input events reset the clock. The Firefox popup invalidates stale asynchronous operations when locked, waits for pending encrypted writes before a new unlock, and re-reads the current ciphertext on reauthentication. The Firefox extension requests only `storage`, `activeTab`, and `scripting` (no broad host permissions), and verifies an exact HTTPS origin before user-requested form fill. Malicious browser extensions, compromised JavaScript dependencies, compromised OS accounts, memory capture, browser storage removal, and malicious browser environments remain threats. A self-hosted password manager needs much more than encryption to be production-ready.

See [Bitwarden import boundaries](docs/IMPORTING-BITWARDEN.md), [Proton Pass import limitations](docs/IMPORTING-PROTON-PASS.md), [native recovery](docs/NATIVE-RECOVERY.md), [Android signing and release gates](docs/ANDROID-RELEASE-GATES.md), [threat model](docs/THREAT-MODEL.md), [source security scanning](docs/SOURCE-SECURITY-SCANNING.md), [web release security gates](docs/WEB-RELEASE-GATES.md), [encrypted interchange format](docs/CRYPTO-FORMAT.md), [Firefox extension](docs/FIREFOX-EXTENSION.md), [Firefox unsigned-release verification](docs/FIREFOX-RELEASE-GATES.md), [passkey boundaries](docs/PASSKEYS.md), [disposable WebAuthn test RP](docs/WEBAUTHN-TEST-RP.md), and [roadmap](docs/ROADMAP.md).

## Getting started

**Web**, Node.js 24+:
```sh
cd apps/web
npm ci
npm run dev
# tests and production static build
npm test
npm run build
# Browser-based recovery smoke tests require Playwright Chromium and Firefox:
npx playwright install chromium firefox
npm run test:e2e
```
Vite listens on `127.0.0.1` by default. Serve `apps/web/dist/` from a trusted HTTPS origin for any non-local deployment. Do not expose an unreviewed development server to the internet.

**Native**, Flutter 3.27.4 / Dart 3.6, with the relevant Linux desktop toolchain or Android SDK:

Encrypted backup import/export and limited local Bitwarden/Proton Pass plaintext JSON import are accessible from the native app (create a native vault first). Linux export uses a user-selected destination; Android export uses the system Documents provider with no broad storage permission. Imports validate the encrypted envelope and master password, then require confirmation before replacing the local vault. **Backups remain portable encrypted JSON**, and restore has been tested only with synthetic fixtures, not physical devices. The Bitwarden and Proton Pass importers require fresh native destination master-password verification after the file picker closes and append records only after successful encryption and an encrypted snapshot freshness check. Real-device import acceptance remains pending.
```sh
cd apps/native
flutter pub get
flutter analyze
flutter test
flutter run -d linux             # native Linux desktop
flutter run -d <android-device>  # native Android device
```
Linux build: `flutter build linux --release`. Android development APK: `flutter build apk --debug` (requires a full Java 17 JDK and Android SDK). Neither output is a validated signed release. The Android debug manifest requests INTERNET for Flutter development tooling; the main Android manifest does not request Internet. Keep signing keys outside source control and inspect final release permissions.

**Firefox extension**, Node.js 24+:

```sh
cd apps/firefox
npm ci --ignore-scripts
npm run build
npm test
npm run lint:extension
npm run package
# Browser-engine popup integration test with a mocked WebExtensions API:
npx playwright install firefox
npm run test:e2e
```

For developer testing, open Firefox `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `apps/firefox/dist/manifest.json`. This is **not** a signed Firefox Add-ons Store package. The extension's local vault is separate from the browser website's storage; use encrypted export and import deliberately to transfer records. See [extension documentation](docs/FIREFOX-EXTENSION.md).

## Verified development scope

Automated checks include Chromium and Firefox encrypted-backup, relock and hidden-tab race tests, Firefox-popup mock API tests, and native cryptography, OTP, symlink and private-file-mode tests. A physical Android 16 phone accepted a debug APK, launched the app, created an empty synthetic vault and exposed the note editor through accessibility controls. FLAG_SECURE prevented screen capture. **Full device item-save and native backup/recovery acceptance remain pending.** No real credentials were used.

## Repository layout

```text
apps/web/              React browser client, cryptography and tests
apps/native/           Flutter UI, crypto, OTP, local storage, Linux/Android runners, tests
apps/firefox/          Manifest V3 Firefox extension, popup, exact-origin autofill, tests
design/                Version-pinned GoreeCloud UI alpha token snapshot (MIT)
tests/interop/         Synthetic cross-platform crypto fixture
docs/                  Architecture, features, objectives, roadmap, threat model, protocol
.github/workflows/     Read-only-permission validation jobs
```

## Integration boundaries

The five mandatory platform systems are architecturally relevant but **not yet integrated or verified**: GoreeCloud UI provides reviewed alpha design-token values; GoreeCloud Identity will govern identity and authorization when sync is built; GoreeShield governs privacy/consent; Wardveil governs cybersecurity; GoreeCloud Mesh governs explicitly authorized interoperable data flows. No vault contents should be shared with these systems implicitly. Passkey references do not provide a usable WebAuthn authenticator.

## Provenance and license

GoreeCloud Vault's newly authored application code is provided under **AGPL-3.0-only** (see [LICENSE](LICENSE)). It does not bundle Bitwarden/Proton Pass source. The local Bitwarden plaintext JSON importers use a documented data shape, not Bitwarden application code, and does not migrate existing passkey private keys, organization items or attachments. Third-party libraries and the copied MIT GoreeCloud UI token snapshot retain their own licenses; see [third-party notices](docs/THIRD-PARTY-NOTICES.md). Open-source availability does not mean a security audit has occurred.

Issues and carefully scoped pull requests are welcome. **Never include passwords, master passwords, private vault data, keys or recovery codes in bug reports, logs, screenshots or issues.**

Native encrypted-backup and Bitwarden JSON imports enforce a 5 MB bound during streaming, independently of provider-reported document size; graphical device acceptance remains pending.
