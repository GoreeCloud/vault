# GoreeCloud Vault — Native encrypted backup and recovery

**Status:** Source implementation and synthetic tests; *not yet validated* end-to-end on Android hardware or in a representative Linux user session. Do not rely on this preview for real credentials.

## Supported format

The portable backup uses the exact [encrypted version 1 JSON envelope](CRYPTO-FORMAT.md) already shared by the web and Firefox apps. Login passwords, note text, OTP seeds, custom fields, tags and passkey *references* live exclusively inside authenticated ciphertext. This is *not* a passkey private-key backup.

## Export

1. Unlock the native app.
2. Open the toolbar's **Encrypted backup options** menu and select **Export encrypted backup**.
3. Choose a location using the OS picker. Linux uses the system save dialog; Android uses **ACTION_CREATE_DOCUMENT** with the system Documents provider.
4. The export contains ciphertext only. Keep the master password separately and protect the destination and its copies.

The Android native channel receives bounded encrypted bytes via Base64 and does not request external-storage, file-system-wide or Internet permissions. The channel wipes its transient byte array after save/cancellation. This cannot guarantee that other process copies are zeroized.

## Restore

1. On the lock screen or from the unlocked toolbar select **Restore encrypted backup**.
2. Choose an encrypted JSON file. Selection is capped at 5,000,000 bytes.
3. Enter the **password for that backup**. Invalid format, incorrect password and altered authenticated ciphertext are rejected *before* local state is changed.
4. Review the number of authenticated items and explicitly confirm **Replace local vault**.
5. The app writes the encrypted envelope through its existing temp-file-and-rename store. Only after the write succeeds does it replace the unlocked in-memory key and items.

Restore **replaces** local data. It does not merge or synchronize items, automatically retain a history, change the master password on existing files, recover a forgotten password, or detect rollback of a valid older encrypted backup. Back up current encrypted data first.

## Tested and untested scope

Synthetic Dart tests cover multi-type export/inspect/re-encryption, authenticated decryption, rejection of tampered GCM ciphertext, wrong-password failures, unsupported envelope, and oversized input. Native Flutter analyzer/tests and Linux release compilation verify source compatibility. Android debug APK CI compilation tests the Kotlin bridge at build time.

Not yet validated: actual file picker behavior, cloud-provider documents, app interruption during picker/write, SAF provider truncation semantics across Android vendors, directory permissions, physical-device backup import/export, cancellation, and real crash/power-loss atomicity. No rollback-detection policy exists for valid but older backups.

## Recovery acceptance checklist

- Export on Linux and Android, hash/reopen encrypted files and verify actual byte identity.
- Import a synthetic backup from web/Firefox, unlock, compare entry count/types/OTP secret without logging values.
- Attempt wrong password, malformed JSON, oversized file and tampered ciphertext; verify original encrypted file is byte-for-byte unchanged.
- Simulate cancellation and write failure; check no partial in-memory state and no corrupted original.
- Restore an older valid copy; document that it can roll back newer entries.
- Assess Android document-provider behavior on at least one real device and a Linux graphical session.
- Before production, review key handling, backup retention, KDF migration and complete data-loss recovery exercises.
