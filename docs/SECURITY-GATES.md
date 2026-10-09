# Security, privacy, and release gates

**Release block:** Current foundation is Development and may not store, sync, autofill, import, or distribute real user secrets as GoreeCloud Vault.

## Gates before any protected credential persistence

1. Human review and acceptance of exact-revision threat model, key hierarchy, recovery design, encryption format, KDF choices, nonce/key reuse prevention, and secure-memory exposure model.
2. Approved, externally reviewed cryptographic libraries and standardized protocols. Never create proprietary primitives, insecure fallback encryption, fake zero-knowledge claims, or server-side plaintext unlock.
3. Tenant isolation and authorization tests: cross-user and cross-organization access attempts, enumeration, horizontal/vertical privilege escalation, revocation, public registration disabled by default.
4. Password/passkey protection: vetted Argon2id or equivalent reviewed KDF; safe limits; hardware-backed and biometric unlock where supported; WebAuthn relying-party and origin verification.
5. Verified rate limiting, brute-force protections, authentication sessions and recovery; account/device approval; administrative action evidence.
6. Secret hygiene: no plaintext credentials, recovery material, decrypted fields or raw authentication tokens in logs, telemetry, crash reporting, browser storage, analytics, build artifacts, backups or AI prompts.
7. Encrypted local/offline cache, lock timeouts, clipboard lifecycle, zero-knowledge sync conflict strategy, robust authenticated backups and destructive-operation safeguards.
8. Security hardening across network, OS, containers, dependencies, CI, permissions and secrets; vulnerability reachability and SBOM/provenance; fail-closed posture on missing evidence.
9. Abuse/phishing tests including exact-origin autofill defaults, iframes/embedded domains, homograph/punycode, private browsing, Unicode/IDN, redirected login forms and passkey boundary failures.
10. Third-party license review, independent testing, rollback drills, target-device acceptance and explicit release sign-off.

## Default development constraints

No public listener, deployment secrets, account creation, API migration, browser host permissions, credential persistence, AI secret access, or release signing is provided in this phase. Upstream code is **unreviewed** under GoreeCloud's trust model and must not be run against personal vaults.

The synthetic item-schema and access-boundary checks use caller-supplied metadata and fixtures; neither validates actual cryptographic encryption, session authority, tenant ownership, grant verification or secret handling. Client item type and field names must not be exposed to the sync server.

The synthetic lock-lifecycle module accepts only forged Development fixture facts and cannot authenticate a session, verify a biometric/device assertion, access keys, persist a timer, or unlock a real vault. The synthetic backup-manifest module operates on metadata only: encryption, integrity and rollback fields are untrusted claims and no backup bytes or Everkeep operation exist. The synthetic observability module merely rejects non-minimized signal shapes; it does not collect or authorize telemetry, and any future collection requires separate Privacy Shield and Observability acceptance.

The synthetic passkey RP preflight applies an intentionally stricter exact-host/top-level HTTPS Development rule and accepts no WebAuthn ceremony material; caller origin, unlock and risk facts remain forgeable. It is not permission to invoke a credential provider. The synthetic migration preflight permits only a metadata-only no-write dry-run proposal; recovery, integrity, consent and destination state are untrusted caller claims. The synthetic clipboard lifecycle never accepts content or authorizes copying; its clear/schedule result does not prove the operating system clipboard or history was cleared.

The first-party origin-matching sample in `src/` rejects unsafe URLs and cross-origin matches, but is **not** an end-to-end phishing or autofill security boundary and must not be integrated before review. The `opaque-sync-preflight` module is a **non-operational synthetic shape check only**: candidate schema v0 does not establish ciphertext authentication, server authorization, key custody, or any right to store or synchronize secrets.

## Human acceptance

Cryptographic designs, production service exposure, key custody, recovery, and Stable release must be reviewed against the exact candidate code and current evidence. Historic issue numbers and CI runs associated with deleted GoreeCloud Vault repositories are **not reusable** as acceptance evidence.

The synthetic device/session revocation planner screens forged metadata only. It does not revoke real sessions, validate an initiator, attest devices, rotate encryption keys, or enforce an atomic revision. Any production integration needs separate exact-revision human security review and server/client runtime testing.
