# GoreeCloud Vault — Features

| Capability | Status | Evidence or limitation |
| --- | --- | --- |
| Browser app | Source implemented / build and tests | React 19 + TypeScript; encrypted login, note, OTP, custom fields and metadata |
| Linux graphical application | Source implemented / analyzer, tests and local Linux build | Flutter native UI; current device and release packaging acceptance pending |
| Android application | Source implemented / CI debug APK compilation and crypto tests | Flutter native Android runner and FLAG_SECURE; physical-device validation pending |
| Local authenticated encryption | Implemented / synthetic tests | AES-256-GCM; PBKDF2-HMAC-SHA-256; no cryptographic audit |
| Master password create/unlock | Implemented in source | No password recovery |
| Login CRUD, search, random password generation | Implemented in source | User interaction, accessibility and persistence not yet fully runtime-tested |
| Encrypted JSON backup export and import | Implemented for web and Firefox; tests pending broader recovery | Native encrypted import/export and validated restore implemented in source; physical-device backup/restore rehearsal pending |
| Native encrypted local file | Implemented in source | Data durability/restore/device checks pending |
| Cross-platform encrypted fixture | Node-generated synthetic multi-item fixture tested by web and Flutter | Browser-based restoration tested with synthetic Playwright Chromium and Firefox; device tests pending |
| TOTP SHA1/SHA256/SHA512 and HOTP | Implemented in web, native and Firefox code | RFC test vectors and parser tests; physical app acceptance pending |
| Secure notes, custom fields, favorites, tags | Implemented in web/native and interoperable encrypted schema | Firefox popup can create/edit encrypted custom fields, tags and favorites; runtime extension interaction pending |
| Firefox WebExtension | Implemented / compiled and linted | MV3 popup, encrypted storage, explicit origin-scoped fill; unsigned and untested on real browser |
| Passkey reference records | Implemented | Metadata **only**: not registration, storage of private keys, or authentication |
| Usable WebAuthn/passkey authenticator | Not implemented | Requires browser/OS integration, credential lifecycle and RP-bound authorization |
| Cloud sync, sharing, broad autofill, aliases | Not implemented | Requires separately reviewed security architecture |
| Signed release and deployment | Not verified | Do not treat development builds as production |
