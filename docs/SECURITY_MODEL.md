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
- Multi-tab writes can conflict. A storage-change event locks other open tabs, but does not provide an atomic cross-tab transaction guarantee.
- An exported encrypted backup can be retained indefinitely; key rotation **does not revoke** previously exported backups encrypted under old passphrases.
- Local storage can be cleared by the user/browser, quota exhaustion or private browsing termination. **There is no account recovery**.
- The confidentiality of fields in ciphertext does not hide the presence, size and timing of saved records in local storage or exported backups.

## Present controls

- Static Content Security Policy with no remote scripts, connections or external image resources.
- Browser Web Crypto; OS random source; no Math.random for credential generation.
- URL scheme validation (HTTP/HTTPS only) and DOM text nodes instead of injecting stored item fields as HTML.
- PBKDF2 parameter and encrypted envelope validation; rejection of failed AES-GCM authentication.
- Passphrase length floor on creation and rekey.
- Finite document/item length limits before encryption and after decryption.
- Explicit confirmation before replacing the local encrypted vault with an import.
- Fresh IV on every save; fresh salt on passphrase change.
- Inactivity lock and cross-tab change lock.
- No actual production keys, provider credentials, analytics IDs or remote vault URLs in the repository.

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
- GitHub Actions runs syntax checks and unit tests when the workflow is enabled on a branch or pull request.
- Passing these checks **cannot** prove production security, browser UX correctness or independent cryptographic review.
