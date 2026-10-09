# Password generation — Development prototype

The native GoreeCloud `src/password-generator.mjs` is deliberately **unconnected** to authentication, vault persistence, browser autofill, clipboard, telemetry, networking, and any production UI.

## Implemented

- Cryptographically secure bounded sampling using the Node.js `crypto.randomInt` API.
- Mixed upper/lowercase/digit/symbol selection with at least one representative of each requested class.
- An opt-in exclusion of visually ambiguous characters.
- Bounds on password length (16–256), strict option validation, and a conservative **distribution-based** lower bound for the implemented forced-class and shuffled uniform-sampling construction. The strength gate refuses configurations whose bound is under 128 bits. This is not an independent cryptographic audit.
- Non-persisting in-memory result; callers must control display, redaction, clipboard, exposure and lifecycle.

## Limitations and gates

**Not audited, not released.** The prior length × alphabet-size **upper-bound heuristic** could overstate strength. The candidate now uses the minimum of the pre-shuffle probability distribution to conservatively bound output guessing probability; permutation averaging cannot increase the maximum probability. The construction, proof assumptions, CSPRNG/platform mapping and accepted minimum security level still require independent review before product use.

Before release: adversarial security review, approved runtime/platform CSPRNG on every supported client, policy constraints and service-specific allowed characters, Unicode behavior, inaccessible-memory and screen-sharing threats, keyboard/clipboard protections, secure UI and accessibility, and negative tests. No password values in analytics, logs or CI output.

Passphrase generation requires a reviewed, versioned wordlist and secure unbiased word selection; it is **not** implemented yet.
