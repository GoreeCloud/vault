# GoreeCloud Vault — synthetic access-boundary candidate

**Status:** Development-only, non-operational candidate; **not an authorization engine**, an Identity or Policy integration, or an authenticated data service.

The first-party module `src/synthetic-access-boundary.mjs` screens a small **synthetic personal-vault** access model. No real credentials, keys, files, protected records, user tokens, network services, persistence, server state or source data are used. It does not grant permissions.

## Evaluated synthetic inputs

- A request names a canonical lower-case UUID-shaped `vaultId` and `itemId`, with the proposed operation `read`, `create`, `replace` or `delete`.
- A supplied **context sketch** includes principal, tenant, owner, vault, optional existing record identity, synthetic active session/revocation/membership flags, policy freshness and an alleged grant role.
- A synthetic `owner` candidate must match the owner ID. A nonowner `viewer` or `editor` candidate must carry an alleged verified grant; `none` is always denied.
- A `viewer` candidate can read, an `editor` can read/create/replace, and an `owner` can read/create/replace/delete. These choices are proposed *screening scenarios*, **not authoritative GoreeCloud Policy defaults**.
- Existing-record operations require exact tenant, vault and item scope. Creating a new record requires no existing resource identity. Unknown operations, extra fields, stale synthetic policy versions, unexpected types, cross-boundary IDs or missing context all fail closed.

The only results are frozen `{ candidate, reason }` objects. `candidate: true` does **not** mean permitted, authenticated, authorized or safe.

## Critical trust warning

The entire context is supplied by a JavaScript caller and may be forged. Even a `grantVerified: true`, `sessionNotRevoked: true` or matching owner ID is **not evidence of verification**. This module cannot attest an Identity session, validate tenant or collection membership, prove revocation, enforce a storage transaction, or authorize access. It may only be used with synthetic test fixtures. Never expose real vault operations to this function's decision.

A future real service must perform independently authenticated session validation, resource ownership/tenant isolation, server-side grant lookup, role scope and expiration, deny-by-default policy, current revocation, atomic storage authorization, replay/race handling and audit-minimized evidence. Client-side checks cannot substitute for those controls. A reviewed encryption protocol must separately authenticate ciphertext and bind immutable resource identifiers. All nine Integral Platform Systems must be evaluated, including GoreeCloud Identity, Policy, Wardveil Security, Privacy Shield and Observability where applicable.

## Remaining review gates

Human-approved security design and exact-revision tests; multi-tenant and organization isolation; collection sharing and grant revocation; expiration and clock trust; concurrent modification and stale-session tests; fuzz/property tests; rate limiting, enumeration and anti-abuse protections; redacted audit; accessible error UX; recovery and restore; and operational monitoring without protected data.

See [security gate #1](https://github.com/GoreeCloud/vault/issues/1), [implementation backlog #3](https://github.com/GoreeCloud/vault/issues/3), `docs/NATIVE-SYNC-CONTRACT.md`, `docs/CRYPTOGRAPHY-CANDIDATE.md` and `docs/SECURITY-GATES.md`.
