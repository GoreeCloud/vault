# GoreeCloud Vault — target architecture (not yet implemented)

## Scope and trust model

```text
Browser / Firefox extension / Desktop / Android / iOS / Web / CLI
  ├─ Glaze experience, protected clipboard, lock policy, accessibility
  ├─ approved client cryptography, encrypted local cache, passkeys/WebAuthn
  └─ ciphertext + scoped, short-lived requests (never plaintext vault secrets)
                         |
                Vault API / Policy Adapter
                   |        |       |
           GoreeCloud Identity   Wardveil Security   Privacy Shield
                   |        |       |
        tenant-scoped opaque encrypted storage + sync metadata
                   |
            Everkeep backups and verified restoration
                   |
         GoreeCloud Mesh + Observability + Manager
```

Client-held vault material must remain outside server and central AI visibility by default. GoreeCloud Identity authenticates accounts/sessions but **must not** become a plaintext vault decryption authority. GoreeCloud Policy mediates operations but must not bypass item grants. GoreeCloud AI receives neither decryption keys nor secret values by default. Any sensitive operation requires user-granted, bounded capabilities and explicit approval where appropriate.

## Boundaries and responsibilities

- **Clients:** reviewed cryptographic primitive implementations, Argon2id-class key derivation where reviewed, lock/unlock lifecycle, device-key protection, secure offline cache, origin-aware autofill, vault encryption/decryption, passkeys, interoperable import/export.
- **Vault service:** independently enforce identity, tenancy, tenant limits, item access/ownership, quotas, rate limits, replay/revocation protections; store ciphertext and the minimum necessary sync metadata; never log protected fields.
- **GoreeCloud infrastructure:** private ingress defaults, hardened runtime, recovery verification, central service health metrics without vault-content access.
- **Migration:** one-way dry run and read-only source adapters; verified imports, checksums, reversible backups; explicit consent to cutover; no automatic bulk secret transmission.

## Phased product structure

1. Pin and quarantine upstream source snapshots.
2. Document/enforce API versioning and import/export compatibility contracts.
3. Implement native security architecture and approved cryptographic trust boundaries only after human review.
4. Integrate each applicable GoreeCloud platform system and the current Glaze contract.
5. Implement testable clients and hardened server in slices.
6. Test migration, rollbacks, target runtimes, security, licensing, and release gates; retire inherited product shell.

A Development-only candidate opaque-sync shape contract and cryptographic review questions are documented in [NATIVE-SYNC-CONTRACT](NATIVE-SYNC-CONTRACT.md) and [CRYPTOGRAPHY-CANDIDATE](CRYPTOGRAPHY-CANDIDATE.md). Neither is a deployed service or a reviewed cryptographic protocol.

This architecture is a **proposal**. The imported Bitwarden code is not proof of any of these native integration capabilities.
