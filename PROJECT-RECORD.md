# GoreeCloud Vault — Project Record

## 2026-09-27 — Drive project-specification migration completed

- Migrated the complete former Google Drive `Project Specification — GoreeCloud Vault.docx` text into the repository as `MIGRATED-PROJECT-SPECIFICATION-2026-09-15.md`.
- Preserved `PROJECT-SPECIFICATIONS.md` as the current authoritative target specification and linked the migrated source as a reconciliation input.
- Added fail-closed repository-governance checks requiring the migrated source so it cannot disappear silently.
- Historical predecessor implementation/verification claims in the migrated source are not current implementation evidence.
- The migration does not change runtime behavior, cryptographic trust, protected-storage authorization, production acceptance, or Stable status; GitHub issue #4 remains the human security-review gate.


## 2026-09-27 — Repository baseline completion candidate

- Added the remaining mandatory repository-root controls: `SPECIFICATIONS.md`, `FEATURES.md`, `BENEFITS.md`, `COMPETITIVE-OBJECTIVES.md`, `BRANDING.md`, and `USER-MANUAL.md`.
- Preserved the `.editorconfig` and `goreecloud.platform.yaml` baseline already merged through PR #9.
- Extended the repository-governance validator so the complete root baseline, all nine Integral Platform Systems, sensitive-file ignore patterns, and the issue #4 protected-storage blocker fail closed if removed.
- Kept `FEATURE-ROADMAP.md` retired and absent.

### Verification boundary

This is repository-governance and documentation hardening only. It does not change runtime behavior, approve cryptography, authorize protected secret persistence, establish authentication or authorization, change exposure, or alter release/Stable status. GitHub issue #4 remains the human security-review gate.


## 2026-09-27 — Platform Contract governance baseline

- Added `goreecloud.platform.yaml` with Development lifecycle truthfulness, loopback health/readiness evidence, all nine applicable Integral Platform Systems in blocked state, and explicit nonconformance blockers.
- Added `.editorconfig` for consistent repository text handling.
- Extended fail-closed repository-governance validation to require those controls and preserve GitHub issue #4 as the protected-storage security-review gate.

### Verification boundary

This milestone changes repository governance only. It does not alter Vault runtime behavior, cryptography, authentication, authorization, protected data handling, network exposure, release state, or Stable eligibility. Protected secret persistence remains blocked pending explicit human review.


## 2026-09-27 — CI provenance and repository-governance hardening established

- Added `scripts/validate_repository_governance.py` to fail closed when mandatory Vault records are missing, the retired `FEATURE-ROADMAP.md` reappears, Development lifecycle language is lost, or the current human security-review gate is removed unexpectedly.
- Added a repository-governance workflow with exact-source verification.
- Hardened the main Go CI and vulnerability workflow to use the GoreeCloud-established pinned `actions/checkout` v7.0.1 commit, disable persisted checkout credentials, and run on Ubuntu 24.04.
- Added exact-source, Go module-integrity, and tidy-metadata validation to the primary Go CI.
- Merged the hardening through PR #7 to main commit `7033ab49294d875c1a1db4b89192560a1c5deaa8`. Exact PR-head CI, vulnerability, and repository-governance workflows passed on `514182e1a02273d084c48cef6f7ec5e6ce10c6a1`; post-merge runs `36363628842`, `36363628867`, and `36363628862` passed on the authoritative merge commit.

### Verification boundary

This milestone is CI/provenance hardening only. It does not alter Vault runtime behavior, cryptographic design, authentication, authorization, secret handling, network exposure, or the human review requirement tracked in GitHub issue #4.

## 2026-09-27 — Security review workflow and vulnerability scanning established

