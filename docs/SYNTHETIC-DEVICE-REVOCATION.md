# Synthetic device and session revocation preflight

**Status:** Development-only, fixture schema v0. Not a device-management service, real session lifecycle, authentication, encryption, authorization, key-rotation, or production-ready feature.

\`src/synthetic-device-revocation.mjs\` screens small, explicitly fabricated snapshots and returns coarse revocation **proposals** without exposing device identifiers. The input is untrusted caller-supplied metadata; a passing result is never an authorization decision or proof of revocation.

## Bounded fixture contract

- Snapshot: \`{schemaVersion:0, revision, devices}\`, with 1–16 devices ordered by unique integer \`slot\` values 1–16, each carrying \`deviceStatus\` and \`sessionStatus\` (\`active\` or \`revoked\`).
- Request: \`{schemaVersion:0, expectedRevision, initiatorSlot, targetSlot, action}\`.
- \`revoke-one\`: exactly one active other device; self-revocation and unknown/already-revoked devices are rejected.
- \`revoke-other-sessions\`: \`targetSlot:null\`; only non-initiating active devices/sessions count. Empty changes are rejected.
- Revision mismatch, invalid prototypes, accessors, decorated or sparse arrays, contradictory state and unknown data are rejected. The proposal contains only a revision increment, affected count, and explicit flags for authorization/session invalidation/key-rotation review.

## Real integration gate

Before building a real device manager, obtain the required exact-revision security approval and design authoritative per-user/tenant device identity, authenticated reauthentication, anti-replay and atomic revision checks, server-side session invalidation propagation, offline-device denial, encryption-key/collection access revocation, audit minimization, recovery, and rollback. Stale clients must not be able to revive a revoked grant. Browser and mobile clients need independent lock-state and device tests. This fixture cannot perform any of those actions.

See [security gates](SECURITY-GATES.md), [threat model](THREAT-MODEL.md), and [platform conformance](PLATFORM-CONFORMANCE.md).
