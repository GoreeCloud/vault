import test from "node:test";
import assert from "node:assert/strict";
import { isCanonicalOpaquePayload, preflightOpaqueSyncMutation } from "../src/opaque-sync-preflight.mjs";

const VAULT = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const bytes = n => Buffer.alloc(n, 21).toString("base64url");
const draft = () => ({
  schemaVersion: 0, operation: "create", vaultId: VAULT, itemId: ITEM,
  previousRevision: 0, nextRevision: 1, sealedPayload: bytes(80)
});
const context = () => ({expectedVaultId: VAULT, expectedPreviousRevision: 0, authorized: true});

test("screening uses only untrusted synthetic opaque payload shape", () => {
  const verdict = preflightOpaqueSyncMutation(draft(), context());
  assert.deepEqual(verdict, { candidate: true, reason: "preflight-only-no-crypto" });
  assert.equal(Object.isFrozen(verdict), true);
  assert.deepEqual(Object.keys(verdict), ["candidate","reason"]);
});

test("rejects tenant/vault mixup and spoofed authorization", () => {
  for(const ctx of [
    {...context(), expectedVaultId: OTHER}, {...context(), authorized: false},
    {...context(), authorized: undefined}, {...context(), extra: true},
    {...context(), expectedVaultId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA"}
  ]) assert.equal(preflightOpaqueSyncMutation(draft(), ctx).candidate, false);
  for(const f of [
    {...draft(), vaultId: OTHER}, {...draft(), itemId: "not-a-uuid"},
    {...draft(), vaultId: "__proto__"}, {...draft(), accountId: OTHER}
  ]) assert.equal(preflightOpaqueSyncMutation(f, context()).candidate, false);
});

test("rejects replay, skipped versions, and action/revision confusion", () => {
  const invalid = [
    {...draft(), previousRevision: 1},
    {...draft(), nextRevision: 2}, {...draft(), nextRevision: -1},
    {...draft(), nextRevision: 1.1}, {...draft(), nextRevision: "1"},
    {...draft(), operation: "delete"}, {...draft(), operation: "replace"},
    {...draft(), schemaVersion: 1}
  ];
  for(const f of invalid) assert.equal(preflightOpaqueSyncMutation(f, context()).candidate,false);
  const update = {...draft(), operation:"replace", previousRevision: 7, nextRevision: 8};
  assert.equal(preflightOpaqueSyncMutation(update, {...context(),expectedPreviousRevision:7}).candidate,true);
  assert.equal(preflightOpaqueSyncMutation(update, {...context(),expectedPreviousRevision:6}).candidate,false);
});

test("checks canonical base64url framing without decoding or claiming crypto integrity", () => {
  assert.equal(isCanonicalOpaquePayload(bytes(32)), true);
  assert.equal(isCanonicalOpaquePayload(bytes(32768)), true);
  for(const value of [
    "", "AA==", "AAAA+", "AAAA/", "abc", "a".repeat(44001),
    bytes(31), bytes(32769), "A".repeat(45), "A".repeat(42)+"B"
  ]) assert.equal(isCanonicalOpaquePayload(value),false,JSON.stringify(value.slice(0,80)));
  assert.equal(preflightOpaqueSyncMutation({...draft(),sealedPayload:bytes(31)},context()).candidate,false);
});

test("fails closed on null, arrays, properties with getters and proxies", () => {
  for(const frame of [null, [], "message", 3, Object.create(Date.prototype)]) {
    assert.equal(preflightOpaqueSyncMutation(frame,context()).candidate,false);
  }
  const withGetter = draft();
  Object.defineProperty(withGetter,"sealedPayload",{get(){ throw Error("never read"); }});
  assert.equal(preflightOpaqueSyncMutation(withGetter,context()).candidate,false);
  const proxy = new Proxy(draft(),{ ownKeys(){ throw Error("attack"); }});
  // A malicious Proxy may throw during any reflective operation.
  assert.equal(preflightOpaqueSyncMutation(proxy,context()).candidate,false);
});

test("rejects any extra plaintext, credential or debugging properties", () => {
  for(const extra of ["password","note","plaintext","tenantId","debug","key","nonce"]) {
    assert.equal(preflightOpaqueSyncMutation({...draft(),[extra]:"test"},context()).candidate,false);
  }
});
