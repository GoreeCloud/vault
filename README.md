# GoreeCloud Vault

An **open-source, offline-first encrypted vault development preview** for web, Linux, Android and Firefox. Inspired by the user-owned privacy principles of Bitwarden and Proton Pass, without importing their proprietary or restricted source. **Not independently security audited; do not entrust irreplaceable credentials to this preview.**

**Project state:** Source implementation and automated checks in progress. No stable release, hosted service, production deployment, cloud sync, Android system autofill, usable/passkey-authenticator support, email aliases, or device-security audit is claimed. Passkey *references* are not passkeys.

## Applications

| Target | Technology | Current behavior |
| --- | --- | --- |
| Browser | React 19 + TypeScript + Vite | Encrypted local vault with login CRUD, secure notes, custom fields, OTP generators, tags, favorites, passkey metadata references, backup export/import, lock on tab hidden |
| Linux desktop | Flutter native Linux | Local encrypted vault, login/notes/OTP editors and crypto, tags, custom fields, passkey metadata references, native app-private storage, user-confirmed encrypted backup import/export via Linux file chooser |
| Android | Flutter native Android | Same native Flutter client, Android screenshot blocking in source; physical-device acceptance pending; Android Storage Access Framework encrypted backup import/export |
| Firefox add-on | Firefox WebExtensions Manifest V3 + React | Isolated encrypted local vault, import/export of encrypted backups, login/notes/OTP/passkey references, explicit user-triggered exact-HTTPS-origin autofill; unsigned, temporary developer installation only |

**Not a WebView wrapper.** Flutter is an approved native Linux and Android UI framework under the current GoreeCloud project standards.

## Security design, scope and limitations

All clients are **local-only**; the Firefox extension has its own isolated encrypted store, and cross-client transfer requires an explicit encrypted backup import. Its encrypted JSON format is the same across platforms: PBKDF2-HMAC-SHA-256 (600,000 iterations, 16-byte random salt) derives an AES-256-GCM key; each write uses a fresh 96-bit nonce, with a 128-bit authentication tag. Only ciphertext, non-secret cryptographic parameters and the format version are persisted. Passwords and records are not sent to a server by this code. The browser keeps encrypted data in localStorage; native clients store an encrypted file in their application support directory. Passwords, notes, OTP secrets and metadata (including custom fields) are encrypted. There is no recovery escrow: **losing your master password permanently prevents decryption**.

PBKDF2 is a conservative interoperable initial choice, not the final password-manager KDF decision. Investigate memory-hard Argon2id, rigorous security review, OS-backed key handling, secure memory, device and browser threat models, data recovery, backup import and cross-platform migration *before* accepting real-world secrets. Neither TLS/identity integration nor multi-device synchronization is implemented.

The web application uses a restrictive production CSP and does not connect to a cloud API. The Firefox extension requests only `storage`, `activeTab`, and `scripting` (no broad host permissions), and verifies an exact HTTPS origin before user-requested form fill. Malicious browser extensions, compromised JavaScript dependencies, compromised OS accounts, memory capture, browser storage removal, and malicious browser environments remain threats. A self-hosted password manager needs much more than encryption to be production-ready.

See [native recovery](docs/NATIVE-RECOVERY.md), [threat model](docs/THREAT-MODEL.md), [encrypted interchange format](docs/CRYPTO-FORMAT.md), [Firefox extension](docs/FIREFOX-EXTENSION.md), [passkey boundaries](docs/PASSKEYS.md), and [roadmap](docs/ROADMAP.md).

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

Encrypted backup import/export is accessible from the native app. Linux export uses a user-selected destination; Android export uses the system Documents provider with no broad storage permission. Imports validate the encrypted envelope and master password, then require confirmation before replacing the local vault. **Backups remain portable encrypted JSON**, and restore has been tested only with synthetic fixtures, not physical devices.
```sh
cd apps/native
flutter pub get
flutter analyze
flutter test
flutter run -d linux             # native Linux desktop
flutter run -d <android-device>  # native Android device
```
Linux build: `flutter build linux --release`. Android development APK: `flutter build apk --debug` (requires a full Java 17 JDK and Android SDK). Neither output is a validated signed release. Keep Android build signing credentials outside source control.

**Firefox extension**, Node.js 24+:

```sh
cd apps/firefox
npm ci --ignore-scripts
npm run build
npm test
npm run lint:extension
npm run package
```

For developer testing, open Firefox `about:debugging` → **This Firefox** → **Load Temporary Add-on** and select `apps/firefox/dist/manifest.json`. This is **not** a signed Firefox Add-ons Store package. The extension's local vault is separate from the browser website's storage; use encrypted export and import deliberately to transfer records. See [extension documentation](docs/FIREFOX-EXTENSION.md).

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

GoreeCloud Vault's newly authored application code is provided under **AGPL-3.0-only** (see [LICENSE](LICENSE)). It does not bundle Bitwarden/Proton Pass source. Third-party libraries and the copied MIT GoreeCloud UI token snapshot retain their own licenses; see [third-party notices](docs/THIRD-PARTY-NOTICES.md). Open-source availability does not mean a security audit has occurred.

Issues and carefully scoped pull requests are welcome. **Never include passwords, master passwords, private vault data, keys or recovery codes in bug reports, logs, screenshots or issues.**
