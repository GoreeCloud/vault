# GoreeCloud Vault — Encrypted Interchange Format v1

**Status:** Preliminary, local-only interoperability contract. No formal cryptographic audit or compatibility guarantee for future versions.

An envelope is a UTF-8 JSON document with **no plaintext per-entry metadata**:

```json
{
  "format": "goreecloud-vault",
  "version": 1,
  "kdf": {
    "name": "pbkdf2-sha256",
    "iterations": 600000,
    "salt": "<16 random bytes, standard Base64>"
  },
  "cipher": {
    "name": "aes-256-gcm",
    "nonce": "<12 random bytes, standard Base64>",
    "data": "<ciphertext concatenated with 16-byte GCM tag, standard Base64>"
  }
}
```

The key is PBKDF2-HMAC-SHA-256 of the UTF-8 master password with the envelope salt, 600,000 iterations, 32 output bytes. Encryption uses AES-256-GCM with no additional authenticated data, a fresh CSPRNG-generated nonce for **every write**, and an appended 16-byte authentication tag. For a given vault, the KDF salt remains fixed when records are updated; rekeying is not implemented. Never reuse a nonce with the same key.

The decrypted UTF-8 payload is:

```json
{"version":1,"entries":[{"id":"random item identifier","title":"Label","username":"Account","password":"Secret","website":"https://example.invalid","notes":""}]}
```

Additional optional fields in each encrypted record preserve backward compatibility with records created before the expanded schema:

- `kind`: `login`, `note`, `otp`, or `passkey` (defaults to `login` when absent).
- `favorite`: boolean. `tags`: array of at most 30 short strings.
- `customFields`: encrypted list of `{name,value,concealed}`, maximum 30. `concealed` controls display only; all record fields are encrypted.
- `otp`: encrypted `{type,secret,algorithm,digits,period,counter,issuer,account}`. The secret is Base32; `type` is `totp` or `hotp`; `algorithm` is `SHA1`, `SHA256`, or `SHA512`. Period is 15-300 seconds, digits 6 or 8. HOTP counters must be incremented in authenticated encrypted storage after use.
- `passkey`: metadata only `{rpId,credentialId,userHandle}`; it is **not** a passkey private key, authenticator, or sign-in capability.

All optional fields live **inside the AES-GCM ciphertext**, not in the external envelope. Existing encrypted v1 files remain decryptable; unknown future fields are not silently trusted. This schema extension does not authorize cloud sync.

The implementation caps the outer document at 5 MB, entries at 20,000, string fields at 20,000 characters, and plaintext at 2.5 MB. A future schema must use an explicit new version, KDF migration and authenticated protocol negotiation. Clients must reject unknown versions and parameter choices, rather than weakening KDF strength.

**Security limitation:** JSON's malleability outside authenticated ciphertext permits an attacker with file-system access to replace the entire envelope or its parameters, making denial-of-service or rollback possible. Authenticated per-vault identity, rollback detection, comprehensive backup/import validation, hardware-backed keys, Argon2id migration and independent expert audit remain planned.

A synthetic Node.js-generated cross-runtime sample is in `tests/interop/sample-v1.json`; its credentials are deliberately fake and only for testing.
