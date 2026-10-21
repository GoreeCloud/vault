# GoreeCloud Vault — OSS client build evidence

**Classification:** GoreeCloud Fork / Development only. This document records bounded compilation results, not security, functional, browser-store, installed-device, release, or production acceptance.

## Reproduction on an isolated development checkout

With Node from `.nvmrc` (v24) and npm 11:

```bash
npm ci --ignore-scripts --no-audit --no-fund
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build cli --configuration=oss-dev --verbose
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build web --configuration=oss-dev --verbose
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build browser --configuration=chrome-dev --verbose
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx build browser --configuration=firefox-dev --verbose
NX_DAEMON=false NX_ISOLATE_PLUGINS=false npx nx run desktop:build-main --configuration=oss-dev --verbose
```

No passwords, customer accounts, signing keys, Vault Server endpoint, telemetry credentials, or release/publishing token are required for these bounded compile tests. The dependency install deliberately disables lifecycle scripts; production/runtime requirements may need additional reviewed native-building steps.

## First verified local compile evidence (2026-10-21)

The GoreeCloud-controlled development laptop `personal-laptop-ideapad3-01` used Node `v24.19.0`, npm `11.17.0`, and the imported Bitwarden GPL clients source. The following completed with exit code zero:

| Target | Result | Evidence scope |
| --- | --- | --- |
| npm ci --ignore-scripts | Pass | Development dependency installation only |
| web oss-dev | Pass | Nx/webpack build; unused TS files and environment-definition warnings |
| cli oss-dev | Pass | Nx/webpack bundle, not CLI runtime or secret handling |
| browser chrome-dev | Pass | Nx/webpack Chrome development extension bundle; entrypoint and asset-size warnings |
| desktop:build-main oss-dev | Pass | Nx/webpack Electron main-process compile, not full desktop package or native signing |
| browser firefox-dev (MV3) | Pass | Nx/webpack Firefox MV3 development bundle; bundle-size warnings, no store/installed-client approval |

The web success required a verbose re-run after an initial Nx invocation failed during project setup. The first two GitHub Actions CI candidates also stopped before CLI compilation: Nx project-graph error formatting masked TS7016 declaration diagnostics for the untyped Tailwind CSS, RxJS and Angular RxJS ESLint plugins in `eslint.config.mjs`. Scoped upstream-compatible `// @ts-ignore` annotations now permit a clean local Nx project-graph rebuild; current exact-head hosted-runner remediation remains pending until Actions confirms it. Verbose Nx commands retain actionable diagnostics. Subsequent target passes do not erase upstream warnings or establish deterministic reproducibility across hosts.

## CI acceptance boundary

`.github/workflows/oss-client-builds.yml` runs the same OSS-only targets (including Firefox MV3) under **read-only** repository permissions, nonpersisting checkout credentials, and pinned third-party Actions. It does not upload, sign, publish, release or deploy a build artifact. A workflow definition is **not** CI evidence until its exact-head GitHub Actions run passes. Consult live GitHub Checks for latest outcomes.

## Outstanding release prerequisites

Complete third-party/cryptographic/license/trademark review, actual authenticated and encrypted client/server behavior, offline and recovery tests, Firefox/browser/device UX and autofill security, GoreeCloud UI acceptance, accessible interaction tests, package identities, platform signing, install/upgrade/rollback and privacy/security gates before product distribution.
