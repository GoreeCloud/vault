# GoreeCloud Vault — Notes

## Current repository state

The repository documentation baseline defines what GoreeCloud Vault must become. It does not establish that the specified product capabilities have been implemented.

Use PROJECT-SPECIFICATIONS.md for authoritative product requirements, PLANNED-FEATURES.md for requirements awaiting verified implementation, IMPLEMENTED-FEATURES.md for verified completed capabilities, and PROJECT-RECORD.md for significant verified history.

## Security-sensitive documentation

Do not place real passwords, passkeys, TOTP seeds, API keys, private keys, access tokens, recovery secrets, production credentials, or decrypted Vault material in repository documentation, examples, tests, logs, issue text, or pull-request descriptions.

## Authority boundary

Other GoreeCloud applications may integrate with Vault, but they must not silently become independent authoritative credential stores. Repository-specific integrations should request narrowly scoped operations from Vault interfaces whenever practical.
