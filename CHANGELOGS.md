# GoreeCloud Vault — Changelogs

All notable repository changes are recorded here. Feature implementation entries must reflect verified repository reality and must not promote planned work to implemented state prematurely.

## Unreleased

### Drive project-specification migration

- Preserved the complete former Google Drive Vault project specification in `MIGRATED-PROJECT-SPECIFICATION-2026-09-15.md`.
- Linked the migrated source from the active `PROJECT-SPECIFICATIONS.md` and made repository-governance validation require the preserved migration source.
- Historical predecessor implementation/verification statements in the migrated source remain non-authoritative unless revalidated against the current repository lineage.
- This migration changes documentation/governance only; it does not authorize protected storage or alter the human security-review gate in GitHub issue #4.


### Repository baseline completion

- Added the mandatory root specification pointer, feature, benefits, competitive-objectives, branding, and user-manual records.
- Extended fail-closed repository governance to require the complete baseline, all nine Integral Platform Systems, sensitive-file ignore patterns, and the active human security-review blocker.
- Retained the Platform Contract and editor baseline already merged through PR #9.
- This change does not alter runtime behavior, cryptographic design, protected storage, authentication, authorization, deployment, or Stable eligibility.



### Platform Contract governance

- Added `goreecloud.platform.yaml` declaring Development lifecycle, loopback health endpoints, all nine applicable Integral Platform Systems as blocked, and explicit nonconformance blockers.
- Added `.editorconfig` for repository text-format consistency.
- Extended fail-closed repository-governance validation to require the manifest/editor baseline and preserve the human security-review blocker.
- No Vault runtime, cryptographic, protected-storage, authentication, authorization, or network-exposure behavior changed.

### Security CI provenance

- Added a fail-closed repository-governance validator for mandatory Vault records, the retired roadmap filename, Development lifecycle truthfulness, and the current human security-review gate.
- Added a dedicated repository-governance workflow with exact-source verification.
- Pinned `actions/checkout` to the GoreeCloud-established v7.0.1 commit, disabled persisted checkout credentials, moved validation jobs to Ubuntu 24.04, and added exact-source/module-integrity/tidy checks to the main Go CI.

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
