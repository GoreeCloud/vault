# GoreeCloud Vault — Proposed Encrypted Synchronization Architecture

**Status:** Design proposal only; **not** an implemented or approved service.
**Owner:** GoreeCloud founder
**Date:** 2026-11-03
**Scope:** Self-hosted ciphertext synchronization, device authorization, recovery, and cross-product integration.
**Baseline:** `GoreeCloud/vault` currently provides an **unreviewed, browser-local, single-device prototype** using PBKDF2-SHA256 and AES-256-GCM. It has **no authenticated sync API**. This document must not be interpreted as evidence of a deployed server or audited cryptography.

## 1. Goals and non-goals

Goals:

- Client-side encryption of credentials, attachments and sensitive item metadata **before** network transfer.
- A self-hostable server storing versioned opaque records, never passphrases, plaintext vault contents or unwrapped vault keys.
- Multiple independently authenticated devices, explicit device enrollment and revocation, and loss-aware recovery.
- Deterministic conflict detection, no silent last-writer-wins, and ability to restore verified encrypted snapshots.
- Clear tenant, organization and per-vault isolation boundaries.
- Standards-based login and hardened private network/reverse proxy integration when the upstream GoreeCloud systems are independently ready.

Non-goals in this design milestone:

- Deploying a server, exposing a public endpoint, changing the VPS, or migrating real Bitwarden/Vaultwarden credentials.
- Assuming GoreeCloud Identity, Gateway or Backup are production-ready because they have local development builds.
- Guaranteeing that a malicious server cannot withhold all data, deny service or show differing timelines to disconnected devices.
- Allowing any account administrator or infrastructure operator to reset a lost encryption passphrase by decrypting another person's vault.

## 2. Verified ecosystem context and integration boundaries

Read-only repository review on 2026-11-03:

| Component | Verified source-level state | Vault integration boundary |
| --- | --- | --- |
| GoreeCloud Identity | Development Keycloak / PostgreSQL foundation; production OIDC integration and secure IdP deployment not established | Future OIDC/OAuth 2.0 account authentication; never a vault decryptor |
| GoreeCloud Gateway | Upstream Caddy-powered development engine, private management sidecar and experimental management apps; production cutover not performed | Future HTTPS reverse proxy and routing; no plaintext secrets in gateway logs |
| GoreeCloud Backup | Development alpha wrapping external Kopia/Rclone with loopback administration; no production backup plan | Future encrypted database/snapshot backup with independent restore validation |
| GoreeCloud UI | Working alpha semantic design authority | Native/web interactions, prompts, conflicts, recovery and accessibility |
| GoreeCloud Vault | Browser-local encrypted document, recovery checks and basic client UI | No network sync, zero-knowledge server deployment or multi-device claim today |

These are intended contracts, **not verified runtime interoperability**. No cross-repository changes or infrastructure actions are authorized by this document.

## 3. Required security invariants

1. The server receives only authenticated **ciphertext** for secrets and sensitive metadata. It may retain explicitly documented operational metadata (tenant, opaque object IDs, revision, byte size, timestamps), which remains privacy-sensitive.
2. A user's account authentication credential, access token or SSO assertion is **not itself a decryption key**. Authenticated administrators cannot unwrap private vault keys by default.
3. Every ciphertext record is authenticated, versioned and tied to its vault, item identity, key epoch and logical revision by associated data; a record cannot be silently substituted into another vault or revision.
4. Every modifying operation must be explicitly authorized, scoped to tenant/vault/device, and conditionally committed against a matching server revision.
5. Client rollback protection and server revisions are separate concerns. A malicious server may replay an older *valid* state; tamper detection alone is insufficient.
6. A backup or recovery artifact is never treated as valid until its encryption authentication and item schema pass verification.
7. Device removal prevents future access to data published after removal and a successful rekey; **past ciphertext and previously exported keys cannot be clawed back**.
8. Logs, metrics, issue trackers, automation tasks and CI artifacts must not collect plaintext vault items, keys, enrollment secrets or private recovery values.
9. Every crypto design and dependency requires a separate threat-model review, vetted implementation, interoperability tests and an independent security assessment before production acceptance.

## 4. Conceptual client cryptographic hierarchy (not implemented)

- Each vault receives a fresh cryptographically random **Vault Data Encryption Key (VDEK)**, independent of account login. Consider separate keys for attachments and derived search metadata.
- The account passphrase protects a wrapping key using **reviewed Argon2id parameters**; the current local prototype's PBKDF2 format is distinct and requires an explicit, reversible migration plan. Argon2id is **proposed**, not yet implemented or benchmarked for Android, Linux or browsers.
- A per-device identity (candidate: vetted Ed25519 signing and X25519/HPKE-compatible key agreement) protects authorized device enrollment and key wrapping. Selection must follow vetted, available operating-system crypto APIs. Do not create proprietary cryptographic primitives.
- The client stores only **wrapped VDEKs** at rest; native clients should use appropriate system-protected key storage. Recovery material, if offered, must be independently protected, not uploaded in decryptable form.
- Per-item AEAD uses a fresh nonce for each encryption. Associated authenticated data binds protocol version, vault ID, item ID, VDEK epoch and item revision. Identifiers must be canonicalized before signing and AEAD operations.
- Sharing grants wrap the relevant VDEK or carefully scoped per-item key separately for each approved recipient device. The server must validate membership and key-epoch authorization but cannot decrypt those wraps.
- Design reviews must decide exact cipher suites, nonce lifecycle, record canonicalization, KDF parameters, device-certification format, clock assumptions and cryptographic library provenance **before implementation**.

