# GoreeCloud Vault Server Roadmap

This roadmap uses **GoreeCloud Vault** as the single canonical current product family and **GoreeCloud Vault Server** as its canonical backend service. **GoreeVault is retired** as a current product identity. Historical records and compatibility-sensitive identifiers may retain `GoreeVault`/`goreevault` only where preservation is necessary for migration, release evidence, interoperability, rollback, or historical truth. See `SERVER-IDENTITY.md` and `../VAULT.md` for the current naming boundary.

The canonical product-family repository is **`GoreeCloud/goreecloud-vault`**. It is intended to maintain Vault Server, Vault Web, and supported Vault client applications while keeping each component's implementation, security, compatibility, release, and acceptance lifecycle independently provable.

## v0.1.0 — Foundation

Established:

- Vaultwarden-derived server baseline with preserved AGPL/upstream provenance;
- GoreeCloud Vault Server product-facing server and administration identity;
- PostgreSQL target architecture;
- exact-head CI and security gates;
- zero-knowledge/client-side cryptographic boundary;
- upstream tracking strategy;
- development-only deployment baseline.

## v0.2.0 — Server compatibility, recovery, and hardening

v0.2 is the GoreeCloud Vault Server Release Candidate milestone. It proves the maintained server, compatibility, recovery, deployment, and release foundations. It does **not** by itself authorize product-wide Stable use because the primary browser vault remains an upstream compatibility dependency rather than a fully accepted GoreeCloud-owned **GoreeCloud Vault Web** Glaze UI surface.

### Automated API, multi-user, and authentication gates

Established or under exact-head validation:

- fresh PostgreSQL startup and migrations;
- database-backed health checks;
- prelogin and closed-registration policy;
- isolated account creation/login;
- unrelated-user private-data isolation;
- organization/member and collection authorization transitions;
- single-use refresh-token rotation and replay rejection;
- atomic concurrent refresh-token consumption with exactly one winner;
- vault sync;
- personal cipher create/read/update/delete;
- attachment lifecycle;
- TOTP authentication/recovery coverage;
- WebAuthn challenge/rejection compatibility coverage.

### Recovery and migration gates

Established on the certified baseline and required on every release candidate:

- destructive PostgreSQL plus `/data` backup/restore rehearsal;
- exact Vaultwarden baseline to GoreeCloud Vault Server migration rehearsal;
- rollback rehearsal to the pre-migration state;
- non-publishing AMD64/ARM64 release-image build;
- source and built-image HIGH/CRITICAL security gates;
- hardened production Compose validation;
- repository-readiness and GoreeCloud-owned Glaze UI conformance checks;
- fail-closed exact-RC Stable evidence contract;
- read-only, secret-minimizing target-environment evidence collector with unit tests and explicit operator attestations for controls that cannot be proven from container metadata alone.

### Remaining v0.2 RC evidence

Before v0.2 can be treated as a supported server Release Candidate milestone:

- run and record the real supported client matrix on exact candidate artifacts;
- perform a real supported-browser/device WebAuthn/passkey flow;
- complete target-environment deployment rehearsal using the production contract and retain the generated target-environment evidence section;
- create/verify required GitHub governance controls from `docs/PRODUCTION-READINESS.md`;
- record completed RC-bound evidence for later Stable promotion.

Passing these items proves the server candidate. It does not override the product-wide Glaze UI gate.

## v0.3.0 — GoreeCloud Vault Web foundation

**GoreeCloud Vault Web** becomes the GoreeCloud-owned browser vault experience rather than a branded wrapper around the upstream-compatible web vault.

This milestone is required for the current product-wide Stable path because GoreeCloud requires Glaze UI on every controlled user-facing interface.

### Foundation contract established

`docs/WEB-CLIENT-CONTRACT.md` defines the implementation boundary inside the canonical product-family repository. The contract establishes:

