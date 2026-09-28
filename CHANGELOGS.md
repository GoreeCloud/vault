# GoreeCloud Vault — Changelogs

All notable repository changes are recorded here. Feature implementation entries must reflect verified repository reality and must not promote planned work to implemented state prematurely.

## Unreleased

### Repository governance hardening

- Added fail-closed repository-governance validation for mandatory Vault project/security records.
- Added automated checks preserving the 54-item planned-capability baseline, planned-versus-implemented feature boundary, human cryptographic-review gate, nine Integral Platform System assessment, retired roadmap rule, and sensitive-file ignore baseline.
- Added exact-source GitHub Actions validation for the repository-governance script.

### Security CI hardening

- Added exact-source Go vulnerability reachability scanning using pinned `govulncheck v1.8.0`.
- Added module-integrity and tidy-metadata checks to the vulnerability workflow.
- Opened GitHub issue #4 as the explicit human-review gate for the Security Design 0.2 threat model and cryptographic architecture.

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
