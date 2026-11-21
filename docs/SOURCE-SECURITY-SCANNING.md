# GoreeCloud Vault automated source security scanning

**Status:** GitHub Actions CodeQL static analysis configured in source,
not a passed audit, independent security assessment or product certification.

The version-pinned GitHub CodeQL Action checks JavaScript/TypeScript (web and
Firefox), Python source and GitHub Actions workflows using source-only build
mode without running project build scripts or package lifecycle hooks.
It runs on pushes to main, pull requests targeting main, explicit dispatch,
and a weekly schedule after the workflow has been merged and enabled.
Its least-privilege token grants read of repository/actions data plus the
security-events permission required to upload CodeQL results.

The CodeQL action itself is supplied by GitHub, pinned to an upstream
verified commit; analysis engines remain external to this repository. No
production user data, signing keys, keystores or private vault material are
needed or uploaded by these workflows. These scripts live in the repository;
GitHub Actions must be authorized and functioning for scans to occur.

## Coverage boundaries

- Static analysis is only a source-based bug-finding aid; a green workflow
  does not prove code safe against malicious pages, compromised runtimes,
  cryptographic implementation flaws, rollback attacks or key extraction.
- Kotlin and Flutter Dart source are not covered by this matrix. Native
  Flutter analyzer, compilation and dedicated cryptography/restore tests
  remain mandatory, and an independent Kotlin/Dart security audit is needed.
- The scan cannot validate actual Android device export/restore, Firefox
  WebExtensions injection permissions, signed release artifacts, hardware
  keystore protections or external credential providers.
- New CI output must be reviewed as evidence; treat findings from this
  service as security issues to triage, not automatic proof of exploitation.
- Changes to scan scope, action pin or permissions require code review.
  Provider availability, quota and repository security settings determine
  whether the workflow can upload code scanning results.

Reference: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning
