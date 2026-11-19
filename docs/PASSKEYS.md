# GoreeCloud Vault — Passkey Architecture and Status

**Present implementation:** Web and Firefox editors now use a Public Suffix List-aware parser (including private suffixes) to reject invalid new RP reference strings such as com, co.uk, github.io, URLs, userinfo, IP literals and malformed host labels. A separate pure origin/RP-suffix test helper checks HTTPS origins and permits localhost solely for development. These checks are **preflight only**, not a signer or proof that a caller controls an RP. Legacy v1 files stay decryptable even if they contain older RP metadata values.

An encrypted `passkey` record type stores referencing metadata such as relying-party (RP) domain, credential identifier and optional user handle, with user notes and tags. It **does not contain or use a passkey private key** and **cannot register or authenticate to an RP**. Do not advertise it as implemented passkey login.

Passkeys are public-key WebAuthn credentials, unlike TOTP or traditional login passwords. Production-grade password-manager passkey support must create/receive RP challenges, implement authenticator semantics, bind credentials to the correct RP ID, sign assertions with a protected non-exportable or specifically controlled private key, enforce UV/UP and user consent, handle registration/authentication lifecycle and defend against origin confusion and rollback. A website must register the authenticator's public key through its actual server protocol.

Firefox 150+ supports extension-initiated WebAuthn requests for permitted RP IDs, which can interact with an authenticator. This **does not by itself grant a vault extension the ability to intercept and satisfy arbitrary website WebAuthn calls**, manage their private keys, or register keys with websites without a proper server challenge. GoreeCloud Vault does not request broad host access for this experimental behavior.

**Next steps:** Examine appropriate Firefox authenticator integration APIs and supported browser versions; prototype constrained registration and assertion against a disposable GoreeCloud test RP using real challenges, consent and secure keys; design Android Credential Manager/Flutter integration; plan import/recovery and storage migrations; threat-model phishing, RP-ID confusion, replay, attestation and synchronized credential lifecycle; implement automated and browser/device E2E verification before claiming passkey support.

No usable portable passkey manager or universal website passkey interception is implemented today.


## Relying-party domain preflight and acceptance boundaries

A new web/Firefox passkey reference RP ID must be an ASCII registrable domain under the bundled Public Suffix List, or exactly localhost for local tests. Internationalized domains should be entered in ASCII/Punycode. Invalid labels, public suffixes, ports and URL syntax are rejected.

The tested origin/RP helper accepts only the same effective host or an RP registrable-domain suffix on HTTPS, with a localhost HTTP exception. It **is not connected to any signing operation**, cannot verify actual site ownership, and must not be used alone for authorization. Ordinary password autofill continues to require an exact HTTPS origin, never WebAuthn's broader RP suffix rule.

The PSL snapshot and dependencies must be kept current; future functional WebAuthn sign-in needs real server challenge validation, allowed-origin enforcement, user consent/UV and credential private-key lifecycle. Normative reference: https://www.w3.org/TR/webauthn-3/#relying-party-identifier .
