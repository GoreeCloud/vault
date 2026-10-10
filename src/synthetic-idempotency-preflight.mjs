/**
 * DEVELOPMENT ONLY — synthetic sequence and lifecycle preflight.
 *
 * All metadata comes from a potentially malicious fixture; a passing proposal
 * does NOT authorize, persist, encrypt, replay-protect or authenticate anything.
 * Schema version 0 is deliberately not a production protocol.
 */
import { snapshotSyntheticExactRecord } from "./synthetic-exact-record.mjs";

const FIELDS = Object.freeze([
  "schemaVersion", "expectedRevision", "observedRevision", "observedStatus",
  "requestSequence", "lastAcceptedSequence", "operation"
]);
const OPERATIONS = new Set(["create", "replace", "delete"]);
const STATES = new Set(["empty", "active", "tombstone"]);
const deny = reason => Object.freeze({ candidate: false, reason });
const counter = value => Number.isSafeInteger(value) && value >= 0;

/**
 * A candidate only describes a possible transition for fabricated metadata.
 * Never use it as an idempotency key, write grant, authenticated CAS, or
 * decision on real vault contents.
 */
export function screenSyntheticIdempotency(input) {
  try {
    const x = snapshotSyntheticExactRecord(input, FIELDS);
    if (!x || x.schemaVersion !== 0 ||
        !OPERATIONS.has(x.operation) || !STATES.has(x.observedStatus) ||
        !["expectedRevision", "observedRevision", "requestSequence",
          "lastAcceptedSequence"].every(key => counter(x[key]))) {
      return deny("invalid-fixture");
    }
    if (x.expectedRevision !== x.observedRevision) return deny("stale-revision");
    if (x.requestSequence <= x.lastAcceptedSequence) return deny("replayed-sequence");
    if (x.lastAcceptedSequence === Number.MAX_SAFE_INTEGER ||
        x.requestSequence !== x.lastAcceptedSequence + 1) return deny("sequence-gap");
    if (x.observedRevision === Number.MAX_SAFE_INTEGER) return deny("revision-overflow");
    // A revision-zero item can only be empty; tombstones cannot be resurrected.
    if ((x.observedStatus === "empty" && x.observedRevision !== 0) ||
        (x.observedStatus !== "empty" && x.observedRevision < 1) ||
        (x.operation === "create" && x.observedStatus !== "empty") ||
        (x.operation !== "create" && x.observedStatus !== "active")) {
      return deny("invalid-transition");
    }
    return Object.freeze({
      candidate: true,
      reason: "synthetic-idempotency-proposal-only",
      plan: Object.freeze({
        nextSequence: x.requestSequence,
        nextRevision: x.observedRevision + 1,
        nextStatus: x.operation === "delete" ? "tombstone" : "active",
        requiresAuthenticatedAtomicAuthority: true
      })
    });
  } catch {
    return deny("invalid-fixture");
  }
}
