# GoreeCloud Vault Server Identity

## Status

Canonical and active server identity. Product lifecycle remains Development/non-Stable.

## Canonical identity

- Official server name: **GoreeCloud Vault Server**
- Parent product: **GoreeCloud Vault**
- Short presentation: **Vault Server** when GoreeCloud context is explicit
- Canonical product-family repository: `GoreeCloud/goreecloud-vault`
- Repository component: GoreeCloud Vault Server
- Canonical service address: `https://vault.goreecloud.com`
- Current implementation model: forked-to-native transitional
- Transitional upstream foundation: Vaultwarden
- Upstream repository: `dani-garcia/vaultwarden`
- License: AGPL-3.0-only
- Design system: current applicable Stable Glaze UI contract
- Security framework: Wardveil Security
- Privacy framework: Privacy Shield
- Continuity and recovery framework: Everkeep

## Naming decision

The former server name **GoreeVault Server** is retired for current presentation.

The former product name **GoreeVault** is retired. It is not a current client-family name, alternate brand, or parallel product. Current client and product presentation must use GoreeCloud Vault, GoreeCloud Vault Web, GoreeCloud Vault Browser, GoreeCloud Vault Desktop, GoreeCloud Vault Mobile, and GoreeCloud Vault CLI as applicable.

Historical records and compatibility-sensitive implementation identifiers may retain GoreeVault only where changing or rewriting them would damage historical accuracy, migration safety, retained evidence, interoperability, or data integrity. Those references are legacy implementation details and must not be presented as current product identity.

## Repository boundary

`GoreeCloud/goreecloud-vault` is the canonical product-family repository. It is intended to maintain GoreeCloud Vault Server, GoreeCloud Vault Web, and supported GoreeCloud Vault client applications under one source-control umbrella while preserving independent component implementation, security, compatibility, release, and acceptance lifecycles.

The previous repository slug `GoreeCloud/goreecloud-vault-server` is retired for current-state references after the verified GitHub rename. Historical records may retain the prior slug when required for chronological accuracy. Server runtime, service, container, package, and deployment identifiers that legitimately use `goreecloud-vault-server` are separate from the repository slug and must not be renamed merely because the repository changed name.

## Required presentation boundary

Use **GoreeCloud Vault Server** for server runtime, administration, deployment, release, recovery, security, monitoring, and backend-specific documentation. Use **GoreeCloud Vault** for the broader current product family and shared product presentation.

Do not rename compatibility-sensitive internal `vaultwarden` or historical `goreevault` identifiers solely for cosmetic reasons. Any such migration must preserve evidence history, user data, interoperability, release governance, and rollback safety.

## Repository invariants

`README.md`, `VAULT.md`, current transactional presentation, and the machine-readable `docs/server-identity.json` must agree with this identity. `scripts/validate-repository-readiness.py` and `scripts/validate-glaze-ui.py` must fail closed on reintroduction of the retired name as active presentation or the retired repository slug as current repository metadata.
