# GoreeCloud Vault — Threat Model

**Status:** Development security-design candidate — pending explicit human security review  
**Applies to:** Planned protected-record, unlock, synchronization, sharing, recovery, browser/client, developer-secret, and administrative capabilities  
**Security gate:** This document does not authorize protected secret persistence, retrieval, synchronization, or production exposure. VLT-005 remains blocked until this threat model and the cryptographic architecture receive explicit human security review.

## 1. Security objective

GoreeCloud Vault is intended to be the sole authoritative GoreeCloud system for credentials, passkeys, authentication secrets, protected Vault records, secure autofill material, and application secrets.

The primary security objective is to preserve confidentiality, integrity, authorization isolation, user control, recoverability, and truthful security state even when individual clients, networks, storage providers, synchronization relays, browser pages, or non-authoritative GoreeCloud components are compromised or malicious.

Vault must fail closed when authorization, integrity, cryptographic state, origin trust, policy state, or recovery evidence is missing, malformed, stale, conflicting, unsupported, or unverifiable.

## 2. Security invariants

The following invariants are mandatory design constraints:

1. Plaintext protected records and decryption keys must not be exposed to ordinary server logs, telemetry, diagnostics, browser storage, synchronization relays, or unrelated GoreeCloud applications.
2. Authentication does not by itself authorize a protected-record operation.
3. Possession of a record identifier, vault identifier, share identifier, device identifier, or API route must never establish access rights.
4. Protected data from one account, vault, organization, profile, or device authorization context must not be substitutable into another.
5. Browser page content is untrusted and must not receive protected material unless a Vault-controlled, origin-authorized operation explicitly permits it.
6. Synchronization transports and storage providers must be able to carry ciphertext without becoming plaintext authorities.
7. Recovery mechanisms must not silently create a weaker equivalent master credential.
8. Administrative roles must not gain plaintext access merely because they can manage users, policy, billing, devices, or organizations.
9. Import/export paths must never normalize temporary plaintext exposure into ordinary persistent state.
10. A successful process start, CI run, health check, or UI security indicator must never be treated as evidence that cryptographic or authorization guarantees are correct.

## 3. Assets

### Highest sensitivity

- Vault root key material and any keys capable of unwrapping it.
- Passkey private keys.
- TOTP seeds.
- Passwords and passphrases.
- SSH private keys.
- API tokens, OAuth refresh tokens, service credentials, database credentials, signing keys, and machine secrets.
- Recovery factors or emergency-access material capable of unlocking protected records.

### High sensitivity

- Decrypted record payloads and record attachments.
- Derived encryption keys and data-encryption keys while resident in process memory.
- Authentication/session tokens that can authorize Vault operations.
- Device-binding private material.
- Organization approval material and privileged recovery decisions.

### Sensitive metadata

- Vault membership.
- Record type and access patterns.
- Service/origin associations.
- Sharing relationships.
- Device inventory and lock state.
- Record revision history.
- Search indexes.
- Security/audit events.

Metadata must be minimized because correlation can reveal meaningful private information even when record payloads remain encrypted.

## 4. Trust boundaries

Vault security design must explicitly enforce at least these boundaries:

- locked process state versus unlocked process state;
- local trusted Vault process versus browser/page content;
- Vault client versus Vault service;
- authenticated principal versus authorized operation;
- one account versus another;
- one vault versus another;
- private vault versus organization-managed shared vault;
- device-local cache versus authoritative encrypted state;
- synchronization relay versus decrypting client;
- user-facing credentials versus machine/application secrets;
- ordinary user versus organization administrator;
- ordinary operations versus emergency/break-glass operations;
- current keys versus retired/rotated keys;
- active record revision versus historical revision;
- local-only mode versus synchronized mode;
- private/isolated browser contexts versus ordinary browsing contexts;
- Vault-controlled code versus third-party import/export parsers and external providers.

## 5. Adversary model

The design must consider attackers with one or more of the following capabilities.

### Remote unauthenticated attacker

Can send malformed, oversized, replayed, high-rate, or protocol-confusing requests to any reachable Vault endpoint.

Required protections include exposure minimization, authentication before protected operations, bounded parsing, rate limiting where applicable, strict protocol/version validation, and safe errors.

### Authenticated malicious user

Has valid credentials for one account or organization but attempts horizontal or vertical privilege escalation, cross-vault access, unauthorized sharing, export, recovery, administrative action, or resource exhaustion.

Required protections include server-side authorization on every protected operation, object-ownership validation, policy checks, explicit organization/vault scoping, and denial by default.

### Compromised browser page