- Opened GitHub issue #4 to obtain explicit human security review of the Security Design 0.2 threat model and cryptographic architecture at exact commit `3dfcb2ac6264efe9e5f929f83a28f010374199c1`.
- Added a dedicated vulnerability-reachability workflow modeled on the current GoreeCloud Gateway pattern: exact-source checkout verification, Go module integrity, tidy metadata enforcement, pinned `govulncheck v1.8.0`, and reachable-vulnerability scanning.
- The workflow hardens repository evidence without changing runtime behavior, cryptographic design, authorization logic, network exposure, or protected-data handling.

### Verification boundary

Automated vulnerability scanning can identify reachable known Go vulnerabilities but cannot approve cryptographic trust, authorization, protected storage, deployment, or Stable status. VLT-005 remains blocked until GitHub issue #4 records explicit human acceptance for an exact reviewed revision.

## 2026-09-27 — Threat model and cryptographic architecture candidate established

- Added `THREAT-MODEL.md` with explicit assets, adversaries, trust boundaries, security invariants, abuse/failure cases, and twenty primary threat cases spanning offline theft, cross-vault substitution, rollback/replay, browser-origin phishing, compromised clients, logging/memory disclosure, recovery, sharing, machine secrets, backups, downgrade, stale devices, administrative bypass, deletion ambiguity, and supply-chain compromise.
- Added `CRYPTOGRAPHY.md` with a candidate per-vault envelope architecture using Argon2id for passphrase-derived unlock keys, XChaCha20-Poly1305 for authenticated encryption, HKDF-SHA-256 for domain-separated subkeys, random Vault Root Keys and Data Encryption Keys, versioned key slots, explicit associated-data binding, recovery/device-factor boundaries, rotation semantics, and documented Go memory-erasure limitations.
- The candidate is intentionally **not cryptographically approved**. GoreeCloud secure-coding instructions require explicit human review for cryptographic trust decisions, and protected storage remains blocked until that review identifies the exact accepted repository revision.

### Verification boundary

Repository source can prove that the review candidate exists and CI can validate repository integrity, but neither AI authorship nor CI can substitute for the required human security review. No protected secret persistence, encryption implementation, production exposure, release, deployment, or Stable claim is established by this milestone.

## 2026-09-27 — Development foundation established

- Added the first executable source foundation for the recreated `GoreeCloud/vault` repository.
- Selected a bounded standard-library Go service shell consistent with current GoreeCloud self-hosted service patterns.
- Restricted the Development listener to explicit loopback addresses and intentionally omitted public/private-network exposure support.
- Added only operational health/readiness endpoints; no Vault record, credential, passkey, TOTP, identity, payment, secret, sharing, synchronization, import/export, or administrative API was introduced.
- Added architecture, security, privacy, and nine-system applicability records so later protected-record work has explicit review boundaries.
- Added automated formatting, test, vet, and build validation.

### Verification boundary

This source foundation is Development evidence only. It does not establish production deployment, production acceptance, Stable status, protected Vault storage, cryptographic correctness, browser integration, or any completed numbered capability from `PROJECT-SPECIFICATIONS.md`.

## 2026-09-27 — Repository specification baseline established

- Verified the authoritative repository as `GoreeCloud/vault`.
- Established `PROJECT-SPECIFICATIONS.md` as the repository-local authority for GoreeCloud Vault requirements.
- Recorded the owner-supplied specification covering 54 capability areas, including credential management, passkeys, TOTP, secure sharing, developer and machine secrets, offline and self-hosted operation, enterprise controls, integrations, privacy, security, portability, accessibility, and Glaze UI.
- Recorded the core authority boundary: GoreeCloud Vault is intended to remain the sole authoritative GoreeCloud system for credentials, passkeys, authentication secrets, protected Vault records, secure autofill material, and application secrets.
- Initialized separate planned and implemented feature-lifecycle records so specification requirements are not misrepresented as completed implementation.
- Initialized repository working notes and a repository changelog.

### Verification boundary

At the documentation baseline, implementation, release, deployment, and stability claims were not established. Those states require later authoritative evidence.
