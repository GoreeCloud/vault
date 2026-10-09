# GoreeCloud Vault — Threat model, Development candidate

**Status:** Candidate for human security review. No sign-off, no production secret storage, no deployment approval.

## Assets and boundaries

| Asset | Confidentiality expectation | Owner of enforcement |
| --- | --- | --- |
| Master secret, derived keys, unlock state | Never server-side or in analytics, crash reports or AI prompts | Trusted client and vetted cryptographic libraries |
| Passwords, TOTP seeds, passkeys, secure notes | Client-encrypted at rest and in transit through sync; explicit user-authorized display | Trusted client |
| Ciphertext, encrypted attachments, minimal revision metadata | Protected per tenant, authenticated and access-controlled | Vault service and storage |
| Session/device claims | Strong authentication, session revocation, device binding where supported | GoreeCloud Identity + Vault authorization |
| Audit/security events | No protected fields, selective disclosure and retention | Wardveil Security, Privacy Shield, Observability |
| Backups and recovery evidence | Confidential, authentic, restorable, no covert plaintext access | Everkeep + Vault cryptographic authority |

Trust boundaries: device OS and user session -> native client/browser extension -> authenticated transport -> Vault service -> storage/backup; private-to-shared collection; parent page-to-iframe; privileged system operators; external migration formats; GoreeCloud AI/service integrations. None is trusted by proximity alone.

## Priority attacks and defensive obligations

| Threat / failure | Required guard | Adversarial acceptance |
| --- | --- | --- |
| Stolen device and offline cache extraction | Reviewed at-rest encryption and lock lifecycle, limited keys, platform-backed unlock | Extract local cache and confirm no decryptable data without authorized key |
| Compromised sync server | Opaque authenticated ciphertext and end-to-end integrity/replay protection | Simulate storage/API compromise; cannot read protected vault contents or silently modify records |
| Cross-tenant or confused-deputy access | Independently enforced authorization for every object/collection and export | Enumerate adjacent tenant IDs, reuse tokens, modify requests; all unauthorized requests fail |
| Phishing and deceptive origin | Strict origin/realm matching, iframe handling, explicit user intent, Wardveil risk evidence | IDN/homograph, subdomain, deceptive suffix, redirect, cross-origin frames, HTTP downgrade tests |
| Token theft and CSRF | Short-lived sessions, token rotation/revocation, strict request origins and browser protections | Replayed/revoked tokens, forged cross-origin requests rejected |
| Offline and sync conflict | Authenticated versioning and monotonic upgrade rules, bounded conflict resolution | Roll back an item, reorder/replay change events, race two trusted clients |
| Malicious imported export | Format allowlists, bounded parsing, no unsafe HTML/scripts, explicit dry run/consent | Fuzz malformed exports, zip-bombs, duplicate IDs, overlong fields, injection payloads |
| Extension malicious page | Minimal permissions, isolation, no plaintext in page JS, controlled autofill | Untrusted DOM/iframe cannot retrieve data, trigger fill, or persist decrypted state |
| Recovery takeover | Owner-controlled recovery options, multi-party consent where warranted, audit and revocation | Simulated support/admin recovery cannot bypass user-held key boundary |
| Dependency or CI compromise | Pinned/provenanced dependencies, commercial module boundary, isolated CI secrets | Tampered packages/build outputs, injected workflows, secret-leak attempts |
| Logs and telemetry leakage | Structured allowlisted diagnostics without secret fields or identifier correlation | Probe every error path; no passwords/tokens/keys in logs and crash artifacts |
| Rogue integrations | Capability-scoped user grants and native authorization owner; no implicit AI secret access | AI or Mesh access denied without explicit policy decision and user consent |
| Backup poisoning and ransomware | Independently verifiable encrypted backups and tested restore isolation | Corrupt/replay backup snapshot; detect and recover without exposing decrypted data |

## Open design decisions requiring security review

1. Which reviewed KDF, password-derived-key formats, calibration parameters, and migration/downgrade rules are appropriate to each supported client runtime.
2. Exact encryption formats, algorithm agility, nonce/key handling, per-item hierarchy, sharing/group key models, and authenticated sync metadata.
3. Device enrollment and session claims versus vault unlock: identity federation must not become decrypt authority.
4. Lost-device and disaster-recovery options that do not introduce undisclosed recovery keys or plaintext escrow.
5. Browser/iframe origin proof and Wardveil signal provenance, including safe degradation while offline.
6. Third-party license, provenance, build reproducibility, and independent penetration tests.

## Evidence requirements

Security reviewers must record the **exact reviewed Git commit SHA**, design version, reviewer name/authority, approvals and exceptions. Review must separately cover implementation and representative runtime behavior. CI success alone does not approve a cryptographic design.

This document is an audit input. The blocking issue is [GoreeCloud/vault#1](https://github.com/GoreeCloud/vault/issues/1). Importing upstream Bitwarden source does not validate these controls.
