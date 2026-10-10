# Offline queue sequencing — synthetic Development fixture

**No real credential handling.** The pure `src/synthetic-offline-queue.mjs` models 1–16 fabricated one-item edit intents containing only identifiers, proposed operations, and revisions. Schema `0` is not shippable. No ciphertext, secrets, keys, network calls, file writes, sessions, grants or persistent queues are used.

The simulation passes a proposal through the existing synthetic revision model, with provisional create/replace/delete/tombstone transitions. It rejects missing or malformed context, stale or duplicate edits, item/vault mismatches and post-delete resurrection. Queue length is now taken from a bounded **own data descriptor** rather than an ordinary array `length` property read. This avoids invoking a caller-controlled Proxy `get` trap during shape validation; sparse, oversized, accessor-backed, decorated, and inconsistent arrays remain rejected. The array's elements are copied from own data descriptors before processing. These checks are defensive fixture hygiene only: a malicious Proxy can still forge descriptor claims, and this model provides no authenticated input provenance or atomic execution.

An invalid item anywhere in the sequence yields a **whole-plan denial**, never a partially accepted output. Affirmative output includes only the proposed final revision/status and step count.

## Trust and race boundary

This is **not a transaction**. Two callers testing the same stale snapshot can both receive an affirmative result. An eventual server must compare-and-swap against independently authoritative stored versions, under server-side authenticated identity, tenant isolation and grant verification. Durable encrypted queues, crash-safe replay, idempotency, multi-device conflict UX, quotas, tombstone retention and rollback-resistant restore remain unimplemented.

No green CI run or simulation candidate authorizes real vault operations. The cryptographic design and key custody must receive exact-source human review before real encrypted cache or synchronization implementation proceeds.

See [security gate #1](https://github.com/GoreeCloud/vault/issues/1), [backlog #3](https://github.com/GoreeCloud/vault/issues/3), `docs/SYNTHETIC-REVISION-MODEL.md`, `docs/NATIVE-SYNC-CONTRACT.md`.
