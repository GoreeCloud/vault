# GoreeCloud Vault — inherited legacy cryptography dependency review

**Status: risk open, release blocked.** This review is a limited
source-inventory checkpoint, **not** cryptographic security acceptance or a
finding that the vulnerability is unreachable.

## Risk to resolve

The October 21, 2026 production npm audit reports an unremediated **high**
advisory for `node-forge@1.4.0`, relating to RSA PKCS#1 v1.5 signature
verification accepting extra nested DigestAlgorithm elements. At the time of
the audit, npm reports no patched version (`fixAvailable: false`).
The authoritative action tracker is
[Vault security issue #8](https://github.com/GoreeCloud/vault/issues/8).

## Direct source import inventory

The four imported modules with direct `node-forge` references are:

- `libs/importer/src/importers/keeper/access/services/crypto.ts`:
  Keeper RSA public/private ASN.1 parsing and RSAES-PKCS1-V1_5
  encryption/decryption for legacy import interoperability.
- `libs/legacy-crypto/src/dangerous/dangerous_duckduckgo_crypto.ts`:
  inherited HMAC and symmetric decryption routines.
- `libs/legacy-crypto/src/dangerous/dangerous_lastpass_crypto.ts`:
  inherited symmetric decryption routines.
- `libs/legacy-crypto/src/services/web-crypto-function.service.ts`:
  inherited MD5 and UTF-8 helpers.

No *direct* source-level call to a signature-verification method was found in
these importers. That is **not** a finding that all call chains, transitive
usage, vendor packages, certificate parsing, cryptography, or runtime inputs
are safe. Keeper key parsing and other internal package behavior can still
carry risk. Do not replace the legacy RSA routines or alter encryption formats
without compatibility, interoperability, and qualified cryptography review.

## Automated checkpoint

`tests/test_legacy_dependency_review.py` enforces the observed direct-import
file inventory, flags new `.verify(`, `.sign(` and related
signature API calls in those files, excluding an existing WebCrypto
`this.subtle.sign` HMAC operation unrelated to node-forge, and confirms the tracked vulnerable
version is named in release gates. This is a narrow change-detection guard:
it does not perform reachability analysis or validate cryptographic
implementations. Passing this test is **not** a security waiver.

## Conditions to close issue #8

1. Review the complete resolved dependency tree and all cryptographic source
   paths, including transitive packages and cryptographic parsing.
2. Obtain an appropriately reviewed upstream security fix or compatible
   replacement and validate old imported data against synthetic regression
   fixtures, including rejection of malformed signatures if relevant.
3. Obtain independent qualified security acceptance of exact source revision,
   key custody, import behavior, recovery and release gates.
4. Repeat the production advisory audit and exact-head OSS compilation and
   installed-client tests, including web, CLI, desktop and Firefox.
5. Keep development and production environments separate; never use actual
   vault credentials as test fixtures.