- Role and Purpose for the browser client;
- separation between GoreeCloud Vault Web and GoreeCloud Vault Server responsibilities;
- client-side zero-knowledge and cryptographic boundaries;
- multi-user account/session isolation requirements;
- browser storage and key-lifecycle rules;
- required compatible browser workflows before cutover;
- full Glaze UI and accessibility requirements;
- restrictive CSP and local-only presentation dependency direction;
- no analytics/behavioral tracking by default;
- immutable release, dependency, SBOM, migration, and rollback requirements;
- an explicit rule that repository co-location or creating a shell does not close the Stable blocker by itself.

The current implementation boundary is `web-client/` in **`GoreeCloud/goreecloud-vault`**. A separate Web repository is not required by the approved product-family repository model unless a later authoritative architecture decision explicitly introduces one.

### Required implementation foundation

- dedicated in-repository GoreeCloud Vault Web component boundary with independent release evidence;
- **Glaze UI Design Language** as the complete GoreeCloud Vault Web presentation and interaction system;
- local-only browser presentation dependencies under GoreeCloud Privacy by Default;
- accessible System/Light/Dark behavior, responsive layouts, keyboard/focus behavior, contrast and forced-colors support;
- individual multi-user account behavior and safe user/session boundaries;
- GoreeCloud Vault client SDK boundary;
- client-side vault encryption/decryption architecture using mature compatible cryptographic primitives;
- secure session locking and memory/key-lifecycle policy;
- import/export strategy;
- compatibility test coverage against GoreeCloud Vault Server;
- migration/fallback path from the bundled upstream web-vault dependency;
- browser accessibility and Glaze UI acceptance evidence.

The existing bundled upstream web vault remains a temporary compatibility asset until GoreeCloud Vault Web reaches the required compatibility and security gates. It is not a permanent production styling exception.

## v0.4.0 — GoreeCloud Vault Browser foundation

- in-repository client component for Firefox and Chromium extension work;
- Glaze UI adapted to browser-extension platform conventions;
- individual-user authentication/session lifecycle;
- URI matching and autofill;
- password/passphrase generator;
- capture/update credentials;
- secure local lock/unlock lifecycle;
- GoreeCloud Vault client SDK reuse;
- compatibility and threat-model review;
- independent extension artifact and release acceptance despite shared repository history.

## v0.5.0 — GoreeCloud Vault Desktop foundation

- in-repository GoreeCloud-native desktop client component;
- Glaze UI adapted to desktop accessibility and windowing conventions;
- individual-user authentication/session lifecycle;
- secure local encrypted state and lock lifecycle;
- browser/desktop handoff strategy where appropriate;
- update/distribution and code-signing plan;
- independent desktop artifact and release acceptance despite shared repository history.

## v0.6.0 — GoreeCloud Vault Mobile foundation

- in-repository Android-first GoreeCloud Vault mobile client component, with iOS planning as applicable;
- Glaze UI adapted to native mobile conventions;
- individual-user authentication/session lifecycle;
- biometric/device-keystore integration using platform security APIs;
- autofill/credential-provider integration;
- secure background/lock behavior;
- mobile client compatibility matrix;
- independent mobile artifact and release acceptance despite shared repository history.

## v1.0.0 — Stable production release

Stable promotion requires the exact candidate artifact to satisfy `docs/PRODUCTION-READINESS.md`, including:

- proven multi-user identity, authorization, and private-data boundaries;
- compatibility and real-client evidence;
- security gates and reviewed exception state;
- migration and rollback;
- backup and verified restore;
- immutable multi-architecture release artifact;
- hardened production deployment validation;
- protected repository/release governance;
- target-environment operational evidence;
- product-wide Glaze UI conformance for every GoreeCloud-controlled user-facing surface;
- fail-closed validation of the RC-bound Stable evidence asset before the Stable and `latest` image tags are created.

Under the current approved path, **GoreeCloud Vault Web** must reach its security, compatibility, accessibility, and Glaze UI gates before v1.0 Stable promotion. A future formally approved material exception could alter that dependency only if it satisfies the GoreeCloud exception standard; no such exception is currently approved.

No semantic version, repository rename, component co-location, or green build can bypass these gates.
