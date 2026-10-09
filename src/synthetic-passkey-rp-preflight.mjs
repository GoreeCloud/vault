import { canonicalSecureOrigin, isExactOriginMatch } from "./origin-policy.mjs";

/**
 * DEVELOPMENT ONLY: conservative passkey relying-party/origin screening.
 *
 * No WebAuthn call, credential ID, user handle, private key, attestation,
 * assertion, authenticator data, challenge, session proof or secret value is
 * accepted or returned. Every context fact is caller supplied and forgeable.
 */
const REQUEST_KEYS = Object.freeze([
  "schemaVersion", "operation", "rpId", "documentUrl", "topLevelUrl",
  "frameDepth", "userInitiated", "privateContext", "vaultUnlockedClaim",
  "hostRiskVerdict"
]);
const VERDICT_KEYS = Object.freeze(["decision", "assessedOrigin", "isCurrent"]);
const OPERATIONS = new Set(["create", "get"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function snapshot(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return null;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length) return null;
  const out = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string" || !expected.includes(key)) return null;
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (!d || !Object.hasOwn(d, "value")) return null;
    out[key] = d.value;
  }
  return out;
}

function canonicalRpId(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 253 ||
      value !== value.toLowerCase() || value.endsWith(".") ||
      !/^[a-z0-9.-]+$/.test(value) || value.includes("..")) return null;
  const labels = value.split(".");
  if (labels.some(label => label.length < 1 || label.length > 63 ||
      label.startsWith("-") || label.endsWith("-"))) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) return null;
  return value;
}

/**
 * Exact-host Development policy is intentionally stricter than full WebAuthn
 * RP-ID semantics. candidate=true is never permission to call navigator.credentials.
 */
export function preflightSyntheticPasskeyRp(untrusted) {
  try {
    const req = snapshot(untrusted, REQUEST_KEYS);
    if (!req) return deny("invalid-request");
    if (req.schemaVersion !== 0 || !OPERATIONS.has(req.operation)) {
      return deny("unsupported-development-request");
    }

    const rpId = canonicalRpId(req.rpId);
    const documentOrigin = canonicalSecureOrigin(req.documentUrl);
    const topOrigin = canonicalSecureOrigin(req.topLevelUrl);
    if (!rpId || !documentOrigin || !topOrigin) return deny("invalid-origin-or-rp");

    if (!Number.isSafeInteger(req.frameDepth) || req.frameDepth !== 0) {
      return deny("top-level-context-required");
    }
    for (const key of ["userInitiated", "privateContext", "vaultUnlockedClaim"]) {
      if (typeof req[key] !== "boolean") return deny("invalid-context");
    }
    if (req.privateContext) return deny("private-context-disabled");
    if (!req.userInitiated) return deny("user-gesture-required");
    if (!req.vaultUnlockedClaim) return deny("vault-unlock-claim-missing");
    if (!isExactOriginMatch(documentOrigin, topOrigin)) {
      return deny("top-level-origin-mismatch");
    }

    const host = new URL(documentOrigin).hostname;
    if (rpId !== host) return deny("exact-host-rp-required");

    const verdict = snapshot(req.hostRiskVerdict, VERDICT_KEYS);
    if (!verdict || verdict.decision !== "allow" || verdict.isCurrent !== true ||
        !isExactOriginMatch(verdict.assessedOrigin, documentOrigin)) {
      return deny("risk-evidence-not-accepted");
    }

    return Object.freeze({ candidate: true, reason: "synthetic-passkey-rp-preflight-only" });
  } catch {
    return deny("invalid-request");
  }
}
