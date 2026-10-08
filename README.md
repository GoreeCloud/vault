# GoreeCloud Vault

**Status: Development / source-import baseline. Not a working password manager, not approved for storing real credentials, and not Stable.**

GoreeCloud Vault is the planned self-hostable, local-first, zero-knowledge credential, passkey, and encrypted-secret manager for the GoreeCloud ecosystem. This repository is the **canonical GoreeCloud/vault source destination**.

## Architecture choice

**Fork-to-Native (transitional).** The user-authorized Bitwarden source import provides a bounded compatibility and migration reference, not a production-ready GoreeCloud Vault. Product-defining encryption trust boundaries, identity, authorization, UX, Glaze, platform integrations, client contracts, and release governance must be rebuilt and independently accepted.

## Repository layout

- `upstream/bitwarden/server/` — pinned Bitwarden server snapshot, **reference/transition only**
- `upstream/bitwarden/clients/` — pinned Bitwarden web, browser, desktop, and CLI snapshot, **reference/transition only**
- `src/origin-policy.mjs` — small first-party prototype of fail-closed exact-origin matching, not connected to any browser or credential database
- `src/password-generator.mjs` — isolated CSPRNG-based local password-generation prototype; never persists credentials
- `src/autofill-preflight.mjs` — non-authoritative browser autofill candidate screening; never reads or fills secrets
- `src/opaque-sync-preflight.mjs` — synthetic encrypted-record shape screening; schema v0, never persists, decrypts or authorizes real data
- `src/synthetic-revision-model.mjs` — pure no-storage revision/tombstone conflict proposals for fixture tests only
- `src/synthetic-offline-queue.mjs` — bounded metadata-only sequencing of fabricated offline edits; no storage or retries
- `src/synthetic-access-boundary.mjs` — non-operational single-owner role/scope screening for synthetic fixtures only
- `src/synthetic-client-item-schema.mjs` — client-private field-name templates only, with no credential values, persistence or encryption
- `preview/` — noninteractive, offline visual concept, not a usable Vault client or Glaze acceptance
- `test/` — tests for explicitly implemented GoreeCloud code
- `docs/` — architecture, security gates, conformance, Glaze requirements, phased migration, legal/provenance record
- `source-lock.json` — upstream source revisions for the imported snapshots

**Do not run inherited deployment scripts or containers as GoreeCloud Vault**. Imported source has not passed GoreeCloud deployment, secrets-management, crypto, tenant-isolation, or licensing acceptance gates.

## Explore the read-only interface concept

Open [the local static preview](preview/index.html) from your checkout. It has no forms, accounts, encryption or credential entry and is **not a password manager**. The design target is Glaze 1.7.0, but the runtime and consumer acceptance are not implemented. See [preview limitations](docs/STATIC-PREVIEW.md).

## Check the foundation

Requires Node.js 20+ (no npm dependencies):

```bash
npm test
```

This tests repository import boundaries, isolated origin matching, an unapproved password-generation prototype, hardened autofill candidate screening and hostile-input checks, opaque-sync envelope shape checks, synthetic access-boundary tests, client-private item template shape screening, synthetic revision/conflict transitions, and bounded offline-queue ordering tests. None is a working browser extension, cryptographic vault, or server. It **does not** test the upstream server/clients, deployed cryptography, password storage, browser autofill integration, or production readiness.

## Security default

No credential ingestion, key storage, public enrollment, extension permissions, deployment, or automatic migration is authorized by this foundation. The approved product must use reviewed libraries and cryptographic protocols, with end-to-end client-side encryption, failure-case testing, explicit human crypto security review, auditability, and rollback.

## Next work

See [static preview](docs/STATIC-PREVIEW.md), [Roadmap](docs/ROADMAP.md), [security gates](docs/SECURITY-GATES.md), [threat model](docs/THREAT-MODEL.md), [password-generation prototype](docs/SECURE-GENERATION.md), [autofill safeguards](docs/AUTOFILL-SAFETY.md), [non-operational sync contract](docs/NATIVE-SYNC-CONTRACT.md), [synthetic conflict model](docs/SYNTHETIC-REVISION-MODEL.md), [offline queue prototype](docs/SYNTHETIC-OFFLINE-QUEUE.md), [synthetic access boundary](docs/SYNTHETIC-ACCESS-BOUNDARY.md), [client-private item schemas](docs/SYNTHETIC-CLIENT-ITEM-SCHEMA.md), [cryptographic review candidate](docs/CRYPTOGRAPHY-CANDIDATE.md), [platform conformance](docs/PLATFORM-CONFORMANCE.md), [Glaze experience](docs/GLAZE-EXPERIENCE.md), and [source licensing](docs/SOURCE-AND-LICENSING.md). Prior GoreeCloud Vault repository IDs, pull requests, and CI evidence **do not establish this repository's implementation state**.
