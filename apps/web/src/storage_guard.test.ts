import {describe, expect, it} from 'vitest';
import {sameStoredVault} from './storage_guard';
import type {VaultEnvelope} from './crypto';

const envelope: VaultEnvelope = {
  format: 'goreecloud-vault',
  version: 1,
  kdf: {name:'pbkdf2-sha256',iterations:600_000,salt:'AAAAAAAAAAAAAAAAAAAAAA=='},
  cipher:{name:'aes-256-gcm',nonce:'AAAAAAAAAAAAAAAA',data:'AAAAAAAAAAAAAAAAAAAAAAAA'},
};

describe('encrypted browser storage freshness', () => {
  it('accepts only the same ciphertext, not changed nonce, salt or malformed data', () => {
    expect(sameStoredVault(envelope, envelope)).toBe(true);
    expect(sameStoredVault(envelope, JSON.stringify(envelope))).toBe(true);
    expect(sameStoredVault(envelope, {...envelope,
      cipher:{...envelope.cipher,nonce:'AQAAAAAAAAAAAAAA'}})).toBe(false);
    expect(sameStoredVault(envelope, {...envelope,
      kdf:{...envelope.kdf,salt:'AQAAAAAAAAAAAAAAAAAAAA=='}})).toBe(false);
    expect(sameStoredVault(envelope, '{"format":"goreecloud-vault","cipher":{}}')).toBe(false);
    expect(sameStoredVault(envelope, null)).toBe(false);
    expect(sameStoredVault(envelope, undefined)).toBe(false);
  });

  it('allows first-run creation only when storage was absent', () => {
    expect(sameStoredVault(null,null)).toBe(true);
    expect(sameStoredVault(null,undefined)).toBe(true);
    expect(sameStoredVault(null,JSON.stringify(envelope))).toBe(false);
    expect(sameStoredVault(null,{})).toBe(false);
    expect(sameStoredVault(null,'corrupt data')).toBe(false);
  });
});