Controls DOM, scripts, iframes, redirects, form markup, navigation timing, phishing lookalikes, and page-provided metadata.

Required protections include origin-aware matching, trusted UI for sensitive confirmation, anti-clickjacking where relevant, no blind page-supplied record selection, no credential release to mismatched origins, and private-context rules.

### Compromised or malicious browser/client integration

A browser extension, native integration layer, desktop/mobile client, or CLI may be outdated, tampered with, overprivileged, or malicious.

Required protections include versioned least-privilege capability interfaces, authenticated client identity where applicable, revocation, explicit scopes, no direct database access, bounded offline authority, and fail-closed capability negotiation.

### Compromised synchronization relay or storage provider

Can read, modify, delete, reorder, duplicate, truncate, roll back, or replay stored ciphertext and metadata but should not possess plaintext keys.

Required protections include authenticated encryption, record/version binding, anti-rollback strategy where applicable, corruption detection, conflict rules, and recovery evidence.

### Local unprivileged attacker

Can inspect user-accessible files, attempt to copy local caches, observe process behavior, or access ordinary application storage.

Required protections include restrictive file permissions, encrypted local persistence, OS-provided protections where available, no plaintext-at-rest caches, and lock-state enforcement.

### Local privileged attacker

Has administrator/root-equivalent privileges or can inspect process memory.

This attacker may defeat many software-only protections. Vault must minimize plaintext/key lifetime, support device revocation and compromise recovery, and avoid claims that ordinary application-layer encryption protects against a fully privileged live-memory attacker.

### Stolen or lost device

Possesses local encrypted state and may attempt offline guessing, rollback, or extraction.

Required protections include memory-hard passphrase key derivation, device-specific wrapping where used, automatic lock, revocation, no plaintext local cache, and recovery/rotation workflows.

### Malicious administrator

Can administer organization membership, policy, infrastructure, servers, backups, or synchronization services but should not automatically receive private user plaintext.

Required protections include cryptographic separation of administration from decryption authority, explicit exceptional-access design if ever supported, independent audit evidence, and clear user-visible policy boundaries.

### Supply-chain attacker

Can compromise a dependency, build action, package, release process, update channel, or signing pipeline.

Required protections include minimal dependencies, pinned/reviewed versions, vulnerability scanning, provenance/signing where applicable, exact-revision CI, update integrity, and reproducible or independently verifiable release evidence where practical.

### Recovery-channel attacker

Attempts to abuse reset, emergency access, recovery codes, device replacement, support workflows, or organization processes to bypass normal unlock protection.

Required protections include explicit recovery authority, delay/approval where appropriate, revocation, audit evidence, no silent downgrade, and cryptographic re-keying after recovery.

## 6. Primary threat cases

### TM-001 — Offline vault theft and passphrase guessing

**Threat:** An attacker obtains encrypted Vault files or backups and performs offline password guessing.

**Required controls:**
- Argon2id-based unlock-key derivation with versioned parameters and per-envelope random salt.
- Independent random Vault root key so changing the user passphrase can rewrap key material without re-encrypting every record.
- No server-side password-equivalent value that directly decrypts Vault contents.
- Parameter-upgrade path.
- Recovery factors designed so they do not reduce effective resistance below the documented security model.

### TM-002 — Cross-account or cross-vault substitution

**Threat:** Ciphertext, wrapped keys, record IDs, or authorization references from one security domain are replayed under another.

**Required controls:**
- Cryptographic associated data binding account/vault/record/revision/format context.
- Server-side ownership and authorization checks.
- Non-guessable identifiers treated only as identifiers, never capabilities.
- Tests for horizontal and vertical isolation.

### TM-003 — Ciphertext tampering, truncation, or swapping

**Threat:** Stored or synchronized encrypted data is modified, truncated, reordered, or substituted.

**Required controls:**
- Authenticated encryption.
- Strict envelope parsing and version validation.
- Associated data binding.
- Corruption treated as an explicit failure, never plaintext fallback.
- Recovery from known-good versions without silently accepting corrupted state.

### TM-004 — Rollback and replay

**Threat:** An attacker restores older ciphertext, key envelopes, device authorization, share state, or security policy to revive revoked access or revert security state.

**Required controls:**
- Monotonic revision or state-generation semantics where authoritative online state exists.
- Signed or authenticated state manifests where appropriate.
- Revocation state that cannot be silently overridden by stale local data.
- Explicit offline conflict and reconnect rules.
- Recovery tooling that distinguishes intentional restore from hostile rollback.

### TM-005 — Malicious origin autofill

**Threat:** A phishing or compromised site attempts to obtain credentials associated with another origin.

