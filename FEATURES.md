# GoreeCloud Vault Server Features

This file records current implemented behavior separately from planned or transitional capability.

## Implemented native foundation

### Native GoreeCloud-owned Rust boundary

`native/` is an independent Rust crate and a proposed long-term server implementation boundary. It is isolated from the inherited root Cargo workspace and currently uses only the Rust standard library.

Its presence in source means a native development foundation exists; it does **not** establish accepted native architecture, production readiness, Platform Contract conformance, or Stable qualification.

### Fail-closed lifecycle status

The native crate records explicit production gates for GoreeCloud Manager, GoreeCloud Identity, persistent storage, GoreeCloud Mesh, Glaze UI, Wardveil Security, Privacy Shield, Everkeep, real supported clients, WebAuthn/passkey acceptance, migration/rollback acceptance, repository/release governance, target-environment acceptance, and production approval.

All current production gates are false. The native `ready` command exits unsuccessfully until the required gates are accepted.

The repository-root `goreecloud.platform.yaml` currently declares the obsolete Platform Contract 0.2 seven-system model. It remains truthful machine-readable repository state, but it is **migration-required** under current Platform Contract 0.4 authority and must not be represented as current platform conformance. Current governance requires evaluation of exactly nine Integral Platform Systems: GoreeCloud Manager, Privacy Shield, Wardveil Security, Everkeep, Glaze UI, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Policy, and GoreeCloud Observability. GoreeCloud Sync remains separately governed. Existing declared integrations remain blocked, Policy and Observability still require explicit manifest evaluation, and the native source must not independently convert any platform-system state to accepted.

### Owner-scoped opaque encrypted-record development store

The native domain includes a memory-only store for already-protected record bytes.

Implemented behavior:

- bounded owner identifiers;
- bounded record identifiers;
- bounded non-empty encrypted payloads;
- positive record revisions;
- same record identifier permitted for different owners;
- owner-scoped get, list, and delete;
- deterministic record-ID ordering for owner lists;
- cross-owner lookup returns no other owner's record;
- debug output reports ciphertext length rather than ciphertext bytes.

The store does not encrypt, decrypt, parse, search, index, persist, synchronize, or transmit protected content.

### Dedicated native CI

The `GoreeCloud Vault Native Foundation` workflow verifies the isolated Cargo lock, formatting, strict Clippy lints, regression tests, locked build, bounded status output, and fail-closed readiness behavior on exact source revisions.

The workflow filename retains `goreevault` only as a compatibility-era automation identifier governed by the repository's existing naming-migration boundary. It is not current product identity.

## Validated transitional compatibility capabilities

The inherited Vaultwarden-compatible path remains available as migration and compatibility reference material. Existing repository evidence includes compatibility coverage for authentication, sync, CRUD, attachments, organizations/collections, TOTP, WebAuthn-compatible paths, recovery, migration/rollback, security scanning, and release-image preflight.

These are not claims that equivalent native features are implemented.

## Not yet implemented in the native server

The following remain incomplete in the native path:

- GoreeCloud Manager integration and accepted operational/lifecycle evidence;
- production GoreeCloud Identity authentication;
- persistent PostgreSQL storage;
- network/HTTP API;
- token/session lifecycle;
- server-side authorization adapters beyond the in-memory owner domain;
- synchronization protocol;
- organizations and collection permissions;
- attachments;
- sends/sharing;
- passkey/WebAuthn server flows;
- TOTP flows;
- import/export and migration tooling;
- production deployment;
- Glaze UI server presentation;
- Wardveil Security integration;
- Privacy Shield integration;
- Everkeep integration;
- GoreeCloud Mesh integration;
- GoreeCloud Policy integration/evaluation;
- GoreeCloud Observability integration/evaluation;
- real-client acceptance;
- production approval;
- Stable release.

Planned capability is not considered implemented until its source and required acceptance evidence are integrated and the applicable authoritative gates accept it.