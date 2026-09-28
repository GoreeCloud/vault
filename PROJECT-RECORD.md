# GoreeCloud Vault — Project Record

## 2026-09-27 — Repository governance validation candidate established

- Added a fail-closed repository-governance validator for the current Vault baseline.
- The validator checks mandatory project/security records for presence, regular-file status, expected identity headings, and non-skeletal content.
- It also protects the 54 numbered planned-capability entries, the explicit planned-versus-implemented boundary, the pending human cryptographic-review gate, representation of all nine Integral Platform Systems, the retirement of `FEATURE-ROADMAP.md`, and sensitive local-file ignore patterns.
- Added an exact-source GitHub Actions workflow using the already-established GoreeCloud checkout action revision used by Gateway repository-governance validation.

### Verification boundary

This automation checks repository-governance invariants only. It does not establish cryptographic approval, protected storage, release, deployment, production acceptance, or Stable status. GitHub issue #4 remains the human security-review gate for VLT-003/VLT-004, and VLT-005 remains blocked.

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
