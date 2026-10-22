# Synthetic-only encrypted-item interoperability laboratory

This directory is a **test laboratory**, never a Vault service or credential
storage system. The executable development server does not import this package.
It exposes no network API, database, user accounts, browser access, files,
logging or migrations.

It demonstrates, using **invented synthetic strings only**, the separation
between *client-side AES-256-GCM encryption* (with item/account-bound associated
data) and a storage coordinator that receives opaque ciphertext plus
optimistic revision tokens. Tests cover wrong-key rejection, cross-item and
cross-account tampering, defensive byte copies, revision conflicts, concurrent
updates and bounded in-memory capacity. The test key is constant and public;
it must **never** be used for real secrets, nor should this experimental format
be adopted as an official GoreeCloud Vault encryption protocol.

This test is NOT integrated with inherited clients' login, sync or item
serialization. See the authoritative library source
`libs/common/src/services/api.service.ts` and open security gate #3.

Run synthetic tests from `services/vault-dev-server`:

    go test -race ./...

Before a real encrypted vault is implemented: specify encryption and
authenticated-data formats, KDF parameters, key protection, rotation, recovery,
tenant authorization, offline conflict and audit requirements. Adopt only
reviewed crypto protocols and real-client tests. Never import live Vaultwarden
data for this laboratory.

## Synthetic incremental sync journal

`NewSyncLedger` composes the in-memory ciphertext store with a sequence of
synthetic change events. It models per-scope cursors, bounded pages (16
events), tombstones on deletion, optimistic revision conflict detection,
atomic sequencing, and stale-history errors after a 64-event rolling window.
It deep-copies ciphertext across the boundary, and cross-scope pulls never
expose other synthetic users. Its test suite models two isolated clients
pulling and decrypting invented values. It does **not** implement user
authentication, cryptographic identity, network transport, a backup database,
real app serialization, recovery or a durable sync protocol. Cursors and
tombstones do not survive process restart.

This code remains intentionally excluded from the native server executable.
No endpoint exposes it, and no real passwords may be submitted.

## Synthetic full-resynchronization after expired journal history

The laboratory also models an atomic `Snapshot(scope)` fallback. A client
whose incremental `Pull` returns `ErrHistoryExpired` may retrieve the
current set of synthetic opaque ciphertext items and a matching cursor,
then use that cursor for subsequent changes. Snapshot returns deterministic,
deep-copied records and omits deleted items. Tests exercise recovery after
history truncation, resumed deltas, deletion propagation, tenant-scope
separation, concurrent writes, and invalid/empty accounts.

This snapshot is **ephemeral and unauthenticated**, not a backup or recovery
service. It does not provide real tenant authorization, durable storage,
rollback protection, migration, key recovery, or application integration.
