# GoreeCloud Vault — static interface preview

**Development only — no credentials.** The repository-local `preview/index.html` and `preview/styles.css` implement a read-only visual design study. No sign-in, vault store, forms, input fields, browser extension, passkeys, encryption, account session, backend, sync service, data writes or remote fetches are present. Do **not** use this sketch to enter or store real secrets.

## Inspect locally

Open `preview/index.html` from a local checkout. The page is intentionally static and works offline without installing dependencies or running a server. It includes planned category cards and truthful, unavailable/pending release gates. It has no JavaScript.

## Optional loopback HTTP QA

The optional `tools/serve-preview.mjs` script starts a **development-only** local preview at `http://127.0.0.1:8765/`. Start it with `node tools/serve-preview.mjs` in the repository root and stop it with Ctrl+C. It serves only the static concept HTML and CSS, with restrictive HTTP headers; it does not provide a Vault account, backend, storage, encryption, authentication or credential submission.

Do **not** expose this preview by public reverse proxy, LAN binding or tunnel. Do not enter real secrets. Four tests in `test/preview-server.test.mjs` cover the allowlisted assets, security headers, denied mutation and traversal requests, and Host-header rejection. The owner laptop and exact-head CI passed 72 tests at `df34c1ae`. These tests do not establish full browser CSP enforcement or Glaze/assistive-technology acceptance.

## Current checks

The repository's `npm test` suite includes `test/static-preview.test.mjs`, which checks absent input/executable elements, a blocking CSP, no remote dependencies, meaningful labels and local navigation anchors, visible focus styling, responsive layout rules, reduced-motion preference and forced-colors handling. These are **source-level assertions only**. They do not constitute actual browser visual review, assistive-technology testing or device acceptance.

## Bounded Chromium rendering review (8 October 2026)

The **exact Git blobs** for `preview/index.html` (`f66e099146736e9fa4a0af70e815dbf44d8c8d0f`) and `preview/styles.css` (`1ff8eaf0693a031f9202baeec658fd7b41fa316e`) were independently rendered with Chromium at CSS viewport widths **320, 360, 390, 540, 768, 1024 and 1440 px**, including both light and dark appearances and one reduced-motion scenario. In this bounded inspection, there was **no horizontal document overflow, no JavaScript page errors, no runtime network requests**, and all preview anchor links resolved to existing IDs; the keyboard skip link and section navigation worked.

**Accessibility defect resolved:** earlier light-mode hover/focus styling used a dark navigation background with dark text (measured **1.29:1**). The theme-specific fix uses `--nav-hover` and measured **12.23:1** for light navigation hover versus **11.06:1** in dark mode. The Node suite adds a minimum **4.5:1 contrast regression** based on the theme tokens.

**Scope limitation:** this QA sandbox blocks direct `file://` and loopback URL navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`, so markup was injected into Chromium's document and the byte-identical stylesheet was injected with CSP bypass **solely to inspect rendering**. This does **not** validate HTTP serving, browser CSP enforcement, dependency loading, actual browser installation on owner devices, independent assistive-technology testing, real 200–400% browser zoom or formal WCAG conformance. The existing source-level safety tests independently check the CSP and absence of dynamic credential-entry fields. No Glaze consumer acceptance is claimed.

## Owner desktop screenshot review (8 October 2026)

The owner supplied a **light-mode desktop screenshot** of the loopback preview after running the development harness. The screenshot visibly shows the sidebar, overview, four planned-category cards, and truthful security/release gates; it also revealed **low-contrast glyphs on dark category tiles** and undersized auxiliary labels. A subsequent style-only revision assigns explicit light/dark tile foreground/background colors and slightly increases the navigation, section-description, status and tag type sizes. Automated tests require **4.5:1 or better tile-glyph contrast** for both themes.

This screenshot is useful visual feedback, **not** evidence of browser-enforced CSP, responsive layouts on other devices, assistive-technology compatibility, Glaze runtime adoption, or production acceptance. The revised style requires fresh owner-browser inspection; screenshots are not stored as application data in the repository.

## Design authority and pending qualification

Glaze V1.7 / `1.7.0` is the **intended Stable consumer target**. This locally styled sketch **does not import or qualify the Glaze runtime** and does not consume proven canonical semantic tokens or official identity assets. The inherited Glaze 1.7.0 Stable runtime is distinct from the unfinished 1.7.1 Development scope.

Before any Glaze consumer or production claim: pin reviewed Stable runtime and tokens, verify actual keyboard and screen-reader navigation, WCAG contrast, high contrast, zoom/text scaling, narrow and wide viewport layouts, light/dark mode, reduced motion, RTL/localization, threat boundaries, representative devices, performance and rollback. Screens showing security or sync success must use actual authoritative evidence, never fabricated status.

Independent cryptography, recovery, identity and authorization security review tracked in [issue #1](https://github.com/GoreeCloud/vault/issues/1) remains open; [implementation backlog #3](https://github.com/GoreeCloud/vault/issues/3) remains active. This is a **non-operational interface prototype** and must not be deployed as a password manager.
