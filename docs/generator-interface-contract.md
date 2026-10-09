# Vault Generator Interface Contract

Status: development-only. No runtime integration is claimed.

## Generator controls
- Provide labelled keyboard-operable Password / Numeric PIN selection.
- Password length 12–256, PIN length 6–32. Validate strict integers.
- Password options: lowercase, uppercase, digits, symbols, ambiguous-character exclusion, custom excluded characters.
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
- Cryptography, real vault unlocking, persistence, and authentication remain outside this reference contract.
- Require exact-head CI, keyboard and screen-reader acceptance, clipboard behavior checks, and human security approval before release.
