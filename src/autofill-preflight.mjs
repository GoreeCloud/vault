import { canonicalSecureOrigin, isExactOriginMatch } from "./origin-policy.mjs";

/**
 * Candidate screening only. This module cannot read, decrypt or emit secrets.
 *
 * All fields must come from a trusted native browser/extension boundary.
 * A web page can forge these fields, so this function is NOT an authorization
 * decision and MUST NOT be wired directly to a credential-fill operation.
 */
const REQUEST_FIELDS = new Set([
  "savedUrl", "documentUrl", "topLevelUrl", "frameDepth",
  "userInitiated", "vaultUnlocked", "explicitUserConsent",
  "privateContext", "hostRiskVerdict"
]);
const VERDICT_FIELDS = new Set(["decision", "assessedOrigin", "isCurrent"]);

function isPlainRecord(x) {
  return x !== null && typeof x === "object" &&
    (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
}
function denied(reason) { return Object.freeze({ candidate: false, reason }); }

/**
 * Returns a non-authoritative preflight verdict, never a credential or a token.
 * Strictly declines cross-origin frames, private contexts, stale/unknown risk
 * evidence, implicit fills and locked sessions.
 */
export function preflightAutofillCandidate(request) {
  if (!isPlainRecord(request) ||
      Object.keys(request).some(key => !REQUEST_FIELDS.has(key))) {
    return denied("invalid-request");
  }

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

  const verdict = request.hostRiskVerdict;
  if (!isPlainRecord(verdict) ||
      Object.keys(verdict).some(key => !VERDICT_FIELDS.has(key)) ||
      verdict.decision !== "allow" || verdict.isCurrent !== true ||
      !isExactOriginMatch(verdict.assessedOrigin, request.documentUrl)) {
    return denied("risk-evidence-not-accepted");
  }

  return Object.freeze({ candidate: true, reason: "preflight-only" });
}
