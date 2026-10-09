# Synthetic conflict preflight — Development only

`src/synthetic-conflict-preflight.mjs` evaluates **caller-provided metadata-only fixtures** (schema version 0). It does **not** merge, persist, authenticate, encrypt, decrypt, synchronize, resolve, restore, or authorize records. Never pass real user secrets or protected metadata to this module.

The preflight rejects extra keys, unsupported types, accessors, inherited properties and unsafe revisions. Only synthetic `active` and `tombstone` labels are accepted. All candidate actions require manual review. Concurrent delete/edit outcomes are quarantined, not silently resurrected or automatically resolved by last-writer-wins. Input facts are forgeable.

Unresolved release blockers include authenticated revision histories, offline queue durability, rollback protection, server transaction isolation, device revocation, tenant permissions, encryption key custody, real backup and restore, and complete conflict-resolution UX. The human exact-revision cryptographic review in issue #1 and all security gates in `docs/SECURITY-GATES.md` must close before real vault data is handled.

Run `node --test test/synthetic-conflict-preflight.test.mjs` locally and `npm test` for the complete foundation checks. Passing tests do not imply a working password manager, security acceptance, deployment, or Stable status.
