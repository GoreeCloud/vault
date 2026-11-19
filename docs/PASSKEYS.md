# GoreeCloud Vault — Passkey Architecture and Status

**Present implementation:** An encrypted `passkey` record type stores referencing metadata such as relying-party (RP) domain, credential identifier and optional user handle, with user notes and tags. It **does not contain or use a passkey private key** and **cannot register or authenticate to an RP**. Do not advertise it as implemented passkey login.

Passkeys are public-key WebAuthn credentials, unlike TOTP or traditional login passwords. Production-grade password-manager passkey support must create/receive RP challenges, implement authenticator semantics, bind credentials to the correct RP ID, sign assertions with a protected non-exportable or specifically controlled private key, enforce UV/UP and user consent, handle registration/authentication lifecycle and defend against origin confusion and rollback. A website must register the authenticator's public key through its actual server protocol.

Firefox 150+ supports extension-initiated WebAuthn requests for permitted RP IDs, which can interact with an authenticator. This **does not by itself grant a vault extension the ability to intercept and satisfy arbitrary website WebAuthn calls**, manage their private keys, or register keys with websites without a proper server challenge. GoreeCloud Vault does not request broad host access for this experimental behavior.

**Next steps:** Examine appropriate Firefox authenticator integration APIs and supported browser versions; prototype constrained registration and assertion against a disposable GoreeCloud test RP using real challenges, consent and secure keys; design Android Credential Manager/Flutter integration; plan import/recovery and storage migrations; threat-model phishing, RP-ID confusion, replay, attestation and synchronized credential lifecycle; implement automated and browser/device E2E verification before claiming passkey support.

No usable portable passkey manager or universal website passkey interception is implemented today.
