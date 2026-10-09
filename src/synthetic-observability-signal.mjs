/**
 * DEVELOPMENT ONLY: strict operational-signal vocabulary with no identifiers
 * and no arbitrary text fields.
 *
 * This is not a telemetry pipeline or permission to collect telemetry. It only
 * demonstrates a data-minimized envelope that cannot carry credentials, URLs,
 * IDs, stack traces, free-form errors, or decrypted vault content.
 */
const KEYS = Object.freeze([
  "schemaVersion", "category", "outcome", "durationBucket",
  "retryBucket", "itemCountBucket", "offline"
]);
const CATEGORIES = new Set(["client-health", "sync-envelope", "backup-envelope", "lock-lifecycle"]);
const OUTCOMES = new Set(["ok", "rejected", "retry", "unavailable"]);
const DURATIONS = new Set(["lt-100ms", "lt-1s", "lt-5s", "gte-5s"]);
const RETRIES = new Set(["0", "1", "2-3", "4+"]);
const COUNTS = new Set(["0", "1", "2-10", "11-100", "101+"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function exactDataRecord(value) {
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

export function screenSyntheticOperationalSignal(signal) {
  try {
    if (!exactDataRecord(signal)) return deny("invalid-shape");
    if (signal.schemaVersion !== 0 ||
        !CATEGORIES.has(signal.category) ||
        !OUTCOMES.has(signal.outcome) ||
        !DURATIONS.has(signal.durationBucket) ||
        !RETRIES.has(signal.retryBucket) ||
        !COUNTS.has(signal.itemCountBucket) ||
        (signal.offline !== true && signal.offline !== false)) {
      return deny("invalid-signal");
    }
    return Object.freeze({ candidate: true, reason: "synthetic-operational-signal-only" });
  } catch {
    return deny("invalid-shape");
  }
}
