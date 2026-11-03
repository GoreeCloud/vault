/** Browser-compatible password and TOTP utilities. No network calls. */
const LOWER = "abcdefghjkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";
function randomIndex(bound) {
  if (!Number.isInteger(bound) || bound < 1 || bound > 256) {
    throw new RangeError("Unsupported random selection range.");
  }
  const source = new Uint8Array(1);
  const ceiling = 256 - (256 % bound);
  do { crypto.getRandomValues(source); } while (source[0] >= ceiling);
  return source[0] % bound;
}
export function generatePassword(options = {}) {
  const { length = 24, lowercase = true, uppercase = true,
    digits = true, symbols = true } = options;
  if (!Number.isInteger(length) || length < 12 || length > 128) {
    throw new RangeError("Password length must be from 12 to 128.");
  }
  const groups = [];
  if (lowercase) groups.push(LOWER);
  if (uppercase) groups.push(UPPER);
  if (digits) groups.push(DIGITS);
  if (symbols) groups.push(SYMBOLS);
  if (!groups.length) throw new RangeError("Select at least one character group.");
  const alphabet = groups.join("");
  const result = groups.map(group => group[randomIndex(group.length)]);
  while (result.length < length) result.push(alphabet[randomIndex(alphabet.length)]);
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join("");
}

export function normalizeWebsite(input) {
  if (typeof input !== "string" || !input.trim()) return "";
  const value = input.trim();
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value) ? value : "https://" + value;
  try {
    const url = new URL(candidate);
    if (!["http:", "https:"].includes(url.protocol) || !url.hostname ||
        url.username || url.password) return "";
    return url.toString();
  } catch { return ""; }
}

function decodeBase32(value) {
  if (typeof value !== "string") throw new Error("Invalid TOTP secret.");
  const clean = value.toUpperCase().replace(/[\s=-]/g, "");
  if (!/^[A-Z2-7]{16,256}$/.test(clean)) throw new Error("Invalid Base32 TOTP secret.");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const decoded = [];
  let bits = 0, accumulator = 0;
  for (const char of clean) {
    accumulator = (accumulator << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      decoded.push((accumulator >>> bits) & 255);
      accumulator &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(decoded);
}

export async function generateTotp(base32, timestampMs = Date.now(), options = {}) {
  const { digits = 6, period = 30, algorithm = "SHA-1" } = options;
  if (!Number.isInteger(digits) || digits < 6 || digits > 8 ||
      !Number.isInteger(period) || period < 15 || period > 120 ||
      !["SHA-1", "SHA-256", "SHA-512"].includes(algorithm) ||
      !Number.isFinite(timestampMs) || timestampMs < 0) {
    throw new RangeError("Invalid TOTP parameters.");
  }
  const counter = BigInt(Math.floor(timestampMs / 1000 / period));
  const input = new Uint8Array(8);
  new DataView(input.buffer).setBigUint64(0, counter);
  const key = await crypto.subtle.importKey(
    "raw", decodeBase32(base32), { name: "HMAC", hash: algorithm }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, input));
  const offset = mac[mac.length - 1] & 15;
  const value = (((mac[offset] & 127) << 24) |
    (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]) >>> 0;
  return String(value % (10 ** digits)).padStart(digits, "0");
}
