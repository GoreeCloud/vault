# GoreeCloud Vault — Native opaque-sync preflight

**Status:** Development-only contract candidate, `schemaVersion: 0`. There is no storage API, server, trusted authorization, encryption, cryptographic authenticity, deployment, account enrollment, or real-data use.

## Goal

Define a narrow native protocol seam before linking GoreeCloud Vault to any persistent or remotely accessible service. The server-side design must treat protected vault contents as opaque, route only minimal sync metadata, enforce authorization **independently** of any caller-supplied context, and never infer that syntactically valid bytes are actually encrypted or authenticated.

## Existing implementation

`src/opaque-sync-preflight.mjs` checks only a synthetic JavaScript record envelope:

| Field | Candidate requirement |
| --- | --- |
| `schemaVersion` | Integer `0`, explicitly unshippable development schema |
| `operation` | `create` or `replace`; no delete, recovery or sharing |
| `vaultId`, `itemId` | Canonical lower-case UUID-shaped identifiers (not proof of identity) |
| `previousRevision`, `nextRevision` | Safe nonnegative integers; next must be exactly previous plus one |
| `sealedPayload` | 32–32,768 decoded-byte-equivalent canonical unpadded base64url; **not decrypted or authenticated** |

The trusted-context object must provide `expectedVaultId`, `expectedPreviousRevision` and an affirmative `authorized` flag. **A caller can forge that object**. It is only an interface sketch for a future authorization owner, never an accepted permission check. Unknown schema versions, unexpected plaintext-looking keys, malformed shapes, overlarge payloads, stale revisions, cross-vault IDs, and invalid inputs fail closed. Output is a Boolean screening candidate and reason label; it never returns payload data.

**Important:** A random, unencrypted, or malicious byte string will pass the sealed-payload *shape* check if encoded correctly. This is deliberately not a cryptographic validation, nor evidence of zero-knowledge security. Real protected records must not pass through this code path.

## Proposed future trust boundaries — not implemented

1. Authenticated user/device claims issued and revoked by GoreeCloud Identity; each mutation needs server-side collection membership and item scope checks independent of input IDs.
2. Client-generated, versioned authenticated-encryption envelope, with an **independently reviewed algorithm**, key hierarchy, nonce strategy, integrity tag, associated-data binding of vault/item/revision, authenticated encryption metadata, and downgrade rejection.
3. Atomic optimistic concurrency controls with storage-backed authoritative versions, device replay resistance, attachment quotas, conflict resolution, offline queues and tombstones.
4. Authenticated transport with hardened self-hostable service, no public endpoint by default, privacy-minimized policy decisions and error channels that never print payload bytes.
5. Encrypted local-first client cache, cross-device key distribution, deliberate sharing/recovery protocols and Everkeep authenticated backups with restore testing.
6. Security design sign-off and tests before a production protocol version is assigned; do not silently convert `schemaVersion: 0` into a production envelope.

## Mandatory acceptance

Threat-model review; key custody and algorithm review; independently verified AEAD failure cases; tenant isolation; user/session revocation; sync replay/concurrency tests; fuzz testing of binary parsers; end-to-end privacy checks; hardened deployment; rollback and recovery drills; performance/DoS budgets; nine Integral Platform Systems conformance. Every acceptance must cite the exact reviewed Git revision.

See `docs/SECURITY-GATES.md`, `docs/THREAT-MODEL.md`, and security review [issue #1](https://github.com/GoreeCloud/vault/issues/1).
