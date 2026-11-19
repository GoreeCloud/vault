import {describe,expect,test} from 'vitest';
import {normalizePasskeyRpId,isPasskeyRpBoundToOrigin} from './passkey_rp';

describe('passkey reference RP scope preflight',()=>{
  test('accepts registrable domains and normalizes ASCII case',()=>{
    expect(normalizePasskeyRpId(' Example.COM ')).toBe('example.com');
    expect(normalizePasskeyRpId('login.example.com')).toBe('login.example.com');
    expect(normalizePasskeyRpId('foo.github.io')).toBe('foo.github.io');
    expect(normalizePasskeyRpId('example.co.uk')).toBe('example.co.uk');
    expect(normalizePasskeyRpId('xn--bcher-kva.com')).toBe('xn--bcher-kva.com');
    expect(normalizePasskeyRpId('localhost')).toBe('localhost');
  });
  test('rejects public suffixes, malformed names, origins, ports and IPs',()=>{
    for(const bad of ['com','co.uk','github.io','localhost.','',
      '.example.com','example..com','-example.com','exa-.example.com',
      'https://example.com','example.com:443','user@example.com',
      '127.0.0.1','[::1]','*.example.com','example.com/path',
      'a'.repeat(64)+'.com','bücher.com']) {
      expect(normalizePasskeyRpId(bad),bad).toBeNull();
    }
  });
  test('allows only exact domain or its HTTPS subdomains, port independent',()=>{
    expect(isPasskeyRpBoundToOrigin('example.com','https://example.com')).toBe(true);
    expect(isPasskeyRpBoundToOrigin('example.com','https://login.example.com:8443')).toBe(true);
    expect(isPasskeyRpBoundToOrigin('example.com','https://sub.login.example.com')).toBe(true);
    expect(isPasskeyRpBoundToOrigin('example.com','https://evil-example.com')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('example.com','https://example.com.evil.test')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('login.example.com','https://example.com')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('example.com','http://example.com')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('co.uk','https://login.co.uk')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('github.io','https://foo.github.io')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('localhost','http://localhost:3000')).toBe(true);
    expect(isPasskeyRpBoundToOrigin('localhost','http://notlocalhost:3000')).toBe(false);
    expect(isPasskeyRpBoundToOrigin('localhost','http://localhost.evil.test')).toBe(false);
  });
  test('rejects non-origin strings and credential-bearing URLs',()=>{
    for(const bad of ['https://example.com/path','https://example.com?x=1',
      'https://user@example.com','https://example.com/','https://example.com#test',
      'file:///tmp/example.com','data:text/plain,example.com']) {
      expect(isPasskeyRpBoundToOrigin('example.com',bad),bad).toBe(false);
    }
  });
});
