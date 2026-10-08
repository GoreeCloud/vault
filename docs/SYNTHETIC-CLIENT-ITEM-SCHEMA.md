# GoreeCloud Vault — synthetic client-private item templates

**Development only. No secret values, encrypted payloads, real passkey material, storage or credential import is accepted by this module.** Schema version `0` is a test-fixture vocabulary, **not** a production format or proof of secure encryption.

## Boundary

`src/synthetic-client-item-schema.mjs` screens only the **names of fields** in a client-private item template. Its return value is a frozen candidate flag and reason; it does not return field names, item kind, or supplied data. All unknown keys, unexpected item types, noncanonical order, duplicate fields, arrays with holes or extra properties, and accessor-bearing or hostile inputs fail closed.

The six **provisional** client-local categories are login, secure note, payment card, identity, passkey and SSH key. Their field names are proposed compatibility/design vocabulary, not a product-data model approved for real use.

**Never send these categories or field names to the server as cleartext metadata.** A category itself can expose personal, financial, credential or security context. Future authenticated encryption should protect the item kind, display title, URLs, usernames, all custom fields, notes, tags, passkey/SSH material and attachments. The server should only see a reviewed, strictly minimal synchronization envelope. Do not assume UUIDs or timing/size metadata are innocuous.

## Deliberate omissions

- No field **values** in the input; no master passwords, card numbers, URLs, recovery data or private keys.
- No browser extension, item editor, key import, device credential provider, local database, encrypt/decrypt, network request, recovery or sharing implementation.
- Passkey credential lifecycle and SSH private-key custody require separate platform/security design and exact-revision human approval.
- Version `0` may not be promoted into a shipping schema without a reviewed revisioned migration protocol.

## Acceptance before actual storage

Review owner-held key hierarchy, vetted AEAD and AAD, KDF, authentication, data minimization, local-cache encryption, field normalization, test vectors, failure cases, migration, recovery and the current GoreeCloud Identity/Policy contracts. Keep sync metadata strictly minimal; independently test tenant isolation and redacted telemetry. See [security gate #1](https://github.com/GoreeCloud/vault/issues/1), [backlog #3](https://github.com/GoreeCloud/vault/issues/3) and `docs/CRYPTOGRAPHY-CANDIDATE.md`.
