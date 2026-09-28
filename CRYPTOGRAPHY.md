# GoreeCloud Vault — Cryptographic Architecture

**Status:** Development cryptographic-design candidate — pending explicit human security review  
**Security gate:** This document is not a cryptographic approval and does not authorize protected secret persistence or production use. The AI-assisted drafting process cannot serve as the final authority for cryptographic trust under GoreeCloud secure-coding instructions.

## 1. Design goals

The cryptographic design must support:

- end-to-end protection of Vault record contents where the selected client/server mode claims it;
- independent cryptographic isolation between vaults;
- password/passphrase changes without re-encrypting every record payload;
- multiple unlock/recovery factors without using one factor as the data-encryption key;
- record and attachment key rotation;
- authenticated corruption/tamper detection;
- ciphertext-only synchronization and backup paths where practical;
- explicit format and algorithm versioning;
- safe migration to future algorithms and stronger KDF parameters;
- bounded blast radius when one record key, device key, or factor is compromised;
- truthful recovery and deletion semantics.

The design must use mature cryptographic libraries and protocols. GoreeCloud Vault must not invent custom ciphers, hashes, MACs, or password-hashing algorithms.

## 2. Cryptographic suite candidate v1

The initial candidate suite is:

| Purpose | Candidate | Notes |
| --- | --- | --- |
| Password/passphrase key derivation | Argon2id, version 0x13 | Use `golang.org/x/crypto/argon2` or an equivalent reviewed implementation on the target platform. |
| Symmetric authenticated encryption | XChaCha20-Poly1305 | 256-bit key, 192-bit nonce; suitable for cryptographically random nonces when uniqueness cannot be centrally coordinated. |
| Subkey derivation / domain separation | HKDF-SHA-256 | Separate keys by explicit context strings and scope. |
| Random key / nonce / salt generation | OS CSPRNG | Go: `crypto/rand`; platform-native secure RNG on other clients. |
| Hash for non-secret integrity identifiers where needed | SHA-256 | Not a password KDF and not a replacement for AEAD authentication. |

References:
- RFC 9106 recommends Argon2id and includes a memory-constrained profile of 64 MiB, 3 passes, 4 lanes.
- Current Go `x/crypto/argon2` documentation recommends Argon2id when unsure and exposes the RFC 9106 profiles.
- Current Go `x/crypto/chacha20poly1305` documentation states that XChaCha20-Poly1305's 24-byte nonce is suitable for random generation and should be preferred when nonce uniqueness cannot be trivially ensured.

The dependency/version actually introduced into source must be reviewed again at implementation time for current release, provenance, vulnerability state, and Go compatibility.

## 3. Key hierarchy

### 3.1 Per-vault root key

Each vault receives an independent random 256-bit **Vault Root Key (VRK)**.

Properties:

- generated from a cryptographically secure random source;
- never derived directly from a password;
- never stored plaintext in ordinary persistence;
- never reused as an application/session/authentication token;
- scoped to one vault;
- rotatable independently from other vaults.

Using a separate VRK per vault limits cross-vault blast radius and avoids making a single account-wide root key an unnecessary universal decryption authority.

### 3.2 Unlock key

A password/passphrase is transformed into a 256-bit **Unlock Key (UK)** with Argon2id.

The password/passphrase itself is never used as an AEAD key.

Candidate interactive KDF profile:

- variant: Argon2id;
- Argon2 version: 0x13;
- output: 32 bytes;
- salt: at least 16 random bytes per key slot;
- candidate default: memory = 64 MiB, passes = 3, parallelism = 4;
- parameters encoded in the key-slot envelope so they can be upgraded;
- implementations must validate parameters against an allowlisted policy range before allocating memory or running the KDF.

The candidate 64 MiB / 3-pass / 4-lane profile follows the second RFC 9106 recommended option. A final platform policy must benchmark supported devices and may define stronger profiles. A lower-memory profile must not be silently selected; any exception requires explicit security review and must remain at or above the current approved GoreeCloud floor.

### 3.3 Key-encryption / wrapping keys

A factor-derived or device-held secret must not be reused directly across unrelated cryptographic purposes.

HKDF-SHA-256 derives purpose-specific **Key Encryption Keys (KEKs)** using versioned context strings, for example:

- `goreecloud-vault/vrk-wrap/v1`
- `goreecloud-vault/dek-wrap/v1`
- `goreecloud-vault/search-index/v1`
- `goreecloud-vault/sync-state/v1`

Context input must bind the appropriate vault and format identifiers. Key-separation rules must be testable and encoded rather than dependent on developer convention alone.

### 3.4 Data-encryption keys

Each independently encrypted record revision uses a fresh random 256-bit **Data Encryption Key (DEK)**.

