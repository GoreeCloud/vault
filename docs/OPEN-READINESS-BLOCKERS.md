# GoreeCloud Vault Server Open Readiness Blockers

## Purpose

This document tracks known GoreeCloud Vault Server release blockers that cannot be resolved solely by a successful source build or automated compatibility test.

It is an implementation tracker, not authorization to bypass `docs/PRODUCTION-READINESS.md`. A blocker remains open until the required evidence is completed and recorded against the exact candidate artifact.

**GoreeCloud Vault** is the single canonical current product and client-family identity. **GoreeVault is retired** as a current product identity. Historical records and compatibility-sensitive `GoreeVault`/`goreevault` identifiers may remain only where preservation is necessary for evidence, migration, rollback, interoperability, or historical truth; they do not define the current product name.

The canonical product-family repository is **`GoreeCloud/goreecloud-vault`**. The previous repository slug `GoreeCloud/goreecloud-vault-server` is historical after the verified rename and must not be used as current repository metadata. Server/service/image identifiers that legitimately use `goreecloud-vault-server` remain separate compatibility or component identifiers and are not renamed by this repository change.

## Current state

**Status:** Stable blocked

**Recorded:** September 11, 2026

The current server stabilization chain has strong automated compatibility, security, recovery, migration, deployment, release-image, Stable-evidence, Glaze UI, repository-readiness, and evidence-tooling source checks. **GoreeCloud Vault Web** also has a Glaze UI development shell, deterministic release/SBOM evidence, a client SDK boundary, fail-closed prelogin/authentication architecture, a reviewed Rust Argon2id core, build-only WebAssembly identity evidence, an isolated pinned `wasm-bindgen` ABI path with deterministic generated-binding evidence, and a validation-only JavaScript runtime adapter exercised against the actual generated bindings and the legacy `goreevault` authentication-material compatibility path. None of those source milestones substitutes for the real-world gates below.

## Blocker 1 — GitHub repository governance

### Current verified state

- The canonical repository is `GoreeCloud/goreecloud-vault`; the prior repository URL redirects to it after the verified rename.
- GitHub repository rulesets endpoint returns no rulesets.
- GitHub Actions environments endpoint returns no environments.
- `main` is currently reported by GitHub as unprotected.
- Default GitHub Actions token permission state cannot be read through the current integration.
- Dependabot vulnerability-alert state cannot be read through the current integration.

### Required completion evidence

- protect `main` against direct/unreviewed release-source changes;
- enforce required GoreeCloud Vault release-blocking checks;
- enforce CODEOWNERS review for protected surfaces;
- create the protected `release` environment;
- require at least one release reviewer;
- prevent self-review where supported;
- verify read-only default Actions permissions;
- enable/verify Dependabot vulnerability alerts;
- verify secret scanning, push protection, and private vulnerability reporting where supported;
- record the verified state in the exact-RC Stable evidence record.

The current GitHub connector does not expose the write operations needed to create these repository settings, so they require an approved GitHub administrative action outside the repository source change.

## Blocker 2 — Real supported-client matrix

Run the supported real clients against the exact GoreeCloud Vault Server RC artifact and record version/platform/result evidence for:

- web;
- Chromium extension;
- Firefox extension;
- desktop;
- Android;
- CLI.

Each client must satisfy the checks defined by `docs/STABLE-EVIDENCE.md`.

## Blocker 3 — Real WebAuthn/passkey path

Complete and record at least one real supported browser/device/authenticator registration and authentication flow against the exact GoreeCloud Vault Server candidate.

Synthetic challenge/rejection coverage remains valuable but does not close this blocker.

## Blocker 4 — Target-environment production rehearsal

Exercise the reviewed production contract in the intended GoreeCloud target environment with exact immutable digests and verify:

- loopback-only backend publication;
- trusted reverse-proxy HTTPS/WSS;
- internal-only PostgreSQL networking;
- non-root/capability-free/read-only-root runtime;
- closed registration and disabled `/admin` policy;
- pre-change backup;
- verified restore;
- recorded rollback;
- monitoring and certificate/storage/restart visibility;
- privacy-conscious logging;
- approved private administrative access path.

### Tooling status

`scripts/collect-target-evidence.py` provides a read-only, secret-minimizing collector for the Stable record's `target_environment` section. It machine-checks the controls that can be observed safely from the reviewed production source, Docker metadata, immutable image references, and the canonical HTTPS health endpoint. Controls such as real HTTPS/WSS validation, backup/restore, rollback, monitoring, log review, and private administrative-path verification require explicit operator attestations after the work is actually completed.

The collector does not run a deployment, create a backup, perform a restore, change Docker state, alter proxy/private-network configuration, or close this blocker by itself.

No production activation should be inferred merely from completing a rehearsal or generating a passing JSON section.

## Blocker 5 — Product-wide Glaze UI ownership and GoreeCloud Vault Web completion

The bundled upstream-compatible web vault remains a temporary development/compatibility dependency.

Under the current GoreeCloud mandatory Glaze UI baseline, Stable is blocked until GoreeCloud owns the primary browser-vault presentation and product-wide Glaze UI conformance is proven.

