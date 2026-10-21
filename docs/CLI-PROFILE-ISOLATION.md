# GoreeCloud Vault — CLI profile isolation (Development)

The imported Bitwarden CLI initially auto-created `Bitwarden CLI` state
under `XDG_CONFIG_HOME`, `~/.config`, Windows `APPDATA` or macOS
Application Support, and honored `BITWARDENCLI_APPDATA_DIR` and a nearby
`bw-data` directory. That would make this independently maintained source
fork read/write the upstream application's profile under some normal setups.

GoreeCloud Vault CLI now uses its own **GoreeCloud Vault CLI** profile folder
on Linux, macOS and Windows, and supports an explicit absolute-only override
through `GOREECLOUD_VAULT_CLI_DATA_DIR`. It ignores the upstream data-path
override and legacy portable `bw-data` location. A missing absolute profile
root fails closed rather than falling back to the shell working directory.

There is **no automatic reading, importing, migrating or copying** of
Bitwarden CLI's existing data. Original Bitwarden data remains untouched and
can be migrated only through a separately reviewed, owner-approved mechanism.
The upstream `bw` command name and Bitwarden wire/API dependencies may still
exist; directory isolation by itself does not prove account/session, service,
network or cryptographic segregation.

## Evidence

`scripts/check_cli_profile_isolation.sh` runs a compiled **OSS development**
CLI with disposable synthetic HOME and XDG directories and verifies startup
under the new profile, rejection of the inherited override, and rejection of
relative GoreeCloud overrides. CI runs it after CLI compilation, before other
client builds. It never performs login or touches an existing user vault.

**Not accepted:** real credential handling, authenticated service/back-end,
legacy profile import, secure storage audit, CLI packaging/signing, or any
production release.

## Package distribution boundary

The imported CLI package still carries upstream `@bitwarden/cli` naming and
commands, which are not distribution-ready GoreeCloud identifiers. The fork
marks this development workspace package `private: true` and replaces the
upstream npm publishing script with a hard failure. It must not publish into
the Bitwarden namespace or any GoreeCloud release registry until the package
identity, migration compatibility, signing and legal review are accepted.
