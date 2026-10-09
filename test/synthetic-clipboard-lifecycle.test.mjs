import test from "node:test";
import assert from "node:assert/strict";
import { planSyntheticClipboardClear as planClear } from "../src/synthetic-clipboard-lifecycle.mjs";

const state = () => ({
  schemaVersion: 0,
  vaultCopyClaim: true,
  vaultLockedClaim: false,
  appBackgroundedClaim: false,
  privateContext: false,
  secondsSinceWrite: 10,
  clearAfterSeconds: 30,
  platformClearSupportedClaim: true
});

test("proposes scheduled clear before timeout and immediate clear at boundary", () => {
  assert.equal(planClear(state()).proposal.action, "schedule-clear");
  assert.equal(planClear({ ...state(), secondsSinceWrite: 29 }).proposal.action, "schedule-clear");
  assert.equal(planClear({ ...state(), secondsSinceWrite: 30 }).proposal.action, "clear-now");
  assert.equal(planClear({ ...state(), secondsSinceWrite: 31 }).proposal.action, "clear-now");
});

test("lock, background and private context force immediate clear proposal", () => {
  for (const s of [
    { ...state(), vaultLockedClaim: true },
    { ...state(), appBackgroundedClaim: true },
    { ...state(), privateContext: true }
  ]) {
    const result = planClear(s);
    assert.equal(result.candidate, true);
    assert.equal(result.proposal.action, "clear-now");
  }
});

test("never proposes copying and denies when platform clear is unavailable", () => {
  const result = planClear(state());
  assert.notEqual(result.proposal.action, "copy");
  assert.equal(planClear({ ...state(), platformClearSupportedClaim: false }).candidate, false);
  const noCopy = planClear({ ...state(), vaultCopyClaim: false });
  assert.equal(noCopy.candidate, true);
  assert.equal(noCopy.proposal.action, "none");
});

test("invalid timeouts and non-boolean context fail closed", () => {
  for (const s of [
    { ...state(), clearAfterSeconds: 4 },
    { ...state(), clearAfterSeconds: 301 },
    { ...state(), secondsSinceWrite: -1 },
    { ...state(), secondsSinceWrite: 1.5 },
    { ...state(), vaultLockedClaim: 1 },
    { ...state(), schemaVersion: 1 }
  ]) assert.equal(planClear(s).candidate, false);
});

test("strict shape rejects clipboard content, accessors and hostile objects without echo", () => {
  const content = { ...state(), clipboardText: "unique-secret-fixture" };
  const accessor = state();
  Object.defineProperty(accessor, "vaultCopyClaim", { get() { throw Error("no"); } });
  const proxy = new Proxy(state(), { ownKeys() { throw Error("trap"); } });
  for (const s of [content, accessor, proxy, null, [], Object.create(Date.prototype)]) {
    const result = planClear(s);
    assert.equal(result.candidate, false);
    assert.equal(JSON.stringify(result).includes("unique-secret-fixture"), false);
  }
});