The approved current path is **GoreeCloud Vault Web** as defined in `docs/ROADMAP.md` and `docs/WEB-CLIENT-CONTRACT.md`.

### Current implementation status

`docs/WEB-CLIENT-CONTRACT.md` defines the GoreeCloud Vault Web Role and Purpose, server/client ownership boundary, client-side zero-knowledge rules, multi-user browser isolation, browser storage policy, compatible workflow baseline, Glaze UI requirements, accessibility acceptance, CSP/dependency direction, privacy/telemetry rules, immutable release evidence, and reversible migration/fallback requirements.

The in-repository `web-client/` component inside `GoreeCloud/goreecloud-vault` now contains a GoreeCloud-owned GoreeCloud Vault Web Glaze UI application shell, deterministic static release/SPDX evidence, a GoreeCloud Vault client SDK facade, SDK-backed email-only prelogin, account-scoped memory-only session/sync foundations, reviewed PBKDF2 and low-level vault-cryptography primitives, a fail-closed Argon2id provider contract, a pinned RustCrypto Argon2id core, exact build-only WebAssembly identity evidence, an isolated pinned `wasm-bindgen` ABI path with deterministic generated-binding evidence, and a validation-only JavaScript runtime adapter. The adapter copies and clears caller-controlled secret/salt buffers, clears controllable generated-binding output after copying it into independent memory, propagates failures without PBKDF2 fallback, and is continuously exercised against the actual generated `wasm-bindgen` module and the legacy `goreevault` authentication-material compatibility path. Production registration, browser-bundle inclusion, and credential processing remain explicitly unapproved.

The repository rename and product-family monorepo decision remove the former requirement to create a separate Web repository. This does **not** close the browser-ownership blocker: the Web component still requires its own exact source/artifact identity, release evidence, security/privacy/accessibility acceptance, compatibility proof, rollback evidence, and production cutover approval.

Remaining completion evidence includes:

- finalized in-repository GoreeCloud Vault Web component boundary and independent release lifecycle/evidence;
- reviewed production browser loading and runtime registration of the Argon2id provider;
- immutable browser release/SBOM coverage for the final WebAssembly module and generated glue;
- real browser performance, memory, CSP, and compatibility evidence for the generated WebAssembly path;
- complete supported sign-in, two-factor, token refresh/rotation, logout, and session invalidation;
- end-to-end user/account key unwrap and supported vault encryption/decryption workflows;
- item create/update/delete, attachments, organization/collection boundaries, TOTP, import/export, and required error/offline behavior;
- Glaze UI presentation throughout the controlled browser experience;
- System/Light/Dark behavior;
- keyboard/focus accessibility;
- reduced-motion and contrast/forced-colors handling;
- local-only presentation dependencies;
- no analytics/behavioral tracking;
- real browser/accessibility acceptance evidence;
- compatibility tests against the exact GoreeCloud Vault Server candidate;
- reversible migration/cutover and previous-known-good browser rollback proof.

No permanent production Glaze exception is currently approved.

## Blocker 6 — Exact-RC Stable evidence

After all other Stable gates are complete:

- create schema-version-2 `goreevault-stable-evidence.json`;
- bind it to the exact GoreeCloud Vault Server RC tag, source SHA, and OCI manifest digest;
- validate it with `scripts/validate-stable-evidence.py`;
- attach it to the matching RC GitHub release;
- obtain the required release approval;
- only then create the Stable tag.

The compatibility-era evidence filename is intentionally retained by current tooling and does not represent the canonical product or server name.

The target-environment collector may provide only the `target_environment` object. It must not be treated as a complete Stable evidence file or as approval for any other section.

## Blocker 7 — Integral Platform System acceptance

`goreecloud.platform.yaml` currently declares all seven Integral Platform Systems as applicable but blocked, and overall service conformance as nonconformant. Stable remains blocked until each applicable system independently accepts the exact relevant GoreeCloud Vault Server state through its own authoritative evidence process.

Required acceptance/evidence references are:

- GoreeCloud Manager: NOT VERIFIED / BLOCKED
- Privacy Shield: NOT VERIFIED / BLOCKED
- Wardveil Security: NOT VERIFIED / BLOCKED
- Everkeep: NOT VERIFIED / BLOCKED
- Glaze UI: NOT VERIFIED / BLOCKED
- GoreeCloud Mesh: NOT VERIFIED / BLOCKED
- GoreeCloud Identity: NOT VERIFIED / BLOCKED

A source-level integration, manifest declaration, another system's pass, repository CI, or a successful deployment does not close this blocker. Each applicable system must prove its own accepted scope and evidence freshness. The accepted references must be retained in the versioned `docs/RC-EVIDENCE.md` record or equivalent exact-candidate release record.

Schema-version-2 `goreevault-stable-evidence.json` does not currently provide dedicated fields for every Integral Platform System. Do not add ad hoc fields to that strict schema. Until a separately governed schema revision incorporates them, authoritative platform-system acceptance records remain an additional Stable prerequisite outside that JSON object.

## Completion rule

Do not delete a blocker merely because work started or partial evidence exists. Mark it complete only when the applicable requirement is objectively satisfied and the final evidence is retained in the proper release or governance record.
