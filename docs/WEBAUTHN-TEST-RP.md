# Disposable WebAuthn relying-party verification fixture

**Status:** Test infrastructure only. **Not a GoreeCloud Vault passkey manager,
not a credential provider, not a hosted identity service and not a production
login.** No real users, keys or credentials should be registered here.

All direct Node dependencies are pinned by package-lock.json and installed
without lifecycle scripts; the local package audit returned no reported
vulnerabilities at the checked revision. No audit or dependency scanner
guarantees that software is safe.

The source under tests/webauthn-rp/ is a separate, loopback-only test RP using
the published MIT-licensed @simplewebauthn/server (14.1.0) protocol verifier.
It exercises an actual browser WebAuthn virtual authenticator through
Playwright, without exporting or handling authenticator private keys in
GoreeCloud Vault's UI, encrypted format or native apps.

## Local development

Node.js 24+, with trusted Playwright Chromium installed:

    cd tests/webauthn-rp
    npm ci --ignore-scripts
    npm test
    npx playwright install chromium
    npm run test:e2e
    # Optional manual localhost test only:
    npm start

The test server binds to **localhost on an ephemeral operating-system port**.
It is deliberately **not** configurable for public network access, public
DNS names, VPN or cloud deployment. Its state is in memory and discarded when
it shuts down. Synthetic tests create ephemeral virtual-authenticator keypairs,
not user credentials.

## Protocol coverage

- Generates cryptographically random WebAuthn registration and authentication
  challenges using the vetted SimpleWebAuthn server implementation
- Stores an unpredictable, short-lived, **single-use** ceremony identifier;
  consumes it before verification to prevent replay
- Validates exact localhost test origin and RP ID; rejects unrelated
  Origin and Host headers and does not provide CORS grants
- Requires browser-side user presence and user verification, a discoverable
  credential and a server-verified registration response
- Stores only a synthetic test user's **credential public key**, counter and
  allowed transport metadata in an ephemeral map
- Verifies subsequent authenticator assertion signatures with the registered
  public key and updates the counter after successful verification
- Rejects malformed inputs, previously used challenges, unknown credentials,
  altered signatures and unsupported operations
- Caps JSON request bodies at 64 KiB, active ceremonies at 128 and registered
  test credentials at 16; serves static assets with a restrictive CSP and no
  persistent data, analytics, logs of WebAuthn responses or secrets

Node unit tests cover the challenge ledger; browser tests use Chromium's virtual
WebAuthn authenticator for registration, assertion, replay rejection,
origin/host checks and cryptographically tampered assertions.

## Explicit production blockers

This **does not** implement a password-manager authenticator that can answer
WebAuthn calls from arbitrary relying parties, store protected passkey private
keys, sync passkeys, perform platform user verification in GoreeCloud Vault, or
provision Android Credential Manager/Firefox authenticator integrations.
There is **no account authorization**, identity binding, durable credential
storage, multiuser isolation, production TLS, attestation trust policy,
backup/rollback protocol, hardened rate limiting, or independently reviewed
security posture in this test fixture. Never turn this test server into a
production service by changing only its bind address.

To implement real user-visible passkeys, first define and audit the extension
and OS authenticator integration, origin/RP caller-binding contract, user
presence/verification and consent flows, protected key lifecycle, backup and
recovery, identity authorization and replay-resistant challenge storage.
The Firefox extension's exact-origin password autofill policy stays unchanged.

Upstream references: https://www.w3.org/TR/webauthn-3/ ,
https://simplewebauthn.dev/docs/packages/server ,
https://playwright.dev/docs/api/class-credentials .
