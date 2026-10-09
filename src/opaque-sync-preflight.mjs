/**
 * Non-operational GoreeCloud Vault sync preflight.
 *
 * Screens synthetic, purportedly encrypted record frames. This module
 * intentionally does NOT authenticate, encrypt, verify AEAD tags, persist,
 * synchronize, authorize or retrieve vault data. A base64url string is
 * not evidence of encryption. Until human review, it cannot gate real secrets.
 *
 * Schema 0 is explicitly a Development fixture, never a production format.
 */
const FIELDS = Object.freeze([
  "schemaVersion", "operation", "vaultId", "itemId",
  "previousRevision", "nextRevision", "sealedPayload"
]);
const CONTEXT_FIELDS = Object.freeze([
  "expectedVaultId", "expectedPreviousRevision", "authorized"
]);
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;
const B64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const MAX_PAYLOAD_BYTES = 32 * 1024;
const MIN_PAYLOAD_BYTES = 32;

// Copy the allowed own data properties once before screening. Proxy
// descriptors are forgeable, so this is NOT authorization or attestation.
function snapshotRecord(input, names) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) return null;
  const keys = Reflect.ownKeys(input);
  if (keys.length !== names.length) return null;
  const safe = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string" || !names.includes(key)) return null;
    const field = Object.getOwnPropertyDescriptor(input, key);
    if (!field || !Object.hasOwn(field, "value")) return null;
    safe[key] = field.value;
  }
  return safe;
}
function isId(x) { return typeof x === "string" && ID_RE.test(x); }
function isRevision(x) { return Number.isSafeInteger(x) && x >= 0; }
function reject(reason) { return Object.freeze({ candidate: false, reason }); }

/**
 * Canonical unpadded base64url framing; validate length without decoding.
 * This is NOT a secrecy, integrity or algorithm-validation check.
 */
export function isCanonicalOpaquePayload(value) {
  if (typeof value !== "string" || value.length > 44000 ||
      !B64URL_RE.test(value) || value.length % 4 === 1) return false;
  const rem = value.length % 4;
  const byteLength = 3 * Math.floor(value.length / 4) + (rem === 2 ? 1 : rem === 3 ? 2 : 0);
  if (byteLength < MIN_PAYLOAD_BYTES || byteLength > MAX_PAYLOAD_BYTES) return false;
  if (rem !== 0) {
    const lastCharValue = B64URL_ALPHABET.indexOf(value[value.length - 1]);
    const lowBitsMask = rem === 2 ? 15 : 3;
    if (lastCharValue < 0 || (lastCharValue & lowBitsMask) !== 0) return false;
  }
  return true;
}

/**
 * Requires a trusted authorization decision and authoritative vault revision.
 * The context fields alone are forgeable by callers; a candidate=true verdict
 * may NEVER substitute for server enforcement, crypto validation, or permission.
 */
export function preflightOpaqueSyncMutation(frame, trustedContext) {
  try {
    const frameInput = snapshotRecord(frame, FIELDS);
    const contextInput = snapshotRecord(trustedContext, CONTEXT_FIELDS);
    if (!frameInput || !contextInput) return reject("invalid-shape");
    if (contextInput.authorized !== true) return reject("not-authorized");
    if (!isId(contextInput.expectedVaultId) ||
        !isRevision(contextInput.expectedPreviousRevision) ||
        !isId(frameInput.vaultId) || !isId(frameInput.itemId)) return reject("invalid-identity");
    if (frameInput.vaultId !== contextInput.expectedVaultId) return reject("vault-mismatch");
    if (frameInput.schemaVersion !== 0 ||
        (frameInput.operation !== "create" && frameInput.operation !== "replace")) {
      return reject("unsupported-development-format");
    }
    if (!isRevision(frameInput.previousRevision) ||
        !isRevision(frameInput.nextRevision) ||
        frameInput.nextRevision !== frameInput.previousRevision + 1 ||
        frameInput.previousRevision !== contextInput.expectedPreviousRevision) {
      return reject("revision-conflict");
    }
    if ((frameInput.operation === "create" && frameInput.previousRevision !== 0) ||
        (frameInput.operation === "replace" && frameInput.previousRevision < 1)) {
      return reject("operation-conflict");
    }
    if (!isCanonicalOpaquePayload(frameInput.sealedPayload)) return reject("invalid-payload-shape");
    return Object.freeze({ candidate: true, reason: "preflight-only-no-crypto" });
  } catch {
    // Throwing getters/proxies/etc. must not escape into callers.
    return reject("invalid-shape");
  }
}
