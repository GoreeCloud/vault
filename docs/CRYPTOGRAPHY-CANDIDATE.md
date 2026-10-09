# Cryptographic architecture — review questions, not an implementation

**State:** Design-input candidate only. No selected/approved cryptographic format, no encryption or key derivation implementation, and no permission to store secrets. Do not treat this document as a production cryptographic specification.

## Required zero-knowledge trust model

The user's trusted client must create and maintain the secrets necessary for decrypting the vault. The GoreeCloud Vault server, GoreeCloud Identity, GoreeCloud AI, operators, sync transport, and backups must **not** require access to plaintext master secrets, passkeys or decrypted vault contents for normal operation. Authentication to a service is separate from authorization to read a record, and both are separate from possession of the decryption key.

## Decisions requiring independent human approval

| Design area | Decision to review | Required negative evidence |
| --- | --- | --- |
| Initial keys | Reviewed client CSPRNG, master-password KDF, calibration/parameters, salts, multi-factor unlock and device enrollment | Low-entropy passphrases, unsupported runtime, lost/locked device |
| Key hierarchy | User keys, vault/collection keys, per-item keys, envelope wrapping and lifetime; account/device revocation | Compromised device, shared collection membership changes and stolen backups |
| Ciphertext format | Established AEAD library and version, nonce discipline, tag length, algorithm agility, AAD binding vault/item/revision/owner | Bit flips, swapped metadata, replay, wrong key, nonce collision, downgrade |
| Secret handling | In-memory lifetimes, OS protected stores, process isolation, lock/clipboard lifecycle, accessibility/screenshots | Process dumps, extension compromise, private windows, telemetry/console leakage |
| Offline/sync | Authenticated state machine, atomic revisions, conflict resolution, rollback/replay detection, DoS limits | Concurrent edits, stale clients, compromised sync server, timing/race attacks |
| Sharing | Authenticated key distribution, roles, revocation and encrypted attachment handling | Unauthorized recipient, expired share and administrator impersonation |
| Recovery | Owner-controlled restore and emergency access without hidden service master keys | Social-engineering recovery, account takeover, corrupt backup, revoked device |
| Migration | Versioned import/export, explicit consent, portable encrypted archive, verified deletion of temporary plaintext | Invalid export, partial restore, corrupted metadata, downgrade path |

## Why no cipher names are embedded in the code yet

Even using a mature algorithm safely requires a reviewed protocol: nonce uniqueness, associated data, key separation, formats, platform runtime constraints, authentication, downgrade handling and recovery cannot be inferred from a library choice. `src/opaque-sync-preflight.mjs` merely checks *shape* of synthetic development records. Its schema version 0 is not a cryptographic format and must never be shipped.

## Release boundary

The independent reviewer records approvals for the exact candidate version, target clients and migration plan in [security gate #1](https://github.com/GoreeCloud/vault/issues/1). Only then implement approved encryption, persistent storage or secret-bearing endpoints with test vectors, negative-path evidence, third-party dependency/SBOM review and target-environment testing.
