# GoreeCloud Vault — Changelogs

All notable repository changes are recorded here. Feature implementation entries must reflect verified repository reality and must not promote planned work to implemented state prematurely.

## Unreleased

### Security design candidate

- Added a Vault threat model covering remote, local, browser, sync, recovery, administrator, supply-chain, and cross-vault threat cases.
- Added a candidate cryptographic architecture defining per-vault root keys, Argon2id factor derivation, XChaCha20-Poly1305 envelope encryption, HKDF key separation, recovery/device key slots, rotation, downgrade resistance, and memory-handling limits.
- Kept protected secret persistence blocked pending explicit human security review of the exact candidate revision.

### Development foundation

- Added a standard-library Go service shell for bounded Development use.
- Enforced loopback-only listen configuration and rejection of wildcard/LAN/public addresses.
- Added health/readiness endpoints with no-store and basic response-hardening headers.
- Added graceful shutdown and bounded HTTP server limits.
- Added Go tests and CI for formatting, testing, vetting, and build.
- Added architecture, security, privacy, and nine-system integration documentation.

### Documentation baseline

- Established the authoritative GoreeCloud Vault project specification.
- Initialized planned and implemented feature-lifecycle records.
- Initialized the project record and repository working notes.
- Replaced the placeholder README with a project-oriented repository overview.
