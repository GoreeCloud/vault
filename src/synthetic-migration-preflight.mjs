/**
 * DEVELOPMENT ONLY: metadata-only migration dry-run screening.
 *
 * No import/export bytes, credentials, attachments, archive content, checksums,
 * secrets, encryption keys, storage, deletion or network operation is handled.
 * All evidence fields are caller claims, not verification.
 */
import { snapshotSyntheticExactRecord } from "./synthetic-exact-record.mjs";

const KEYS = Object.freeze([
  "schemaVersion", "sourceFormat", "sourceItemCount", "sourceAttachmentCount",
  "sourceReadOnlyClaim", "temporaryPlaintextClaim", "dryRun",
  "explicitUserConsentClaim", "destinationEmptyClaim", "backupReadyClaim",
  "checksumEvidenceClaim"
]);
const FORMATS = new Set(["bitwarden-json", "bitwarden-csv", "generic-csv", "goreecloud-development-export"]);
const deny = reason => Object.freeze({ candidate: false, reason });
const bool = x => x === true || x === false;
const count = (x, max) => Number.isSafeInteger(x) && x >= 0 && x <= max;

/**
 * candidate=true means only that a fabricated metadata fixture satisfies the
 * rules for a non-writing dry-run proposal. It cannot authorize cutover.
 */
export function preflightSyntheticMigrationDryRun(input) {
  try {
    const data = snapshotSyntheticExactRecord(input, KEYS);
    if (!data) return deny("invalid-shape");
    if (data.schemaVersion !== 0 || !FORMATS.has(data.sourceFormat) ||
        !count(data.sourceItemCount, 1_000_000) ||
        !count(data.sourceAttachmentCount, 100_000)) {
      return deny("invalid-development-metadata");
    }
    for (const key of [
      "sourceReadOnlyClaim", "temporaryPlaintextClaim", "dryRun",
      "explicitUserConsentClaim", "destinationEmptyClaim", "backupReadyClaim",
      "checksumEvidenceClaim"
    ]) if (!bool(data[key])) return deny("invalid-development-metadata");

    if (data.dryRun !== true) return deny("write-mode-not-authorized");
    if (data.sourceReadOnlyClaim !== true) return deny("source-must-remain-read-only");
    if (data.temporaryPlaintextClaim !== false) return deny("temporary-plaintext-not-accepted");
    if (data.explicitUserConsentClaim !== true) return deny("consent-claim-required");
    if (data.destinationEmptyClaim !== true) return deny("nonempty-target-not-supported");
    if (data.backupReadyClaim !== true || data.checksumEvidenceClaim !== true) {
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
