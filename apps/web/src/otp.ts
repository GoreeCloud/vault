/**
 * Offline HOTP/TOTP, RFC 4226 / RFC 6238.
 * This module has no dependencies and performs no network requests.
 */
export type Otp = {
  type: 'totp' | 'hotp';
  secret: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
  counter: number;
  issuer: string;
  account: string;
};

const b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function decodeBase32(text: string): Uint8Array {
  const input = text.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');
  if (!input || input.length > 1024 || /[^A-Z2-7]/.test(input) || [1, 3, 6].includes(input.length % 8))
    throw Error('Invalid Base32 OTP secret');
  let bits = 0, buffer = 0;
  const output: number[] = [];
  for (const c of input) {
    buffer = (buffer << 5) | b32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >>> bits) & 255);
      buffer &= (1 << bits) - 1;
    }
  }
  if (!output.length || buffer !== 0) throw Error('Malformed Base32 padding');
  return new Uint8Array(output);
}

export function validOtp(value: unknown): value is Otp {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<Otp>;
  if (x.type !== 'totp' && x.type !== 'hotp') return false;
  if (!['SHA1', 'SHA256', 'SHA512'].includes(x.algorithm ?? '')) return false;
  if (x.digits !== 6 && x.digits !== 8) return false;
  if (!Number.isInteger(x.period) || x.period! < 15 || x.period! > 300) return false;
  if (!Number.isSafeInteger(x.counter) || x.counter! < 0) return false;
  if (typeof x.issuer !== 'string' || x.issuer.length > 255 ||
      typeof x.account !== 'string' || x.account.length > 255 ||
      typeof x.secret !== 'string') return false;
  try { return decodeBase32(x.secret).length >= 10; } catch { return false; }
}

export function parseOtp(input: string): Otp {
  if (!input.startsWith('otpauth://')) {
    const value: Otp = {type: 'totp', secret: input.trim().toUpperCase(),
      algorithm: 'SHA1', digits: 6, period: 30, counter: 0, issuer: '', account: ''};
    if (!validOtp(value)) throw Error('Invalid OTP secret');
    return value;
  }
  if (input.length > 2500) throw Error('OTP URI too large');
  const uri = new URL(input);
  if (uri.protocol !== 'otpauth:' || !['totp', 'hotp'].includes(uri.hostname))
    throw Error('Unsupported OTP type');
  const name = decodeURIComponent(uri.pathname.replace(/^\//, ''));
  const algorithm = (uri.searchParams.get('algorithm') ?? 'SHA1').toUpperCase();
  const digits = Number(uri.searchParams.get('digits') ?? '6');
  const period = Number(uri.searchParams.get('period') ?? '30');
  const counter = Number(uri.searchParams.get('counter') ?? '0');
  const value = {
    type: uri.hostname as Otp['type'],
    secret: (uri.searchParams.get('secret') ?? '').toUpperCase().replace(/\s/g, ''),
    algorithm: algorithm as Otp['algorithm'], digits: digits as Otp['digits'],
    period, counter, issuer: uri.searchParams.get('issuer') ?? '',
    account: name.slice(0, 255)
  };
  if (!validOtp(value)) throw Error('Invalid or unsupported OTP URI');
  return value;
}

export async function generateOtp(value: Otp, unixMs = Date.now()): Promise<string> {
  if (!validOtp(value)) throw Error('Invalid OTP settings');
  if (!Number.isFinite(unixMs) || unixMs < 0) throw Error('Invalid time');
  const counter = value.type === 'totp' ? Math.floor(unixMs / (value.period * 1000)) : value.counter;
  const counterBytes = new Uint8Array(8);
  let remaining = BigInt(counter);
  for (let i = 7; i >= 0; i--) { counterBytes[i] = Number(remaining & 255n); remaining >>= 8n; }
  const algorithm = {'SHA1':'SHA-1','SHA256':'SHA-256','SHA512':'SHA-512'}[value.algorithm];
  const key = await crypto.subtle.importKey('raw', decodeBase32(value.secret) as BufferSource,
    {name:'HMAC', hash:algorithm}, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes as BufferSource));
  const offset = mac[mac.length - 1] & 15;
  const binary = ((mac[offset] & 0x7f) << 24) | (mac[offset+1] << 16) |
    (mac[offset+2] << 8) | mac[offset+3];
  return (binary % 10 ** value.digits).toString().padStart(value.digits, '0');
}