**Required controls:**
- Exact-origin and explicitly configured matching modes.
- PSL/domain handling designed to avoid naive suffix checks.
- Visible trusted confirmation for risky overrides.
- No page-script authority to choose arbitrary Vault entries.
- Frame and redirect context validation.
- Tests for Unicode/IDN, lookalike, scheme, port, subdomain, redirect, iframe, and mixed-context cases.

### TM-006 — Browser extension overreach

**Threat:** Excessive extension permissions or broad content-script access expose protected information.

**Required controls:**
- Minimal host and API permissions.
- Vault-owned secure UI for reveal/copy/reauthentication.
- No persistent plaintext credential cache in ordinary extension storage.
- Private-window policy and explicit private-context isolation.
- Capability-scoped native messaging or client API if used.

### TM-007 — Compromised client or stolen session

**Threat:** A valid session or client is taken over and used to read or export large portions of the Vault.

**Required controls:**
- Short-lived/revocable authorization where practical.
- Reauthentication for sensitive reveal/export/share/recovery operations.
- Bulk-operation policy and rate controls.
- Device/session management.
- Lock-on-risk or policy-driven lock where supported.
- Audit events that omit secret values.

### TM-008 — Secret leakage through logs and telemetry

**Threat:** Protected values appear in logs, traces, crash reports, metrics, analytics, error messages, support bundles, or CI artifacts.

**Required controls:**
- Redaction by construction.
- Prohibition on request/response body logging for protected operations.
- Structured allowlisted telemetry.
- Synthetic test data.
- Secret scanning.
- Crash/error review and explicit diagnostic schemas.

### TM-009 — Memory disclosure

**Threat:** Plaintext secrets or keys remain in process memory longer than necessary or are duplicated.

**Required controls:**
- Minimize plaintext lifetime and copies.
- Prefer byte-oriented APIs for protected material.
- Avoid immutable string conversion for secret bytes where practical.
- Zero mutable buffers after use where meaningful, while documenting that Go cannot guarantee complete process-memory erasure because of garbage collection, compiler behavior, copies, and runtime internals.
- Lock state must drop references to decrypted Vault state and key material promptly.
- Never claim protection against a fully privileged live-memory attacker.

### TM-010 — Unsafe import/export

**Threat:** Plaintext exports, malformed imports, archive traversal, parser bugs, or temporary files leak secrets.

**Required controls:**
- Explicit user authorization and reauthentication.
- Bounded parsers and size limits.
- Safe temporary-file handling with restrictive permissions.
- No automatic cloud upload.
- Clear warnings for plaintext formats.
- Secure cleanup best effort with documented filesystem limitations.
- Encryption for protected export formats.
- Import treated as untrusted input.

### TM-011 — Recovery bypass

**Threat:** Account recovery, emergency access, organization recovery, or device replacement bypasses normal cryptographic control.

**Required controls:**
- Recovery authority and cryptographic path documented separately.
- No provider or support operator plaintext access unless a separately governed exceptional-access feature explicitly says so.
- Time delay, multi-party approval, or equivalent controls where risk requires.
- Post-recovery key rotation/revocation.
- User-visible security event history.

### TM-012 — Shared-record overexposure

**Threat:** A share is forwarded, replayed, accessed after expiry, or reveals more metadata/content than intended.

**Required controls:**
- Share-specific cryptographic material or capability with explicit scope.
- Expiry/revocation validation.
- One-time consumption semantics where promised.
- Recipient binding when supported.
- Minimal exposed metadata.
- No reuse of primary Vault unlock material as a share secret.

### TM-013 — Machine-secret privilege escalation

**Threat:** Developer or service credentials are exposed through user-facing APIs, browser surfaces, CI, environment dumps, or overbroad automation scopes.

**Required controls:**
- Separate machine-secret capability classes.
- Non-interactive scoped access tokens or workload identity rather than exposing full user Vault authority.
- Explicit injection boundaries.
- No browser autofill path for machine-only secrets unless specifically authorized.
- Rotation, revocation, and audit semantics.

### TM-014 — Backup compromise

**Threat:** Backups expose plaintext or omit the key/recovery material needed for safe restore.

**Required controls:**
- Back up ciphertext and versioned envelopes, not plaintext.
- Keep recovery authority distinct from ordinary backup storage when practical.
- Restore verification.
- Tamper/corruption detection.
- Document which secrets are required to restore and how they are protected.

### TM-015 — Denial of service through KDF or parsing

**Threat:** Attackers trigger expensive Argon2 work, large decrypt attempts, archive bombs, or unbounded parsing.

