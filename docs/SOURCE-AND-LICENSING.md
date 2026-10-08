# Source provenance, licensing, and legal gates

## Precisely imported source

- **Bitwarden server:** https://github.com/bitwarden/server at `ea4b0474f0702c270ccef029ce9c491f0d351e09`
- **Bitwarden clients:** https://github.com/bitwarden/clients at `0e7970ed405e99b18fe9fb776283253301ee7dc1`

Snapshots are imported as **source references / transition inputs**, not as a trusted GoreeCloud Vault release. The upstream repositories each have their own original commit histories; this GoreeCloud repository records exact upstream revisions and retains original source files, license notices, and attribution rather than falsely claiming independent authorship. This is an *import*, not a GitHub-network fork relationship (`isFork=false`).

## License boundaries

Bitwarden server uses **AGPL v3** as default and Bitwarden clients use **GPL v3** as default, with separate **Bitwarden License v1.0** commercial-only modules under `bitwarden_license/`. Those commercial directories and nested .git files are **not copied** into this repo. Do not reintroduce commercial-only code or assume that published source means permission to produce a branded commercial release. The original upstream `LICENSE*.txt` and `TRADEMARK_GUIDELINES.md` remain available in the imported source trees.

The Bitwarden mark and official logos are **not GoreeCloud assets**. Imported material is not authorized as a branded user-facing GoreeCloud product. Before distributable builds, obtain a source/code/license review including third-party notices, GPL/AGPL corresponding-source obligations, client/server combined-distribution implications, modified-source attribution, and trademark-safe product assets. AGPL network-service conditions may be triggered by modifications.

## Update discipline

Never automatically pull upstream into a production branch. For each upstream update: pin a specific SHA; inventory changed files/licenses; screen commercial modules; triage advisories; verify dependency and provenance; review compatibility and trust boundaries; run applicable build and tests; and merge through exact-revision review. Preserve the source-lock record.

**Excluded sources:** Bitwarden Android and iOS native repositories, directory connector, SDK and integrations have not yet been imported. Evaluate their respective licenses and platform requirements before inclusion. Missing product capabilities are **planned**, not implemented.

This document is engineering guidance, not legal advice.

## Recorded source-tree integrity

`source-lock.json` also pins Git tree SHA-1 object IDs for the exact imported server and client source subtrees. The foundation check reads committed subtree object IDs through `git rev-parse HEAD:<path>` and fails if either differs from its pinned import record. This detects unexpected changes to committed imported trees, but it is not a replacement for independent upstream signature, license, dependency or security verification.
