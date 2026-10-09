# Synthetic migration dry-run preflight

**Status: Development-only metadata policy. No file parsing, import/export, storage mutation, deletion, or cutover occurs.**

`src/synthetic-migration-preflight.mjs` accepts a small fabricated migration-plan shape and can produce only a `dry-run-no-write` proposal. It receives only bounded format labels, counts, and boolean claims. It does not receive source file contents, attachment bytes, source paths, storage handles, or real integrity values.

## Current fail-closed rules

The fixture uses a short allowlist of migration-format labels solely as test vocabulary. It requires bounded item and attachment counts plus caller claims that the source remains read-only, temporary unprotected staging is absent, the operation is a dry run, explicit user consent exists, the destination is empty, recovery backup is ready, and integrity evidence exists.

Those fields are caller claims, not verification. A successful result does not prove the source is valid, integrity evidence is correct, recovery is available, consent is authentic, or the destination is empty.

Write mode is deliberately unsupported. Non-empty-target migration is deliberately unsupported. The preflight never proposes import, overwrite, deletion, cutover, or rollback.

## Required migration acceptance

Real migration requires format-specific parsers with hostile-input limits; protected local handling; explicit consent; dry-run and diff UX; field and attachment fidelity; versioned normalization; verified integrity evidence; duplicate/conflict policy; transactional or safely recoverable writes; backup and rollback; cleanup of temporary material; compatibility testing; malformed-input tests; representative round trips; and exact-revision security/privacy review.

This module is a planning guard only and does not authorize real data ingestion or satisfy migration/recovery release gates.