### Example conceptual envelope (NOT a frozen API or production format)

```json
{
  "protocol": "goreecloud.vault.sync.proposed",
  "vaultId": "opaque-vault-id",
  "itemId": "opaque-item-id",
  "revision": 7,
  "keyEpoch": 2,
  "nonce": "<base64-encoded-random-nonce>",
  "ciphertext": "<authenticated-ciphertext>",
  "authorDeviceId": "opaque-authorized-device-id",
  "deviceSignature": "<signature-over-canonical-envelope>"
}
```

Every field name and signature representation above is illustrative; values, canonical serialization, byte limits and parsing rules require review. Do not reuse the browser-local `goreecloud.vault.local.v1` document format unchanged as a network security protocol.

## 5. Authentication, authorization and device enrollment

- **Identity:** future OIDC authorization-code flow + PKCE with strict issuer/audience/expiry validation and independent signing-key trust; no implicit trust of an HTTP header forwarded by a reverse proxy.
- **Web:** favor a reviewed same-origin backend-for-frontend session using Secure, HttpOnly, SameSite cookies, CSRF protection and origin checks. Do not put long-lived bearer tokens in accessible localStorage.
- **Native:** platform credential storage, scoped short-lived tokens and refresh rotation. No token or vault key in a URL, browser history, query parameters or application logs.
- **Enrollment:** a new device generates keys locally. An existing authorized device verifies a user-visible pairing challenge, signs the new device's certificate/authorization request and wraps permitted keys for it. High-risk enrollment requires additional authentication confirmation.
- **Authorization:** server checks tenant ID, vault ID, user membership, explicit role, device status, token scope, key epoch and operation type on every request. Deny by default; an owner role does not automatically mean decryption privilege.
- **Revocation:** revoke device session/tokens, stop future writes and downloads, advance vault key epoch, rewrap or reencrypt affected secrets as policy requires, and notify authorized devices. Previously captured ciphertext remains a limitation.

## 6. Opaque storage model and synchronization semantics

Proposed relational entities (not migrations or deployed schema):

| Entity | Minimal data | Invariants |
| --- | --- | --- |
| Tenant / organization | Opaque ID, policy metadata | Isolation on every query and transaction |
| User membership | Tenant/vault IDs, role, lifecycle | Authorization not inferred from client request |
| Device | Public keys, attestation/pairing state, revocation epoch | Device proof and revocation checked |
| Vault | Opaque ID, key epoch, server revision, current checkpoint | Monotonic revision, authorized membership |
| Encrypted item | Item ID, ciphertext envelope, tombstone, revision | Explicit CAS update, size and format limits |
| Operation receipt | Device ID, operation ID, accepted revision | Idempotency and replay resistance |
| Append-only checkpoint | Revision, authenticated prior hash, signature/receipt | Clients can audit continuity; server cannot silently rewrite known accepted checkpoints |

### Proposed HTTP contract (design, not available endpoints)

- `GET /v1/vaults/{vaultId}/changes?after={cursor}`: authenticated, bounded, paginated ciphertext/tombstone retrieval scoped to vault/device.
- `PUT /v1/vaults/{vaultId}/items/{itemId}`: authenticated encrypted update with explicit `If-Match` current revision or conditional create, client operation ID and verified device proof.
- `DELETE /v1/vaults/{vaultId}/items/{itemId}`: append a signed, authenticated deletion tombstone; do not immediately erase history needed for recovery and device consistency.
- `POST /v1/devices/enrollment-requests` / authorized approval endpoint: pairing challenge and public-key certification, never the plaintext VDEK.
- `GET /v1/vaults/{vaultId}/checkpoints`: verified revision continuity/receipt data so clients can compare observed histories.

Response requirements: `401` invalid account auth, `403` insufficient tenant/vault/device authority, `409` or `412` stale revision, `413` bounded payload rejection, `429` abuse throttling. Do not automatically retry a failed unsafe write under a new revision or silently merge concurrent passwords.

### Conflict workflow

1. Client reads and records the last accepted server revision.
2. It makes a local encrypted edit that can remain queued offline without discarding the old version.
3. On reconnection it signs and submits a conditional operation with a unique client operation ID.
4. Server atomically validates authorization, device state, current revision and idempotency before appending a new revision.
5. On conflict, both ciphertext versions remain recoverable. A trusted client decrypts the divergent versions locally and requests a user-visible choice. It must not use wall-clock timestamps as unquestioned authority.
6. The client persists the accepted revision/checkpoint; a lower or inconsistent checkpoint raises an explicit rollback/fork alert. Known client checkpoints should eventually be cross-compared among devices; otherwise a malicious server may fork views.

