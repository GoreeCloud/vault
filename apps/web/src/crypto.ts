/** GoreeCloud Vault local format v1. No cleartext record metadata is persisted. */
export const STORAGE_KEY = 'goreecloud.vault.encrypted.v1';
export const ITERATIONS = 600_000;
const enc = new TextEncoder();
const dec = new TextDecoder('utf-8', { fatal: true });
const MAX_ENVELOPE_BYTES = 5_000_000;

import { validOtp, type Otp } from './otp';

export type VaultKind = 'login' | 'note' | 'otp' | 'passkey';
export type CustomField = { name: string; value: string; concealed: boolean };
/** Optional extensions preserve existing encrypted file v1 without migrating original records. */
export type Entry = {
  id: string; title: string; username: string; password: string; website: string; notes: string;
  kind?: VaultKind; favorite?: boolean; tags?: string[];
  customFields?: CustomField[];
  otp?: Otp;
  /** A reference only, not a credential private key or a usable passkey authenticator. */
  passkey?: { rpId: string; credentialId: string; userHandle: string };
};
export type VaultEnvelope = {
  format: 'goreecloud-vault'; version: 1;
  kdf: { name: 'pbkdf2-sha256'; iterations: number; salt: string };
  cipher: { name: 'aes-256-gcm'; nonce: string; data: string }
};

export function bytesTo64(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    str += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(str);
}
export function from64(value: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) throw Error('Invalid encoding');
  const str = atob(value);
  return Uint8Array.from(str, c => c.charCodeAt(0));
}
export function randomId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), n => n.toString(16).padStart(2, '0')).join('');
}
export function generatePassword(length = 24): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  const limit = Math.floor(256 / alphabet.length) * alphabet.length;
  let password = '';
  while (password.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const n of bytes) {
      if (n < limit && password.length < length) password += alphabet[n % alphabet.length];
    }
  }
  return password;
}
function validEntries(entries: unknown): entries is Entry[] {
  return Array.isArray(entries) && entries.length <= 20_000 && entries.every(x =>
    x && typeof x === 'object' &&
    ['id', 'title', 'username', 'password', 'website', 'notes'].every(k =>
      typeof x[k] === 'string' && x[k].length <= 20_000) &&
    (x.kind === undefined || ['login', 'note', 'otp', 'passkey'].includes(x.kind)) &&
    (x.favorite === undefined || typeof x.favorite === 'boolean') &&
    (x.tags === undefined || (Array.isArray(x.tags) && x.tags.length <= 30 &&
      x.tags.every((t: unknown) => typeof t === 'string' && t.length <= 120))) &&
    (x.customFields === undefined || (Array.isArray(x.customFields) && x.customFields.length <= 30 &&
      x.customFields.every((f: CustomField) => f && typeof f.name === 'string' && f.name.length <= 150 &&
        typeof f.value === 'string' && f.value.length <= 20000 && typeof f.concealed === 'boolean'))) &&
    (x.otp === undefined || validOtp(x.otp)) &&
    (x.passkey === undefined || (x.passkey && typeof x.passkey.rpId === 'string' &&
      x.passkey.rpId.length <= 253 && /^[a-z0-9.-]+$/.test(x.passkey.rpId) &&
      typeof x.passkey.credentialId === 'string' && x.passkey.credentialId.length <= 4096 &&
      typeof x.passkey.userHandle === 'string' && x.passkey.userHandle.length <= 4096)));
}
export function parseEnvelope(text: string): VaultEnvelope {
  if (text.length > MAX_ENVELOPE_BYTES) throw Error('Vault exceeds size limit');
  const x: unknown = JSON.parse(text);
  if (!x || typeof x !== 'object') throw Error('Invalid vault file');
  const v = x as Partial<VaultEnvelope>;
  if (v.format !== 'goreecloud-vault' || v.version !== 1 ||
    v.kdf?.name !== 'pbkdf2-sha256' || v.kdf?.iterations !== ITERATIONS ||
    v.cipher?.name !== 'aes-256-gcm' || typeof v.kdf.salt !== 'string' ||
    typeof v.cipher.nonce !== 'string' || typeof v.cipher.data !== 'string' ||
    from64(v.kdf.salt).length !== 16 || from64(v.cipher.nonce).length !== 12 ||
    from64(v.cipher.data).length < 17) throw Error('Unsupported or malformed vault');
  return v as VaultEnvelope;
}
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function initialize(password: string): Promise<{ key: CryptoKey; envelope: VaultEnvelope }> {
  if (password.length < 12 || password.length > 1024) throw Error('Master password must contain 12–1024 characters');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const envelope = await encryptEntries([], key, bytesTo64(salt));
  return { key, envelope };
}
export async function unlock(password: string, envelope: VaultEnvelope): Promise<{ key: CryptoKey; entries: Entry[] }> {
  const key = await deriveKey(password, from64(envelope.kdf.salt));
  const data = from64(envelope.cipher.data);
  const clear = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: from64(envelope.cipher.nonce) as BufferSource }, key, data as BufferSource);
  const obj: unknown = JSON.parse(dec.decode(clear));
  if (!obj || typeof obj !== 'object' || (obj as { version?: unknown }).version !== 1 ||
    !validEntries((obj as { entries?: unknown }).entries)) throw Error('Corrupted vault data');
  return { key, entries: (obj as { entries: Entry[] }).entries };
}
export async function encryptEntries(entries: Entry[], key: CryptoKey, salt: string): Promise<VaultEnvelope> {
  if (!validEntries(entries)) throw Error('Invalid entry data');
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const body = enc.encode(JSON.stringify({ version: 1, entries }));
  if (body.length > 2_500_000) throw Error('Vault exceeds size limit');
  const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, body);
  return {
    format: 'goreecloud-vault', version: 1,
    kdf: { name: 'pbkdf2-sha256', iterations: ITERATIONS, salt },
    cipher: { name: 'aes-256-gcm', nonce: bytesTo64(nonce), data: bytesTo64(new Uint8Array(sealed)) }
  };
}
