# GoreeCloud Vault — Initial Threat Model

**Stage:** Development preview; security acceptance pending.

## Assets and boundaries

Assets are master passwords, derived vault keys, plaintext credentials, encrypted vault files, account metadata, backups and future synchronization identities. In the present architecture, clients are trusted at unlock time and only encrypted documents are persisted. The browser and native OS process are not assumed safe if compromised.

## Initial defenses (implemented)

- AES-256-GCM authenticated encryption with fresh per-write nonces.
- PBKDF2-HMAC-SHA-256 with fixed 600,000-iteration policy and per-vault random salt.
- No intentional app telemetry, advertising, synchronization, external vault API or secret logging.
- Native app storage in platform application support directory; Android backup disabled in the Android manifest, and Android FLAG_SECURE screenshot/recents blocking in MainActivity (runtime acceptance pending).
- Web application CSP and lock-on-tab-hidden behavior; native client locks on paused/hidden lifecycle.
- Encryption before writing, and native temporary-file-then-rename storage; no plaintext export.
- Synthetic tests exercising authentication rejection, nonce randomness and a cross-runtime fixture.

## Critical outstanding risks

| Area | Risk and necessary work |
| --- | --- |
| Master password | Password-strength UX, throttling where defensible, KDF selection/migration, stronger Argon2id memory-hard alternative, UX for unrecoverable passwords |
| JavaScript runtime | XSS, malicious extensions, browser compromise, dependency injection, CSP audit, trusted HTTPS distribution, browser storage quota/clearing |
| Native runtime | Secure-memory erasure limits, OS account compromise, screenshots/recents, Android accessibility misuse, Linux file permissions, device-keystore use |
| Data integrity | Malicious replacement/rollback of an entire encrypted envelope, crash-safe file atomicity and fsync, backup restore rehearsals |
| Sync and identity | No sync or account service exists; authenticated enrollment, malicious-server model, tampering/replay/rollback, key rotations, authorization and recovery required |
| Autofill | Not implemented; requires origin-matching anti-phishing tests, user gesture, safe accessibility/Autofill framework integration |
| Export/import | Browser encrypted backup export is implemented. Native backup export and safe import/restore are not; high data-loss risk without rehearsed recovery |
| Release pipeline | No independent source/dependency audit, provenance/attestation, code signing, physical-device tests, or audited update channel |
| Compliance | GoreeShield privacy, Wardveil cybersecurity, Identity and Mesh contracts not verified or enforced end-to-end |

Do not describe the product as zero-knowledge cloud sync, security audited, password-recovery capable, secure against a malicious local device, or a drop-in Bitwarden/Proton replacement.

## Acceptance before real-password use

Independent protocol and source review; threat modeling across web, native and future sync; strict dependency/security scans; browser/Android/Linux runtime and malicious-input tests; backup/import/restore validation; secure-release signing; meaningful migration tests; deployment and privacy review. Maintain a rollback plan and publish a real security-advisory process.
