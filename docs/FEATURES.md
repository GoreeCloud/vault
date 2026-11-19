# GoreeCloud Vault — Features

| Capability | Status | Evidence or limitation |
| --- | --- | --- |
| Browser app | Source implemented / build and tests | React 19 + TypeScript; encrypted login, note, OTP, custom fields and metadata |
| Linux graphical application | Source implemented / analyzer, tests and local Linux build | Flutter native UI; current device and release packaging acceptance pending |
| Android application | Limited Android 16 physical-device smoke test | Debug APK installed/launched, synthetic empty vault created, note editor exposed and screenshot protection observed; full device/backup acceptance pending |
| Automatic idle lock | Five-minute inactivity timer added in web, Flutter native and Firefox popup | Web/Firefox virtual-clock tests and native deterministic-timer tests; device lifecycle and accessibility acceptance pending |
| Local authenticated encryption | Implemented / synthetic tests | AES-256-GCM; PBKDF2-HMAC-SHA-256; no cryptographic audit |
| Master password create/unlock | Implemented in source | No password recovery |
| Login CRUD, search, random password generation | Implemented in source | User interaction, accessibility and persistence not yet fully runtime-tested |
| Encrypted JSON backup export and import | Implemented for web and Firefox; tests pending broader recovery | Native encrypted import/export and validated restore implemented in source; physical-device backup/restore rehearsal pending |
| Native encrypted local file | Implemented in source | Linux 0600 encrypted-file permissions, random exclusive temp files, symlink/oversize rejection tested; crash durability/restore pending |
| Cross-platform encrypted fixture | Node-generated synthetic multi-item fixture tested by web and Flutter | Browser restoration/relock and hidden-tab KDF race tested in Chromium and Firefox; device tests pending |
| TOTP SHA1/SHA256/SHA512 and HOTP | Implemented in web, native and Firefox code | RFC test vectors and parser tests; physical app acceptance pending |
| Secure notes, custom fields, favorites, tags | Implemented in web/native and interoperable encrypted schema | Firefox popup can create/edit encrypted custom fields, tags and favorites; runtime extension interaction pending |
| Proton Pass extracted plaintext data.json import | Web and Firefox source / synthetic tests | Active personal logins/notes, first URL, TOTP, basic custom fields; explicit counts of unsupported items, aliases, passkeys, files and deleted entries. No ZIP/PGP/CSV decryption or passkey transfer |
| Bitwarden plaintext JSON import | Web + Firefox browser tests; Flutter native parser and encrypted-append source with synthetic tests | Explicit user action; personal logins/notes, basic custom fields, folder tags and TOTP; preview counts skipped passkeys, unsupported item types, organization items, history, attachments, extra URLs and reprompt policies; not lossless |
| Firefox WebExtension | Implemented / compiled and linted | MV3 popup, encrypted storage, explicit origin-scoped fill; unsigned; installed temporarily in Firefox 159 headless, popup mocked-WebExtensions testing; real tab autofill pending |
| Passkey reference records | Implemented with web/Firefox RP-domain preflight | Metadata **only**. Web/Firefox editors reject public suffixes and malformed domains. Not registration, private keys, or authentication |
| Usable WebAuthn/passkey authenticator | Not implemented | Requires browser/OS integration, credential lifecycle and RP-bound authorization |
| Cloud sync, sharing, broad autofill, aliases | Not implemented | Requires separately reviewed security architecture |
| Signed release and deployment | Not verified | Do not treat development builds as production |
