# Source provenance and open-source boundary

- **GoreeCloud product:** GoreeCloud Vault
- **Development classification:** GoreeCloud Fork
- **Upstream:** [bitwarden/clients](https://github.com/bitwarden/clients)
- **Imported branch:** `main`
- **Pinned upstream commit:** `e2969bf1b80f0942c582b158dc7b97a9110651bc`
- **Import date:** 2026-10-21
- **Import method:** source snapshot into the existing `GoreeCloud/vault` repository, retaining that repository's history; **not** a GitHub-hosted fork-network relationship.
- **Imported scope:** GPL client monorepo source (web, browser, desktop, CLI, shared code), except excluded items below.

## Licensing and provenance

The upstream `LICENSE.txt` declares GPL-3.0 as the default for the client repository, with a separate Bitwarden commercial license applying to the `bitwarden_license/` directory. This independent source copy **does not import that directory**. Keep `LICENSE.txt`, `LICENSE_GPL.txt`, `LICENSE_BITWARDEN.txt` (the upstream license notice), copyright headers, third-party notices, and provenance intact. Inclusion of a *license text* is not inclusion or permission to use the commercial source module.

No rights in Bitwarden trademarks, logos, service marks, official binary-signing identities, names, app-store listings, or endorsement are granted. Existing upstream brand assets, runtime labels, and package IDs may still occur in the development-only source and must not be distributed as GoreeCloud-branded binaries without a compliant identity migration.

Dependencies, transitive licenses, asset permissions, cryptographic handling, exports, and redistribution requirements require independent review; this baseline is **not** a completed SBOM or a legal clearance. GPL source-distribution and applicable corresponding-source obligations must be met on distribution.

## Deliberate exclusions

- `bitwarden_license/`: commercial/limited-rights modules; excluded to avoid importing restricted implementations.
- `.github/`: upstream CI, privileged workflows, bot configuration, release, and publication automation; replaced with explicitly minimal read-only GoreeCloud checks.
- `.git/`: upstream git metadata/history; a pinned upstream SHA is recorded above and the GoreeCloud repository retains its own commit history.

## Updating upstream

1. Pin and review an upstream revision and changes in license/module boundaries.
2. Compare changes against the current GoreeCloud branch, especially vault crypto, origin matching, passkeys, autofill, auth, and sync.
3. Reapply commercial-source exclusions and verify preservation of notices.
4. Review transitive dependencies, supply chain, required migrations, data integrity, privacy, and compatibility.
5. Integrate on a review branch, run OSS-only builds and adverse-path tests, and validate exact candidate artifacts.
6. Update this import record and applicable GoreeCloud governance/task records only after authoritative evidence.

Do not assume upstream build/release checks prove this fork's security.
