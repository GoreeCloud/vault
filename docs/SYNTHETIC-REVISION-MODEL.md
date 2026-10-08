# Synthetic revision and conflict model — DEVELOPMENT ONLY

`src/synthetic-revision-model.mjs` is a pure, non-operational fixture function that computes metadata-only proposals for create, replace, and delete operations. It has **no real storage, authentication, encryption, connectivity, session tracking, concurrency control, vault items or secret fields**. Schema `0` is unshippable.

## State transitions

| Fixture state | Operation | Result |
| --- | --- | --- |
| Empty, revision 0 | Create at 0 | Active, revision 1 proposal |
| Active, revision N | Replace at N | Active, revision N+1 proposal |
| Active, revision N | Delete at N | Tombstone, revision N+1 proposal |
| Active, revision N | Stale revision | Reject |
| Active, revision N | Create | Reject |
| Empty | Replace/delete | Reject |
| Tombstone | Create/replace/delete | Reject |
| Any | Cross-vault / cross-item | Reject |
| Any | Malformed or unsupported | Reject |

Only a frozen `{candidate,reason}` denial or frozen `{candidate,reason,proposal:{revision,status}}` affirmative *proposal* is returned. No IDs, ciphertext or field data are returned. No input is modified. This models tombstones and optimistic concurrency concepts, not real synchronization.

## Critical: race behavior is intentionally *not* secured

Two clients can obtain `candidate: true` from **the same stale synthetic snapshot**. Therefore this model does **not** prevent concurrent conflicting writes, authorize mutations, deduplicate operations or provide server-side atomicity. Production must enforce atomic compare-and-swap against storage-authoritative revisions **after** independently authenticated identity, per-record tenancy/grants, device/session revocation and reviewed ciphertext integrity checks; replay and idempotency semantics require their own threat model. Offline queues, tombstone retention, backup restore, conflict merge policies and storage rollback protection remain unimplemented.

## Human review requirements

Issue [#1](https://github.com/GoreeCloud/vault/issues/1) still blocks approved cryptography, real records, key custody, persistent encrypted cache and sync. Issue [#3](https://github.com/GoreeCloud/vault/issues/3) tracks implementation. Adverse lifecycle and race tests are *fixtures only* and cannot justify closing either gate.

Related: `docs/NATIVE-SYNC-CONTRACT.md`, `docs/CRYPTOGRAPHY-CANDIDATE.md`, `docs/SECURITY-GATES.md`.
