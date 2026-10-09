/**
 * DEVELOPMENT ONLY: metadata-only backup and restore preflight.
 *
 * No backup bytes are decrypted, authenticated, stored, restored, uploaded, or
 * transmitted. Caller claims about encryption/integrity are not evidence.
 * schemaVersion 0 is deliberately unshippable.
 */
import { snapshotSyntheticExactRecord } from "./synthetic-exact-record.mjs";

const MANIFEST_KEYS = Object.freeze([
  "schemaVersion", "backupId", "vaultId", "snapshotRevision", "itemCount",
  "opaqueBytes", "format", "clientEncryptedClaim", "serverCanDecryptClaim"
]);
const RESTORE_KEYS = Object.freeze([
  "schemaVersion", "targetVaultId", "currentRevision", "targetEmpty",
  "integrityEvidenceClaim", "rollbackEvidenceClaim", "operatorCanDecryptClaim"
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const deny = reason => Object.freeze({ candidate: false, reason });
const uuid = value => typeof value === "string" && UUID.test(value);
const count = (value, max) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const bool = value => value === true || value === false;

function validManifest(m) {
  return m.schemaVersion === 0 &&
    uuid(m.backupId) && uuid(m.vaultId) &&
    count(m.snapshotRevision, Number.MAX_SAFE_INTEGER - 1) &&
    count(m.itemCount, 1_000_000) &&
    count(m.opaqueBytes, 1_000_000_000_000) &&
    m.format === "synthetic-opaque-backup-v0" &&
    m.clientEncryptedClaim === true &&
    m.serverCanDecryptClaim === false;
}

export function screenSyntheticBackupManifest(manifestInput) {
  try {
    const manifest = snapshotSyntheticExactRecord(manifestInput, MANIFEST_KEYS);
    if (!manifest) return deny("invalid-shape");
    if (!validManifest(manifest)) return deny("invalid-development-manifest");
    if (manifest.itemCount === 0 && manifest.opaqueBytes !== 0) {
      return deny("empty-count-size-mismatch");
    }
    if (manifest.itemCount > 0 && manifest.opaqueBytes === 0) {
      return deny("nonempty-count-size-mismatch");
    }
    return Object.freeze({ candidate: true, reason: "synthetic-backup-manifest-only" });
  } catch {
    return deny("invalid-shape");
  }
}

export function planSyntheticRestoreMetadata(manifestInput, contextInput) {
  try {
    const manifest = snapshotSyntheticExactRecord(manifestInput, MANIFEST_KEYS);
    const context = snapshotSyntheticExactRecord(contextInput, RESTORE_KEYS);
    if (!manifest || !context) return deny("invalid-shape");
    if (!validManifest(manifest) ||
        context.schemaVersion !== 0 ||
        !uuid(context.targetVaultId) ||
        !count(context.currentRevision, Number.MAX_SAFE_INTEGER - 1) ||
        !bool(context.targetEmpty) ||
        !bool(context.integrityEvidenceClaim) ||
        !bool(context.rollbackEvidenceClaim) ||
        !bool(context.operatorCanDecryptClaim)) {
      return deny("invalid-development-restore-context");
    }
    if (manifest.vaultId !== context.targetVaultId) return deny("vault-mismatch");
    if (context.operatorCanDecryptClaim !== false) return deny("operator-decrypt-boundary");
    if (context.integrityEvidenceClaim !== true ||
        context.rollbackEvidenceClaim !== true) return deny("missing-restore-evidence");
    if (context.targetEmpty !== true || context.currentRevision !== 0) {
      return deny("nonempty-target-requires-reviewed-merge");
    }
    return Object.freeze({
      candidate: true,
      reason: "synthetic-restore-plan-only",
      proposal: Object.freeze({ action: "restore-to-empty-target-only" })
    });
  } catch {
    return deny("invalid-shape");
  }
}