**Required controls:**
- Do not run expensive unlock KDF solely on unauthenticated remote attacker input.
- Bound KDF concurrency.
- Bound record, attachment, import, request, and allocation sizes.
- Reject unsupported parameters outside safe policy ranges.
- Timeouts and resource quotas.

### TM-016 — Algorithm/configuration downgrade

**Threat:** A malicious or stale client selects weaker algorithms, KDF parameters, envelope versions, or policy state.

**Required controls:**
- Allowlisted algorithm/version identifiers.
- Minimum KDF policy floors.
- No silent fallback.
- Upgrade-required states for unsupported insecure versions.
- Associated-data binding of algorithm and format identifiers.

### TM-017 — Stale device authorization

**Threat:** Revoked devices continue to decrypt or synchronize indefinitely.

**Required controls:**
- Explicit device revocation.
- Fresh authorization checks for online operations.
- Bounded offline authority and reconnect reconciliation.
- Re-keying when compromise requires invalidating previously distributed key material.

### TM-018 — Administrative data-plane bypass

**Threat:** Administrative APIs or database access bypass normal Vault authorization and expose protected plaintext.

**Required controls:**
- Protected data must remain encrypted in ordinary server persistence.
- Administrative APIs operate on metadata/control state only unless an exceptional flow is explicitly designed.
- Database administrator access alone must not be sufficient to decrypt user records.
- High-risk operations require separate authorization and evidence.

### TM-019 — Key/record deletion ambiguity

**Threat:** The UI claims deletion while ciphertext or usable keys remain in backups, history, replicas, or caches.

**Required controls:**
- Truthful deletion states.
- Define retention windows and backup behavior.
- Prefer cryptographic erasure where appropriate by destroying necessary wrapping keys.
- Do not claim physical erasure when storage media or backup semantics cannot prove it.

### TM-020 — Supply-chain compromise

**Threat:** Build dependencies or update infrastructure inject secret-stealing behavior.

**Required controls:**
- Keep the cryptographic dependency set small.
- Review and pin security-sensitive dependencies.
- CI vulnerability/dependency scanning.
- Signed/provenance-aware release path where supported.
- Separate source merge from production acceptance.

## 7. Abuse cases

Vault features themselves can be misused. Design reviews must consider:

- using secure sharing for unauthorized exfiltration;
- mass export by a compromised account;
- organization administrators coercively changing policy;
- emergency access being used as routine bypass;
- automated credential rotation locking out owners;
- developer-secret APIs becoming a general remote-command secret oracle;
- browser autofill being triggered invisibly;
- clipboard features leaving sensitive values available too long;
- audit systems becoming surveillance of private record usage.

Controls must minimize abuse without converting Vault into a system that unnecessarily observes private user behavior.

## 8. Failure behavior

Security-sensitive failures must be explicit.

Vault must not:
- return stale plaintext after lock;
- fall back to unencrypted storage;
- treat decryption failure as an empty valid record;
- silently ignore authentication-tag failure;
- silently weaken KDF parameters;
- use another account/vault key after key lookup failure;
- auto-authorize because policy/identity/security services are unavailable;
- expose stack traces or protected material in external errors.

Degraded states must distinguish unavailable, locked, corrupted, stale, denied, unsupported, recovery-required, and unknown conditions where those differences affect safe user action.

## 9. Verification obligations

Before VLT-005 protected storage may be implemented as an accepted security foundation, human security review must explicitly examine at least:

- this threat model;
- cryptographic architecture;
- cross-account/vault isolation;
- unlock and lock state;
- local persistence permissions;
- backup/recovery design;
- rollback/replay handling;
- import/export boundaries;
- browser-origin model;
- log/telemetry redaction;
- dependency and supply-chain choices;
- failure and corruption handling.

Later implementation must add automated tests for relevant cases and must not mark this document “approved” merely because CI passes.

## 10. Known limitations of this candidate

This model is architecture-level and does not yet prove:
- a secure implementation;
- correct cryptography;
- production deployment;
- resistance to a fully privileged live-memory attacker;
- browser integration safety;
- secure recovery;
- synchronization anti-rollback guarantees;
- Stable readiness.

Those claims require implementation-specific and runtime evidence.

## 11. References

- GoreeCloud Instructions — Secure Coding and AI-Assisted Development.
- GoreeCloud Standard — Platform Security Baseline and Controls.
- GoreeCloud Standard — Platform Privacy Engineering and Controls.
- RFC 9106 — Argon2 Memory-Hard Function: https://www.rfc-editor.org/rfc/rfc9106.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Go x/crypto documentation: https://pkg.go.dev/golang.org/x/crypto
