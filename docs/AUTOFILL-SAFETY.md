# GoreeCloud Vault — browser autofill preflight

**Status:** Native Development prototype; **not enabled in any browser, service, extension or client**.

`src/autofill-preflight.mjs` screens possible autofill events without reading or returning passwords. It rejects insecure origins, cross-origin navigation, subdomains, all subframes, private contexts, implicit fills, locked sessions, missing user consent and stale or mismatched host-reported risk evidence. The input shape now requires exactly the expected own data properties, rejects accessors, symbols, missing or extra keys, and fails closed on throwing proxies; the origin helper rejects raw controls, whitespace and backslashes instead of relying on URL-parser normalization.

## Trust model

**Calling code is security-critical.** JavaScript executing in a web page can forge flags such as `userInitiated`, `vaultUnlocked` and `hostRiskVerdict`. The presence of these fields is **not** cryptographic proof or a genuine Wardveil integration. Proxy objects may fake descriptors, and passing the strict shape screening is not a trusted browser/host attestation. Never call this function with values authored by the page. Do not connect its `candidate: true` output directly to a password store or form-fill API. It is *not* an authorization decision.

Before any browser integration, an independently trusted native extension/browser background component must:

1. Bind origin, frame identity, top-level navigation, tab, document lifecycle and actual user gesture from protected browser APIs.
2. Bind the saved credential to an authenticated, unlocked, authorized vault state without exposing it to the page or this preflight module.
3. Evaluate risk and the relevant GoreeCloud Policy and Wardveil contracts through authenticated capability interfaces, treating unknown, stale and missing evidence as deny.
4. Enforce explicit per-fill consent or a narrowly reviewed preference and prevent fills in deceptive or isolated/private contexts unless specifically designed and reviewed.
5. Red-team navigation races, redirects, shadow DOM, credential theft from page script, CSP, service workers, download links, phishing and inter-process messages; validate Firefox and GoreeCloud Browser separately.

## Deliberate restrictions

There is no related-domain heuristic, wildcard, HTTP exception, page API, extension IPC, autofill side effect, plaintext credential read, telemetry or network request. Future compatibility modes require threat-model updates and security review before enabling.

Related: `docs/THREAT-MODEL.md`, `docs/SECURITY-GATES.md`, blocking [issue #1](https://github.com/GoreeCloud/vault/issues/1).
