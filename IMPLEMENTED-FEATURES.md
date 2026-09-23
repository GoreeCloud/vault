# GoreeCloud Vault — Implemented Features

**Record type:** Repository implemented-feature inventory  
**Repository:** `GoreeCloud/vault`  
**Lifecycle:** Development / nonconformant  
**Authority:** Current `main` source and accepted repository evidence  
**Governing standard:** Standard — Repository Feature Tracking and Changelog Governance v1.0, effective September 22, 2026.

## Interpretation

This record describes capabilities present in the current GoreeCloud Vault repository. It distinguishes the GoreeCloud-owned native Development foundation from the inherited Vaultwarden-compatible transitional path. It does **not** establish accepted native architecture, production readiness, current Platform Contract conformance, Release Candidate, or Stable qualification.

`FEATURES.md` remains the product-facing feature description. This file is the lifecycle authority for what is implemented.

## Implemented native Development foundation

### Native GoreeCloud-owned Rust boundary

- Independent `native/` Rust crate proposed as the long-term GoreeCloud Vault Server implementation boundary.
- Isolation from the inherited root Cargo workspace.
- Current native foundation uses only the Rust standard library.
- Explicit fail-closed production readiness model; required production gates remain false and the native `ready` command fails until accepted gates exist.

### Owner-scoped opaque encrypted-record Development store

- Memory-only store for already-protected opaque record bytes.
- Bounded owner identifiers.
- Bounded record identifiers.
- Bounded non-empty encrypted payloads.
- Positive record revisions.
- Same record identifier permitted under different owners.
- Owner-scoped get, list, and delete.
- Deterministic record-ID ordering for owner lists.
- Cross-owner lookup does not expose another owner's record.
- Debug output reports ciphertext length rather than ciphertext bytes.
- Native store does not encrypt, decrypt, parse, search, index, persist, synchronize, or transmit protected content.

### Native CI foundation

- Dedicated native workflow validates the isolated Cargo lock, formatting, strict Clippy lints, regression tests, locked build, bounded status output, and fail-closed readiness behavior on exact source revisions.

## Validated transitional compatibility capabilities

The inherited Vaultwarden-compatible path remains available as transitional migration/compatibility reference material. Repository evidence includes compatibility coverage for authentication, synchronization, CRUD, attachments, organizations/collections, TOTP, WebAuthn-compatible paths, recovery, migration/rollback, security scanning, and release-image preflight.

These compatibility capabilities are **not** claims that equivalent native GoreeCloud Vault features are implemented.

## Implemented-but-not-accepted boundaries

- Native architecture foundation without accepted production architecture or persistence/network stack.
- Compatibility/recovery/security foundations without current GoreeCloud-native production acceptance.
- Repository security and release tooling without final exact-release approval.

## Explicitly not established in the native server

Current native source does not establish production Identity authentication, persistent PostgreSQL storage, network/HTTP API, token/session lifecycle, production authorization adapters, synchronization protocol, organizations/collections, attachments, Sends/sharing, passkey/WebAuthn server flows, TOTP flows, import/export/migration tooling, production deployment, server presentation, complete Integral Platform System integration, real-client acceptance, production approval, or Stable release.

## Maintenance rule

When an obligation in `PLANNED-FEATURES.md` becomes implemented and verified on the authoritative integration line, reconcile it here and record the material change in `CHANGELOGS.md`. Draft or unmerged pull requests are not implementation authority.