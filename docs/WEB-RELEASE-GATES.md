# Web production bundle and offline security boundaries

**Stage: development preview.** GoreeCloud Vault does not currently ship an
audited web release or public managed hosting service. There is no sync
server, credential-sharing backend or cloud identity provider.

## Production build policy

Production Vite builds use a deliberately constrained Content Security Policy:
scripts and styles must come from the application origin; connections, workers,
frames, forms, embedded objects and base-URL rewrites are denied. The
development server permits same-origin HMR connections and its required
inline development styles; those development-only exceptions may never
appear in the production package.

The web CI build runs a zero-dependency source-controlled release checker
that verifies the exact production CSP, no-referrer policy, one local JS
entrypoint, one local stylesheet, presence of both referenced assets, absence
of unexpected files, source maps, symlinks and remote HTML scripts, and a
strict three-file build allowlist. Separate negative tests verify that a
weakened CSP or additional resources cause rejection.

Local verification:

    cd apps/web
    npm ci --ignore-scripts
    npm run build
    npm run verify:bundle
    npm test
    npm audit --omit=dev --audit-level=high

The browser E2E workflow also runs a separate production Vite preview in
Chromium and Firefox with a disposable synthetic master password, confirms
authenticated encrypted local storage and verifies that even a same-origin
fetch request is rejected by the generated production CSP.

These tests prevent accidental policy drift; they do **not** establish that
generated JavaScript is benign, that an HTTP host serves trusted bytes,
that browser extensions/OS accounts are safe, or that sensitive production
secrets are ready to store. The build has no monitoring, sync or telemetry
service. Future GoreeCloud Mesh integration needs a separately reviewed
allowlisted API, user consent, Wardveil security controls and GoreeShield
privacy review before the network-deny policy can change.

## Deployment remains blocked

Before any production exposure, enforce CSP and other security headers at
the hosting layer (not meta tags alone), HTTPS/HSTS, reviewed release
artifacts, trusted update and rollback, independent security review, privacy
documentation, realistic keyboard/accessibility testing, and verified
backup/export/restore in separate disposable profiles. Never upload real
vault contents to GitHub Actions or issue trackers. No deployment is
performed by this gate.
