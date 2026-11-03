# GoreeCloud Vault

**Status: 0.1.0 pre-alpha — local-first prototype only. Not a production password manager.**

My vision for GoreeCloud Vault is a private, self-hostable, end-to-end encrypted home for passwords, passkeys, authentication codes, personal records, developer secrets and controlled collaboration. It should use the [GoreeCloud UI](https://github.com/GoreeCloud/gc-ui) design authority and integrate with the wider GoreeCloud ecosystem without handing other services plaintext vault contents.

## What's implemented

This initial implementation is a **single-device, browser-only prototype**, not a Bitwarden-compatible server or replacement for an installed Vaultwarden instance.

- AES-256-GCM encrypted local vault document with a random 96-bit nonce for each save.
- PBKDF2-HMAC-SHA256 passphrase-based key derivation (600,000 iterations, 128-bit random salt).
- Browser-native Web Crypto key handling, with nonextractable AES keys.
- Create, unlock, lock, change passphrase and automatically lock after five minutes of inactivity.
- Save, edit, search, filter, favorite and delete encrypted login, note and generic secret items.
- Cryptographically random password generator with enabled-character-class coverage.
- TOTP code generation (Base32/HMAC-SHA1 by default; additional supported digest options).
- Encrypted JSON backup export and explicit destructive import.
- Cross-tab changes trigger locking rather than silently merging competing writes.
- Responsive desktop/mobile web interface, following verified [GC UI design guidance](https://github.com/GoreeCloud/gc-ui/blob/main/docs/DESIGN_LANGUAGE.md).
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

Open **http://localhost:4173** in the same computer's browser.

1. Create a passphrase of at least 12 characters. **There is no password reset or recovery service.**
2. Create a few *noncritical test credentials*. The encrypted envelope is stored in that browser profile's localStorage; no plaintext vault records are persisted intentionally.
3. Export an encrypted backup and keep it separately. Importing a backup **replaces** the current local vault, and needs that backup's original passphrase.
4. Lock the vault and unlock again. Your keys are only retained in active JavaScript memory while unlocked.

**Do not migrate your real password vault, use as your only copy of secrets, or publish this instance on the internet.** A green automated test suite does not establish readiness for real credentials.

## Architecture

```text
index.html / styles.css / src/app.mjs  browser workspace
     │
     ├─ src/security.mjs             password and TOTP generation
     └─ src/crypto.mjs               browser-only crypto and envelope validation
              │
        localStorage (ciphertext envelope only)
```

The local prototype deliberately has **no backend**. For the planned multi-user self-hosted architecture, ciphertext storage, device enrollment, authentication, key wrapping, revocation, share grants, recovery and security auditability must be designed and reviewed together before implementation. See [security model](docs/SECURITY_MODEL.md).

## Quality and development

Run `npm test` and `npm run check` after changes. The current code has not undergone third-party penetration testing, a cryptographic review, a browser-based automated accessibility audit or screenshot-led design acceptance; release gates remain open. Avoid storing real secrets in development test fixtures or in source control.

The repository does not yet declare a redistribution license; public visibility **does not** itself grant an open-source license. The project's license needs a founder decision before external reuse or derivative distribution.

## GoreeCloud ecosystem

Future integrations are scoped to [GoreeCloud Identity](https://github.com/GoreeCloud/identity), [GoreeCloud Gateway](https://github.com/GoreeCloud/gateway), [GoreeCloud VPN](https://github.com/GoreeCloud/VPN), [GoreeCloud DNS](https://github.com/GoreeCloud/dns), and [GC UI](https://github.com/GoreeCloud/gc-ui). These links express intended integration boundaries, not verified deployments or product interoperability.

## Security

Read [SECURITY.md](SECURITY.md) and [the security model](docs/SECURITY_MODEL.md) before contributing. Security reports should not expose live passwords, recovery keys or personal records. The current browser storage mode is intended only to validate UX and crypto foundations, not to satisfy a production threat model.
