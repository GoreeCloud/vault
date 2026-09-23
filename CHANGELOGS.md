# GoreeCloud Vault — Changelogs

**Record type:** Repository change history  
**Repository:** `GoreeCloud/vault`  
**Lifecycle:** Development / nonconformant  
**Governing standard:** Standard — Repository Feature Tracking and Changelog Governance v1.0, effective September 22, 2026.

## 2026-09-22 — Debian runtime security remediation

### Changed

- PR #46 refreshed fixed Debian Trixie runtime packages `gzip`, `libpcre2-8-0`, `libsqlite3-0`, and `perl-base` during the existing image build without changing the pinned base-image digest.
- The authoritative generated Debian Dockerfile and its Jinja source template were updated together.
- No Trivy ignore, severity relaxation, or vulnerability-gate bypass was added.

### Verification

- Exact PR head `77ebc7db1f44c265133d0575daced2b8d93c1028` passed the applicable current-head workflow set, including GoreeVault Security Scan #822, CI #844, Build #130, Recovery #327, Compatibility #355, Release #294, Migration Handoff #322, Production Deployment Validation #758, Glaze UI #744, Evidence Tooling #668, Hadolint #943, zizmor #356, template checks, and spelling.
- The guarded squash merge produced authoritative `main` commit `4cde6c31c91f03f6751c298a6bf4fecf7d58bf48`.
- Readback on `main` confirms all four fixed package names are present in both `docker/Dockerfile.debian` and `docker/Dockerfile.j2`.
- No post-merge push workflow set was exposed at the immediate readback point; that absence does not convert the pre-merge evidence into a post-merge run claim.

### Lifecycle boundary

This security remediation does not establish Release Candidate, production approval, current Platform Contract conformance, or Stable qualification.

## 2026-09-22 — Repository feature/changelog governance migration

### Added

- `IMPLEMENTED-FEATURES.md` as the authoritative implemented-feature inventory.
- `PLANNED-FEATURES.md` as the authoritative planned/incomplete-feature inventory.
- `CHANGELOGS.md` as the authoritative repository change-history record.

### Changed

- Retired the repository `FEATURE-ROADMAP.md` control model.
- Removed the obsolete requirement to synchronize feature-roadmap authority with Google Drive.
- Recorded migration from the obsolete Platform Contract 0.2/seven-system declaration as an explicit open stabilization obligation rather than silently treating it as current conformance.
- Preserved `FEATURES.md` as a product-facing feature description rather than lifecycle authority.

### Lifecycle boundary

This documentation/control-plane migration does not alter Vault runtime behavior. GoreeCloud Vault remains Development/nonconformant; native architecture acceptance, current Platform Contract conformance, production Identity/persistence/network service, supported-client acceptance, recovery, release, and Stable qualification remain open.

## Historical change evidence

Historical implementation and validation evidence remains preserved by Git history, merged pull requests, repository `NOTES.md`/documentation, workflow records, security/recovery evidence, and product-specific governed evidence. Future material integrated changes must be recorded here.

## Maintenance rule

Record material integrated changes here with enough exact repository evidence to distinguish authoritative `main` state from draft/unmerged work. Do not convert compatibility behavior, green CI, or a source foundation into native production or Stable claims.