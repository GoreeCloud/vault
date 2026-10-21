# GoreeCloud Vault — approved icon migration (development)

The product-specific Vault vector is copied byte-for-byte from GoreeCloud's canonical
[branding-assets/products/vault/app-icon.svg](https://github.com/GoreeCloud/branding-assets/blob/main/products/vault/app-icon.svg)
at source blob `c34edae0c57a6bac002fb0f940de7ae26cf1450e`.
That source, not this derivative, controls the approved icon geometry and colors.
The platform-wide GoreeCloud logo is **not** substituted for a distinct Vault identity.

`assets/branding/app-icon.svg` is the exact approved source snapshot.
`scripts/render_vault_icons.py` rasterizes it faithfully via librsvg/PyGObject
into the normal browser toolbar/manifest icons and web favicons/app icons.
Re-run on a development host with GdkPixbuf's SVG loader installed whenever
the canonical source changes; update the recorded approved source blob deliberately.

**Scope and limits:** These normal/icon entry points are real source modifications,
not an assertion that GoreeCloud UI has been implemented throughout the app.
Existing beta, gray, locked, native messaging, desktop-tray, platform installers,
signing/notarization, badges, other app surfaces and embedded upstream marks are
**not fully migrated**. Do not distribute the fork as a rebranded product without
an exhaustive asset/trademark audit and runtime screenshot-based UI acceptance.
Original third-party copyrights and licenses are retained and unaffected.
