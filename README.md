# GoreeCloud Vault

**Status: 0.1.0 pre-alpha — local-first prototype only. Not a production password manager.**

My vision for GoreeCloud Vault is a private, self-hostable, end-to-end encrypted home for passwords, passkeys, authentication codes, personal records, developer secrets and controlled collaboration. It should use the [GoreeCloud UI](https://github.com/GoreeCloud/gc-ui) design authority and integrate with the wider GoreeCloud ecosystem without handing other services plaintext vault contents.

## What's implemented

This initial implementation is a **single-device, browser-only prototype**, not a Bitwarden-compatible server or replacement for an installed Vaultwarden instance.

- AES-256-GCM encrypted local vault document with a random 96-bit nonce for each save.
- PBKDF2-HMAC-SHA256 passphrase-based key derivation (600,000 iterations, 128-bit random salt).
- Browser-native Web Crypto key handling, with nonextractable AES keys.
- Create, unlock, lock, and rotate passphrases with **current-passphrase verification** and a fresh random salt; automatically lock after five minutes of inactivity.
- Save, edit, search, filter, favorite and delete encrypted login, note and generic secret items. Closing the editor scrubs hidden form fields and duplicate submissions are blocked while encrypted saves are pending.
- Configurable cryptographically random password generator (12–128 characters; choose lowercase, uppercase, numbers and symbols). The generated value stays masked until explicitly revealed, and each enabled character class is represented.
- TOTP code generation (Base32/HMAC-SHA1 by default; additional supported digest options), with validation of authenticator secrets before saving them in the encrypted vault.
- A local Security Check dialog that flags reused, short and a small set of common passwords, plus HTTP login URLs; no external requests or plaintext password report output.
- Encrypted JSON backup export and **passphrase-authenticated restore**: decrypt and validate an imported backup before any replacement, then require explicit confirmation. An encrypted export of the last successful save remains available after a later storage/quota failure, provided its revision has not changed.
- Web Locks-controlled writes compare the exact previously loaded ciphertext, reject stale-tab overwrites, and automatically lock other tabs when ciphertext changes. Unsupported Web Locks browsers cannot write.
- Responsive desktop/mobile web interface with a reachable mobile bottom navigation dock, following verified [GC UI design guidance](https://github.com/GoreeCloud/gc-ui/blob/main/docs/DESIGN_LANGUAGE.md).
- Node built-in unit tests, no installed runtime third-party dependencies, GitHub Actions checks.

**Not implemented:** server, cloud synchronization, secure sharing, browser autofill extensions, native Android/iOS/Linux apps, passkey provider, hardware-backed biometrics, Argon2id, attachments, encrypted per-item search index, enterprise RBAC/SSO/SCIM, automated security monitoring, email aliases and emergency recovery. These are captured in the [full product specification](docs/PRODUCT_SPEC.md) and tracked in [the feature roadmap](docs/FEATURES.md), **not as released capabilities**.

## Try it locally

Requirements: a current browser with Web Crypto; Node.js 22 for tests; Python 3 for the local development server. Open on **localhost** or use **HTTPS**. No login, tracking, analytics, remote APIs or third-party JavaScript are built in.

```bash
git clone https://github.com/GoreeCloud/vault.git
cd vault
npm test
npm run check
npm run serve
```

The optional zero-dependency **headless Chromium acceptance check** creates an isolated temporary browser profile, serves only on loopback, exercises the real Export backup download, validates downloaded ciphertext against the local vault, then restores that exported backup (including tampered-ciphertext rejection and successful recovery), and writes screenshots to its private temporary directory. It requires an already installed compatible Chromium binary:

```bash
CHROME_BIN=/path/to/chromium npm run test:browser
```

Open **http://localhost:4173** in the same computer's browser.

1. Create a passphrase of at least 12 characters and confirm it before saving the new vault. **There is no password reset or recovery service.**
2. Create a few *noncritical test credentials*. The encrypted envelope is stored in that browser profile's localStorage; no plaintext vault records are persisted intentionally.
3. Passphrase changes require your current passphrase, and re-encrypt the latest saved document without modifying previously exported backups. Export a fresh backup after each change.
4. Export an encrypted backup and keep it separately. Importing a backup first verifies the original passphrase and ciphertext, then **replaces** the current local vault only after confirmation. A verified backup is not an automatic merge.
5. Lock the vault and unlock again. Your keys are only retained in active JavaScript memory while unlocked.

**Do not migrate your real password vault, use as your only copy of secrets, or publish this instance on the internet.** A green automated test suite does not establish readiness for real credentials.

## Local Security Check limitations

The **Security Check** is an on-device hygiene aid. It examines only unlocked **login** items in memory and returns record titles with basic reuse/short/common-password/HTTP URL concerns. It does not check public breach databases, estimate comprehensive password entropy, prove MFA is absent, scan other user accounts or provide a security guarantee. Audit results are not saved or sent to a service.

## Appearance and accessible navigation

The web prototype now uses the GC UI Iris palette in **dark and light appearance**, follows the operating system by default and offers a three-way System → Light → Dark switch on both locked and unlocked screens. The preference is a nonsecret local display setting; it is **not** stored as vault plaintext or transmitted remotely.

The item collection uses semantic list elements and labeled, selectable buttons; secret reveal controls expose an explicit pressed state to assistive technology. Rebuilt item and detail controls preserve keyboard focus across selection and favorite-state updates; after deleting a focused item, focus falls back to the New item action. Mobile navigation remains within a reachable bottom dock. The optional Chromium smoke runner checks both appearances, core contrast, mobile overflow and selected high-contrast/reduced-motion rules, but it does **not** replace a full human-assisted screen-reader or accessibility review.

## Local data integrity hardening

- All item mutations update a fresh in-memory draft and display it only **after** the encrypted write succeeds. Storage/quota failures leave the prior saved document intact.
- Supported browsers use the Web Locks API with a same-origin exclusive lock and exact ciphertext comparison to prevent cooperating tabs overwriting newer revisions.
- Unlock, initial vault creation, encrypted backup verification/import and passphrase rotation check for stale sessions or concurrent changes. First-run passphrases must be confirmed; imports authenticate the encrypted document before overwrite.
- A session epoch invalidates delayed writes after locking. Storage changes from other tabs trigger locking; unlock again to reload. The optional Chromium smoke test also simulates idle timeout while an editor contains synthetic, unsaved secrets and verifies cleared DOM fields.
- This is a prototype-level mitigation, **not** a substitute for server transactions, secure sync, hardened device storage or a third-party review. Malicious scripts, outdated clients or compromised browsers may bypass cooperating locks.

## Architecture

```text
index.html / styles.css / src/app.mjs  browser workspace
     │
     ├─ src/security.mjs             password and TOTP generation
     └─ src/crypto.mjs               browser-only crypto and envelope validation
              │
        localStorage (ciphertext envelope only)
```

The local prototype deliberately has **no backend**. The reviewable [encrypted synchronization architecture proposal](docs/ENCRYPTED_SYNC_ARCHITECTURE.md) describes candidate trust boundaries, device authorization, conflict control, key recovery and release gates. It is **design-only** and does not create server endpoints. For the planned multi-user self-hosted architecture, ciphertext storage, device enrollment, authentication, key wrapping, revocation, share grants, recovery and security auditability must be designed and reviewed together before implementation. See [security model](docs/SECURITY_MODEL.md).

## Quality and development

Run `npm test` and `npm run check` after changes. The current code has not undergone third-party penetration testing, an independent cryptographic review, a full browser-based accessibility audit or final screenshot-led design acceptance; manual browser smoke screenshots have been reviewed for desktop/mobile workflow layout, but not all screen sizes/states; release gates remain open. Avoid storing real secrets in development test fixtures or in source control.

The repository does not yet declare a redistribution license; public visibility **does not** itself grant an open-source license. The project's license needs a founder decision before external reuse or derivative distribution.

## GoreeCloud ecosystem

Future integrations are scoped to [GoreeCloud Identity](https://github.com/GoreeCloud/identity), [GoreeCloud Gateway](https://github.com/GoreeCloud/gateway), [GoreeCloud VPN](https://github.com/GoreeCloud/VPN), [GoreeCloud DNS](https://github.com/GoreeCloud/dns), and [GC UI](https://github.com/GoreeCloud/gc-ui). These links express intended integration boundaries, not verified deployments or product interoperability.

## Security

Read [SECURITY.md](SECURITY.md) and [the security model](docs/SECURITY_MODEL.md) before contributing. Security reports should not expose live passwords, recovery keys or personal records. The current browser storage mode is intended only to validate UX and crypto foundations, not to satisfy a production threat model.
