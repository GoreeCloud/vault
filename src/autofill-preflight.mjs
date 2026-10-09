import { canonicalSecureOrigin, isExactOriginMatch } from "./origin-policy.mjs";

/**
 * Pure candidate screening; NEVER reads, decrypts, copies or emits secrets.
 * Context can be forged in JavaScript; only a trusted native browser host can
 * establish the actual tab/frame/origin, user gesture, unlock and risk state.
 * This helper MUST NOT authorize credential filling.
 */
const REQUEST_FIELDS = new Set([
  "savedUrl", "documentUrl", "topLevelUrl", "frameDepth",
  "userInitiated", "vaultUnlocked", "explicitUserConsent",
  "privateContext", "hostRiskVerdict"
]);
const VERDICT_FIELDS = new Set(["decision", "assessedOrigin", "isCurrent"]);
function denied(reason) { return Object.freeze({ candidate: false, reason }); }

/**
 * Reads one property descriptor per permitted key into a null-prototype
 * snapshot; never invokes accessor properties. Symbols, missing or extra keys,
 * decorated arrays, custom prototypes and throwing proxies fail closed.
 *
 * A Proxy may lie about its descriptors: this is robustness, NOT attestation.
 */
function readExactDataSnapshot(record, allowed) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) return null;
  const proto = Object.getPrototypeOf(record);
  if (proto !== Object.prototype && proto !== null) return null;
  const keys = Reflect.ownKeys(record);
  if (keys.length !== allowed.size) return null;
  const snapshot = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string" || !allowed.has(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

export function preflightAutofillCandidate(untrustedRequest) {
  try {
    const request = readExactDataSnapshot(untrustedRequest, REQUEST_FIELDS);
    if (request === null) return denied("invalid-request");

    for (const field of ["savedUrl", "documentUrl", "topLevelUrl"]) {
      if (canonicalSecureOrigin(request[field]) === null) return denied("invalid-origin");
    }

    if (!Number.isSafeInteger(request.frameDepth) || request.frameDepth !== 0) {
      return denied("frame-not-allowed");
    }

    for (const field of ["userInitiated", "vaultUnlocked", "explicitUserConsent", "privateContext"]) {
      if (typeof request[field] !== "boolean") return denied("missing-trusted-context");
    }
    if (request.privateContext) return denied("private-context-disabled");
    if (!request.vaultUnlocked) return denied("vault-locked");
    if (!request.userInitiated || !request.explicitUserConsent) return denied("consent-required");

    if (!isExactOriginMatch(request.documentUrl, request.topLevelUrl)) {
      return denied("top-level-origin-mismatch");
    }
    if (!isExactOriginMatch(request.savedUrl, request.documentUrl)) {
      return denied("saved-origin-mismatch");
    }

    const verdict = readExactDataSnapshot(request.hostRiskVerdict, VERDICT_FIELDS);
    if (verdict === null || verdict.decision !== "allow" ||
        verdict.isCurrent !== true ||
        !isExactOriginMatch(verdict.assessedOrigin, request.documentUrl)) {
      return denied("risk-evidence-not-accepted");
    }
    return Object.freeze({ candidate: true, reason: "preflight-only" });
  } catch {
    // Reflective operations on hostile Proxy objects may throw. Never crash
    // this non-authoritative screening step or echo input into a reason.
    return denied("invalid-request");
  }
}
