/**
 * DEVELOPMENT ONLY: metadata-only migration dry-run screening.
 *
 * No import/export bytes, credentials, attachments, archive content, checksums,
 * secrets, encryption keys, storage, deletion or network operation is handled.
 * All evidence fields are caller claims, not verification.
 */
const KEYS = Object.freeze([
  "schemaVersion", "sourceFormat", "sourceItemCount", "sourceAttachmentCount",
  "sourceReadOnlyClaim", "temporaryPlaintextClaim", "dryRun",
  "explicitUserConsentClaim", "destinationEmptyClaim", "backupReadyClaim",
  "checksumEvidenceClaim"
]);
const FORMATS = new Set(["bitwarden-json", "bitwarden-csv", "generic-csv", "goreecloud-development-export"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function exactRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== KEYS.length) return false;
  return keys.every(key => {
    if (typeof key !== "string" || !KEYS.includes(key)) return false;
    const d = Object.getOwnPropertyDescriptor(value, key);
    return d && Object.hasOwn(d, "value");
  });
}
const bool = x => x === true || x === false;
const count = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;

/**
 * candidate=true means only that a fabricated metadata fixture satisfies the
 * rules for a non-writing dry-run proposal. It cannot authorize cutover.
 */
export function preflightSyntheticMigrationDryRun(input) {
  try {
    if (!exactRecord(input)) return deny("invalid-shape");
    if (input.schemaVersion !== 0 || !FORMATS.has(input.sourceFormat) ||
        !count(input.sourceItemCount, 1_000_000) ||
        !count(input.sourceAttachmentCount, 100_000)) {
      return deny("invalid-development-metadata");
    }
    for (const key of [
      "sourceReadOnlyClaim", "temporaryPlaintextClaim", "dryRun",
      "explicitUserConsentClaim", "destinationEmptyClaim", "backupReadyClaim",
      "checksumEvidenceClaim"
    ]) if (!bool(input[key])) return deny("invalid-development-metadata");

    if (input.dryRun !== true) return deny("write-mode-not-authorized");
    if (input.sourceReadOnlyClaim !== true) return deny("source-must-remain-read-only");
    if (input.temporaryPlaintextClaim !== false) return deny("temporary-plaintext-not-accepted");
    if (input.explicitUserConsentClaim !== true) return deny("consent-claim-required");
    if (input.destinationEmptyClaim !== true) return deny("nonempty-target-not-supported");
    if (input.backupReadyClaim !== true || input.checksumEvidenceClaim !== true) {
      return deny("recovery-evidence-claim-required");
    }

    return Object.freeze({
      candidate: true,
      reason: "synthetic-migration-dry-run-only",
      proposal: Object.freeze({ mode: "dry-run-no-write" })
    });
  } catch {
    return deny("invalid-shape");
  }
}
