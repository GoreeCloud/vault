# Pinned Bitwarden source dependency-manifest census

**Classification:** Development-only source inventory check. Not a resolved SBOM, license clearance, trademark approval, vulnerability/reachability scan, independent crypto review, or release authorization.

## Verified imported reference source

The two pinned Git subtree IDs in `source-lock.json` were independently enumerated using GitHub's complete recursive tree listings (`truncated=false`), then cross-checked automatically in `test/pinned-manifest-census.test.mjs` using `git ls-tree -r -z HEAD`. Both checks inspect committed **filenames and Git blob identities only**. They do not run upstream packages, resolve dependencies, fetch registries, ingest credentials, or enable Bitwarden software.

| Reference-only imported tree | Git tree SHA | Git tree entries | Blob entries | Recognized manifest filenames |
| --- | --- | ---: | ---: | ---: |
| `upstream/bitwarden/server` | `ebd9f6c4a548b4ee8c9602f5fbed95e51ae31d80` | 8,873 | 7,399 | **149**: 143 .NET, 4 npm, 2 Rust |
| `upstream/bitwarden/clients` | `9014209b7ad05b18c5621279223dfa6f0ffa4867` | 10,319 | 8,417 | **79**: 63 npm, 16 Rust |
| **Total** | Both pinned, unmodified | **19,192** | **15,816** | **228 manifest filenames** |

The test detects unexpected first-party promotion of the source-lock classifications and a change to the enumerated ecosystem totals. It refuses imported paths named `bitwarden_license`, and builds a SHA-256 metadata digest from sorted ecosystem, manifest path and Git blob IDs. The digest is **not** an independent upstream signature or integrity attestation; separate `tools/check-foundation.mjs` enforces the complete subtree SHA and original notice files.

**Examples to inspect in an approved reviewer environment:** server `src/Admin/package-lock.json`, `src/Api/packages.lock.json`, `src/Core/MailTemplates/Mjml/package-lock.json`; clients `package-lock.json` and `apps/desktop/desktop_native/Cargo.lock`.

## Reference lockfile spot-check (automated Development regression)

`test/pinned-lockfile-spotcheck.test.mjs` parses two **committed, reference-only** lockfiles in the imported trees without resolving or installing packages.

- Server `src/Api/packages.lock.json` (Git blob `e29842fbbbf31784e2ab2f7aa06c7ea43050a085`): `net10.0` contains **175** dependency entries — **14 Direct, 144 Transitive, 17 Project**. The first 158 have resolved package versions; the 17 project entries are source-project references, not unversioned NuGet registry entries.
- Clients `apps/desktop/desktop_native/Cargo.lock` (Git blob `3a239261ab8953d6eddba9f7d03f1cf59bea9177`): **646** package sections, partitioned by declared origin into **622 registry, 10 Git and 14 local/no source**. **24** package sections have no checksum field. That absence is not evidence of compromise and requires assessment in context.

The regression asserts counts, source-type partitions and basic declared field presence. It does **not** validate content checksums, signatures, SPDX licenses, advisories or the dependencies of all workspaces. It is not a comprehensive TOML parser or a distributable SBOM. The checks passed at exact commit `e24447864427eb2d0278d047205fd58d3510d265` in [Actions run 38020013778](https://github.com/GoreeCloud/vault/actions/runs/38020013778) (178 Node, 27 Python). Any documentation change requires another exact-head validation.

## Critical limits

A filename-pattern census is not a dependency graph and does not prove the packages are installed, used or reachable. The test includes common npm, .NET, Rust, Go, Python, JVM, Ruby, PHP, Dart, Swift and other declaration/lock formats; custom or embedded formats may be missed. No lockfile contents, package versions, transitive dependencies, license compatibility, attribution compliance, advisories, signing evidence, SAST results or release artifacts have been reviewed. This source inventory does not replace a qualified legal/security review of the *actual target distribution*.

The first attempted standalone scanner (source tree candidate `e14fc21a091f46c30cecbc252055b20cefbf0611`) **was not committed or run**. The **smaller census regression** in `test/pinned-manifest-census.test.mjs` is a different, committed and CI-tested implementation; do not misrepresent it as a full scanner or SBOM generator.

## Remaining acceptance gates

- [Independent legal/source/trademark review #16](https://github.com/GoreeCloud/vault/issues/16) — required qualified decisions on GPL/AGPL, corresponding source, third-party notices, trademark, commercial exclusions and supply chain
- [Cryptographic trust boundary acceptance #1](https://github.com/GoreeCloud/vault/issues/1) — required before any operational user secret
- [Glaze 1.7.0 consumer acceptance #17](https://github.com/GoreeCloud/vault/issues/17) — no accepted runtime/device evidence
- [Engineering backlog #3](https://github.com/GoreeCloud/vault/issues/3) — authenticated encrypted client/storage/sync, actual SBOM/license testing, recovery and release governance

No production runtime, no real credentials, no Stable designation and no implicit approvals.
