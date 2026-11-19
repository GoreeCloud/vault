import {describe, expect, test} from 'vitest';
import {decodeBase32, generateOtp, parseOtp} from './otp';

function base32(bytes: Uint8Array) {
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let buffer=0,bits=0,out='';
  for (const n of bytes) {
    buffer=(buffer<<8)|n; bits+=8;
    while (bits>=5) { bits-=5; out+=alphabet[(buffer>>>bits)&31]; buffer&=(1<<bits)-1; }
  }
  if (bits) out+=alphabet[(buffer<<(5-bits))&31];
  return out;
}
describe('RFC 6238 cross-browser one-time codes', () => {
  const vectors = [
    ['12345678901234567890','SHA1','94287082'],
    ['12345678901234567890123456789012','SHA256','46119246'],
    ['1234567890123456789012345678901234567890123456789012345678901234','SHA512','90693936']
  ] as const;
  for (const [key,algorithm,code] of vectors) test(algorithm+' at 59 seconds', async()=>{
    const secret=base32(new TextEncoder().encode(key));
    expect(await generateOtp({type:'totp',secret,algorithm,digits:8,period:30,counter:0,issuer:'',account:''},59000)).toBe(code);
  });
  test('RFC 4226 HOTP first two counters', async()=>{
    const otp = parseOtp('otpauth://hotp/Example?secret='+base32(new TextEncoder().encode('12345678901234567890'))+'&counter=0');
    expect(await generateOtp(otp)).toBe('755224');
    expect(await generateOtp({...otp,counter:1})).toBe('287082');
  });
  test('otpauth URI and secret validation',()=>{
    const a=parseOtp('otpauth://totp/GoreeCloud:test%40example.invalid?secret=JBSWY3DPEHPK3PXP&issuer=GoreeCloud');
    expect(a.type).toBe('totp'); expect(a.issuer).toBe('GoreeCloud');
    expect(decodeBase32(a.secret).length).toBe(10);
    expect(()=>parseOtp('otpauth://totp/a?secret=????')).toThrow();
    expect(()=>parseOtp('otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&algorithm=MD5')).toThrow();
    expect(()=>parseOtp('otpauth://totp/a?secret=JBSWY3DPEHPK3PXP&period=0')).toThrow();
  });
});
