# GoreeCloud Vault

**Status: Development / source-import baseline. Not a working password manager, not approved for storing real credentials, and not Stable.**

GoreeCloud Vault is the planned self-hostable, local-first, zero-knowledge credential, passkey, and encrypted-secret manager for the GoreeCloud ecosystem. This repository is the **canonical GoreeCloud/vault source destination**.

## Architecture choice

**Fork-to-Native (transitional).** The user-authorized Bitwarden source import provides a bounded compatibility and migration reference, not a production-ready GoreeCloud Vault. Product-defining encryption trust boundaries, identity, authorization, UX, Glaze, platform integrations, client contracts, and release governance must be rebuilt and independently accepted.

## Repository layout

- `upstream/bitwarden/server/` — pinned Bitwarden server snapshot, **reference/transition only**
- `upstream/bitwarden/clients/` — pinned Bitwarden web, browser, desktop, and CLI snapshot, **reference/transition only**
- `src/origin-policy.mjs` — small first-party prototype of fail-closed exact-origin matching, not connected to any browser or credential database
- `test/` — tests for explicitly implemented GoreeCloud code
- `docs/` — architecture, security gates, conformance, Glaze requirements, phased migration, legal/provenance record
- `source-lock.json` — upstream source revisions for the imported snapshots

**Do not run inherited deployment scripts or containers as GoreeCloud Vault**. Imported source has not passed GoreeCloud deployment, secrets-management, crypto, tenant-isolation, or licensing acceptance gates.

## Check the foundation

Requires Node.js 20+ (no npm dependencies):

```bash
npm test
```

This tests repository import boundaries and the isolated origin-matching prototype. It **does not** test the upstream server/clients, cryptography, password storage, autofill integration, or production readiness.

## Security default

No credential ingestion, key storage, public enrollment, extension permissions, deployment, or automatic migration is authorized by this foundation. The approved product must use reviewed libraries and cryptographic protocols, with end-to-end client-side encryption, failure-case testing, explicit human crypto security review, auditability, and rollback.

## Next work

See [Roadmap](docs/ROADMAP.md), [security gates](docs/SECURITY-GATES.md), [platform conformance](docs/PLATFORM-CONFORMANCE.md), [Glaze experience](docs/GLAZE-EXPERIENCE.md), and [source licensing](docs/SOURCE-AND-LICENSING.md). Prior GoreeCloud Vault repository IDs, pull requests, and CI evidence **do not establish this repository's implementation state**.