The DEK encrypts the protected record payload with XChaCha20-Poly1305.

The DEK is then wrapped under a VRK-derived KEK. This envelope design permits:

- VRK rotation by rewrapping DEKs rather than decrypting and re-encrypting all record payloads;
- independent record-key rotation;
- smaller compromise domains;
- future cryptographic migration by creating new envelope versions.

Attachments or large file objects should use independent random file keys and a separately reviewed chunking/streaming format. Record DEKs must not be reused as file-stream keys unless the eventual file format explicitly proves that reuse safe.

## 4. Key slots and factors

A **key slot** is a versioned envelope that grants one approved factor a way to unwrap a VRK.

Candidate factor types include:

- user passphrase-derived UK;
- device-local OS/hardware-backed wrapping key;
- explicit recovery secret;
- organization/shared-vault member key material;
- future hardware/security-key factor when an approved deterministic secret or wrapping primitive is available.

Key slots must include:

- format version;
- slot identifier;
- factor type;
- algorithm/KDF identifiers;
- KDF parameters where applicable;
- random salt where applicable;
- random AEAD nonce;
- wrapped VRK ciphertext;
- associated-data context;
- creation/version metadata required for safe migration.

Possession of key-slot metadata must not by itself authorize access. Authentication, authorization, policy, and key possession remain separate gates.

## 5. Passkeys and WebAuthn

Passkeys/WebAuthn credentials are primarily authentication credentials. Vault must not assume that an ordinary WebAuthn authentication ceremony yields a stable decryption key.

A passkey may become an unlock factor only through a separately reviewed design using an appropriate platform/WebAuthn secret-producing capability (for example, an approved PRF-style extension where supported), with explicit fallback, portability, device-loss, and recovery semantics.

Until that design exists:

- passkeys may authenticate a user;
- passkeys must not silently replace the Vault encryption factor;
- successful authentication must not be treated as proof that the decrypting key is available.

## 6. Device-local keys

Supported clients may create device-local wrapping keys protected by platform facilities such as:

- hardware-backed keystores;
- secure enclaves;
- OS credential/key stores;
- protected files with restrictive permissions when stronger facilities are unavailable.

Device keys:

- are device-scoped;
- must not be synchronized as plaintext;
- must be independently revocable;
- must not become an undeclared recovery backdoor;
- may wrap a VRK only through an explicit key slot.

The exact Android, desktop, browser, and server-side device-key mechanisms require platform-specific review.

## 7. Recovery secrets

Recovery must use explicit, independently generated cryptographic material rather than a weak derivative of ordinary profile data.

Candidate principles:

- generate recovery secret material from a CSPRNG;
- represent it in a human-manageable encoding only through a separately reviewed format;
- use it to derive/wrap key material through a dedicated recovery key slot;
- keep recovery-factor state separate from ordinary authentication reset;
- require user-visible rotation/revocation after recovery;
- support removing a recovery slot;
- never allow support personnel or infrastructure administrators to reconstruct the secret unless a separately governed exceptional-access design explicitly establishes that capability.

Emergency/break-glass access for organizations is a separate authorization and cryptographic-sharing problem and must not be implemented by copying the user's recovery secret.

## 8. Envelope format

All persisted encrypted objects require explicit self-describing versioned envelopes.

### 8.1 Cleartext envelope fields

Only metadata required to parse, select algorithms, locate the correct security domain, and validate policy should remain outside the ciphertext.

Candidate fields:

- format magic;
- format version;
- algorithm suite identifier;
- vault identifier;
- object identifier;
- revision/generation identifier;
- key version / wrapped-DEK version;
- nonce(s);
- ciphertext lengths;
- KDF identifiers/parameters/salts for key slots.

Clear metadata is privacy-sensitive and must be minimized. Searchable titles, usernames, URLs, record names, notes, tags, and secret-bearing custom fields are not presumed cleartext.

### 8.2 Associated data

AEAD associated data must bind ciphertext to its security context.

Candidate record associated data includes canonical serialization of:

- envelope format version;
- algorithm suite;
- vault identifier;
- object identifier;
- record type identifier where required for anti-confusion;
- revision/generation;
- key version.

Candidate wrapped-key associated data includes:

- envelope version;
- vault identifier;
- slot identifier;
- factor type;
- KDF/algorithm identifiers;
- key version.

Canonical encoding must be unambiguous and independently testable. Ad-hoc string concatenation is prohibited.

## 9. Nonces

XChaCha20-Poly1305 uses a 24-byte nonce.

Candidate rule:

- generate a new nonce from the OS CSPRNG for every encryption operation under a given key;
- never use timestamps, counters shared across unsynchronized devices, record IDs, or predictable values as a substitute for random nonces;
- store nonces with the ciphertext;
- treat RNG failure as a hard failure;
- never retry encryption with the same nonce after partial failure unless the entire operation is demonstrably discarded before any ciphertext is committed.

