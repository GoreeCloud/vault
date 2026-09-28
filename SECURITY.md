# Security Policy

## Project maturity

GoreeCloud Vault is under active Development and has not reached a Stable or production-ready release. The current executable foundation exposes only loopback health/readiness endpoints and does not yet implement protected Vault storage or credential operations.

## Reporting a vulnerability

Report vulnerabilities privately through GitHub Security Advisories for this repository when available. Do not publish exploitable details in a public issue before a coordinated fix can be prepared.

A useful report includes the affected revision, component, reproducible steps, expected and observed behavior, security impact, and a suggested mitigation when known. Do not include real passwords, passkeys, TOTP seeds, private keys, tokens, recovery secrets, private Vault data, or unrelated personal information.

## Mandatory security principles

- fail closed on missing, malformed, stale, conflicting, or unverifiable security evidence where protected data is involved;
- least privilege and explicit authorization at trusted execution boundaries;
- no UI-only authorization;
- no plaintext credentials or secret material in logs, telemetry, crash output, repository files, examples, fixtures, or ordinary diagnostics;
- no custom cryptographic primitives;
- origin-aware credential operations and explicit trust-boundary validation for browser integrations;
- reauthentication for sensitive reveal, copy, export, sharing, recovery, and administrative operations where required;
- explicit separation between user credentials and machine/application secrets;
- evidence-backed security claims only;
- dependency, build provenance, update integrity, and vulnerability management before release claims.

## Foundation 0.1 exposure restrictions

The current server configuration accepts only `localhost`, `127.0.0.0/8`, and `::1` loopback literals/hostnames accepted by the implementation. Wildcard, LAN, private-network, and public listen addresses are rejected.

This restriction must not be relaxed merely to make development easier. Broader exposure requires a documented authentication/authorization model, transport security, abuse controls, Gateway/Network placement, Privacy Shield and Wardveil review, and target-environment validation.

## Secrets in development

Never commit active secret values. Examples and templates must use placeholders. Development tests must use synthetic data that cannot authenticate to real systems.

## Security review gates before secret handling

Before the repository implements credential storage or retrieval, the relevant change must define and review at least:

- threat model and trust boundaries;
- key hierarchy and cryptographic library choices;
- unlock and reauthentication semantics;
- protected memory and local-cache expectations;
- persistence and synchronization boundaries;
- audit/log redaction rules;
- backup/recovery behavior;
- import/export plaintext handling;
- authorization and cross-account/cross-vault isolation;
- failure, corruption, rollback, and compromise recovery behavior.
