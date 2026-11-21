# Firefox release readiness and unsigned bundle verification

**Status:** Development preview. The repository does not contain signing keys,
a signed Mozilla Add-ons release, verified real-site extension acceptance, or
a production-distribution channel.

## Automated unsigned package boundary

The Firefox CI job installs locked dependencies without package lifecycle
scripts, compiles the popup, tests origin behavior, runs an in-repository
zero-dependency package guard, invokes Mozilla's extension linter, audits
dependencies, and produces an unsigned development archive.

Run locally:

    cd apps/firefox
    npm ci --ignore-scripts
    npm run build
    npm test
    npm run verify:bundle
    npm run lint:extension
    npm audit --audit-level=high
    npm run package

The release guard fails when the package adds host or optional permissions,
background execution, registered content scripts, external connectivity or
unreviewed extension surfaces; it verifies the MV3 Firefox ID, privacy
declaration, strictly local CSP, known local popup JS/CSS references, and
absence of unexpected packaged files or source maps. Synthetic negative
tests ensure that modified manifests and external script URLs are rejected.
No new third-party dependencies or actions are introduced.

This is a **static allowlist**, not a security audit, malware detector,
permission-runtime verifier, reproducible-build certificate, cryptographic
signature, proof of data-collection absence, or protection against privileged
browser extensions. Generated third-party React runtime bundles must still
receive manual source review, including existing linter warnings.

## Before any public signed distribution

- Independently review the code, dependency graph, pinned lockfile, generated
  scripts, local-only CSP and Mozilla linter findings
- Test temporary installation in supported Firefox versions and real form
  injection on consented synthetic test accounts over HTTPS; reject origin
  mismatches, hidden or ambiguous forms, navigation races and cross-origin
  frames; never run unreviewed scripts on sensitive real accounts
- Run backup encryption/export/import and recovery with disposable accounts,
  validate permissions and browser storage limits, verify no unexpected remote
  requests or plaintext persistence, and complete an independent threat review
- Establish Mozilla Add-ons developer identity, signing flow, review/approval,
  versioned release artifacts, a trusted update channel and rollback procedure
- Publish supported versions, a security contact and data-handling statement
  only after these controls are independently verified

Do not install an unsigned development archive as if it were an audited
password manager. The code does not provide actual passkey credential-provider
registration/assertion for arbitrary websites.
