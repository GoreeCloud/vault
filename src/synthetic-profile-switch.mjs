/**
 * DEVELOPMENT-ONLY metadata preflight for multi-profile vault switching.
 * Every input assertion is caller-controlled and forgeable. No trusted session,
 * key, credential, profile storage, synchronization, clipboard, or UI action.
 */
import { snapshotSyntheticExactRecord } from './synthetic-exact-record.mjs';

const STATE_KEYS = Object.freeze(['schemaVersion', 'revision', 'activeSlot', 'profiles']);
const PROFILE_KEYS = Object.freeze(['slot', 'mode', 'lockState', 'pendingEdits']);
const REQUEST_KEYS = Object.freeze(['schemaVersion', 'expectedRevision', 'targetSlot', 'intent']);
const deny = reason => Object.freeze({ candidate: false, reason });
const validRevision = n => Number.isSafeInteger(n) && n >= 0 && n < Number.MAX_SAFE_INTEGER;
const validSlot = n => Number.isSafeInteger(n) && n >= 1 && n <= 16;

function snapshotProfiles(input) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return null;
  const lengthData = Object.getOwnPropertyDescriptor(input, 'length');
  const length = lengthData?.value;
  if (!lengthData || !Object.hasOwn(lengthData, 'value') ||
      !Number.isSafeInteger(length) || length < 1 || length > 16) return null;
  const keys = Reflect.ownKeys(input);
  if (keys.length !== length + 1 || !keys.includes('length')) return null;
  const profiles = [];
  let previousSlot = 0;
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
    const profile = snapshotSyntheticExactRecord(descriptor.value, PROFILE_KEYS);
    if (!profile || !validSlot(profile.slot) || profile.slot <= previousSlot ||
        !['local-only', 'synced'].includes(profile.mode) ||
        !['locked', 'unlocked'].includes(profile.lockState) ||
        !Number.isSafeInteger(profile.pendingEdits) || profile.pendingEdits < 0 ||
        profile.pendingEdits > 16) return null;
    previousSlot = profile.slot;
    profiles.push(profile);
  }
  return profiles;
}

/** A candidate is NEVER permission to switch, unlock, copy, or access any vault. */
export function planSyntheticProfileSwitch(stateInput, requestInput) {
  try {
    const state = snapshotSyntheticExactRecord(stateInput, STATE_KEYS);
    const request = snapshotSyntheticExactRecord(requestInput, REQUEST_KEYS);
    if (!state || !request) return deny('invalid-shape');
    const profiles = snapshotProfiles(state.profiles);
    if (!profiles || state.schemaVersion !== 0 || request.schemaVersion !== 0 ||
        !validRevision(state.revision) || !validRevision(request.expectedRevision) ||
        !validSlot(state.activeSlot) || !validSlot(request.targetSlot) ||
        request.intent !== 'switch') return deny('invalid-development-fixture');
    if (state.revision !== request.expectedRevision) return deny('stale-revision');
    if (state.activeSlot === request.targetSlot) return deny('already-active');
    const current = profiles.find(profile => profile.slot === state.activeSlot);
    const target = profiles.find(profile => profile.slot === request.targetSlot);
    if (!current || !target) return deny('unknown-profile');
    if (current.lockState !== 'locked' || target.lockState !== 'locked') {
      return deny('requires-authoritative-lock');
    }
    if (current.pendingEdits !== 0 || target.pendingEdits !== 0) {
      return deny('unresolved-local-edits');
    }
    return Object.freeze({
      candidate: true,
      reason: 'synthetic-profile-switch-plan-only',
      proposal: Object.freeze({
        nextRevision: state.revision + 1,
        requiresSessionRevalidation: true,
        requiresIndependentProfileKeyCustody: true,
        requiresClipboardClearReview: true,
        requiresEphemeralUiReset: true,
        requiresOfflineConflictReview: true
      })
    });
  } catch {
    return deny('invalid-shape');
  }
}
