# Synthetic passkey relying-party / origin preflight

**Status: Development-only screening. Not a WebAuthn implementation, authenticator, credential provider, browser integration, or authorization decision.**

`src/synthetic-passkey-rp-preflight.mjs` screens fabricated metadata for a deliberately conservative passkey creation/get candidate. It accepts no challenge, credential ID, user handle, authenticator data, attestation object, assertion, signature, private key, encrypted vault value, session token, or biometric/device proof.

## Conservative Development policy

The current fixture requires:

- schema version 0 and operation `create` or `get`;
- HTTPS document and top-level origins that match exactly;
- top-level frame depth only;
- an explicit caller claim of user initiation;
- no private-context use;
- a caller claim that the vault is unlocked;
- a current caller-supplied host-risk verdict matching the same origin; and
- an RP ID that exactly equals the normalized current hostname.

The exact-host RP rule is intentionally stricter than the full WebAuthn relying-party-ID rules. It avoids prematurely encoding parent-domain delegation, public-suffix behavior, platform exceptions, or browser policy into this prototype.

## Security boundary

Every contextual field is forgeable JavaScript fixture data. `candidate: true` must never cause a browser/native credential API call, reveal a credential, select an authenticator, satisfy user verification, or establish phishing safety. The module rejects extra properties and hostile object shapes and never echoes the RP ID or origin in its result.

## Required real implementation evidence

A shipping passkey lifecycle requires reviewed WebAuthn/FIDO semantics; authoritative browser/native origin and top-level-context evidence; RP ID and public-suffix validation; challenge freshness; ceremony type and cross-origin rules; authenticator/user-verification policy; credential lifecycle and encrypted storage; device/platform behavior; phishing/IDN/private-window tests; accessibility; recovery/export policy; and exact-revision independent security review.

This preflight does not satisfy security issue #1 and does not establish browser, Identity, Policy, Wardveil, passkey-provider, or production conformance.
