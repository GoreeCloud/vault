import {parse} from 'tldts';

/**
 * WebAuthn relying-party domain *preflight* validation for new encrypted
 * metadata references. Not a WebAuthn authenticator and not caller identity
 * verification. Runtime authenticators MUST perform their own RP/origin
 * checks, challenge verification, user presence/verification and consent.
 */
export function normalizePasskeyRpId(value: string): string | null {
  if (typeof value !== 'string') return null;
  const input = value.trim().toLowerCase();
  if (input === 'localhost') return input; // Only for local development RP.
  if (input.length < 3 || input.length > 253) return null;
  // Require explicit ASCII DNS (Punycode for IDNs); no URL, userinfo or ports.
  if (!/^[a-z0-9.-]+$/.test(input)) return null;
  const labels = input.split('.');
  if (labels.length < 2 || labels.some(label =>
    label.length < 1 || label.length > 63 ||
    label.startsWith('-') || label.endsWith('-'))) return null;
  const result = parse(input, {allowPrivateDomains: true, extractHostname: false});
  // Use the IANA + private/public suffix list rather than a manually
  // maintained list; "co.uk" and "github.io" are not registrable RP IDs.
  if (result.isIp || result.hostname !== input ||
      !result.domain || !result.publicSuffix ||
      result.publicSuffix === input) return null;
  return input;
}

/**
 * Check the RP ID suffix rule against an explicitly supplied WebAuthn origin.
 * This helper is for research/tests; using it alone MUST NOT authorize a
 * signing operation. Keep password autofill's stronger exact-origin rule.
 */
export function isPasskeyRpBoundToOrigin(rpId: string, origin: string): boolean {
  const rp = normalizePasskeyRpId(rpId);
  if (!rp) return false;
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    if (rp === 'localhost') {
      return host === 'localhost' &&
        (parsed.protocol === 'https:' || parsed.protocol === 'http:');
    }
    if (parsed.protocol !== 'https:') return false;
    return host === rp || host.endsWith('.' + rp);
  } catch { return false; }
}
