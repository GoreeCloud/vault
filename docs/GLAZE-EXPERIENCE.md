# Glaze integration (design contract, unimplemented)

Use the current **Glaze — GoreeCloud Design & Experience System** from the authoritative `GoreeCloud/glaze` repository and Glaze-Index. As verified from the current canonical Glaze repository, the required Stable consumer target is **Glaze V1.7 / `1.7.0`**, with runtime entrypoint `js/glaze-v1.7.0.mjs`. This is a bounded Stable identity/runtime inherited from V1.6.0; the V1.7.1 richer capabilities are still in Development. **Vault has not adopted that runtime, supplied consumer evidence, or reached Glaze conformance.** Do not copy arbitrary Bitwarden screenshots, colors, controls, or branding as a substitute for integration.

Required experiences: accessible lock/unlock and reauthentication, searchable credential library, safe editing, passkey management, recovery/backup, cross-device sync state, multi-profile switching, migration wizard, breach and risk warnings, privacy/consent controls, secure onboarding, and understandable offline behavior.

Design characteristics: calm, premium, compact hierarchy; strong readability; keyboard and screen-reader support; adaptive window/mobile layout; reduced motion; appropriate contrast; quality iconography; predictable empty/loading/error states; no decorative or misleading security badges. Show meaningful encryption/backup *status* only from authoritative evidence.

Glaze must not be allowed to weaken cryptographic boundaries or entice users into unsafe credential disclosure. Before claiming adoption, pin and vendor/use the approved exact Stable source, perform Vault-local rendered and accessible experience tests, keyboard/touch/reduced-motion, representative platform/security/privacy acceptance, and rollback. Do not import 1.7.1 Development as Stable behavior. The repository contains a [static read-only visual sketch](STATIC-PREVIEW.md) in `preview/`, but **no in-product Glaze runtime or qualified consumer integration** exists. Source-level interface checks do not replace rendered/device accessibility acceptance.

## Fail-closed consumer evidence

The new `docs/glaze-consumer-preflight.json` and `test/glaze-consumer-preflight.test.mjs` record the **unaccepted** Glaze V1.7.0 target. No runtime is imported, no consumer evidence is accepted, and no production authorization exists. This is an explicit Development preflight, not Glaze conformance. Vault was not listed in the checked Glaze consumer registry as of 9 October 2026; re-verify live authority before changing its status.
