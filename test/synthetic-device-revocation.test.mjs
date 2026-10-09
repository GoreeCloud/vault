import test from "node:test";
import assert from "node:assert/strict";
import { planSyntheticDeviceRevocation as plan } from "../src/synthetic-device-revocation.mjs";

const snapshot = (revision = 4) => ({
  schemaVersion: 0, revision, devices: [
    { slot: 1, deviceStatus: "active", sessionStatus: "active" },
    { slot: 2, deviceStatus: "active", sessionStatus: "active" },
    { slot: 3, deviceStatus: "revoked", sessionStatus: "revoked" }
  ]
});
const request = (action = "revoke-one", targetSlot = 2) =>
  ({ schemaVersion: 0, expectedRevision: 4, initiatorSlot: 1, targetSlot, action });

test("plans an isolated non-authoritative revocation with no identifiers in output", () => {
  const outcome = plan(snapshot(), request());
  assert.deepEqual(outcome, {
    candidate: true, reason: "synthetic-revocation-plan-only",
    proposal: {
      nextRevision: 5, affectedCount: 1,
      requiresServerAuthorization: true,
      requiresSessionInvalidation: true,
      requiresKeyRotationReview: true
    }
  });
  assert.ok(Object.isFrozen(outcome));
  assert.ok(Object.isFrozen(outcome.proposal));
  assert.equal(JSON.stringify(outcome).includes("slot"), false);
});

test("revoke-other-sessions excludes initiator and already revoked sessions", () => {
  const outcome = plan(snapshot(), request("revoke-other-sessions", null));
  assert.equal(outcome.candidate, true);
  assert.equal(outcome.proposal.affectedCount, 1);
  assert.equal(outcome.proposal.nextRevision, 5);
});

test("rejects stale snapshots, active-session absence, self revocation and unknown targets", () => {
  for (const [s, q] of [
    [snapshot(5), request()],
    [snapshot(), { ...request(), targetSlot: 1 }],
    [snapshot(), { ...request(), targetSlot: 4 }],
    [snapshot(), { ...request(), targetSlot: 3 }],
    [snapshot(), { ...request("revoke-other-sessions", null), targetSlot: 2 }],
    [{ ...snapshot(), devices: [{ slot: 1, deviceStatus: "active", sessionStatus: "active" }] },
      request("revoke-other-sessions", null)],
    [{ ...snapshot(), devices: snapshot().devices.map(d =>
      d.slot === 1 ? { ...d, sessionStatus: "revoked" } : d) }, request()]
  ]) assert.equal(plan(s, q).candidate, false);
});

test("rejects invalid order, duplicate slots, contradictory device state and malicious types", () => {
  const d = snapshot().devices;
  for (const devices of [
    [d[1], d[0]], [d[0], d[0]], [d[0], { slot: 2, deviceStatus: "revoked", sessionStatus: "active" }],
    [], new Array(2), Array.from({ length: 17 }, (_, i) => ({ slot: i + 1, deviceStatus: "active", sessionStatus: "active" }))
  ]) assert.equal(plan({ ...snapshot(), devices }, request()).candidate, false);
  for (const q of [
    { ...request(), action: "__proto__" },
    { ...request(), targetSlot: "2" },
    { ...request(), expectedRevision: -1 },
    { ...request(), schemaVersion: 1 },
    { ...request(), extra: "secret-fixture" }
  ]) assert.equal(plan(snapshot(), q).candidate, false);
});

test("accessors, prototypes, sparse/decorated arrays and proxies fail closed", () => {
  const invalid = snapshot();
  Object.defineProperty(invalid, "devices", { get() { throw Error("must not run"); } });
  const accessorDevice = { slot: 1, deviceStatus: "active", sessionStatus: "active" };
  Object.defineProperty(accessorDevice, "slot", { get() { throw Error("must not run"); } });
  const decorated = snapshot().devices;
  decorated.extra = true;
  const proxy = new Proxy(snapshot(), { ownKeys() { throw Error("trap"); } });
  const invalidRequest = request();
  Object.defineProperty(invalidRequest, "targetSlot", { get() { throw Error("must not run"); } });
  for (const [s, q] of [
    [invalid, request()], [{ ...snapshot(), devices: [accessorDevice] }, request()],
    [{ ...snapshot(), devices: decorated }, request()], [proxy, request()],
    [snapshot(), invalidRequest], [Object.create({ schemaVersion: 0 }), request()]
  ]) assert.equal(plan(s, q).candidate, false);
});

test("revision overflow and injected identifying metadata are never accepted", () => {
  const max = Number.MAX_SAFE_INTEGER;
  assert.equal(plan(snapshot(max - 1), { ...request(), expectedRevision: max - 1 }).candidate, true);
  assert.equal(plan(snapshot(max), { ...request(), expectedRevision: max }).candidate, false);
  assert.equal(plan({ ...snapshot(), ownerEmail: "example@invalid.test" }, request()).candidate, false);
  assert.equal(plan(snapshot(), { ...request(), deviceName: "fixture" }).candidate, false);
});
