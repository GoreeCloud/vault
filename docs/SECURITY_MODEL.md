# GoreeCloud Vault — Security Architecture and Release Gates

**Document type:** Technical security model and release checklist
**Owner:** GoreeCloud founder
**Status:** Pre-alpha implementation with unresolved security review
**Updated:** 2026-11-03
**Canonical source:** GoreeCloud/vault/docs/SECURITY_MODEL.md

## Intent and security boundary

I require GoreeCloud Vault to protect user-held secrets without making a server, administrator, reverse proxy or other GoreeCloud service capable of decrypting the user's vault by default.

The current prototype runs entirely in an authorized browser, with **no server**. The user supplies a passphrase; PBKDF2-HMAC-SHA256 (600,000 iterations, random 16-byte salt) derives a nonextractable AES-GCM-256 key. The encrypted document uses a newly generated 12-byte IV on each save and binds the document format as additional authenticated data. Only the ciphertext envelope and key-derivation parameters are written to localStorage. Plaintext data and decrypted keys exist in JavaScript memory while unlocked.

This architecture demonstrates **encrypted local data at rest** but has **not** been audited or reviewed as a complete zero-knowledge cloud architecture. It makes no claims of secure sharing or server-side key isolation because no such features exist yet.

## Threat assumptions

- An attacker who steals only the encrypted localStorage value should face offline passphrase guessing costs. The user's passphrase strength is critical.
- An attacker with JavaScript execution in the application's origin, an unlocked browser session, malicious extensions, keylogging or device compromise **can read secrets**. No browser application can prevent all such attacks.
- Browser developer tools, swap, memory dumps, clipboard managers, backup tools and local OS facilities may preserve sensitive values despite UI locking.
- In browsers supporting Web Locks, cooperating tabs serialize encrypted writes and reject stale ciphertext revisions; noncooperating or malicious scripts can bypass these checks. A future server must enforce durable revisions independently.
- An exported encrypted backup can be retained indefinitely; key rotation **does not revoke** previously exported backups encrypted under old passphrases.
- Local storage can be cleared by the user/browser, quota exhaustion or private browsing termination. **There is no account recovery**.
- The confidentiality of fields in ciphertext does not hide the presence, size and timing of saved records in local storage or exported backups.

## Present controls

- Static Content Security Policy with no remote scripts, connections or external image resources.
- Browser Web Crypto; OS random source; no Math.random for credential generation.
- Optional TOTP secret input is checked with the browser HMAC implementation before encrypted item storage; invalid Base32 enrollment secrets are rejected rather than failing only at code-display time.
- Basic login hygiene analysis runs only against unlocked in-memory vault entries, does not submit credentials to a remote service, and never includes plaintext passwords in its report.
- URL scheme validation (HTTP/HTTPS only) and DOM text nodes instead of injecting stored item fields as HTML.
- PBKDF2 parameter and encrypted envelope validation; rejection of failed AES-GCM authentication.
- Passphrase length floor on creation and rekey.
- Finite document/item length limits before encryption and after decryption. Imported ciphertext lengths are bounded before base64 decoding.
- Imported encrypted backups are decrypted and authenticated against the supplied backup passphrase and validated for supported document structure **before** asking to replace local data. User confirmation and same-origin guarded write are required.
- New vault creation requires passphrase confirmation.
- Fresh IV on every save; fresh salt on passphrase change. Current passphrase is verified by decrypting the latest stored envelope before a rekey can commit; the operation is guarded against stale cross-tab writes.
- Inactivity lock, session-epoch invalidation of delayed operations and cross-tab change lock.
- Closed secret-editor fields are explicitly cleared, and concurrent/duplicate editor saves are blocked until encryption and guarded storage commit finish. This reduces residual DOM exposure but not in-memory plaintext exposure while the vault is unlocked.
- Web Locks exclusive critical section with expected ciphertext comparison before writes; unsupported browsers disable writes.
- Draft-based encrypted mutations only update the visible document after storage succeeds.
- Keyboard focus restoration for item-selection/detail updates does not persist sensitive item content or introduce network requests.
- No actual production keys, provider credentials, analytics IDs or remote vault URLs in the repository.

## Proposed encrypted sync architecture

A candidate [encrypted multi-device synchronization and recovery design](ENCRYPTED_SYNC_ARCHITECTURE.md) now records intended separation of client encryption from SSO, strict device authorization, revision/concurrency controls, encrypted backups, rollback limits, integration boundaries and acceptance gates. This is **not** an implemented server, security review or production-ready protocol. The current browser-local format is unchanged.

## Known gaps and security-critical work

1. Independent application, cryptographic and threat-model review; fix identified vulnerabilities.
2. Adopt vetted Argon2id and determine cross-client KDF interoperability.
3. Design a shared encrypted sync protocol with authenticated clients, stable monotonic revision handling and rollback/replay protection.
4. Implement passkey credential lifecycle, secure enclave and native credential-provider integration with review.
5. Design device enrollment, account recovery, trusted emergency access and revocation without leaking secret material to server administrators.
6. Implement durable encrypted backups and **tested restoration** before real use; add migration and format-version recovery.
7. Add CSRF/authentication protections and authorization isolation when an HTTP API exists.
8. Audit browser CSP, local data confidentiality, dependency provenance, clipboard/autofill attack surface and XSS risks.
9. Verify WCAG-relevant accessibility, responsive screenshots, light/dark/high contrast states, keyboard-only flows and correct GC UI visual acceptance.
10. Add native mobile/desktop clients and browser extensions independently; a responsive website alone is not a native application.
11. Establish an authorized software license, vulnerability disclosure process and security maintenance policy.
12. Release only after security, interoperability, data recovery and deployment acceptance tests demonstrate readiness.

## Deployment boundary

Do **not** expose this prototype on a public domain, import real user credentials or replace existing production Vaultwarden/Bitwarden instances. Future server and reverse proxy integration requires production change approval, monitored rollout, backup and verified rollback. The current files are static HTML/CSS/JavaScript and a Node test harness; no server-side data service is supplied.

## Testing evidence

- Unit tests in `tests/crypto.test.mjs` cover encrypt/decrypt, fresh IVs, wrong passphrases, ciphertext tampering, document validation, password character-class requirements, URL validation and published RFC TOTP vectors.
- Unit tests in `tests/storage.test.mjs` exercise cooperating-tab conflicts, stale writes, session revocation, storage failures and browsers missing Web Locks.
- Unit tests in `tests/recovery.test.mjs` check authenticated backup verification, incorrect passphrases, tamper rejection and oversized format rejection; full interactive recovery remains unverified.
- Unit tests in `tests/rekey.test.mjs` cover current passphrase verification, fresh key/salt rotation, intact document recovery, rejection of old credentials and failed-attempt nonmutation.
- Unit tests in `tests/health.test.mjs` verify scoped local hygiene counts and that passwords are absent from returned findings; this is not a comprehensive security analysis.
- GitHub Actions runs syntax checks and unit tests when the workflow is enabled on a branch or pull request.
- `tests/browser-smoke.mjs` (optional, requires an installed Chromium binary) performs an isolated loopback browser smoke test of first-run confirmation, encrypted item creation, local ciphertext, manual lock/unlock, incorrect backup passphrase rejection, authenticated restore, real two-tab stale-write races, appearance switching, light-theme action contrast, and mobile viewport/nav geometry. It also captures nonsecret screenshots for manual inspection; these are temporary evidence, not a full visual accessibility certification.
- Passing these checks **cannot** prove production security, full browser UX/accessibility correctness or independent cryptographic review.
