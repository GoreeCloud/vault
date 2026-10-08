import { randomInt } from "node:crypto";

/**
 * Password-generation prototype for trusted local clients only.
 * Uses Node's CSPRNG with unbiased bounded selection.
 * No persistence, network, telemetry, logs, or clipboard operations.
 *
 * This module is NOT an accepted GoreeCloud Vault cryptographic trust boundary.
 * Do not ship for real credentials before the exact-revision security review.
 */
const CLASSES = Object.freeze({
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}:,.?"
});
const AMBIGUOUS = new Set("0O1lI");
const KEYS = new Set(["length", "lowercase", "uppercase", "digits", "symbols", "excludeAmbiguous"]);
const MIN_TARGET_BITS = 128;

// Snapshot *own data properties* before using caller-controlled configuration.
// Proxy traps can still lie, so this is robustness, not a security attestation.
function snapshotOptions(input) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) {
      throw new TypeError();
    }
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null) throw new TypeError();
    const safe = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== "string" || !KEYS.has(key)) throw new TypeError();
      const property = Object.getOwnPropertyDescriptor(input, key);
      if (!property || !Object.hasOwn(property, "value")) throw new TypeError();
      safe[key] = property.value;
    }
    return safe;
  } catch {
    throw new TypeError("Invalid generator options");
  }
}

export function generatePassword(options = {}) {
  const safe = snapshotOptions(options);
  const length = safe.length ?? 28;
  if (!Number.isSafeInteger(length) || length < 16 || length > 256) {
    throw new RangeError("Password length must be an integer between 16 and 256");
  }
  const excludeAmbiguous = safe.excludeAmbiguous ?? false;
  if (typeof excludeAmbiguous !== "boolean") throw new TypeError("Invalid excludeAmbiguous option");

  const groups = [];
  for (const [name, original] of Object.entries(CLASSES)) {
    const enabled = safe[name] ?? true;
    if (typeof enabled !== "boolean") throw new TypeError("Character class options must be boolean");
    if (!enabled) continue;
    const alphabet = excludeAmbiguous ? [...original].filter(c => !AMBIGUOUS.has(c)).join("") : original;
    if (!alphabet) throw new RangeError("Selected character class is empty");
    groups.push(alphabet);
  }
  if (groups.length === 0) throw new RangeError("At least one character class must be enabled");

  const alphabet = groups.join("");
  // A conservative configuration gate, NOT a claim of formal min-entropy:
  // forced per-class characters and shuffling alter the output distribution.
  if (length * Math.log2(alphabet.length) < MIN_TARGET_BITS) {
    throw new RangeError("Configuration does not meet the minimum strength target");
  }

  // Include every requested class without bias from % arithmetic.
  const output = groups.map(group => group[randomInt(group.length)]);
  while (output.length < length) output.push(alphabet[randomInt(alphabet.length)]);
  for (let i = output.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output.join("");
}
