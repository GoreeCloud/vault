# GoreeCloud Vault — Planned Features and Open Obligations

**Record type:** Repository planned/incomplete-feature inventory  
**Repository:** `GoreeCloud/vault`  
**Lifecycle:** Development / nonconformant  
**Authority:** Current `main` source, accepted repository evidence, and active GoreeCloud Tasks Management obligations  
**Governing standard:** Standard — Repository Feature Tracking and Changelog Governance v1.0, effective September 22, 2026.

## Interpretation

Items here are planned, incomplete, blocked, transitional, or acceptance-gated. Their presence does not imply implementation or release readiness. Partial foundations that already exist are also described in `IMPLEMENTED-FEATURES.md` for the verified portion only.

## Current stabilization obligations

- Complete retirement of the former GoreeVault active product identity across current documentation, UI, packages, release materials, websites, artwork, repository surfaces, and safely migratable identifiers while preserving truthful historical provenance.
- Advance and accept the native GoreeCloud Vault Server architecture so inherited Vaultwarden architecture remains transitional rather than product-defining.
- Migrate the repository from the obsolete Platform Contract 0.2/seven-system declaration to the current Platform Contract 0.4 model and evaluate exactly nine Integral Platform Systems: Manager, Privacy Shield, Wardveil Security, Everkeep, GLAZE UI, Mesh, Identity, Policy, and Observability. GoreeCloud Sync remains separately governed.
- Establish production GoreeCloud Identity authentication without weakening Vault encryption/application authorization separation.
- Add persistent PostgreSQL storage for the native server with migration, rollback, integrity, authorization, and recovery evidence.
- Add the native network/HTTP API, token/session lifecycle, and production authorization adapters.
- Implement native synchronization, organizations/collection permissions, attachments, Sends/sharing, WebAuthn/passkey flows, TOTP, import/export, and migration tooling as separately accepted capabilities.
- Establish current Stable GLAZE UI authority and product-specific server/client presentation acceptance where applicable.
- Complete Privacy Shield, Wardveil Security, Everkeep, Mesh, Manager, Policy, and Observability runtime integration/evaluation with evidence-backed dispositions.
- Complete real supported-client acceptance, WebAuthn/passkey acceptance, target-environment validation, migration/rollback, destructive isolated recovery rehearsal, monitoring, repository governance, exact-release evidence, production approval, and Stable qualification.

## Security and continuity obligations

- Preserve the zero-knowledge/encrypted-content boundary through native migration.
- Keep server disaster recovery distinct from user-controlled encrypted portable export.
- Perform exact-candidate isolated restore rehearsal covering database, attachments, configuration, cryptographic material, authorization state, and rollback safety before Stable approval.
- Maintain privacy-preserving security evidence and fail closed on missing/stale/conflicting acceptance evidence.

## Explicit non-claims

Until corresponding evidence exists, this file does not claim accepted native production architecture, current Platform Contract conformance, production Identity, production persistence/network service, complete native client compatibility, production deployment, Release Candidate, Production Acceptance, or Stable status.

## Maintenance rule

Move an item to `IMPLEMENTED-FEATURES.md` only after the authoritative implementation and required verification are integrated. Record material lifecycle changes in `CHANGELOGS.md`. Keep actionable execution work in GoreeCloud Tasks Management without creating duplicate task authority.