The extended nonce choice is intended to make independent random nonce generation safe across offline and multi-device workflows without requiring a global nonce allocator.

## 10. Record encryption flow

Candidate record-write sequence:

1. Validate authorization and vault scope at the trusted operation boundary.
2. Construct canonical record metadata and revision context.
3. Generate a fresh random 32-byte DEK.
4. Generate a fresh XChaCha20-Poly1305 nonce.
5. Encrypt the canonical protected record payload under the DEK using context-bound associated data.
6. Derive the DEK-wrapping KEK from the VRK using HKDF-SHA-256 and a versioned purpose/context.
7. Generate a fresh wrapping nonce.
8. Wrap the DEK under the KEK with XChaCha20-Poly1305 and associated data binding vault/object/revision/key version.
9. Persist only the versioned encrypted envelope and permitted minimized metadata.
10. Clear mutable plaintext/DEK buffers on a best-effort basis and release references promptly.

Persistence must be atomic enough that a crash cannot create an apparently valid record pointing to missing or mismatched wrapped keys.

## 11. Record decryption flow

Candidate record-read sequence:

1. Authenticate the principal/session where applicable.
2. Authorize the exact vault/object/action.
3. Load and strictly validate the envelope structure and policy bounds.
4. Select only an allowlisted supported algorithm suite.
5. Obtain the appropriate VRK from the unlocked key state.
6. Derive the expected DEK-wrapping KEK.
7. Authenticate/decrypt the wrapped DEK.
8. Authenticate/decrypt the payload with exact associated data.
9. Return plaintext only to the narrowly authorized caller/surface.
10. Minimize copies and plaintext lifetime.
11. On any parsing, key, or authentication failure, return a distinct safe failure state; never attempt plaintext fallback or cross-vault key guessing.

## 12. Lock state and memory

The Go runtime does not provide a general guarantee that all copies of sensitive bytes can be reliably erased because garbage collection, compiler transformations, stack copies, and runtime internals may retain data.

Therefore Vault must not promise perfect memory wiping in Go.

Required practical controls:

- keep long-lived key state in small explicit structures;
- prefer mutable byte slices over immutable strings for secret material where practical;
- avoid formatting secret bytes into errors/logs;
- avoid unnecessary copies;
- overwrite mutable buffers after use when useful;
- use `runtime.KeepAlive` or equivalent only when it has a specific reviewed purpose, not as a claim of guaranteed erasure;
- on lock, drop all references to decrypted record caches, VRKs, DEKs, and factor-derived keys promptly;
- design automatic lock so new decrypt operations cannot race through after lock state changes;
- document stronger platform-specific protected-memory facilities when they are actually used.

A fully privileged live-memory attacker remains outside the guarantees of software-only process encryption.

## 13. Rotation

### Passphrase / KDF upgrade

Changing a passphrase or increasing Argon2id parameters should:

1. derive a new UK with a new random salt and current parameter profile;
2. unwrap the VRK through the authorized old factor;
3. create a new key slot wrapping the same VRK;
4. atomically activate the new slot;
5. retire/revoke the old slot;
6. record security evidence without secret values.

Record payloads do not require re-encryption solely for a passphrase change.

### VRK rotation

VRK rotation is required when the VRK itself may be compromised or a policy requires cryptographic re-keying.

Candidate process:

- generate a fresh random VRK;
- rewrap every active DEK under the new VRK-derived KEK;
- issue fresh authorized key slots;
- retire old wrapping state;
- ensure offline/stale clients cannot silently reintroduce old active authority;
- preserve recovery/rollback only through an explicitly controlled migration window.

### DEK rotation

Generate a new DEK when:

- a record is rewritten under a policy that requires new key material;
- compromise is suspected;
- cryptographic format migration requires it;
- a sharing boundary changes in a way that makes key reuse unsafe.

## 14. Synchronization

The preferred sync model carries encrypted envelopes and minimized metadata.

A synchronization service must not require VRKs or plaintext record data merely to store, order, or transfer record state.

Sync design must additionally solve:

- revision identity;
- conflict handling;
- replay/rollback resistance;
- device revocation;
- stale-client behavior;
- deleted/tombstoned record semantics;
- attachment integrity;
- policy freshness.

Those mechanisms require a separate synchronization protocol review and are not established by this document alone.

## 15. Backup and restore

Backups should contain:

- encrypted record/file envelopes;
- encrypted key slots;
- required non-secret format metadata;
- integrity/version information;
- policy/configuration state needed for recovery, subject to minimization.

Backups must not silently include plaintext Vault contents.

Restore must verify:

