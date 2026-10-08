# Bounded adversarial regression sweeps (Development only)

The deterministic negative-input sweeps in `test/synthetic-invariant-sweep.test.mjs` exercise 900 synthetic malformed/cross-boundary cases across opaque-sync framing, role/tenant screening and private client item-template shape screening. These cases complement the browser autofill's 384 mutation cases, and they are intentionally **not** coverage-guided fuzzing or security validation.

- Inputs are generated from fixed seeds and fabricated IDs; they contain no production secrets or operational encryption keys.
- Each mutation has a deliberately invalid property and must fail closed, return a frozen candidate/reason-only response, and avoid echoing synthetic fixture strings.
- These tests are reproducible smoke tests of shape validators; they do not validate an authenticated browser host, server-side identity, crypto integrity, side channels, multi-tenant production runtime, or recovery.
- The browser autofill validator also rejects accessor properties, missing/extra and symbol keys, hostile proxies and URL-parser-normalized whitespace/backslash inputs, without claiming to authenticate a web page or session.

Before considering a Beta or production credential path, add property-based and coverage-guided fuzzing of actual reviewed binary parsers, credential and synchronization state machines, AEAD tampering/nonce scenarios, authentication and tenant-isolation runtimes, and platform-representative device tests under the human security approval gate.
