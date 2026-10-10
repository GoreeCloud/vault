# Security review evidence map — Development candidate

**Status:** Review preparation only, not approval or a release artifact. These controls describe outstanding evidence, not features delivered. The authoritative gate is [issue #1](https://github.com/GoreeCloud/vault/issues/1); the live backlog is [issue #3](https://github.com/GoreeCloud/vault/issues/3).

## Isolation

- The GitHub default branch is a historical stub. First-party `src/` modules in draft PRs model forged, secret-free inputs and may return `candidate: true` **without** authenticating any principal, validating consent or proving encryption.
- No actual passwords, passkeys, tokens, encrypted payloads, decrypted memory, real clipboard content, cloud storage or migration files may be passed into Development fixtures.
- Preserve the `upstream/bitwarden/` reference snapshot and licensing notices. No release or native-runtime acceptance follows merely from imported upstream behavior or tests.

## Required review evidence and accountable boundary

| Domain | Evidence required before handling real secrets | Current evidence category |
| --- | --- | --- |
| Client key custody and recovery | Exact implementation review of reviewed crypto primitives, KDF parameters, nonce/key separation, unlock/lock, rotation, memory lifecycle, device loss and restore vectors | Human cryptographic review **open** |
| Identity and Policy | Independently verified session, tenant, resource, role and revocation authority; fail-closed abuse tests | Caller-forgeable metadata screens only |
| Storage and offline sync | Authenticated ciphertext framing, durable encrypted cache, atomic revision/lease, idempotency, replay and rollback tests | Stateless synthetic proposals only |
| Browser, passkeys and clipboard | Origin/RP binding, WebAuthn platform ceremonies, permission scope, private-mode semantics, sensitive clipboard clearing on target OS | Preflight and lifecycle fixtures only |
| Privacy Shield and Observability | Data minimization, real redaction enforcement, telemetry consent and retention evidence | Signal-shape preflight only |
| Wardveil Security | Documented threat cases, phishing and exploitation response paths, independent security assessment | Threat-model plan only |
| Everkeep | Encrypted backup integrity, user-authorized restore, round trip and destructive-recovery exercise | Backup/restore metadata claims only |
| Glaze and client platforms | Accepted consumer version, accessible interactive forms, native device/keyboard/screen reader runs and rollback evidence | Read-only static preview only |
| Manager and Mesh | Reviewed admin and service boundaries that cannot expose vault secrets; protocol and capability isolation | No live integration verified |
| Legal/release | Bitwarden license/trademark/provenance review; reproducible builds, supply chain, rollback, human release authorization | Pending independent signoff |

## Reviewer workflow

1. Select and pin the **exact reviewed source commit** and dependency provenance. Record candidate PR stack and outstanding differences from `main`.
2. Run exact-head CI plus independent hostile-input suites; verify source-boundary workflow, dependency and license notices. CI does **not** discharge cryptographic review.
3. Record an independent, qualified review with concrete issue/commit references in security gate #1. List all unresolved findings; do not silently waive blockers.
4. On a representative runtime only after applicable approvals, test cross-tenant denial, device revocation, offline conflict and recovery, WebAuthn binding, secret lifetime, assistive technologies, and rollback.
5. Reconcile the GoreeCloud Tasks Management Vault record and release decisions from observed evidence. Do not label Stable or deploy for real secrets until all gates are explicitly satisfied.

**Interpretation rule:** Every `candidate: true` fixture result is non-authoritative. A malicious Proxy can forge JavaScript descriptor observations; defensive fixture snapshots are not cryptographic attestation or trust establishment.
