# GoreeCloud Vault — Roadmap

## Development preview (initial source)

Offline encrypted vault format; React browser UI; Flutter Linux/Android UI; native local encrypted file storage; browser encrypted JSON backup export; static tests and CI. Source presence alone is not platform acceptance.

## Next highest priorities

1. Validate web/native cross-format interoperability and damage/rollback behavior; extend synthetic protocol tests.
2. Add native backup/export/import and web backup import with explicit integrity checks, confirmation, rollback and tested recovery.
3. Design Argon2id versioned migration, vetted OS key/secret-storage integration and independent cryptographic/security review.
4. Validate Linux release bundle, Android APK installation, lifecycle/security behavior and accessibility on authorized real devices.
5. Threat-model and build a self-hosted encrypted-blob sync service with proven identity/session protection and rollback-aware sync; no server-side plaintext.
6. Add secure origin-scoped Android autofill, optional browser extension, passkeys/TOTP and interoperable import formats only after safety review.
7. Document GoreeShield, Wardveil, Mesh, Identity and GoreeCloud UI integrations with real tests and privacy boundaries.

No delivery dates, stable-release status, production host or ongoing unattended work is implied.
