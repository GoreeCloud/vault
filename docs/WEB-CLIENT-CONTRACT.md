# GoreeCloud Vault Web Client Contract

## Purpose

This document defines the implementation boundary for **GoreeCloud Vault Web**, the planned GoreeCloud-owned primary browser vault client for the GoreeCloud Vault family.

The former GoreeVault product identity is retired. Historical and compatibility-sensitive identifiers may retain the old token only when migration, evidence, interoperability, or data-integrity requirements justify it; they are not current product identity.

GoreeCloud Vault Web is required on the current path to product-wide Stable readiness because the bundled upstream-compatible web vault is a temporary compatibility dependency and does not establish native GoreeCloud browser ownership or current Glaze UI acceptance.

The canonical source-control umbrella is `GoreeCloud/goreecloud-vault`. GoreeCloud Vault Web is maintained as an independently governed product component inside that repository, currently under `web-client/`. Repository co-location does not authorize browser-vault cutover and does not collapse Web, Server, or other client release and acceptance lifecycles.

## Role and Purpose

**Role:** Primary GoreeCloud-owned browser client for GoreeCloud Vault.

**Purpose:** Provide a secure, privacy-first, multi-user browser experience for storing and using encrypted credentials while preserving GoreeCloud Vault Server's zero-knowledge boundary and approved interoperability behavior.

GoreeCloud Vault Web must not become a server-side decryption layer, credential-inspection service, or branding wrapper around an inherited upstream web vault.

## Architectural boundary

GoreeCloud Vault Web owns browser presentation and interaction, Glaze UI behavior, client-side vault encryption/decryption, client key lifecycle and lock state, encrypted local state, browser session handling, Vault Server API integration, accessibility, client import/export UX, and browser release/supply-chain controls.

GoreeCloud Vault Server owns authenticated API behavior, persistence, authorization, organizations and collections, encrypted object and attachment persistence, token lifecycle, server-side WebAuthn/passkey protocol participation, rate limiting, backend policy, migrations, and server recovery.

Both components may live in `GoreeCloud/goreecloud-vault`, but their authority boundaries remain separate. Shared repository history, CI infrastructure, or release tooling must not be used as evidence that one component's acceptance automatically accepts another component.

Neither boundary authorizes the server to receive or retain plaintext master passwords, decrypted vault contents, derived encryption keys, decrypted attachments, TOTP seeds, passkey private material, or other client-side plaintext secrets beyond what an explicitly reviewed compatible protocol requires.

## Canonical server origin

The canonical synchronized-service origin is `https://vault.goreecloud.com`. Production clients must not require a third-party hosted control plane, analytics service, remote font service, or proprietary telemetry endpoint for ordinary vault operation.

## Cryptography and zero-knowledge requirements

GoreeCloud Vault Web must use mature, reviewed cryptographic foundations and preserve the approved Vault Server model. It must not invent cryptographic primitives or redesign KDF, encryption, token, WebAuthn/passkey, or key-derivation behavior merely for branding or code-ownership goals.

Decrypted vault data and derived keys are short-lived client memory. Plaintext vault items and master passwords must not be persisted in ordinary browser storage. Lock, logout, account switch, and session invalidation must clear applicable decrypted state and key material. Secrets must not enter URLs, analytics, logs, crash reports, or debugging output.

Any material cryptographic or protocol departure requires a dedicated threat model, interoperability evidence, migration and rollback plans, and security approval.

## Multi-user and isolation requirements

GoreeCloud Vault Web must support distinct users and accounts, explicitly scope local state to the active identity, clear sensitive in-memory state on account switch, honor authorization and organization changes after synchronization, honor session/device invalidation, and keep private-network connectivity separate from application authentication and authorization.

## Required compatibility surface before cutover

Exact-candidate testing must cover sign-in, unlock/lock, token lifecycle, full synchronization, item CRUD, secure notes and supported item types, attachments, organizations/collections/permissions, TOTP, WebAuthn/passkeys, logout/session invalidation, supported import/export, error handling, offline/interruption behavior, and reauthentication where data safety requires it.

Feature support must be explicit. A new client must not silently replace a working compatibility client while required supported workflows are missing.

## Browser storage and session policy

No plaintext vault items belong in localStorage, sessionStorage, IndexedDB, Cache Storage, service-worker caches, or persistent filesystem APIs. No master password may be persisted. Derived key persistence requires a separately reviewed secure-unlock design using appropriate protected platform storage. Account removal must clear account-scoped browser state.

Offline operation is permitted only with a reviewed encrypted-storage, key-lifecycle, update, synchronization, and recovery model.

## Glaze UI requirements

GoreeCloud Vault Web must use the current applicable Stable **Glaze UI** contract as a complete presentation and interaction system. Required acceptance includes recognizable GoreeCloud Vault identity, responsive layouts, System/Light/Dark behavior where applicable, keyboard operation, visible focus, reduced motion, contrast and forced-colors support, understandable security states, accessible labels and announcements, appropriate touch targets, local presentation dependencies, and no analytics or behavioral tracking in the default product.

Security-sensitive actions such as reveal, copy, autofill, delete, export, recovery changes, and session revocation must prioritize clarity over decoration.

## Content Security Policy and dependencies

The client should be deployable with restrictive CSP and local application assets. `unsafe-eval`, broad third-party script origins, remote fonts, or permissive connection policies require explicit security review and removal planning.

Dependencies must be necessary, licensed appropriately, reproducibly locked, scanned, attributable in release evidence, and replaceable without loss of user-owned vault data.

## Privacy Shield, Wardveil, Everkeep, Mesh, Identity, and Manager

The client must integrate current applicable GoreeCloud Platform System contracts without collapsing authority boundaries. Privacy Shield governs data use and minimization; Wardveil governs security evidence and protective controls; Everkeep governs recovery and continuity; GoreeCloud Mesh governs approved coordination; GoreeCloud Identity may provide account and device identity without obtaining plaintext vault access; GoreeCloud Manager may expose approved administration and lifecycle state without bypassing Vault authorization.

## Accessibility acceptance

Production cutover requires representative browser acceptance for keyboard-only core workflows, screen-reader semantics, visible focus order, zoom/reflow, reduced motion, appearance modes, increased contrast, forced colors where applicable, and narrow/mobile layouts. Automated checks supplement but do not replace real-browser validation.

## Release and supply-chain requirements

A GoreeCloud Vault Web Release Candidate must have exact source identity, locked dependencies, automated tests, security/dependency scanning, Glaze UI and accessibility gates, exact Vault Server compatibility tests, immutable browser artifact identity, an SBOM or equivalent inventory, rollback documentation, and exact-candidate evidence.

The Web component must retain its own versioned release evidence and accepted artifact identity even when its source is stored in the same repository as Vault Server and other Vault clients.

## Migration and fallback

The upstream-compatible web vault remains only as a transitional compatibility/fallback asset until GoreeCloud Vault Web passes required compatibility, security, privacy, accessibility, migration, recovery, and release gates. Cutover must be reversible and must not require database downgrade or plaintext export merely to restore the previously accepted browser client.

## Stable-release gate

GoreeCloud Vault Web closes the browser-ownership blocker only when the primary production browser vault is GoreeCloud-owned, current Glaze UI conformance is accepted, zero-knowledge boundaries are preserved, the supported browser workflow matrix passes against the exact server candidate, accessibility passes, release artifacts are immutable and traceable, rollback is proven, and final Stable evidence identifies the accepted browser artifact. Creating a component directory or rendering a Glaze shell does not close this blocker by itself.
