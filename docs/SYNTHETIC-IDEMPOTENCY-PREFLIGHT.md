# Synthetic idempotency and lifecycle preflight — Development only

**Status: source-only, untrusted fixture and unshippable schema version `0`.** The module `src/synthetic-idempotency-preflight.mjs` screens fabricated sequence counters, item lifecycle status, and revision claims. It never stores, authenticates, encrypts, transmits, reads credentials, issues idempotency keys, or performs an atomic transaction. A positive `candidate` has no authorization or replay-defense value.

## Fixture contract

The input must be a plain or null-prototype record containing *exactly* seven own **data** properties: `schemaVersion`, `expectedRevision`, `observedRevision`, `observedStatus`, `requestSequence`, `lastAcceptedSequence`, `operation`. Extra keys (including any password or token), arrays, symbols, accessors, inherited properties and invalid counters fail closed. The strict helper captures an own-descriptor snapshot before validation rather than reading the original object's values through property gets. A malicious Proxy can forge descriptor claims: the snapshot is **not** attestation or integrity proof.

Accepted synthetic transitions:

| Observed status | Observed revision | Operation | Proposed status |
| --- | --- | --- | --- |
| `empty` | exactly `0` | `create` | `active` |
| `active` | safe integer ≥ `1` | `replace` | `active` |
| `active` | safe integer ≥ `1` | `delete` | `tombstone` |

Every candidate additionally requires equal observed/expected revisions; strictly next request sequence (not repeated or skipped); and a revision increment without overflow. Tombstone resurrection, repeated create, writes to empty state and inconsistent revision/status claims are rejected. Output is immutable and omits identifiers and protected values.

## Authorization and persistence gap

The caller controls all seven claims. Two checks with identical input can both pass. A real implementation requires **independently authoritative** authenticated session/tenant/resource ownership, client-held reviewed keys, an atomic compare-and-swap transaction, durable per-scope idempotency records with retention and conflict semantics, crash/retry analysis, version rollback defense, and negative cross-tenant and multi-device tests. Neither this source nor passing CI authorizes a credential path.

Run `node --test test/synthetic-idempotency-preflight.test.mjs` and `npm test`. See [security gate #1](https://github.com/GoreeCloud/vault/issues/1), [backlog #3](https://github.com/GoreeCloud/vault/issues/3), `docs/SECURITY-REVIEW-EVIDENCE.md` (on the separate review branch), and `docs/SYNTHETIC-SYNC-LEASE-PREFLIGHT.md`.