- envelope integrity;
- required key-slot availability;
- format support;
- version/generation consistency;
- recovery authority.

A backup that cannot be decrypted with the documented recovery materials must not be represented as a successful Vault backup.

## 16. Sharing

Secure sharing must not reuse the user's passphrase, UK, VRK, or primary recovery secret as the share capability.

Future sharing design should use share-specific random key material or explicit recipient key wrapping so that:

- a share can be revoked independently;
- expiration does not require changing the user's Vault unlock factor;
- one share compromise does not reveal unrelated Vault contents;
- recipients receive only the intended record/material.

One-time and self-destructing semantics require authoritative server-side state in addition to cryptography; ciphertext alone cannot prove that a recipient did not copy plaintext.

## 17. Import and export

Plaintext import/export formats are inherently high risk.

Required cryptographic rules:

- protected export formats use a separately versioned encryption envelope;
- export passphrases use a dedicated KDF salt/parameters and must not reuse the live Vault UK;
- import/export temporary keys and plaintext must be scoped to the operation;
- no automatic reuse of exported key material as live Vault root keys;
- malformed or unsupported encrypted exports fail closed.

Filesystem secure-deletion limitations must be documented; cryptographic erasure by destroying wrapping keys may provide stronger practical deletion semantics for encrypted temporary data.

## 18. Algorithm agility and downgrade resistance

Every encrypted envelope must identify its format and algorithm suite.

Implementations must:

- maintain an allowlist of accepted suites;
- define minimum accepted KDF parameters;
- reject unknown, malformed, or explicitly retired suites;
- never silently fall back to a weaker suite;
- support migration by decrypting an accepted old envelope and re-encrypting into the new format under explicit authorization;
- bind algorithm/version identifiers into associated data.

“Agility” must not become attacker-controlled algorithm selection.

## 19. Error handling

External errors must not reveal:

- whether a guessed secret was nearly correct;
- decrypted content;
- key bytes;
- KDF outputs;
- internal key-slot structure beyond what the caller is authorized to inspect.

Internally, failures should preserve enough typed information to distinguish:

- locked state;
- denied access;
- unsupported format;
- KDF policy rejection;
- authentication-tag failure/corruption;
- missing key slot;
- revoked factor/device;
- recovery required.

Secret values must not be interpolated into error text.

## 20. Test requirements before accepted implementation

Any implementation of this architecture must include tests for at least:

- encrypt/decrypt round trip;
- tampered ciphertext rejection;
- tampered associated-data rejection;
- wrong vault/object/revision binding rejection;
- wrong factor/passphrase rejection;
- malformed/truncated envelope rejection;
- unsupported algorithm/version rejection;
- KDF parameter upper/lower bound enforcement;
- nonce length and RNG failure handling;
- cross-vault key isolation;
- key-slot rotation;
- passphrase/KDF rewrap without payload re-encryption;
- VRK rewrap/migration behavior;
- lock-state denial;
- no secret values in expected logs/errors;
- corruption recovery boundaries;
- fuzzing of envelope parsing before release claims.

Cryptographic test vectors should be added where standards provide them.

## 21. Human security review checklist

Before VLT-004 can be marked accepted and before VLT-005 protected storage is allowed to proceed beyond non-secret scaffolding, an explicit human security reviewer must examine and accept or revise:

- Argon2id profile and supported-device cost targets;
- XChaCha20-Poly1305 selection and implementation library;
- HKDF context/domain separation;
- per-vault VRK hierarchy;
- DEK envelope design;
- key-slot serialization;
- associated-data canonicalization;
- recovery-factor model;
- device-key model;
- passkey/WebAuthn separation from encryption;
- memory-handling limitations;
- rotation and rollback strategy;
- sync replay/rollback design dependencies;
- backup/recovery implications;
- platform-specific keystore use;
- dependency and supply-chain posture.

Review evidence must identify the exact repository revision reviewed. Passing CI is not a substitute for this review.

## 22. References

- RFC 9106 — Argon2 Memory-Hard Function: https://www.rfc-editor.org/rfc/rfc9106.html
- RFC 5869 — HKDF: https://www.rfc-editor.org/rfc/rfc5869.html
- RFC 8439 — ChaCha20 and Poly1305: https://www.rfc-editor.org/rfc/rfc8439.html
- Go x/crypto Argon2: https://pkg.go.dev/golang.org/x/crypto/argon2
- Go x/crypto XChaCha20-Poly1305: https://pkg.go.dev/golang.org/x/crypto/chacha20poly1305
- Go x/crypto HKDF: https://pkg.go.dev/golang.org/x/crypto/hkdf
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- GoreeCloud Instructions — Secure Coding and AI-Assisted Development.
- GoreeCloud Standard — Platform Security Baseline and Controls.
