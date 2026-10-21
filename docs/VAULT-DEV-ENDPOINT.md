# GoreeCloud Vault — private development endpoint

**State: Development only — not ready for authentication or real credentials.**

This document describes the *transport* boundary of the private development hostname; it is not a Vault Server deployment guide or proof of a cryptographically safe backend.

## Verified observation (October 21, 2026)

- The AdGuard Home rewrite for `vault-dev.goreecloud.com` is enabled and points to `100.71.27.119`.
- The authorized laptop resolves the name to that private overlay address; the VPS reports the address on `wt0`.
- HTTP redirects to HTTPS, but the HTTPS handshake fails with a TLS alert.
- The live Caddy configuration has a separate `vault.goreecloud.com` route to the existing Vaultwarden service, but **no** `vault-dev.goreecloud.com` route or stored certificate was found.
- The existing Vaultwarden container and its data must not be reused as a development backend, nor should this DNS rewrite be treated as deployment evidence.

## Safe transport preflight

From a machine connected to the approved private overlay:

```sh
python3 scripts/check_vault_dev_endpoint.py --expected-ip 100.71.27.119
```

The check requires the explicit expected CGNAT-overlay IPv4, verifies the exact DNS answer, connects only to that IP, validates a trusted TLS certificate using the development hostname as SNI, and sends an unauthenticated HTTPS HEAD request without redirect following. It returns a deliberately limited JSON result and a nonzero exit status when a transport gate fails. It never sends a Vault session, password, API key, cookie, or request body. Unit tests use synthetic, offline connection fixtures.

**A passing result means only that the DNS/TLS/HTTP transport responded:** it does not attest backend identity or permission, data isolation, security review, encrypted sync, account ownership, passkey behavior, native OS support, recovery, or readiness to use real passwords.

## Separate infrastructure acceptance (not performed)

1. Identify an authorized, isolated GoreeCloud Vault **development** backend and its source, test database, permissions, storage, credentials, backup and rollback strategy. Do not attach the existing Vaultwarden production data or import live secrets.
2. Make a minimal, separately reviewed `vault-dev.goreecloud.com` virtual-host configuration in the authoritative ingress infrastructure. Restrict reachability to the approved private overlay and provide a valid TLS certificate for that exact hostname. Validate reverse-proxy config and rollback before any controlled reload.
3. Verify TLS with normal certificate validation and private DNS from approved devices, plus authenticated synthetic test tenants and origin-safe browser behavior. Certificate issuance and a successful HTTP response are not credentials-release approval.
4. Complete Vault issue #3 and related cryptography, licensing, sync, backup/recovery, GoreeCloud UI and native-OS acceptance gates before permitting real vault credentials.

**No live DNS rewrite, Caddy routing, certificates, Vaultwarden data, or production service was changed by this repository preflight work.**
