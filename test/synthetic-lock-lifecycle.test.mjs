import test from "node:test";
import assert from "node:assert/strict";
import { simulateSyntheticLockLifecycle as simulate } from "../src/synthetic-lock-lifecycle.mjs";

const state = () => ({
  schemaVersion: 0, status: "unlocked", sessionActive: true,
  sessionNotRevoked: true, deviceApproved: true, secondsSincePresence: 10,
  idleTimeoutSeconds: 300, reauthFresh: false
});
const event = type => ({ schemaVersion: 0, type });

test("explicit risk events conservatively propose a lock", () => {
  for (const type of ["background", "session-revoked", "device-revoked", "user-lock"]) {
    const result = simulate(state(), event(type));
    assert.equal(result.candidate, true);
    assert.equal(result.proposal.nextStatus, "locked");
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.proposal), true);
  }
});

test("idle timeout is deterministic and boundary-inclusive", () => {
  assert.equal(simulate({ ...state(), secondsSincePresence: 299 }, event("timeout-check")).proposal.nextStatus, "unlocked");
  assert.equal(simulate({ ...state(), secondsSincePresence: 300 }, event("timeout-check")).proposal.nextStatus, "locked");
  assert.equal(simulate({ ...state(), secondsSincePresence: 301 }, event("timeout-check")).proposal.nextStatus, "locked");
});

test("synthetic reauthentication claim is required before an unlock proposal", () => {
  const locked = { ...state(), status: "locked" };
  assert.equal(simulate(locked, event("reauthenticated")).candidate, false);
  const result = simulate({ ...locked, reauthFresh: true }, event("reauthenticated"));
  assert.equal(result.candidate, true);
  assert.equal(result.proposal.nextStatus, "unlocked");
  assert.equal(result.proposal.reason, "synthetic-reauth-claim");
});

test("revoked session or unapproved device overrides other events", () => {
  for (const s of [
    { ...state(), sessionActive: false },
    { ...state(), sessionNotRevoked: false },
    { ...state(), deviceApproved: false }
  ]) {
    const result = simulate(s, event("activity"));
    assert.equal(result.candidate, true);
    assert.equal(result.proposal.nextStatus, "locked");
  }
});

test("invalid, decorated, accessor and hostile inputs fail closed without echo", () => {
  const accessor = state();
  Object.defineProperty(accessor, "reauthFresh", { get() { throw Error("no"); } });
  const proxy = new Proxy(event("activity"), { ownKeys() { throw Error("trap"); } });
  for (const [s, e] of [
    [{ ...state(), secret: "fixture-secret" }, event("activity")],
    [{ ...state(), idleTimeoutSeconds: 5 }, event("activity")],
    [{ ...state(), secondsSincePresence: -1 }, event("activity")],
    [{ ...state(), status: "unknown" }, event("activity")],
    [accessor, event("activity")],
    [state(), proxy],
    [null, event("activity")],
    [state(), null]
  ]) {
    const result = simulate(s, e);
    assert.equal(result.candidate, false);
    assert.equal(JSON.stringify(result).includes("fixture-secret"), false);
  }
});
