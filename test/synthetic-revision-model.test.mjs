import test from "node:test";
import assert from "node:assert/strict";
import { simulateSyntheticRevisionStep as step } from "../src/synthetic-revision-model.mjs";

const VAULT = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const snapshot = (revision = 0, status = "empty") =>
  ({ schemaVersion: 0, vaultId: VAULT, itemId: ITEM, revision, status });
const intent = (operation = "create", expectedRevision = 0) =>
  ({ schemaVersion: 0, vaultId: VAULT, itemId: ITEM, operation, expectedRevision });

test("synthetic create, replace, delete and tombstone lifecycle is metadata only", () => {
  const state = snapshot();
  const create = step(state, intent());
  assert.deepEqual(create, {
    candidate: true, reason: "synthetic-proposal-only",
    proposal: { revision: 1, status: "active" }
  });
  assert.deepEqual(state, snapshot(), "input must not be mutated");
  const current = snapshot(create.proposal.revision, create.proposal.status);
  const replace = step(current, intent("replace", 1));
  assert.deepEqual(replace.proposal, { revision: 2, status: "active" });
  const remove = step(snapshot(2, "active"), intent("delete", 2));
  assert.deepEqual(remove.proposal, { revision: 3, status: "tombstone" });
  for (const operation of ["create", "replace", "delete"]) {
    assert.equal(step(snapshot(3, "tombstone"), intent(operation, 3)).candidate, false);
  }
  assert.equal(Object.isFrozen(create), true);
  assert.equal(Object.isFrozen(create.proposal), true);
});

test("stale clients, replay and out-of-order revisions are denied when compared to provided fixture snapshot", () => {
  const active = snapshot(7, "active");
  for (const expectedRevision of [0, 6, 8, 999, "7", 7.1, -1]) {
    assert.equal(step(active, intent("replace", expectedRevision)).candidate, false);
  }
  const first = step(active, intent("replace", 7));
  assert.equal(first.candidate, true);
  // This is NOT atomic: two checks against the SAME stale snapshot both pass.
  const racing = step(active, intent("replace", 7));
  assert.equal(racing.candidate, true);
  // Only when a caller supplies an updated snapshot does replay fail.
  assert.equal(step(snapshot(8, "active"), intent("replace", 7)).candidate, false);
});

test("creation cannot overwrite a live record or resurrect a tombstone", () => {
  assert.equal(step(snapshot(1, "active"), intent("create", 1)).candidate, false);
  assert.equal(step(snapshot(3, "tombstone"), intent("create", 3)).candidate, false);
  assert.equal(step(snapshot(), intent("replace", 0)).candidate, false);
  assert.equal(step(snapshot(), intent("delete", 0)).candidate, false);
});

test("cross-vault and cross-item requests are rejected", () => {
  assert.equal(step(snapshot(), {...intent(), vaultId: OTHER}).candidate, false);
  assert.equal(step(snapshot(), {...intent(), itemId: OTHER}).candidate, false);
  assert.equal(step({...snapshot(), vaultId: "INVALID"}, intent()).candidate, false);
});

test("out-of-range revisions, malformed state and unsupported operations fail closed", () => {
  for (const s of [
    snapshot(-1, "empty"), snapshot(1, "empty"), snapshot(0, "active"),
    snapshot(0, "tombstone"), snapshot(1, "unknown"),
    snapshot(Number.MAX_SAFE_INTEGER, "active"),
    snapshot(Number.MAX_SAFE_INTEGER + 1, "active"),
    {...snapshot(), schemaVersion: 1}
  ]) assert.equal(step(s, intent("replace", s.revision)).candidate, false);
  for (const q of [
    intent("merge"), intent("restore"), intent("delete", 0),
    {...intent(), schemaVersion: 1}, {...intent(), expectedRevision: NaN}
  ]) assert.equal(step(snapshot(), q).candidate, false);
});

test("hostile accessor, proxy, unexpected fields and symbols deny without leaking source fields", () => {
  const x = snapshot();
  Object.defineProperty(x, "itemId", { get() { throw Error("unexpected getter"); } });
  const hostile = new Proxy(snapshot(), { ownKeys() { throw Error("proxy trap"); } });
  const intentProxy = new Proxy(intent(), { getOwnPropertyDescriptor() { throw Error("trap"); } });
  const withSymbol = snapshot(); withSymbol[Symbol("hidden")] = "fixture";
  for (const [s,q] of [
    [x, intent()], [hostile, intent()], [snapshot(), intentProxy],
    [withSymbol, intent()], [{...snapshot(), password: "fixture"}, intent()],
    [snapshot(), {...intent(), ciphertext: "fixture"}],
    [Object.create(Date.prototype), intent()],
    [null, intent()], [snapshot(), null]
  ]) {
    const v = step(s,q);
    assert.equal(v.candidate, false);
    assert.deepEqual(Object.keys(v), ["candidate", "reason"]);
    assert.equal(JSON.stringify(v).includes("fixture"), false);
    assert.equal(Object.isFrozen(v), true);
  }
});

test("proposals disclose no vault/item identifiers or protected fields", () => {
  const success = JSON.stringify(step(snapshot(), intent()));
  for (const data of [VAULT, ITEM, "password", "ciphertext", "username"]) {
    assert.equal(success.includes(data), false);
  }
});
