import test from "node:test";
import assert from "node:assert/strict";
import { screenSyntheticVaultAccess as screen } from "../src/synthetic-access-boundary.mjs";

const P = "11111111-1111-4111-8111-111111111111";
const T = "33333333-3333-4333-8333-333333333333";
const V = "44444444-4444-4444-8444-444444444444";
const ITEM = "55555555-5555-4555-8555-555555555555";
const request = () => ({vaultId: V, itemId: ITEM, operation: "read"});
const context = () => ({
  principalId: P, tenantId: T, vaultTenantId: T, vaultId: V,
  vaultOwnerId: P, resourceItemId: ITEM, resourceVaultId: V,
  resourceTenantId: T, sessionActive: true, sessionNotRevoked: true,
  membershipActive: true, policyCurrent: true, grantVerified: true,
  grantedRole: "owner", policyVersion: 3, sessionPolicyVersion: 3
});

test("snapshot reads own data descriptors, never proxy get traps", () => {
  let count = 0;
  const denyGet = value => new Proxy(value, {
    get() { count++; throw Error("must not call untrusted get"); }
  });
  assert.deepEqual(screen(denyGet(request()), denyGet(context())), {
    candidate: true, reason: "synthetic-screen-only"
  });
  assert.equal(count, 0);
});

test("malicious getter accessors are rejected without being invoked", () => {
  let called = 0;
  const req = request();
  Object.defineProperty(req, "operation", {enumerable: true, configurable: true,
    get() { called++; return "read"; }});
  const ctx = context();
  Object.defineProperty(ctx, "grantVerified", {enumerable: true, configurable: true,
    get() { called++; return true; }});
  assert.equal(screen(req, context()).candidate, false);
  assert.equal(screen(request(), ctx).candidate, false);
  assert.equal(called, 0);
});

test("failed snapshot reflects no context and prevents valid-shaped fallback", () => {
  const throwing = new Proxy(context(), {
    getOwnPropertyDescriptor() { throw Error("hostile"); }
  });
  assert.deepEqual(screen(request(), throwing), {candidate: false, reason: "invalid-shape"});
  const decorated = {...context(), unexpected: "metadata"};
  assert.equal(screen(request(), decorated).candidate, false);
  const inherited = Object.create(context());
  assert.equal(screen(request(), inherited).candidate, false);
});

test("passes only a synthetic shape; descriptor lies cannot authenticate a session", () => {
  const original = context();
  const proxy = new Proxy(original, {
    get(_target, key) { if (key === "grantVerified") return false; return Reflect.get(_target, key); }
  });
  assert.equal(screen(request(), proxy).candidate, true);
  assert.equal(screen(request(), {...original, grantVerified: false}).candidate, false);
});
