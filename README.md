# GoreeCloud Vault

GoreeCloud Vault is the first-party GoreeCloud platform for private credential, passkey, authentication-secret, identity, secure-access, and application-secret management.

## Role

**Private credential, passkey, secret, identity, and secure-access management platform.**

## Purpose

Provide GoreeCloud with a single authoritative system for securely storing, managing, generating, using, sharing, synchronizing, and protecting passwords, passkeys, TOTP secrets, identities, payment information, developer secrets, machine secrets, and other sensitive Vault records.

## Project status

The repository currently has an authoritative documentation baseline. The capabilities described in PROJECT-SPECIFICATIONS.md are required/planned unless and until they are independently verified as implemented and recorded in IMPLEMENTED-FEATURES.md.

## Authoritative repository records

- PROJECT-SPECIFICATIONS.md — governing project requirements and capability specification.
- PLANNED-FEATURES.md — required/planned capabilities awaiting verified implementation.
- IMPLEMENTED-FEATURES.md — capabilities verified as implemented.
- PROJECT-RECORD.md — significant verified project history and decisions.
- CHANGELOGS.md — repository change history.
- NOTES.md — maintained development and implementation notes.

## Core authority boundary

GoreeCloud Vault is intended to remain the sole authoritative GoreeCloud system for credentials, passkeys, authentication secrets, protected Vault records, secure autofill material, and application secrets. Other GoreeCloud applications may integrate with Vault but should request authorized Vault operations rather than create competing credential authorities.

## Security posture

Vault is specified as privacy-first, self-hosted, end-to-end encrypted, least-privilege, fail-closed where destination trust cannot be sufficiently established, and designed to avoid plaintext secret exposure in ordinary server, browser, application, telemetry, synchronization, or logging paths.
