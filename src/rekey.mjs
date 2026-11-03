import { createVault, openVault } from "./crypto.mjs";

/**
 * Verify the current passphrase against authenticated persisted ciphertext,
 * then re-encrypt the same validated document with a new salt and key.
 *
 * Pure with respect to persistence: the caller must atomically commit the
 * result against its exact previous ciphertext revision.
 */
export async function rotateVaultPassphrase(envelope, currentPassphrase, nextPassphrase) {
  if (typeof currentPassphrase !== "string" || !currentPassphrase) {
    throw new Error("Current vault passphrase required.");
  }
  if (typeof nextPassphrase !== "string" || nextPassphrase.length < 12) {
    throw new Error("New passphrase must contain at least 12 characters.");
  }
  if (nextPassphrase === currentPassphrase) {
    throw new Error("Choose a different passphrase.");
  }
  const { document } = await openVault(envelope, currentPassphrase);
  return createVault(nextPassphrase, document);
}
