import sample from '../../../tests/interop/sample-v1.json';
import { describe, expect, test } from 'vitest';
import { encryptEntries, from64, generatePassword, initialize, parseEnvelope, unlock, type Entry } from './crypto';
describe('encrypted local vault format', () => {
  test('round trip, authentication, randomized nonces, no plaintext', async () => {
    const created = await initialize('a sufficiently long master password');
    const item: Entry = { id: 'abc', title: 'Example', username: 'user', password: 'TOP-SECRET-TEST', website: 'example.com', notes: '' };
    const first = await encryptEntries([item], created.key, created.envelope.kdf.salt);
    const second = await encryptEntries([item], created.key, created.envelope.kdf.salt);
    expect(first.cipher.nonce).not.toBe(second.cipher.nonce);
    expect(JSON.stringify(first)).not.toContain('TOP-SECRET-TEST');
    expect((await unlock('a sufficiently long master password', parseEnvelope(JSON.stringify(first)))).entries).toEqual([item]);
    await expect(unlock('bad password', first)).rejects.toThrow();
  });
  test('rejects malformed, future and undersized envelopes', async () => {
    const created = await initialize('a sufficiently long master password');
    expect(from64(created.envelope.kdf.salt)).toHaveLength(16);
    expect(() => parseEnvelope(JSON.stringify({...created.envelope, version:2}))).toThrow();
    expect(() => parseEnvelope(JSON.stringify({...created.envelope, cipher:{...created.envelope.cipher,nonce:'bad'}}))).toThrow();
  });
  test('Node.js synthetic fixture decrypts in WebCrypto', async () => {
    const result = await unlock('interop test password only', parseEnvelope(JSON.stringify(sample)));
    expect(result.entries[0].password).toEqual('NOT-A-REAL-PASSWORD');
  });
  test('password generator', () => {
    expect(generatePassword(24)).toHaveLength(24);
    expect(generatePassword(24)).not.toEqual(generatePassword(24));
  });
});
