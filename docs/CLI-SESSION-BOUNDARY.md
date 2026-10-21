# GoreeCloud Vault — CLI session namespace isolation

**Classification: Development only; real credentials and Stable releases remain blocked.**

The imported Bitwarden CLI inherited `BW_SESSION` as an environment input for
secure-storage decryption and as an output from login/unlock. When Bitwarden
and GoreeCloud Vault share a shell, a session from the upstream client must
never silently become a GoreeCloud Vault session. The separate on-disk profile
implemented in PR #11 did not, by itself, isolate this environment variable.

GoreeCloud Vault CLI now exclusively uses `GOREECLOUD_VAULT_SESSION` in its
secure-storage key retrieval, CLI `--session` input, login/unlock message and
raw output handling, lock and logout cleanup, and repository test fixtures.
In a shell, the development CLI displays the correct platform-native syntax
for `export GOREECLOUD_VAULT_SESSION=...` or PowerShell
`$env:GOREECLOUD_VAULT_SESSION=...`. The existing CLI command name `bw`
remains inherited for compatibility and is not yet an approved release name.

An inherited `BW_SESSION` has no fallback and is never treated as a valid
GoreeCloud key. An invalid GoreeCloud session does not cause fallback to the
upstream session. On lock and logout, the fork deletes its own environment
key rather than storing the string `undefined`. The inherited CLI debugger
no longer contains a fixed session-like value; it references only the
GoreeCloud-specific environment variable supplied at execution time.

## Validation

The CLI unit fixture
`apps/cli/src/platform/services/node-env-secure-storage.service.spec.ts`
uses **synthetic 64-byte keys** to verify absence of upstream fallback,
GoreeCloud acceptance and precedence, and rejection of malformed sessions.
Existing login and unlock test fixtures use the renamed session key. The
read-only GitHub Actions build workflow runs the focused secure-storage unit
tests, while the integrity workflow requires that no runtime CLI TypeScript
file contains an inherited `BW_SESSION` reference. Client builds and smoke
tests must pass on the exact candidate commit before merge.

## Unresolved trust and release gates

- `BW_CLIENTID` and `BW_CLIENTSECRET` API-key variables are **not** changed by
  this patch. They remain a separate upstream-account isolation risk requiring
  independent review and synthetic tests.
- This is not account isolation, cryptographic review, server interoperability,
  authenticated sync or proof of correct behavior with a real locked vault.
  Import/export, account switching, sessions saved outside the CLI, desktop
  IPC, key custody and command output remain to be audited.
- Do not run login or unlock against real user accounts during development.
  Do not auto-migrate or copy existing Bitwarden profiles or credentials.
- `node-forge` high-severity advisory (#8) and release gates (#3) stay OPEN.
