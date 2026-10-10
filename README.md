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
- `src/synthetic-idempotency-preflight.mjs` — strict synthetic sequence/lifecycle proposal; no authenticated replay protection or atomic writes
- `src/synthetic-offline-queue.mjs` — bounded metadata-only sequencing of fabricated offline edits; no storage or retries
- `src/synthetic-access-boundary.mjs` — non-operational single-owner role/scope screening for synthetic fixtures only
- `src/synthetic-client-item-schema.mjs` — client-private field-name templates only, with no credential values, persistence or encryption
- `src/synthetic-device-revocation.mjs` — bounded fabricated device/session revocation proposals, not real session invalidation or authorization
- `src/synthetic-lock-lifecycle.mjs` — forged-state lock/reauth transition proposals only; never authenticates or unlocks a real vault
- `src/synthetic-backup-manifest.mjs` — metadata-only backup/restore preflight; never reads, writes, encrypts or restores backup bytes
- `src/synthetic-observability-signal.mjs` — identifier-free coarse operational-signal screening; never collects or transmits telemetry
- `src/synthetic-passkey-rp-preflight.mjs` — exact-host, top-level HTTPS passkey RP candidate screening with no WebAuthn or credential material
- `src/synthetic-migration-preflight.mjs` — metadata-only migration planning restricted to no-write dry runs
- `src/synthetic-clipboard-lifecycle.mjs` — post-copy clear/schedule proposals only; never reads or authorizes clipboard contents
- `preview/` — noninteractive, offline visual concept, not a usable Vault client or Glaze acceptance
- `test/` — tests for explicitly implemented GoreeCloud code
- `docs/` — architecture, security gates, conformance, Glaze requirements, phased migration, legal/provenance record
- `source-lock.json` — upstream source revisions for the imported snapshots

**Do not run inherited deployment scripts or containers as GoreeCloud Vault**. Imported source has not passed GoreeCloud deployment, secrets-management, crypto, tenant-isolation, or licensing acceptance gates.

## Explore the read-only interface concept

Open [the local static preview](preview/index.html) from your checkout. It has no forms, accounts, encryption or credential entry and is **not a password manager**. The design target is Glaze 1.7.0, but the runtime and consumer acceptance are not implemented. See [preview limitations](docs/STATIC-PREVIEW.md).

For optional loopback-only HTTP/header QA, run `npm run preview` and open `http://127.0.0.1:8765/` on that machine. Stop it with Ctrl+C. This server is for local development, not deployment; never tunnel it or provide credentials. The QA server's tests are included in `npm test`.

The static preview includes CSS viewport safe-area handling for notches and gesture navigation. This is not evidence of native mobile inset behavior; see `test/preview-safe-area.test.mjs`.

## Check the foundation

Requires Node.js 20+ (no npm dependencies):

```bash
npm test
```

This tests repository import boundaries, isolated origin matching, an unapproved password-generation prototype, hardened autofill candidate screening and hostile-input checks, opaque-sync envelope shape checks, synthetic access-boundary tests, client-private item template shape screening, synthetic revision/conflict transitions, bounded offline-queue ordering, forged-state idempotency sequence/lifecycle screening, fabricated lock/reauth lifecycle transitions, metadata-only backup/restore screening, identifier-free coarse observability envelopes, conservative passkey RP/origin screening, no-write migration dry-run planning, and clipboard clear-lifecycle proposals. None is a working browser extension, cryptographic vault, or server. It **does not** test the upstream server/clients, deployed cryptography, password storage, browser autofill integration, or production readiness.

## Security default

No credential ingestion, key storage, public enrollment, extension permissions, deployment, or automatic migration is authorized by this foundation. The approved product must use reviewed libraries and cryptographic protocols, with end-to-end client-side encryption, failure-case testing, explicit human crypto security review, auditability, and rollback.

## Next work

See [static preview](docs/STATIC-PREVIEW.md), [Roadmap](docs/ROADMAP.md), [security gates](docs/SECURITY-GATES.md), [threat model](docs/THREAT-MODEL.md), [password-generation prototype](docs/SECURE-GENERATION.md), [autofill safeguards](docs/AUTOFILL-SAFETY.md), [non-operational sync contract](docs/NATIVE-SYNC-CONTRACT.md), [synthetic conflict model](docs/SYNTHETIC-REVISION-MODEL.md), [offline queue prototype](docs/SYNTHETIC-OFFLINE-QUEUE.md), [idempotency lifecycle proposal](docs/SYNTHETIC-IDEMPOTENCY-PREFLIGHT.md), [synthetic access boundary](docs/SYNTHETIC-ACCESS-BOUNDARY.md), [client-private item schemas](docs/SYNTHETIC-CLIENT-ITEM-SCHEMA.md), [synthetic lock lifecycle](docs/SYNTHETIC-LOCK-LIFECYCLE.md), [backup/restore metadata preflight](docs/SYNTHETIC-BACKUP-MANIFEST.md), [privacy-safe observability preflight](docs/SYNTHETIC-OBSERVABILITY.md), [passkey RP/origin preflight](docs/SYNTHETIC-PASSKEY-RP-PREFLIGHT.md), [migration dry-run preflight](docs/SYNTHETIC-MIGRATION-PREFLIGHT.md), [clipboard clear lifecycle](docs/SYNTHETIC-CLIPBOARD-LIFECYCLE.md), [cryptographic review candidate](docs/CRYPTOGRAPHY-CANDIDATE.md), [platform conformance](docs/PLATFORM-CONFORMANCE.md), [Glaze experience](docs/GLAZE-EXPERIENCE.md), and [source licensing](docs/SOURCE-AND-LICENSING.md). Prior GoreeCloud Vault repository IDs, pull requests, and CI evidence **do not establish this repository's implementation state**.
