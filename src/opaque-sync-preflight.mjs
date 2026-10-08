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

function ownPlainRecord(value, permittedKeys) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  if (Object.getOwnPropertySymbols(value).length) return false;
  const names = Object.getOwnPropertyNames(value);
  if (names.length !== permittedKeys.length) return false;
  return names.every(name =>
    permittedKeys.includes(name) &&
    Object.getOwnPropertyDescriptor(value, name)?.get === undefined &&
    Object.getOwnPropertyDescriptor(value, name)?.set === undefined
  );
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
    if (!ownPlainRecord(frame, FIELDS) ||
        !ownPlainRecord(trustedContext, CONTEXT_FIELDS)) return reject("invalid-shape");
    if (trustedContext.authorized !== true) return reject("not-authorized");
    if (!isId(trustedContext.expectedVaultId) ||
        !isRevision(trustedContext.expectedPreviousRevision) ||
        !isId(frame.vaultId) || !isId(frame.itemId)) return reject("invalid-identity");
    if (frame.vaultId !== trustedContext.expectedVaultId) return reject("vault-mismatch");
    if (frame.schemaVersion !== 0 ||
        (frame.operation !== "create" && frame.operation !== "replace")) {
      return reject("unsupported-development-format");
    }
    if (!isRevision(frame.previousRevision) ||
        !isRevision(frame.nextRevision) ||
        frame.nextRevision !== frame.previousRevision + 1 ||
        frame.previousRevision !== trustedContext.expectedPreviousRevision) {
      return reject("revision-conflict");
    }
    if ((frame.operation === "create" && frame.previousRevision !== 0) ||
        (frame.operation === "replace" && frame.previousRevision < 1)) {
      return reject("operation-conflict");
    }
    if (!isCanonicalOpaquePayload(frame.sealedPayload)) return reject("invalid-payload-shape");
    return Object.freeze({ candidate: true, reason: "preflight-only-no-crypto" });
  } catch {
    // Throwing getters/proxies/etc. must not escape into callers.
    return reject("invalid-shape");
  }
}
