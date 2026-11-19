# Import Bitwarden into GoreeCloud Vault (development preview)

**Supported source:** An *unencrypted / plaintext Bitwarden .json export* from an individual vault. The user must explicitly select a local file and confirm a count-only preview. No Bitwarden API access, network transfer, cloud sync, source-code copying, account access or encrypted Bitwarden export decryption is performed.

**Security caution:** Plaintext password-manager exports are extremely sensitive. Export only on a trusted device, do not send the file through email/cloud/network services, and delete the plaintext source when you have independently checked your encrypted GoreeCloud backup and data. Bitwarden's [export guidance](https://bitwarden.com/help/export-your-data/) warns against insecure storage of plaintext exports.

## Web, Firefox, Linux and Android workflow

1. Create or unlock a GoreeCloud Vault local encrypted vault.
2. Under **Import from other managers** (web), **Import Bitwarden JSON** (Firefox), or the native **Encrypted backup options → Import Bitwarden plaintext JSON** menu (Linux/Android), choose a **plaintext JSON** export, max 5 MB. For native clients create a local encrypted vault first.
3. Native clients require re-entry of the destination master password **after the file picker closes** because backgrounding locks the app. Read the preview: number of personal logins/secure notes and count of unsupported/omitted content. No passwords or item titles are shown in the confirmation.
4. Confirm explicitly. The client generates new random record identifiers and **appends** supported records to the current encrypted vault; it does not overwrite, merge, deduplicate, or sync across devices.
5. Native clients **remain locked** after importing. Unlock and review every entry. Export a *GoreeCloud encrypted JSON backup* only after successful import; to transfer to Linux/Android, use the native **Restore encrypted backup** path, which replaces the native device vault after separate confirmation and requires a fresh unlock.

Supported mappings (personal vault only):

| Bitwarden plaintext JSON | GoreeCloud Vault |
| --- | --- |
| Type 1 login | Encrypted login title, username, password, first URI, notes, favorite |
| Type 2 secure note | Encrypted secure note title, body, favorite |
| Folder name | Single tag if resolvable |
| Custom field type 0 (text) | Encrypted visible custom field |
| Custom field type 1 (hidden) | Encrypted concealed custom field |
| Login TOTP (Base32 or supported otpauth URI) | Encrypted OTP secret and validated parameters |

**Not migrated (reported as counts before confirming):** credit cards, identity items, organization-owned items, attachments, previous passwords, any passkeys including FIDO2 private keys, additional URLs beyond the first, and per-item reprompt policy. Those omissions can be important. Do not discard the original manager or any independently secured backups until you have verified everything required is supported elsewhere. Custom field types outside 0 or 1, invalid OTP sources, malformed structures and oversized imports are rejected rather than silently degraded. When there are no representable personal login/note records, import is rejected.

Bitwarden's password-protected or account-restricted encrypted JSON is **not supported** by this importer. Do not rename encrypted exports or attempt to treat them as plaintext; encrypted Bitwarden files need a separately reviewed interoperable decryptor. ZIPs and CSV are not supported here. Proton Pass import is not implemented.

## Security properties and limits

- Parsing and transformation execute locally in memory. No plaintext export is sent to GoreeCloud or saved as a GoreeCloud plaintext file.
- A fresh cryptographic record identifier is created for each imported item.
- All applications validate a strict 5 MB input size and records with the existing encrypted-format limits.
- Imported entries are encrypted using the destination AES-256-GCM vault before writing persistent storage. Native clients require the destination master password after OS selection and seal the combined item list before replacing the encrypted file.
- Native clients also invalidate a pending import when the application locks again during password verification or preview, and reject a stale encrypted snapshot if the on-disk vault changed before replacement. This is **not** an interprocess transaction or crash-safe multiwriter locking mechanism. On a validation/encryption/storage failure, the old encrypted vault remains untouched.
- The source plaintext file still exists wherever the original password manager exported it. JavaScript/Dart memory and OS caches are not guaranteed to be zeroized; browser extensions and compromised devices remain relevant threats.
- There is no fully lossless migration, collection/organization migration, attachment migration, or passkey signing implementation.
- Automated synthetic tests cover conversion, omissions, encrypted writes, invalid sources, cancellation/rejection and post-import unlock in Chromium, Firefox, the Firefox extension popup's mocked WebExtensions runtime, and Dart unit tests. Native file-picker migration still requires Android and Linux graphical-session testing. Real Firefox extension integration and production acceptance remain pending.
