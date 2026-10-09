import test from 'node:test';
import assert from 'node:assert/strict';
import { planSyntheticProfileSwitch as plan } from '../src/synthetic-profile-switch.mjs';

const state = () => ({
  schemaVersion: 0, revision: 5, activeSlot: 1,
  profiles: [
    { slot: 1, mode: 'synced', lockState: 'locked', pendingEdits: 0 },
    { slot: 2, mode: 'local-only', lockState: 'locked', pendingEdits: 0 }
  ]
});
const request = () => ({ schemaVersion: 0, expectedRevision: 5, targetSlot: 2, intent: 'switch' });

test('returns only immutable non-authoritative safety requirements without profile identities', () => {
  const outcome = plan(state(), request());
  assert.deepEqual(outcome, {
    candidate: true, reason: 'synthetic-profile-switch-plan-only',
    proposal: {
      nextRevision: 6, requiresSessionRevalidation: true,
      requiresIndependentProfileKeyCustody: true, requiresClipboardClearReview: true,
      requiresEphemeralUiReset: true, requiresOfflineConflictReview: true
    }
  });
  assert.ok(Object.isFrozen(outcome));
  assert.ok(Object.isFrozen(outcome.proposal));
  assert.equal(JSON.stringify(outcome).includes('targetSlot'), false);
});

test('rejects active and destination profiles without matching isolated slots', () => {
  for (const [s, q] of [
    [state(), { ...request(), targetSlot: 1 }],
    [state(), { ...request(), targetSlot: 3 }],
    [{ ...state(), activeSlot: 3 }, request()],
    [{ ...state(), activeSlot: 2 }, { ...request(), targetSlot: 2 }]
  ]) assert.equal(plan(s, q).candidate, false);
});

test('fails closed for unlocked profiles and unresolved offline edits', () => {
  for (const profiles of [
    state().profiles.map((p, i) => i === 0 ? { ...p, lockState: 'unlocked' } : p),
    state().profiles.map((p, i) => i === 1 ? { ...p, lockState: 'unlocked' } : p),
    state().profiles.map((p, i) => i === 0 ? { ...p, pendingEdits: 1 } : p),
    state().profiles.map((p, i) => i === 1 ? { ...p, pendingEdits: 1 } : p)
  ]) assert.equal(plan({ ...state(), profiles }, request()).candidate, false);
});

test('rejects stale or overflowing revision and unrecognized intent', () => {
  assert.equal(plan({ ...state(), revision: 6 }, request()).reason, 'stale-revision');
  assert.equal(plan({ ...state(), revision: Number.MAX_SAFE_INTEGER }, request()).candidate, false);
  assert.equal(plan(state(), { ...request(), intent: 'unlock' }).candidate, false);
  assert.equal(plan(state(), { ...request(), schemaVersion: 1 }).candidate, false);
  assert.equal(plan(state(), { ...request(), targetSlot: '2' }).candidate, false);
});

test('rejects duplicate, out-of-order, sparse, decorated and excessive arrays', () => {
  const profiles = state().profiles;
  const decorated = [...profiles];
  decorated.ownerEmail = 'fixture@example.invalid';
  const invalidSets = [
    [profiles[1], profiles[0]], [profiles[0], profiles[0]],
    new Array(2), decorated, [], Array.from({ length: 17 }, (_, i) => ({
      slot: i + 1, mode: 'synced', lockState: 'locked', pendingEdits: 0
    }))
  ];
  for (const value of invalidSets) assert.equal(plan({ ...state(), profiles: value }, request()).candidate, false);
});

test('rejects accessor and inherited fields without reading their getters', () => {
  let invoked = false;
  const badProfile = { ...state().profiles[0] };
  Object.defineProperty(badProfile, 'slot', { get() { invoked = true; throw Error('getter'); } });
  const badRequest = request();
  Object.defineProperty(badRequest, 'targetSlot', { get() { invoked = true; throw Error('getter'); } });
  for (const [s, q] of [
    [{ ...state(), profiles: [badProfile, state().profiles[1]] }, request()],
    [state(), badRequest], [Object.create({ schemaVersion: 0 }), request()],
    [{ ...state(), untrusted: 'secret' }, request()]
  ]) assert.equal(plan(s, q).candidate, false);
  assert.equal(invoked, false);
});

test('rejects hostile proxy traps and never follows ordinary property get traps', () => {
  const bad = new Proxy(state(), { ownKeys() { throw Error('untrusted'); } });
  const misleading = new Proxy(request(), { get() { throw Error('untrusted'); } });
  assert.equal(plan(bad, request()).candidate, false);
  assert.equal(plan(state(), misleading).candidate, true);
  const proxyArray = new Proxy(state().profiles, {
    get(target, prop) { if (prop === 'length') throw Error('must not read'); return Reflect.get(target, prop); }
  });
  assert.equal(plan({ ...state(), profiles: proxyArray }, request()).candidate, true);
  const tampered = new Proxy(state().profiles, {
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'length') return { value: 99, writable: false, configurable: false, enumerable: false };
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
  });
  assert.equal(plan({ ...state(), profiles: tampered }, request()).candidate, false);
});

test('validates bounded profile metadata and rejects unknown fields', () => {
  for (const bad of [
    { ...state().profiles[0], mode: 'cloud' },
    { ...state().profiles[0], pendingEdits: -1 },
    { ...state().profiles[0], pendingEdits: 17 },
    { ...state().profiles[0], lockState: 'open' },
    { ...state().profiles[0], profileName: 'do-not-copy' }
  ]) assert.equal(plan({ ...state(), profiles: [bad, state().profiles[1]] }, request()).candidate, false);
});
