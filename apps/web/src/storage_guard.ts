import {parseEnvelope, type VaultEnvelope} from './crypto';

/** Best-effort encrypted ciphertext snapshot equality. These are NOT
 * cross-process compare-and-swap or anti-rollback guarantees. No secrets,
 * passwords, or decrypted entries are read or logged by this function.
 */
export function sameStoredVault(expected: VaultEnvelope | null, stored: unknown): boolean {
  if (expected === null) return stored === null || stored === undefined;
  if (stored === null || stored === undefined) return false;
  try {
    const candidate = parseEnvelope(
      typeof stored === 'string' ? stored : JSON.stringify(stored),
    );
    return candidate.format === expected.format &&
      candidate.version === expected.version &&
      candidate.kdf.name === expected.kdf.name &&
      candidate.kdf.iterations === expected.kdf.iterations &&
      candidate.kdf.salt === expected.kdf.salt &&
      candidate.cipher.name === expected.cipher.name &&
      candidate.cipher.nonce === expected.cipher.nonce &&
      candidate.cipher.data === expected.cipher.data;
  } catch {
    return false;
  }
}
