# Importing Proton Pass data into GoreeCloud Vault

**Status:** Development preview for the web app and Firefox extension. Only synthetic export data has been tested. This is not a full-fidelity Proton Pass importer or a usable passkey migration.

## What the importer accepts

- A **manually extracted plaintext data.json** from the unencrypted Proton Pass ZIP export, such as the file under the Proton Pass directory within that archive.
- A bounded file of 1 byte to 5,000,000 bytes. The top-level document must contain a version string and a vaults mapping. Active record content-format versions 1–8 are supported; future schema versions are rejected rather than silently interpreted.
- A user-selected file, a locally unlocked GoreeCloud Vault, and an explicit count-only confirmation before any encrypted write.

**Not accepted:** ZIP archives, PGP-encrypted data.pgp, the Proton Pass CSV export, cloud account access, automatic Proton API access, actual passkey private keys, alias re-registration, or attachment binaries. Do not rename encrypted exports to data.json as a workaround. Proton's official instructions explain the available export choices: https://proton.me/support/pass-export .

## Supported fields

| Proton Pass plaintext data.json | GoreeCloud encrypted vault |
| --- | --- |
| Active login records | Login title, username or email, password, first website, notes, TOTP |
| Active note records | Secure-note title and body |
| Login with both username and email | Username; secondary email retained as an encrypted visible custom field |
| Custom field: text or hidden | Encrypted visible or concealed custom field |
| Custom field: extra TOTP | One available OTP generator; additional OTP seeds retained as concealed encrypted fields |
| Vault name | Encrypted tag |
| Pinned item | Favorite |

New random identifiers are generated; existing entries are **not replaced, merged or deduplicated**. The source is processed locally in memory, and only AES-GCM encrypted GoreeCloud records are saved on confirmation. Neither the app nor the extension uploads the source to a server.

## Omitted or changed material

The confirmation reports counts for unsupported item types (including cards, identities, aliases, SSH keys, Wi-Fi and templates), deleted/trashed records, passkeys, attachments, extra URLs beyond the first, unsupported custom field types and extra sections. Passkey counts refer only to parsed supported logins; unsupported item types are not fully inspected for embedded credential material. **Never interpret a zero count as proof that a Proton export had no passkeys.** Forwarding aliases are not recreated and remain dependent on Proton. Additional TOTP fields kept as concealed text are not automatically configured as separate authenticators.

**Important:** The version-8 export structure was checked against published format descriptions; real customer exports, future schema changes and every custom field variation have not been independently accepted. Test recovery on synthetic material, verify every supported field after import, and retain an independently secured original backup until migration quality is established.

## Safe procedure

1. On a trusted machine, export from Proton Pass using its own export interface. If you choose its **unencrypted ZIP**, understand that the data inside is plaintext.
2. Extract the plaintext data.json locally. Do **not** upload it to a public issue, log, source repository, cloud storage, or this conversation.
3. Unlock GoreeCloud Vault web or Firefox extension. Choose **Import Proton Pass data.json**.
4. Review item counts and omissions, then confirm. Validation errors and canceled confirmation do not write to the destination vault. If a storage write itself fails, inspect the encrypted vault before retrying; storage failure is not proof that a write was rolled back.
5. Lock and unlock the destination to inspect the imported entries. Export a fresh **GoreeCloud encrypted JSON backup** for portable recovery.
6. Keep the original manager and its secure backup until every required credential and 2FA configuration has been checked. Protect or securely delete plaintext export files from disk, downloads, backups and sync folders when safe.

JavaScript memory cannot be guaranteed to be zeroized, and an OS, malicious extension or website compromise remains outside this preview's security guarantees. Web and Firefox tests use fake credentials only, including a simulated delayed encrypted storage write across the inactivity lock. This feature does not provide complete Proton Pass replacement, alias hosting, passkey authentication, or cloud sync.
