# GoreeCloud Vault — security and release gates

**State: development baseline only. None of the gates below are claimed satisfied by this source import.**

## P0 — must hold before any operational secret handling

- Review exact source, key custody, KDF, memory lifetime, lock/unlock, platform-backed storage, and client-side encryption. Do not invent or silently change cryptographic algorithms.
- Validate cross-user, cross-tenant, organization, item and attachment authorization in a real authenticated backend. Never rely on synthetic fixtures as authorization evidence.
- Validate encrypted offline cache, sync conflict resolution, corruption handling, recovery, import/export, backup and restore using non-sensitive test fixtures.
- Validate browser origin matching, autofill prompt boundaries, private-browsing policy, passkey relying-party/origin checks, clipboard disclosure and clipboard clearing limitations.
- Complete open-source notices, trademark replacement, transitive dependency/license inventory, reproducible OSS builds, supply-chain verification, and security scans.
- Keep source, test fixtures, CI logs, screenshots, telemetry and diagnostics completely free of real vault secrets and credentials.

## P1 — must hold before a GoreeCloud-branded release

- Implement the **GoreeCloud UI** design authority across shipped clients, covering accessibility, keyboard, screen-reader, themes, responsive surfaces and onboarding.
- Establish verified app package identities, update/signing continuity, extension IDs, CSP, permissions and store-compliance.
- Validate web, browser, desktop, CLI and any later mobile clients against a real permitted backend; no mobile backend or extension feature is inferred from source presence.
- Validate self-hosted and managed deployment choices, secure defaults, migration/rollback, compatibility, reliability, privacy, and failure recovery.
- Validate platform integrations with appropriate GoreeCloud systems only through documented, current contracts with narrow permissions.
- Document a versioned release candidate with exact commit, CI status, relevant runtime/device evidence, known risks, recovery and rollback.

## Not yet implemented or validated

This repository's imported source has upstream behavior and names. No GoreeCloud Vault binaries, production runtime, service integration, mobile apps, browser-store submissions, external security acceptance, or Stable release are established by the import.

For live ongoing tasks use the authorized GoreeCloud task authority; GitHub issues and pull requests remain authoritative for repository-native implementation.
