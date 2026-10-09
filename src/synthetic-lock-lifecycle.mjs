/**
 * DEVELOPMENT ONLY: lock/reauthentication lifecycle proposal for fabricated state.
 *
 * This module never unlocks a vault, validates a biometric, authenticates a
 * session, handles keys, or reads secret material. All evidence is caller
 * supplied and therefore forgeable. schemaVersion 0 is unshippable.
 */
const STATE_KEYS = Object.freeze([
  "schemaVersion", "status", "sessionActive", "sessionNotRevoked",
  "deviceApproved", "secondsSincePresence", "idleTimeoutSeconds", "reauthFresh"
]);
const EVENT_KEYS = Object.freeze(["schemaVersion", "type"]);
const EVENTS = new Set([
  "activity", "background", "timeout-check", "session-revoked",
  "device-revoked", "user-lock", "reauthenticated"
]);
const deny = reason => Object.freeze({ candidate: false, reason });

function exactDataRecord(value, expected) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== expected.length) return false;
  return keys.every(key => {
    if (typeof key !== "string" || !expected.includes(key)) return false;
    const d = Object.getOwnPropertyDescriptor(value, key);
    return d && Object.hasOwn(d, "value");
  });
}
const bool = value => value === true || value === false;
const age = value => Number.isSafeInteger(value) && value >= 0 && value <= 604800;
const timeout = value => Number.isSafeInteger(value) && value >= 30 && value <= 86400;

function proposal(nextStatus, reason) {
  return Object.freeze({
    candidate: true,
    reason: "synthetic-lock-transition-only",
    proposal: Object.freeze({ nextStatus, reason })
  });
}

export function simulateSyntheticLockLifecycle(stateInput, eventInput) {
  try {
    if (!exactDataRecord(stateInput, STATE_KEYS) ||
        !exactDataRecord(eventInput, EVENT_KEYS)) return deny("invalid-shape");
    if (stateInput.schemaVersion !== 0 || eventInput.schemaVersion !== 0) {
      return deny("unsupported-development-version");
    }
    if (!["locked", "unlocked"].includes(stateInput.status) ||
        !EVENTS.has(eventInput.type) ||
        !bool(stateInput.sessionActive) ||
        !bool(stateInput.sessionNotRevoked) ||
        !bool(stateInput.deviceApproved) ||
        !bool(stateInput.reauthFresh) ||
        !age(stateInput.secondsSincePresence) ||
        !timeout(stateInput.idleTimeoutSeconds)) {
      return deny("invalid-state");
    }

    if (!stateInput.sessionActive || !stateInput.sessionNotRevoked) {
      return proposal("locked", "session-unavailable");
    }
    if (!stateInput.deviceApproved) return proposal("locked", "device-unapproved");

    if (["session-revoked", "device-revoked", "user-lock", "background"].includes(eventInput.type)) {
      return proposal("locked", "explicit-or-risk-lock");
    }
    if (eventInput.type === "timeout-check") {
      if (stateInput.status === "unlocked" &&
          stateInput.secondsSincePresence >= stateInput.idleTimeoutSeconds) {
        return proposal("locked", "idle-timeout");
      }
      return proposal(stateInput.status, "timeout-not-reached");
    }
    if (eventInput.type === "activity") {
      return proposal(stateInput.status, stateInput.status === "unlocked" ?
        "synthetic-presence-refresh" : "remain-locked");
    }
    if (eventInput.type === "reauthenticated") {
      if (stateInput.status !== "locked") return deny("already-unlocked");
      if (stateInput.reauthFresh !== true) return deny("fresh-reauth-required");
      return proposal("unlocked", "synthetic-reauth-claim");
    }
    return deny("invalid-event");
  } catch {
    return deny("invalid-shape");
  }
}
