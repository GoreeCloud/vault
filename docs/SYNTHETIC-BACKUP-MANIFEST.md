# Synthetic backup and restore metadata preflight

**Status: Development-only metadata model. No backup is created, encrypted, authenticated, uploaded, downloaded, decrypted, or restored.**

`src/synthetic-backup-manifest.mjs` screens a bounded fabricated backup-manifest shape and can produce a metadata-only restore proposal for an empty synthetic target. Its fields named as encryption, integrity, or rollback *claims* are caller supplied and are not evidence that those properties exist.

## Current bounded behavior

The manifest requires schema version 0, canonical synthetic identifiers, bounded revision/count/size metadata, the Development-only format marker `synthetic-opaque-backup-v0`, an asserted client-encrypted boundary, and an asserted server-cannot-decrypt boundary. Empty item counts must have zero opaque bytes; non-empty counts must not claim zero bytes.

The restore preflight additionally requires a matching target vault, an empty target at revision 0, claimed integrity evidence, claimed rollback evidence, and an operator-cannot-decrypt boundary. It intentionally rejects merge/overwrite restoration into a non-empty target because conflict-safe destructive recovery has not been reviewed.

## What it does not prove

- There is no ciphertext parser, encryption, MAC/AEAD check, signature, checksum, key, archive, file I/O, Everkeep request, or storage operation.
- A successful result does not prove a backup exists, is complete, is confidential, is authentic, is fresh, belongs to the user, or can be restored.
- It does not authorize destructive replacement, merge restoration, retention, remote replication, or disaster-recovery actions.
- It does not expose backup IDs or vault IDs in its result.

## Required Everkeep and recovery acceptance

Before real Vault backup/restore exists, the exact implementation must have human-approved cryptographic framing and key custody; authenticated client-side backup format and versioning; rollback/replay protection; authorization and ownership checks; least-privilege Everkeep integration; retention and deletion semantics; corruption/truncation/wrong-key/old-backup tests; safe non-empty-target conflict handling; transactional restore or equivalent recovery guarantees; destructive-operation safeguards; representative restore drills; and verified rollback from failed recovery.

This preflight is useful for designing those contracts without crossing the current secret-handling security gate. It is not Everkeep conformance or disaster-recovery acceptance.


## Hostile-input snapshot hardening

Both manifest and restore context fields are copied from exact own data descriptors into immutable null-prototype snapshots before validation. No caller property getters are invoked while interpreting encryption, operator-access or restore-safety claims. Malicious Proxy descriptors can still lie; this robustness check **never verifies encryption or authorization**.
