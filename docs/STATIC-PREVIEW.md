# GoreeCloud Vault — static interface preview

**Development only — no credentials.** The repository-local `preview/index.html` and `preview/styles.css` implement a read-only visual design study. No sign-in, vault store, forms, input fields, browser extension, passkeys, encryption, account session, backend, sync service, data writes or remote fetches are present. Do **not** use this sketch to enter or store real secrets.

## Inspect locally

Open `preview/index.html` from a local checkout. The page is intentionally static and works offline without installing dependencies or running a server. It includes planned category cards and truthful, unavailable/pending release gates. It has no JavaScript.

## Current checks

The repository's `npm test` suite includes `test/static-preview.test.mjs`, which checks absent input/executable elements, a blocking CSP, no remote dependencies, meaningful labels and local navigation anchors, visible focus styling, responsive layout rules, reduced-motion preference and forced-colors handling. These are **source-level assertions only**. They do not constitute actual browser visual review, assistive-technology testing or device acceptance.

## Design authority and pending qualification

Glaze V1.7 / `1.7.0` is the **intended Stable consumer target**. This locally styled sketch **does not import or qualify the Glaze runtime** and does not consume proven canonical semantic tokens or official identity assets. The inherited Glaze 1.7.0 Stable runtime is distinct from the unfinished 1.7.1 Development scope.

Before any Glaze consumer or production claim: pin reviewed Stable runtime and tokens, verify actual keyboard and screen-reader navigation, WCAG contrast, high contrast, zoom/text scaling, narrow and wide viewport layouts, light/dark mode, reduced motion, RTL/localization, threat boundaries, representative devices, performance and rollback. Screens showing security or sync success must use actual authoritative evidence, never fabricated status.

Independent cryptography, recovery, identity and authorization security review tracked in [issue #1](https://github.com/GoreeCloud/vault/issues/1) remains open; [implementation backlog #3](https://github.com/GoreeCloud/vault/issues/3) remains active. This is a **non-operational interface prototype** and must not be deployed as a password manager.
