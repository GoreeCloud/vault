# GoreeCloud Vault

GoreeCloud Vault is the first-party GoreeCloud platform for private credential, passkey, authentication-secret, identity, secure-access, and application-secret management.

## Role

**Private credential, passkey, secret, identity, and secure-access management platform.**

## Purpose

Provide GoreeCloud with a single authoritative system for securely storing, managing, generating, using, sharing, synchronizing, and protecting passwords, passkeys, TOTP secrets, identities, payment information, developer secrets, machine secrets, and other sensitive Vault records.

## Project status

**Lifecycle: Active Development — pre-Stable.**

The repository now contains a bounded Development foundation. It does **not** yet implement credential storage, encryption, authentication, password management, passkeys, TOTP, secure sharing, synchronization, import/export, secrets management, or browser/client credential APIs.

Current executable behavior is intentionally limited to:

- a standard-library Go service shell;
- loopback-only listener validation;
- `/healthz` and `/readyz` endpoints;
- bounded HTTP server timeouts/header size;
- graceful shutdown;
- CI for formatting, tests, vetting, and build.

This foundation is not a production service and must not be exposed through Gateway, Caddy, LAN/private-network interfaces, or the public Internet.

## Local Development

Requirements: the Go version declared in `go.mod`.

```bash
go test ./...
go vet ./...
go build ./cmd/goreecloud-vault
go run ./cmd/goreecloud-vault
```

Default listen address:

```text
127.0.0.1:8787
```

An explicit loopback address may be selected with:

```bash
GOREECLOUD_VAULT_LISTEN='[::1]:8787' go run ./cmd/goreecloud-vault
```

Non-loopback addresses are rejected by design in this foundation.

## Authoritative repository records

- `SPECIFICATIONS.md` — compatibility pointer to the authoritative project specification.
- `PROJECT-SPECIFICATIONS.md` — governing project requirements and capability specification.
- `PLANNED-FEATURES.md` — required/planned capabilities awaiting verified implementation.
- `IMPLEMENTED-FEATURES.md` — capabilities or non-feature foundations verified in source, with scope limits stated explicitly.
- `PROJECT-RECORD.md` — significant verified project history and decisions.
- `FEATURES.md`, `BENEFITS.md`, and `COMPETITIVE-OBJECTIVES.md` — feature-state summary, product value, and target objectives.
- `BRANDING.md` and `USER-MANUAL.md` — product identity and current Development-use guidance.
- `CHANGELOGS.md` — repository change history.
- `NOTES.md` — maintained development and implementation notes.
- `ARCHITECTURE.md` — architecture and trust-boundary baseline.
- `SECURITY.md` — project security policy and development gates.
- `PRIVACY.md` — privacy architecture and current behavior.
- `PLATFORM-INTEGRATIONS.md` — nine-system applicability/conformance assessment.
- `THREAT-MODEL.md` — security threat-model candidate pending explicit human review.
- `CRYPTOGRAPHY.md` — cryptographic architecture candidate pending explicit human review.

## Core authority boundary

GoreeCloud Vault is intended to remain the sole authoritative GoreeCloud system for credentials, passkeys, authentication secrets, protected Vault records, secure autofill material, and application secrets. Other GoreeCloud applications may integrate with Vault but should request authorized Vault operations rather than create competing credential authorities.

## Security posture

Vault is specified as privacy-first, self-hosted, end-to-end encrypted, least-privilege, and fail-closed where destination trust cannot be sufficiently established. The repository will use established cryptographic libraries and reviewed protocols; documentation or source presence alone does not establish secure implementation.
