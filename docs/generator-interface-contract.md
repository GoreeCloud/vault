# Vault Generator Interface Contract

Status: development-only. No runtime integration is claimed.

## Generator controls
- Provide labelled keyboard-operable Password / Numeric PIN selection.
- Password length 16–256 with a conservative 128-bit configuration minimum, PIN length 6–32 (PINs are not 128-bit passwords). Validate strict integers.
- Password options: lowercase, uppercase, digits, symbols, ambiguous-character exclusion, and bounded custom excluded characters (up to 256). Explain when a configuration fails the 128-bit target.
- Present clear errors near controls with assistive-technology associations.
- Support focus visibility, contrast, reduced motion, small screens, and translated labels.

## Privacy and lifecycle
- Mask outputs by default and require deliberate reveal.
- Never include outputs in URLs, logging, telemetry or analytics.
- No automatic clipboard copies.
- Conceal displayed output on background, device lock, session expiry, profile switch or logout.
- Do not claim to erase immutable strings from process memory.

## Release boundary
- Glaze components and tokens must be checked against their real implementation before integration.
- Cryptography review, real vault unlocking, persistence, and authentication remain outside this reference contract. Generator output is not automatically an approved, secure password-management or enrollment workflow.
- Require exact-head CI, keyboard and screen-reader acceptance, clipboard behavior checks, and human security approval before release.
