import { openVault } from "./crypto.mjs";

/**
 * Authenticate an encrypted backup without mutating storage.
 *
 * The only returned information is the count of structurally valid items.
 * This cannot promise data durability or full browser recovery acceptance.
 */
export async function verifyEncryptedBackup(envelope, passphrase) {
  const opened = await openVault(envelope, passphrase);
  return Object.freeze({ itemCount: opened.document.items.length });
}
