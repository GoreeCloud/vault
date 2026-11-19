# Third-Party Source and License Notices

Original GoreeCloud Vault files are licensed under AGPL-3.0-only. The following upstream components remain independently maintained and licensed by their authors:

| Component | Use | Source | Upstream license |
| --- | --- | --- | --- |
| React / React DOM | Browser UI runtime | https://github.com/facebook/react | MIT |
| Vite | Browser build tool | https://github.com/vitejs/vite | MIT |
| TypeScript | Type checker | https://github.com/microsoft/TypeScript | Apache-2.0 |
| Flutter / generated platform scaffold | Native Linux/Android UI | https://github.com/flutter/flutter | BSD-3-Clause |
| cryptography (Dart) | PBKDF2 + AES-GCM | https://github.com/dint-dev/cryptography | Apache-2.0 |
| path_provider | Platform app-support path | https://github.com/flutter/packages | BSD-3-Clause |
| Mozilla web-ext CLI | Firefox extension development lint/build (not included in runtime) | https://github.com/mozilla/web-ext | MPL-2.0 |
| GoreeCloud UI token snapshot | App semantic design values | https://github.com/GoreeCloud/gc-ui | MIT |

The `design/gc.tokens.json` snapshot is copied from `GoreeCloud/gc-ui` at the exact source commit in `design/UPSTREAM_COMMIT`, with its upstream copyright/licensing retained.

No Bitwarden, Proton Pass or Vaultwarden application source is included. Their names identify comparative product inspiration, not affiliation, endorsement or code ownership. Evaluate source obligations afresh before importing any future upstream implementation.

The repository-specific AGPL-3.0-only grant does **not** change third-party licenses. Dependency-lock files are present for traceability; before release, verify exact transitive licenses, provenance and vulnerabilities against installed versions.
