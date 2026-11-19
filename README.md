# GoreeCloud Vault

An **open-source, offline-first password-vault development preview** for the browser, Linux, and Android. Inspired by the user-owned privacy principles of Bitwarden and Proton Pass, without importing their proprietary or restricted source. **Not independently security audited; do not entrust irreplaceable credentials to this preview.**

**Project state:** Source implementation and automated checks in progress. No stable release, hosted service, production deployment, cloud sync, browser extension, Android autofill, passkey support, email aliases, or device-security audit is claimed.

## Applications

| Target | Technology | Current behavior |
| --- | --- | --- |
| Browser | React 19 + TypeScript + Vite | Create and unlock encrypted local vault, add/edit/delete/search logins, password generator, encrypted JSON backup export, auto-lock when tab hidden |
| Linux desktop | Flutter native Linux | Create and unlock encrypted local vault, add/edit/delete/search logins, password generator, lock on app background |
| Android | Flutter native Android | Same Flutter client source, Android platform runner and local app-private storage; physical-device behavior not yet verified |

**Not a WebView wrapper.** Flutter is an approved native Linux and Android UI framework under the current GoreeCloud project standards.

## Security design, scope and limitations

The current vault is **local-only**. Its encrypted JSON format is the same across platforms: PBKDF2-HMAC-SHA-256 (600,000 iterations, 16-byte random salt) derives an AES-256-GCM key; each write uses a fresh 96-bit nonce, with a 128-bit authentication tag. Only ciphertext, non-secret cryptographic parameters and the format version are persisted. Passwords and records are not sent to a server by this code. The browser keeps encrypted data in localStorage; native clients store an encrypted file in their application support directory. No recovery escrow exists: **losing your master password permanently prevents decryption**.

PBKDF2 is a conservative interoperable initial choice, not the final password-manager KDF decision. Investigate memory-hard Argon2id, rigorous security review, OS-backed key handling, secure memory, device and browser threat models, data recovery, backup import and cross-platform migration *before* accepting real-world secrets. Neither TLS/identity integration nor multi-device synchronization is implemented.

The web application uses a restrictive CSP and does not connect to a cloud API. Browser extensions, compromised JavaScript dependencies, compromised OS accounts, memory capture, browser storage removal, and malicious browser environments remain threats. A self-hosted password manager needs much more than encryption to be production-ready.

See [threat model](docs/THREAT-MODEL.md), [encrypted interchange format](docs/CRYPTO-FORMAT.md), and [roadmap](docs/ROADMAP.md).

## Getting started

**Web**, Node.js 24+:
```sh
cd apps/web
npm ci
npm run dev
# tests and production static build
npm test
npm run build
```
Vite listens on `127.0.0.1` by default. Serve `apps/web/dist/` from a trusted HTTPS origin for any non-local deployment. Do not expose an unreviewed development server to the internet.

**Native**, Flutter 3.27.4 / Dart 3.6, with the relevant Linux desktop toolchain or Android SDK:
```sh
cd apps/native
flutter pub get
flutter analyze
flutter test
flutter run -d linux             # native Linux desktop
flutter run -d <android-device>  # native Android device
```
Linux build: `flutter build linux --release`. Android development APK: `flutter build apk --debug`. Neither output is a validated signed release. Keep Android build signing credentials outside source control.

## Repository layout

```text
apps/web/              React browser client, cryptography and tests
apps/native/           Flutter UI, crypto, local storage, Linux/Android runners, tests
design/                Version-pinned GoreeCloud UI alpha token snapshot (MIT)
tests/interop/         Synthetic cross-platform crypto fixture
docs/                  Architecture, features, objectives, roadmap, threat model, protocol
.github/workflows/     Read-only-permission validation jobs
```

## Integration boundaries

The five mandatory platform systems are architecturally relevant but **not yet integrated or verified**: GoreeCloud UI provides reviewed alpha design-token values; GoreeCloud Identity will govern identity and authorization when sync is built; GoreeShield governs privacy/consent; Wardveil governs cybersecurity; GoreeCloud Mesh governs explicitly authorized interoperable data flows. No vault contents should be shared with these systems implicitly.

## Provenance and license

GoreeCloud Vault's newly authored application code is provided under **AGPL-3.0-only** (see [LICENSE](LICENSE)). It does not bundle Bitwarden/Proton Pass source. Third-party libraries and the copied MIT GoreeCloud UI token snapshot retain their own licenses; see [third-party notices](docs/THIRD-PARTY-NOTICES.md). Open-source availability does not mean a security audit has occurred.

Issues and carefully scoped pull requests are welcome. **Never include passwords, master passwords, private vault data, keys or recovery codes in bug reports, logs, screenshots or issues.**
