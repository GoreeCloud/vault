# Password generation — Development prototype

The native GoreeCloud `src/password-generator.mjs` is deliberately **unconnected** to authentication, vault persistence, browser autofill, clipboard, telemetry, networking, and any production UI.

## Implemented

- Cryptographically secure bounded sampling using the Node.js `crypto.randomInt` API.
- Mixed upper/lowercase/digit/symbol selection with at least one representative of each requested class.
- An opt-in exclusion of visually ambiguous characters.
- Bounds on password length (16–256), input type validation, and rejection of low-strength configurations by a basic upper-bound estimate.
- Non-persisting in-memory result; callers must control display, redaction, clipboard, exposure and lifecycle.

## Limitations and gates

**Not audited, not released.** The configuration-strength check is not a formal entropy proof because mandatory class membership and shuffling alter the distribution. It prevents obviously weak input configurations but does not establish an accepted min-entropy or cryptographic product.

Before release: adversarial security review, approved runtime/platform CSPRNG on every supported client, policy constraints and service-specific allowed characters, Unicode behavior, inaccessible-memory and screen-sharing threats, keyboard/clipboard protections, secure UI and accessibility, and negative tests. No password values in analytics, logs or CI output.

Passphrase generation requires a reviewed, versioned wordlist and secure unbiased word selection; it is **not** implemented yet.
