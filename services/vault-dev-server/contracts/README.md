# Imported client HTTP contract inventory — development only

The JSON inventory records an **observed subset** of actual HTTP request
methods and routes in the imported client source. It is **not** an API
specification for a working GoreeCloud Vault backend; every route is marked
`implemented: false`. The native development service must return HTTP 503
for every identity, account, cipher and sync request.

Source grounding:

- Password prelogin: `libs/common/src/auth/password-prelogin/password-prelogin-api.service.ts`, identity origin. The model includes KDF settings and salt; the response format and secure identity/key lifecycle remain unimplemented.
- Token flow: `libs/common/src/services/api.service.ts` uses the **identity** origin for `POST /connect/token`, including separate refresh-token logic. Authentication grants and session handling are not implemented.
- Cipher CRUD and `GET /sync`: `libs/common/src/services/api.service.ts` uses the API origin. The sync request includes `?excludeDomains=true` depending on platform autofill capabilities.

The inventory must not imply that the legacy client's request/response JSON,
authorization, encryption/key formats or telemetry are safe or supported.
Implementing the real service requires authenticated, tenant-scoped,
zero-knowledge encrypted data and reviewed key custody, KDF settings,
durable sync and tombstone contracts, recovery, and client end-to-end tests.
Never plug in existing Docker Vaultwarden data or real passwords in testing.

Run `python3 -m unittest discover -s tests -p test_vault_imported_client_contract.py`
from the repository root to check that source-grounded route assumptions
have not drifted without review.

Native Go client_contract_test.go exercises every catalogued route with synthetic-only inputs and verifies HTTP 503, no redirect, and no input reflection. This is not live client interoperability.
