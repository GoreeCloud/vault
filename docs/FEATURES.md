# GoreeCloud Vault — Features and Capability Roadmap

**Document type:** Founder-directed product specification and implementation tracking
**Owner:** GoreeCloud founder
**Status:** Proposed complete platform; only the checked local prototype functions exist
**Updated:** 2026-11-03
**Canonical source:** GoreeCloud/vault/docs/FEATURES.md

## Mission

I want GoreeCloud Vault to unite secure password management, passkeys, MFA, private digital identities, encrypted records, family sharing, developer secrets and enterprise controls within a self-hosted, extensible GoreeCloud service. I require client-side encryption and user-controlled keys, and I do not consider an unreviewed prototype a production password manager.

The full requested product draws on the capabilities of Bitwarden, Vaultwarden, Proton Pass and 1Password. This is a **target capability union**, not a claim of component compatibility, feature completion or rights to redistribute another product's software.

## Implementation status

**Prototype implemented, not security-audited:**
- [x] Local encrypted vault create, open, save, lock and rekey
- [x] Login, secure note and generic secret CRUD; searching, favorites and filters
- [x] Cryptographic password generator and browser TOTP code generation
- [x] Basic, local-only login hygiene report: repeated/short/common passwords and HTTP URLs; no breach or MFA assertions
- [x] Encrypted local backup export and destructive import
- [x] Responsive GC UI-inspired web frontend with basic keyboard and accessible labeling
- [x] Unit tests and syntax-test workflow definitions

**Not yet implemented / requires design, tests and approvals:**

1. **Core password management:** form detection, browser/mobile autofill, equivalent domains, credential history, duplicate remediation and bulk import.
2. **Password generation and health:** passphrases, site profiles, exposure scanning, scoring, history and enterprise policies.
3. **Passkeys and passwordless:** FIDO2/WebAuthn passkey creation, use, synchronization, biometric approval, secure enrollment and loss recovery.
4. **Two-factor authentication:** QR enrollment, native auto-fill, hardware security keys, account MFA enforcement and recovery controls.
5. **Encrypted digital vaults:** multiple independently keyed vaults, team access, offline sync, secure attachments, template fields and ownership transfer.
6. **Personal records:** structured identities, payment cards, bank records, IDs, licenses, Wi-Fi, certificates, SSH keys and documents.
7. **Secure sharing:** encrypted links, time-limited grants, recipient permissions, item/vault sharing and genuine cryptographic revocation boundaries.
8. **Email privacy:** hide-my-email aliases, forwarding, custom domains, SimpleLogin/Fastmail bridges and private identity profiles.
9. **Family and household:** membership, shared collections, guests, emergency access and family recovery.
10. **Security center:** weak/reused/exposed credentials, missing MFA, breached email checks, guided remediation and reports.
11. **Cryptographic architecture:** reviewed Argon2id, per-vault keys, authenticated key wrapping, secure storage and verifiable recovery.
12. **Cross-platform apps:** browser extensions and **native** Android/iOS/Linux/macOS/Windows applications, operating-system autofill and offline support.
13. **Business and enterprise:** organizations, RBAC, vault groups, SAML/OIDC, SCIM, directory sync, policies, compliance-ready audit logging.
14. **Developer secrets:** environment-specific keys, machine identities, CI/CD secrets, scoped tokens, injection, audited rotation and revocation.
15. **SSH and Git:** secure key handling, SSH agent, approval flows, Git signing and deployment credentials.
16. **Self-hosting infrastructure:** server API, encrypted sync, Docker/Compose/Kubernetes, PostgreSQL, backups, HA, observability and admin configuration.
17. **APIs and automation:** documented REST/OpenAPI, SDK, CLI, events, webhooks, SCIM and cross-product integrations.
18. **Recovery and continuity:** trusted recipients, waiting periods, emergency workflows, encrypted exports and independently tested restoration.
19. **Travel and device trust:** local vault removal, device posture, conditional access, lost-device revocation and documented travel-mode limits.
20. **Privacy, compliance and governance:** minimized telemetry, privacy-preserving audits, deletion/retention policies and security evidence.
21. **Migration:** Bitwarden, Vaultwarden, Proton Pass, 1Password, browsers, CSV/JSON; sandboxed imports with schema verification.
22. **Search and productivity:** cross-vault advanced search, tags, saved searches, collections, bulk operations and accessible shortcuts.
23. **Notifications and observability:** breach alerts, expiring grants, credential reminders, sync health and redacted operational metrics.
24. **GoreeCloud ecosystem:** GC UI, Identity, Gateway, VPN, DNS, Backup and additional services with least-privilege isolation.
25. **Platform design:** end-to-end encryption, self-hosting first, strong defaults, standard protocols and maintainable modular components.
26. **Module delivery:** Password Manager, Passkeys, Authenticator, Secure Storage, Sharing, Privacy, Security Center, Secrets Manager, Developer Tools, Enterprise, Recovery, Server, Apps and Integrations.
27. **Release acceptance:** validated zero-knowledge architecture, interoperable clients, secure recovery, reliable sync and production security reviews.

## Proposed delivery order

- **Phase A (current):** isolated local-first security prototype, tests, accessibility and GC UI.
- **Phase B:** threat model review, vetted cryptography, import/migration, security testing and encrypted backup recovery.
- **Phase C:** review and approve the [encrypted synchronization architecture proposal](ENCRYPTED_SYNC_ARCHITECTURE.md), then implement a secure self-hosted ciphertext sync API, authenticated clients, database migrations, rollback protection and multi-device tests.
- **Phase D:** native Android/Linux clients, browser extension, passkeys, autofill and offline sync.
- **Phase E:** shared vaults, family recovery, developer secrets and enterprise features.
- **Phase F:** cross-product integrations, deployment hardening, independent audits and stable release gates.

**Scope disclaimer:** A roadmap checklist is not a claim of implementation. No existing Bitwarden/Vaultwarden instance is migrated, replaced or modified by this repository.