## 7. Recovery, sharing and deletion limits

- Recovery is designed as **user-held, separately protected encrypted recovery material** or explicit authorized-device-assisted transfer. Losing all authorized decryption factors without recovery material can mean irreversible loss of vault secrets. SSO password reset must not imply vault decryptability.
- Recovery enrollment, recovery-package rotation and recipient removal require verified user intent and audit events that **exclude sensitive values**.
- Every import or restore must validate format/version, encryption authentication, item schema, expected revision and vault identity before mutating state. Stage restoration to a new isolated destination, inspect counts and hashes, then confirm any replacement.
- Revocation removes access to future epochs, not secrets already copied before removal. Sharing recipients may retain previously decrypted information.
- Deletion means tombstone + retention policy and encrypted key/record lifecycle; SSDs, snapshots, copied files and cloud retention may prevent immediate physical erasure. Document crypto-erasure limits.
- Backup encryption cannot depend on a single missing passphrase; publish recovery practices before promising continuous availability.

## 8. Self-hosted infrastructure separation (future only)

- Dedicated unprivileged Vault server identity, strict host/network privileges, PostgreSQL role isolation, encrypted disks/volumes as defense in depth, TLS at gateway and internal hops, versioned migrations and bounded resource use.
- Never expose PostgreSQL, server key material, IdP development console, Caddy admin, Gateway's private control endpoint or backup job API to the public internet.
- Treat Identity's current Keycloak development configuration, Gateway's read-only management sidecar and Backup's loopback control plane as **ineligible** for assumed production integrations.
- Backup jobs should capture consistent ciphertext/database state and authenticated revision manifests; regularly restore into a disposable isolated environment. Back up wrapping-key metadata and migration state; the backup service should not possess raw VDEKs.
- Monitoring emits counts, operation results, revisions and latency only. Scrub payloads, query strings, authorization headers, passphrases, email aliases and vault item titles from access logs and traces.
- Explicit user authorization, incident plan, verified backups and rollback are required before any production-facing change.

## 9. Threats and mitigations to test

| Threat | Intended mitigation | Residual concern |
| --- | --- | --- |
| Compromised database / storage backup | Client-side AEAD ciphertext, independently protected keys | Offline passphrase guessing, metadata and volume exposure |
| Malicious administrator | Zero-knowledge design; no plaintext key custody | Access denial, rollback, traffic analysis, malicious client distribution |
| Rogue device registration | Device proof, trusted-device approval and user challenge | User tricked into approving fraudulent device |
| Stale writer / offline conflict | Transactional CAS, idempotency, encrypted revisions | User needs an explicit conflict resolution path |
| Rollback / forked histories | Signed monotonic checkpoints, local high-water mark, cross-device comparison | New clients without prior trusted checkpoint |
| Server XSS or malicious frontend delivery | Strict CSP, integrity/version pinning, app-signing and independent audits | Web-delivered JS can still steal unlocked secrets |
| Lost device / stolen token | Session revocation, device key lifecycle, scope expiry and rekey | Already copied data remains accessible |
| Compromised recovery process | Independently protected recovery material, explicit intent, audit | Human factors, loss of all recovery factors |
| Backup corruption / partial restore | Authenticated manifests and isolated restore drills | Unavailable or outdated off-site backups |
| Unauthorized tenant access | Deny-by-default per-request membership and tenant isolation tests | Logic flaws in new server authorization |

## 10. Acceptance gates before creating a production-capable server

- [ ] Founder review/approval of crypto primitives, recovery scheme, scope, compatibility and licensing.
- [ ] Formal threat model identifying assets, principals, device trust, all messages and failure modes.
- [ ] Documented versioned protobuf/JSON or other canonical serialization with strict max sizes and field validation.
- [ ] Audited client crypto libraries and per-platform test vectors; no custom primitives.
- [ ] Signed device enrollment, scoped authorization and revocation tests.
- [ ] Multi-tenant permission tests, including horizontal and vertical access-control failures.
- [ ] Transactional revision, replay/idempotency and offline-conflict integration tests.
- [ ] Cross-device rollback/fork detection with explicit limitations.
- [ ] Documented passphrase and key-epoch migration with rollback, not destructive in-place conversion.
- [ ] Authenticated, isolated backup restoration and continuity test evidence.
- [ ] Android and Linux native integration/security acceptance (not inferred from web prototype).
- [ ] Independent cryptographic, application and dependency security review.
- [ ] GC UI accessibility and actionable conflict/recovery interfaces validated.
- [ ] Production deployment change approval, recoverable backup and observable rollback.

**Decision:** No new network synchronization service should be enabled or represented as secure until these gates are satisfied. This document only establishes a reviewable candidate direction.
