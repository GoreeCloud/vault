# Synthetic sync lease preflight — Development only

This source-only fixture proposes compare-and-swap (CAS) revision transitions; it does **not** acquire leases, authenticate an actor, lock rows, store bytes, or enforce atomicity. Concurrent callers given the same stale snapshot may both receive candidates. Accordingly the result MUST NOT be used as authorization to write or sync any user data.

The preflight accepts precisely six ordinary own-value metadata fields; invalid objects, extra secret-like fields, wrong states, nonmonotonic revisions, and resurrection attempts fail closed. Results omit identifiers and always require a future authoritative atomic transaction.

Before any real sync implementation: qualify exact-revision cryptography and key custody, authenticated device and tenant authorization, transactional CAS and conflict isolation, durable tombstones and revocation, retries/idempotency, restore integrity, rollout/rollback, privacy evidence, and negative integration tests. Remain gated by `docs/SECURITY-GATES.md` and security issue #1.

Run `node --test test/synthetic-sync-lease-preflight.test.mjs` and `npm test`. These checks are only Development evidence.
