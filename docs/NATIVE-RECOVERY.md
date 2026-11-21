# GoreeCloud Vault — Native encrypted backup and recovery

**Status:** Source implementation, synthetic tests and limited physical Android 16 first-run verification; *not yet validated* end-to-end backup restoration on Android hardware or a representative Linux graphical session. Do not rely on this preview for real credentials.

## Supported format

The portable backup uses the exact [encrypted version 1 JSON envelope](CRYPTO-FORMAT.md) already shared by the web and Firefox apps. Login passwords, note text, OTP seeds, custom fields, tags and passkey *references* live exclusively inside authenticated ciphertext. This is *not* a passkey private-key backup.

## Export

1. Unlock the native app.
2. Open the toolbar's **Encrypted backup options** menu and select **Export encrypted backup**.
3. Choose a location using the OS picker. Linux uses the system save dialog; Android uses **ACTION_CREATE_DOCUMENT** with the system Documents provider.
4. The export contains ciphertext only. Keep the master password separately and protect the destination and its copies.

Before opening the destination picker, the native app rechecks that the
encrypted on-disk vault matches the last observed in-memory ciphertext.
If another writer replaced the file, export refuses rather than silently
producing an outdated recovery checkpoint. The check is **not** an interprocess
transaction and cannot guarantee the file will remain unchanged after the
comparison. If the app locks while the picker is open, it does not announce
a successful export on the old unlocked session.

The Android backup channel receives bounded ciphertext and does not request broad storage or Internet permissions itself. The Flutter debug manifest requests Internet for development tooling; the main manifest does not. The channel wipes its transient byte array after save/cancellation. This cannot guarantee that other process copies are zeroized.

## Restore

1. On the lock screen or from the unlocked toolbar select **Restore encrypted backup**.
2. Choose an encrypted JSON file. Selection is capped at 5,000,000 bytes. The native file reader checks the provider-reported size and independently caps streamed bytes, rejecting truncation, extra bytes, or a provider reporting a smaller size than it delivers.
3. Enter the **password for that backup**. Invalid format, incorrect password and altered authenticated ciphertext are rejected *before* local state is changed.
4. Review the number of authenticated items and explicitly confirm **Replace local vault**.
5. The app writes the encrypted envelope through its existing temp-file-and-rename store. Before writing, the app checks that the current encrypted destination still
matches the previously observed snapshot, including an originally missing
vault. The restore also rejects newly invalidated app lock sessions after
the OS picker returns; changing apps during password validation or confirmation
aborts the operation. The final authenticated snapshot comparison and
encrypted temp-file/rename now execute under a stable app-private advisory
lockfile with an in-isolate FIFO. The native lock-epoch is checked after
lock acquisition and after writing the temporary ciphertext, before rename.
This protects against cooperating native writers on the same local vault path. It does not stop noncooperating writers,
malicious filesystem actors, OS compromise, concurrent non-Dart tools or
prove directory fsync, power-loss durability, or valid-old-backup rollback
detection. Only after the write succeeds does it replace the current
encrypted envelope. It **remains locked** and requires the backup's master password for a fresh unlock. This prevents Android file-picker lifecycle transitions from inadvertently reopening a vault.

Restore **replaces** local data. It does not merge or synchronize items, automatically retain a history, change the master password on existing files, recover a forgotten password, or detect rollback of a valid older encrypted backup. Back up current encrypted data first.

## Tested and untested scope

New synthetic store tests also exercise racing cooperative encrypted writers,
a rejected second first-run creation, lockfile symlink refusal, and permission
checks on the empty 0600 Linux lockfile. These tests do not prove Android
provider behavior or true multi-process crash recovery.

Synthetic Dart tests cover bounded provider-stream reads (misreported size, overrun, underrun, read failures), Linux 0600 mode, random exclusive temp files, symlink and oversized-file rejection, and multi-type export/inspect/re-encryption, authenticated decryption, rejection of tampered GCM ciphertext, wrong-password failures, unsupported envelope, and oversized input. Native Flutter analyzer/tests and Linux release compilation verify source compatibility. Android debug APK CI compilation tests the Kotlin bridge at build time.

A debug APK was installed and launched on Android 16; an empty synthetic vault was created and the note editor inspected. The backup picker was not exercised.

Not yet validated: actual file picker behavior, cloud-provider documents, app interruption during picker/write, SAF provider truncation semantics across Android vendors, directory permissions, physical-device backup import/export, cancellation, and real crash/power-loss atomicity. No rollback-detection policy exists for valid but older backups. If storage
fails during restore, inspect the actual encrypted destination before retrying;
do not assume that all write failures automatically preserve the original.

## Recovery acceptance checklist

- Export on Linux and Android, hash/reopen encrypted files and verify actual byte identity.
- Import a synthetic backup from web/Firefox, unlock, compare entry count/types/OTP secret without logging values.
- Attempt wrong password, malformed JSON, oversized file and tampered ciphertext; verify original encrypted file is byte-for-byte unchanged.
- Simulate cancellation and write failure; check no partial in-memory state and no corrupted original.
- Restore an older valid copy; document that it can roll back newer entries.
- Assess Android document-provider behavior on at least one real device and a Linux graphical session.
- Before production, review key handling, backup retention, KDF migration and complete data-loss recovery exercises.
