import test from "node:test";
import assert from "node:assert/strict";
import { screenSyntheticVaultAccess } from "../src/synthetic-access-boundary.mjs";

const P = "11111111-1111-4111-8111-111111111111";
const A = "22222222-2222-4222-8222-222222222222";
const T = "33333333-3333-4333-8333-333333333333";
const V = "44444444-4444-4444-8444-444444444444";
const ITEM = "55555555-5555-4555-8555-555555555555";
const OTHER = "66666666-6666-4666-8666-666666666666";
const request = (operation = "read") => ({ vaultId: V, itemId: ITEM, operation });
const state = () => ({
  principalId: P, tenantId: T, vaultTenantId: T, vaultId: V, vaultOwnerId: P,
  resourceItemId: ITEM, resourceVaultId: V, resourceTenantId: T,
  sessionActive: true, sessionNotRevoked: true, membershipActive: true,
  policyCurrent: true, grantVerified: true, grantedRole: "owner",
  policyVersion: 3, sessionPolicyVersion: 3
});
const noResource = () => ({
  ...state(), resourceItemId: null, resourceVaultId: null, resourceTenantId: null
});

test("synthetic owner screening returns no item or authorization token", () => {
  for (const op of ["read", "replace", "delete"]) {
    const result = screenSyntheticVaultAccess(request(op), state());
    assert.deepEqual(result, { candidate: true, reason: "synthetic-screen-only" });
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(Object.keys(result), ["candidate", "reason"]);
  }
  assert.equal(screenSyntheticVaultAccess(request("create"), noResource()).candidate, true);
});

test("reader and editor operations are strictly limited in the synthetic model", () => {
  const viewer = { ...state(), principalId: A, grantedRole: "viewer" };
  assert.equal(screenSyntheticVaultAccess(request("read"), viewer).candidate, true);
  for (const op of ["replace", "delete"]) {
    assert.equal(screenSyntheticVaultAccess(request(op), viewer).candidate, false);
  }
  const editor = { ...viewer, grantedRole: "editor" };
  assert.equal(screenSyntheticVaultAccess(request("read"), editor).candidate, true);
  assert.equal(screenSyntheticVaultAccess(request("replace"), editor).candidate, true);
  assert.equal(screenSyntheticVaultAccess(request("create"), {
    ...editor, resourceItemId: null, resourceVaultId: null, resourceTenantId: null
  }).candidate, true);
  assert.equal(screenSyntheticVaultAccess(request("delete"), editor).candidate, false);
  assert.equal(screenSyntheticVaultAccess(request("read"), { ...viewer, grantedRole: "none" }).candidate, false);
});

test("screening declines cross-vault, tenant, item and ownership mixups", () => {
  for (const s of [
    { ...state(), vaultId: OTHER },
    { ...state(), resourceItemId: OTHER },
    { ...state(), resourceVaultId: OTHER },
    { ...state(), resourceTenantId: OTHER },
    { ...state(), principalId: OTHER },
    { ...state(), tenantId: OTHER },
    { ...state(), vaultTenantId: OTHER },
    { ...state(), grantedRole: "owner", vaultOwnerId: OTHER }
  ]) assert.equal(screenSyntheticVaultAccess(request(), s).candidate, false);
  assert.equal(screenSyntheticVaultAccess(request("create"), state()).candidate, false);
  assert.equal(screenSyntheticVaultAccess(request("read"), noResource()).candidate, false);
});

test("synthetic sessions reject revocations, stale policy, unknown evidence and grants", () => {
  for (const s of [
    { ...state(), sessionActive: false },
    { ...state(), sessionNotRevoked: false },
    { ...state(), membershipActive: false },
    { ...state(), policyCurrent: false },
    { ...state(), policyVersion: 4 },
    { ...state(), sessionPolicyVersion: 0 },
    { ...state(), sessionPolicyVersion: "3" },
    { ...state(), grantedRole: "administrator" },
    { ...state(), grantVerified: null },
    { ...state(), grantVerified: false },
    { ...state(), sessionActive: 1 },
    { ...state(), policyCurrent: undefined },
    { ...state(), principalId: A, grantedRole: "viewer", grantVerified: false }
  ]) assert.equal(screenSyntheticVaultAccess(request(), s).candidate, false);
});

test("strict shape rejects plaintext, accessors, prototypes and malicious proxies", () => {
  for (const [q, c] of [
    [{ ...request(), password: "synthetic" }, state()],
    [request(), { ...state(), secret: "synthetic" }],
    [{ ...request(), operation: "share" }, state()],
    [request(), { ...state(), vaultId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }],
    [Object.create(Date.prototype), state()],
    [request(), null],
    [[], state()],
    [null, state()]
  ]) assert.equal(screenSyntheticVaultAccess(q, c).candidate, false);

  const accessor = state();
  Object.defineProperty(accessor, "grantVerified", {
    get() { throw Error("should not execute"); }
  });
  assert.equal(screenSyntheticVaultAccess(request(), accessor).candidate, false);
  const malicious = new Proxy(request(), { ownKeys() { throw Error("no"); } });
  assert.equal(screenSyntheticVaultAccess(malicious, state()).candidate, false);
});

test("screen output never reflects identifiers or sensitive input", () => {
  const good = JSON.stringify(screenSyntheticVaultAccess(request(), state()));
  const bad = JSON.stringify(screenSyntheticVaultAccess({ ...request(), password: "fixture" }, state()));
  assert.equal(good.includes(V), false);
  assert.equal(good.includes(P), false);
  assert.equal(bad.includes("fixture"), false);
});

test("create cannot bypass tenant-to-vault ownership scope", () => {
  const requestToCreate = request("create");
  const syntheticContext = noResource();
  assert.equal(screenSyntheticVaultAccess(requestToCreate, syntheticContext).candidate, true);
  for (const context of [
    { ...syntheticContext, vaultTenantId: OTHER },
    { ...syntheticContext, tenantId: OTHER },
    { ...syntheticContext, grantVerified: false },
    { ...syntheticContext, sessionPolicyVersion: 999 }
  ]) assert.equal(screenSyntheticVaultAccess(requestToCreate, context).candidate, false);
});

test("owner requires explicit synthetic grant evidence, not merely matching IDs", () => {
  assert.equal(screenSyntheticVaultAccess(request(), { ...state(), grantVerified: false }).candidate, false);
  assert.equal(screenSyntheticVaultAccess(request(), { ...state(), grantVerified: undefined }).candidate, false);
  assert.equal(screenSyntheticVaultAccess(request(), { ...state(), grantVerified: true }).candidate, true);
});
