/**
 * DEVELOPMENT-ONLY synthetic device/session revocation preflight.
 * All caller assertions are forgeable. No session token, secret, identity,
 * server request, key rotation, persistence, or device authorization exists.
 * Schema version 0 is a fixture-only contract, never a production wire format.
 */
const SNAPSHOT_KEYS = Object.freeze(["schemaVersion", "revision", "devices"]);
const DEVICE_KEYS = Object.freeze(["slot", "deviceStatus", "sessionStatus"]);
const REQUEST_KEYS = Object.freeze(["schemaVersion", "expectedRevision", "initiatorSlot", "targetSlot", "action"]);
const ACTIONS = new Set(["revoke-one", "revoke-other-sessions"]);
const deny = reason => Object.freeze({ candidate: false, reason });

function copyExactDataRecord(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const actual = Reflect.ownKeys(value);
  if (actual.length !== keys.length) return null;
  const safe = Object.create(null);
  for (const key of actual) {
    if (typeof key !== "string" || !keys.includes(key)) return null;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    safe[key] = descriptor.value;
  }
  return safe;
}
function copyDevices(value) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype ||
      !Number.isSafeInteger(value.length) || value.length < 1 || value.length > 16) return null;
  const own = Reflect.ownKeys(value);
  if (own.length !== value.length + 1 || !own.includes("length")) return null;
  const copy = [];
  let previous = 0;
  for (let i = 0; i < value.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
    const device = copyExactDataRecord(descriptor.value, DEVICE_KEYS);
    if (!device || !Number.isSafeInteger(device.slot) ||
        device.slot <= previous || device.slot > 16 ||
        !["active", "revoked"].includes(device.deviceStatus) ||
        !["active", "revoked"].includes(device.sessionStatus) ||
        (device.deviceStatus === "revoked" && device.sessionStatus !== "revoked")) return null;
    previous = device.slot;
    copy.push(device);
  }
  return copy;
}
const revision = n => Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
const slot = n => Number.isSafeInteger(n) && n >= 1 && n <= 16;

/**
 * Proposes only coarse counts. It MUST NOT be used as an authorization decision
 * or command sent to a real revocation service.
 */
export function planSyntheticDeviceRevocation(snapshotInput, requestInput) {
  try {
    const state = copyExactDataRecord(snapshotInput, SNAPSHOT_KEYS);
    const request = copyExactDataRecord(requestInput, REQUEST_KEYS);
    if (!state || !request) return deny("invalid-shape");
    const devices = copyDevices(state.devices);
    if (!devices || state.schemaVersion !== 0 || request.schemaVersion !== 0 ||
        !revision(state.revision) || !revision(request.expectedRevision) ||
        !slot(request.initiatorSlot) || !ACTIONS.has(request.action)) {
      return deny("invalid-development-fixture");
    }
    if (request.expectedRevision !== state.revision) return deny("stale-revision");
    const initiator = devices.find(d => d.slot === request.initiatorSlot);
    if (!initiator || initiator.deviceStatus !== "active" ||
        initiator.sessionStatus !== "active") return deny("inactive-initiator");

    let affectedCount = 0;
    if (request.action === "revoke-one") {
      if (!slot(request.targetSlot) || request.targetSlot === request.initiatorSlot) {
        return deny("invalid-target");
      }
      const target = devices.find(d => d.slot === request.targetSlot);
      if (!target || target.deviceStatus !== "active") return deny("unknown-or-revoked-target");
      affectedCount = 1;
    } else {
      if (request.targetSlot !== null) return deny("invalid-target");
      affectedCount = devices.filter(d =>
        d.slot !== request.initiatorSlot &&
        (d.deviceStatus === "active" || d.sessionStatus === "active")).length;
      if (affectedCount === 0) return deny("no-other-active-sessions");
    }
    return Object.freeze({
      candidate: true,
      reason: "synthetic-revocation-plan-only",
      proposal: Object.freeze({
        nextRevision: state.revision + 1,
        affectedCount,
        requiresServerAuthorization: true,
        requiresSessionInvalidation: true,
        requiresKeyRotationReview: true
      })
    });
  } catch {
    return deny("invalid-shape");
  }
}
