/**
 * DEVELOPMENT ONLY: pure, synthetic revision-transition thought experiment.
 *
 * No storage, crypto, sync server, authentication, payloads, secret values,
 * concurrency primitives or authoritative state are present. This simulator
 * is not a permission check and is NOT suitable for real credentials.
 *
 * schemaVersion 0 is an unshippable test vocabulary.
 */
const KEYS_STATE = Object.freeze([
  "schemaVersion", "vaultId", "itemId", "revision", "status"
]);
const KEYS_INTENT = Object.freeze([
  "schemaVersion", "vaultId", "itemId", "expectedRevision", "operation"
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const deny = reason => Object.freeze({ candidate: false, reason });

function copyOwnValues(input, allowed) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) return null;
  const keys = Reflect.ownKeys(input);
  if (keys.length !== allowed.length) return null;
  const result = Object.create(null);
  for (const key of keys) {
    if (typeof key !== "string" || !allowed.includes(key)) return null;
    const property = Object.getOwnPropertyDescriptor(input, key);
    if (!property || !Object.hasOwn(property, "value")) return null;
    result[key] = property.value;
  }
  return result;
}
function uuid(value) {
  return typeof value === "string" && UUID.test(value);
}
function revision(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * Compute one metadata-only *proposal* from synthetic fixture inputs.
 * candidate=true is NEVER proof of atomicity, persistence, ACLs, or security.
 * The proposal contains no identifier, ciphertext, field data or token.
 */
export function simulateSyntheticRevisionStep(snapshotInput, intentInput) {
  try {
    const snapshot = copyOwnValues(snapshotInput, KEYS_STATE);
    const intent = copyOwnValues(intentInput, KEYS_INTENT);
    if (!snapshot || !intent) return deny("invalid-shape");
    if (snapshot.schemaVersion !== 0 || intent.schemaVersion !== 0) {
      return deny("unsupported-development-version");
    }
    if (![snapshot.vaultId, snapshot.itemId, intent.vaultId, intent.itemId].every(uuid)) {
      return deny("invalid-identifiers");
    }
    if (snapshot.vaultId !== intent.vaultId || snapshot.itemId !== intent.itemId) {
      return deny("resource-mismatch");
    }
    if (!revision(snapshot.revision) || !revision(intent.expectedRevision)) {
      return deny("invalid-revision");
    }
    if ((snapshot.status === "empty" && snapshot.revision !== 0) ||
        ((snapshot.status === "active" || snapshot.status === "tombstone") &&
         snapshot.revision < 1) ||
        !["empty", "active", "tombstone"].includes(snapshot.status)) {
      return deny("invalid-snapshot");
    }
    if (!["create", "replace", "delete"].includes(intent.operation)) {
      return deny("invalid-operation");
    }
    if (snapshot.revision !== intent.expectedRevision) return deny("stale-revision");
    if (snapshot.revision === Number.MAX_SAFE_INTEGER) return deny("revision-exhausted");
    if (snapshot.status === "tombstone") return deny("tombstone-immutable");
    if (intent.operation === "create" && snapshot.status !== "empty") {
      return deny("already-exists");
    }
    if (intent.operation !== "create" && snapshot.status !== "active") {
      return deny("no-live-item");
    }

    const nextStatus = intent.operation === "delete" ? "tombstone" : "active";
    return Object.freeze({
      candidate: true,
      reason: "synthetic-proposal-only",
      proposal: Object.freeze({ revision: snapshot.revision + 1, status: nextStatus })
    });
  } catch {
    // Hostile Proxy operations throw: fail closed with no input echo.
    return deny("invalid-shape");
  }
}
