# GoreeCloud Vault — Initial Threat Model

**Stage:** Development preview; security acceptance pending.

## Assets and boundaries

Assets are master passwords, derived vault keys, plaintext credentials, encrypted vault files, account metadata, backups and future synchronization identities. In the present architecture, clients are trusted at unlock time and only encrypted documents are persisted. The browser and native OS process are not assumed safe if compromised.

## Initial defenses (implemented)

- AES-256-GCM authenticated encryption with fresh per-write nonces.
- PBKDF2-HMAC-SHA-256 with fixed 600,000-iteration policy and per-vault random salt.
- No intentional app telemetry, advertising, synchronization, external vault API or secret logging.
- Native app storage in platform application support directory; Android backup disabled in the Android manifest, and Android FLAG_SECURE screenshot/recents blocking in MainActivity (screen capture blocked in an Android 16 device smoke test).
- Web CSP, lock-on-tab-hidden and cancellation of in-flight KDF; native app locks on inactive/paused/hidden, and web, native and Firefox popup clients automatically lock after five minutes without local activity. Pending native decryptions are invalidated and sensitive editor dialogs are dismissed.
- Encryption before writing; native bounded ciphertext, exclusive random temporary files with Linux mode 0600 set before writing, symlink refusal and rename; no plaintext export.
- Synthetic tests exercising authentication rejection, nonce randomness, multi-type cross-runtime fixtures and RFC 4226/6238 OTP vectors.
- Firefox extension uses explicit user action and exact HTTPS origin checks to constrain form filling; no broad host permissions or background listener.

## Critical outstanding risks

| Area | Risk and necessary work |
| --- | --- |
| Master password | Password-strength UX, throttling where defensible, KDF selection/migration, stronger Argon2id memory-hard alternative, UX for unrecoverable passwords |
| JavaScript runtime | XSS, malicious extensions, browser compromise, dependency injection, CSP audit, trusted HTTPS distribution, browser storage quota/clearing |
| Native runtime | Idle lock is not secure-memory zeroization; secure-memory erasure limits, OS account compromise, screenshots/recents, Android accessibility misuse, Linux file permissions, device-keystore use |
| Data integrity | Valid older encrypted backups can roll back later data; atomic rename and file flush do not prove directory fsync or device crash durability. Device recovery rehearsals remain required |
| Sync and identity | No sync or account service exists; authenticated enrollment, malicious-server model, tampering/replay/rollback, key rotations, authorization and recovery required |
| Autofill | Not implemented; requires origin-matching anti-phishing tests, user gesture, safe accessibility/Autofill framework integration |
| Plaintext migration | Bitwarden plaintext JSON import intentionally loads secrets in browser and native application memory and never promises full lossless coverage. Disk plaintext source, browser/XSS compromise, Android picker/provider trust, unsupported fields, duplicate appends, stale encrypted snapshots, interrupted lifecycle and user cancellation need protection and explicit review. |
| Export/import | Encrypted JSON import/export source exists for web, Firefox, Linux and Android, but independent device restore rehearsal, power-loss tests, safe original-vault retention, corrupt backup handling and rollback remain mandatory |
| One-time codes | Secrets encrypted but copying introduces clipboard exposure; TOTP clock skew, malformed URIs, replay, HOTP counter durability, and QR provisioning require review |
| Firefox extension | Popup and injected content security boundaries, malicious login pages, tab navigation races, compromised browser profile, third-party dependencies and unsigned distribution; no independent extension audit |
| Passkeys | Web/Firefox metadata editors reject public suffixes with tldts, and an origin/RP-suffix helper is unit-tested. Neither creates credentials nor authorizes sign-in. Real WebAuthn provider needs caller-origin and challenge verification, consent/UV, protected keys, anti-replay and recovery |
| Release pipeline | No independent source/dependency audit, provenance/attestation, code signing, physical-device tests, or audited update channel |
| Compliance | GoreeShield privacy, Wardveil cybersecurity, Identity and Mesh contracts not verified or enforced end-to-end |

Do not describe the product as zero-knowledge cloud sync, security audited, password-recovery capable, secure against a malicious local device, a usable passkey authenticator, or a drop-in Bitwarden/Proton replacement.

## Acceptance before real-password use

Independent protocol and source review; threat modeling across web, native and future sync; strict dependency/security scans; browser/Android/Linux runtime and malicious-input tests; backup/import/restore validation; secure-release signing; meaningful migration tests; deployment and privacy review. Maintain a rollback plan and publish a real security-advisory process.
