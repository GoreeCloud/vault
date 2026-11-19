# GoreeCloud Vault — Roadmap

## Development preview (initial source)

Offline encrypted vault format; React browser UI; native Flutter Linux/Android UI; native encrypted file storage; web encrypted backup import/export; notes, tags, favorites, custom encrypted fields, TOTP/HOTP; Firefox encrypted popup, backup and explicit exact-origin autofill; synthetic tests and CI. Source presence alone is not platform acceptance.

## Next highest priorities

1. Complete security review for new item types, OTP input parsing, extension messaging/DOM injection and backup/rollback handling; maintain Chromium/Firefox recovery E2E tests and add real extension runtime tests.
2. Validate native encrypted backup/export/import end-to-end on Linux and Android devices (system file picker, cancelled operations, replacement confirmation, simulated write failure, restore rehearsal and data-loss rollback).
3. Design Argon2id versioned migration, vetted OS key/secret-storage integration and independent cryptographic/security review.
4. Validate native Linux bundle, Android install/upgrade/lifecycle, Firefox extension sideload, UI and accessibility on authorized real devices.
5. Threat-model and build a self-hosted encrypted-blob sync service with proven identity/session protection and rollback-aware sync; no server-side plaintext.
6. Implement usable passkey creation/assertion via verified browser/OS authenticator integrations, Android Credential Manager, safe credential import/export contracts, additional structured item types, and secure origin-scoped Android autofill.
7. Document GoreeShield, Wardveil, Mesh, Identity and GoreeCloud UI integrations with real tests and privacy boundaries.

No delivery dates, stable-release status, production host or ongoing unattended work is implied.


## Migration integrity

Implement full capability-aware migration from supported password-manager exports in deliberately limited stages. First-party web and Firefox clients, plus Flutter native clients in source, implement bounded, user-confirmed **Bitwarden plaintext JSON personal login/note** import with omission counters and encrypted append. Remaining work: support more Bitwarden field types, add explicit collision review/deduplication, preserve multi-URI rules, consider safe encrypted Bitwarden/Proton imports after source and license review, verify device migration and recoverability, and maintain original data until tests demonstrate coverage. Never claim passkey credentials have migrated based on metadata alone.


## Proton Pass migration scope

A bounded, explicitly confirmed, local parser for manually extracted plaintext Proton Pass data.json has been implemented in the browser and Firefox clients. It maps active login/note records with supported fields into the encrypted local vault and counts omitted unsupported types, passkeys, attachments, additional URLs and other metadata. Supported content-format versions are limited to 1–8. No ZIP or PGP decryption is implemented; native import and true passkey migration remain separately gated. Before production acceptance, exercise real authorized Proton exports (never uploading their contents), verify version upgrades, malicious JSON, user cancellation, independent backup restores and complete field preservation.

## WebAuthn domain-scoping foundation

Web and Firefox metadata editors validate newly entered RP domains using a Public Suffix List-aware parser, with pure RP-domain/origin-suffix tests. This does **not** implement passkey registration or sign-in. Next engineering phases are test-RP challenge verification, secure authenticator lifecycle and recovery, user consent and UV, permission-minimized browser integration, Android Credential Provider, security review and signed distribution. Do not relax password autofill exact-origin constraints.


## WebAuthn protocol experiment

A disposable localhost test relying party checks fresh one-use challenges,
user-verified registration and assertion signatures using a browser virtual
authenticator. The next passkey workstream must establish safe browser-extension
and Android platform credential-provider contracts, user consent and device
key custody, not merely attach the test-RP code to production routes.
