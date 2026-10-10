# Development-only distribution boundary — automatic tripwire

**Status:** Source-level regression protection for GoreeCloud Vault Development, not a release gate approval or security attestation.

The command `node tools/check-development-boundary.mjs` is included in `npm test` on each pull request. It inspects the checked-out source and emits stable violation codes without reflecting caller-provided bytes. It fails if the current Development-only package grows executable/release scripts, unapproved package dependencies or binary entrypoints; if the static preview gains forms, executable elements, remote fetches or loses its warning/CSP; if the source-lock no longer classifies the imported Bitwarden source as reference-only; or if CI drops current limited permissions and combined Node/Python tests. It also screens first-party tracked paths for sensitive-file and early deployment surfaces.

The CI guard now checks **both** allowlisted workflow files: `.github/workflows/foundation.yml` and `.github/workflows/lock-lifecycle-reference.yml`. A new or removed workflow path fails closed until reviewed and added to the Development policy. The lock-reference workflow's read-only permissions, SHA-pinned checkout/Python setup, non-persisting checkout credentials and regression-test command are checked; tests deliberately inject privilege escalation, dispatch widening and unreviewed workflow names. The guard is static and does not replace GitHub repository branch protection, runner isolation or a review of the complete Actions execution graph.

## Behavior and limits

- Explicit fixture policy: `private: true`, `0.1.0-dev` version, named allowed package scripts and no declared runtime dependencies or distribution entrypoints. Any deliberate future expansion requires a code-reviewed guard update and relevant approvals.
- The preview is still a read-only concept. The tripwire checks raw markup/CSS patterns, not the browser runtime or an exhaustive HTML parser; it cannot prove CSP enforcement, accessibility or resistance to browser compromise.
- `tools/check-foundation.mjs` separately pins the exact upstream source trees and verifies original license notices. Neither tool verifies license compliance, code safety, upstream signatures or third-party dependency reachability.
- This check has no cryptographic secret detection, repository-wide semantic or dependency audit, policy enforcement at runtime, or protection against a contributor deliberately changing/removing the guard. GitHub branch rules, independent reviewers and protected release mechanisms remain necessary.
- The guard may flag an intentionally approved future feature. A passing run is a **Development-only statement about this precise repository configuration**, not a product/release-ready or secret-safe finding.

## Follow-up acceptance

Human security review [#1](https://github.com/GoreeCloud/vault/issues/1), authenticated client key custody, tenant isolation, proven atomic sync, documented GPL/AGPL and trademark obligations, dependency/SBOM scans, Glaze acceptance, actual browser/device interoperability, backup/restore testing and release sign-off remain open in [backlog #3](https://github.com/GoreeCloud/vault/issues/3).

Run `npm test` to exercise the guard and negative regressions, and retain exact-head CI evidence for the reviewed commit.