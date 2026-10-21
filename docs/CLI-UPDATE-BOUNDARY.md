# GoreeCloud Vault — CLI update-feed isolation

**Development only. No release channel exists yet.**

The imported Bitwarden CLI update command called
`https://api.github.com/repos/bitwarden/clients/releases`, linked official
Bitwarden client downloads and instructed users to install `@bitwarden/cli`.
Neither feed, binary, nor npm package belongs to the independently maintained
GoreeCloud Vault fork.

The GoreeCloud Vault CLI command now fails closed with an explicit message,
without performing HTTP requests, checking upstream releases, suggesting
upstream binaries, installing packages, or modifying local app state.

The command's construction contract is preserved for CLI registration. Source
regression tests assert that no upstream feed or npm instruction reappears.
A release feed must remain disabled until a GoreeCloud-controlled distribution
endpoint, package name, signing, secure update verification, rollback,
migration integrity, licensing and security review are all accepted.

This isolated change does **not** prove authenticating to any Vault server,
checking browser updates, OS package manager behavior, client encryption,
or real user credential safety. Do not publish any GoreeCloud Vault update.
