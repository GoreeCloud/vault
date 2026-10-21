# GoreeCloud Vault

**GoreeCloud Fork · Development only · Not approved for sensitive data**

GoreeCloud Vault is a GoreeCloud-controlled password-manager project based initially on the **GPL-licensed Bitwarden clients** source. This repository is an **independent source fork**, not a GitHub fork-network relationship and not an official Bitwarden product.

## Current implementation

The imported baseline contains upstream web vault, browser extension, desktop application, and CLI source plus shared libraries. GoreeCloud Vault naming has been added to initial web, browser-extension, and desktop shell metadata; full GoreeCloud UI adaptation and branding remain outstanding. This baseline is **not yet a production-ready GoreeCloud Vault**: security acceptance, interoperability verification, packaging, backend integration, and mobile clients remain pending.

The independently managed GoreeCloud Vault Server is a separate workstream; this import does not implement or deploy a backend.

## Development (OSS configurations only)

Prerequisites: supported Node.js/npm toolchain and any platform prerequisites documented by upstream.

```bash
npm ci
npx nx serve web --configuration=oss-dev
npx nx serve cli --configuration=oss-dev
```

These are upstream development commands, **not verified GoreeCloud build results**. Do not run commercial configurations, distribute branded artifacts, use real vault secrets, or connect production accounts until the required security and release gates are satisfied.

## Provenance, licenses, and security

- [Upstream source and import record](docs/UPSTREAM.md)
- [Security and release acceptance gates](docs/RELEASE-GATES.md)
- [GNU GPLv3 license](LICENSE_GPL.txt)
- [Upstream licensing notice](LICENSE.txt)

The upstream `bitwarden_license/` source is deliberately excluded. Original notices and author attributions are retained. Bitwarden trademarks and logos are **not** licensed for GoreeCloud product use; all affected assets, names, identifiers, and user-facing flows require a reviewed replacement before shipping.

Security reports should not include vault contents, credentials, recovery material, or private keys. No release or production environment is authorized by the existence of this repository.
