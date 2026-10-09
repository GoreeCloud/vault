/**
 * DEVELOPMENT ONLY: clipboard-exposure clearing proposal with no clipboard data.
 *
 * This module does not read, write, inspect, transform or retain clipboard
 * contents and never authorizes copying a credential. It only proposes a clear
 * action from fabricated metadata after a caller claims a Vault-origin copy.
 */
const KEYS = Object.freeze([
  "schemaVersion", "vaultCopyClaim", "vaultLockedClaim", "appBackgroundedClaim",
  "privateContext", "secondsSinceWrite", "clearAfterSeconds",
  "platformClearSupportedClaim"
]);
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
const seconds = x => Number.isSafeInteger(x) && x >= 0 && x <= 86400;
const timeout = x => Number.isSafeInteger(x) && x >= 5 && x <= 300;

function proposal(action, reason) {
  return Object.freeze({
    candidate: true,
    reason: "synthetic-clipboard-clear-only",
    proposal: Object.freeze({ action, reason })
  });
}

/**
 * A proposal describes clearing only. It never returns an allow-copy action.
 */
export function planSyntheticClipboardClear(input) {
  try {
    if (!exactRecord(input)) return deny("invalid-shape");
    if (input.schemaVersion !== 0 ||
        !bool(input.vaultCopyClaim) ||
        !bool(input.vaultLockedClaim) ||
        !bool(input.appBackgroundedClaim) ||
        !bool(input.privateContext) ||
        !bool(input.platformClearSupportedClaim) ||
        !seconds(input.secondsSinceWrite) ||
        !timeout(input.clearAfterSeconds)) {
      return deny("invalid-development-state");
    }

    if (input.vaultCopyClaim !== true) return proposal("none", "no-vault-copy-claimed");
    if (input.platformClearSupportedClaim !== true) return deny("platform-clear-not-supported");
    if (input.privateContext || input.vaultLockedClaim || input.appBackgroundedClaim) {
      return proposal("clear-now", "risk-state");
    }
    if (input.secondsSinceWrite >= input.clearAfterSeconds) {
      return proposal("clear-now", "timeout-reached");
    }
    return proposal("schedule-clear", "timeout-pending");
  } catch {
    return deny("invalid-shape");
  }
}
