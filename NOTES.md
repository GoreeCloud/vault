# GoreeCloud Vault — Notes

## Current repository state

The repository contains an initial Development service foundation plus the authoritative project specification. The executable surface remains intentionally small and does not handle protected Vault records.

Use `PROJECT-SPECIFICATIONS.md` for authoritative product requirements, `PLANNED-FEATURES.md` for requirements awaiting verified implementation, `IMPLEMENTED-FEATURES.md` for verified implementation scope, and `PROJECT-RECORD.md` for significant verified history.

## Immediate engineering boundary

Before adding any protected-record persistence or retrieval operation, complete a dedicated threat model and reviewed design for:

- key derivation and hierarchy;
- encryption envelope and algorithm/library selection;
- unlock and reauthentication state;
- storage and local-cache protection;
- account/vault/organization authorization isolation;
- synchronization and conflict semantics;
- record history and secure deletion limitations;
- backup/recovery and disaster-recovery key handling;
- redacted diagnostics and security evidence.

## Security-sensitive documentation

Do not place real passwords, passkeys, TOTP seeds, API keys, private keys, access tokens, recovery secrets, production credentials, or decrypted Vault material in repository documentation, examples, tests, logs, issue text, or pull-request descriptions.

## Authority boundary

Other GoreeCloud applications may integrate with Vault, but they must not silently become independent authoritative credential stores. Repository-specific integrations should request narrowly scoped operations from Vault interfaces whenever practical.
