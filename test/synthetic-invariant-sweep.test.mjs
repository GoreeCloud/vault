import test from "node:test";
import assert from "node:assert/strict";
import { preflightOpaqueSyncMutation } from "../src/opaque-sync-preflight.mjs";
import { screenSyntheticVaultAccess } from "../src/synthetic-access-boundary.mjs";
import { screenSyntheticClientItemTemplate } from "../src/synthetic-client-item-schema.mjs";

/** Fixed-seed mutations: repeatable, bounded adversarial smoke tests, NOT fuzz coverage. */
function random(seed = 0x55AA0123) {
  let state = seed;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return state >>> 0;
  };
}
const vault = "11111111-1111-4111-8111-111111111111";
const item = "22222222-2222-4222-8222-222222222222";
const tenant = "33333333-3333-4333-8333-333333333333";
const owner = "44444444-4444-4444-8444-444444444444";
const other = "55555555-5555-4555-8555-555555555555";

function outputIsMinimal(result) {
  assert.equal(result.candidate, false);
  assert.deepEqual(Object.keys(result), ["candidate", "reason"]);
  assert.equal(Object.isFrozen(result), true);
  const stringified = JSON.stringify(result);
  for (const sensitive of ["fake-secret-value", vault, item, tenant, owner]) {
    assert.equal(stringified.includes(sensitive), false);
  }
}
test("bounded synthetic sync mutations always fail without exposing fixture content", () => {
  const next = random();
  const base = () => ({
    schemaVersion: 0, operation: "create", vaultId: vault, itemId: item,
    previousRevision: 0, nextRevision: 1,
    sealedPayload: Buffer.alloc(64, 11).toString("base64url")
  });
  const context = () => ({expectedVaultId: vault, expectedPreviousRevision: 0, authorized: true});
  for (let i = 0; i < 300; i++) {
    const frame = base(), c = context();
    switch (next() % 8) {
      case 0: frame.schemaVersion = 1 + (next() % 400); break;
      case 1: frame.operation = "delete"; break;
      case 2: frame.vaultId = other; break;
      case 3: frame.previousRevision = 1 + (next() % 400); break;
      case 4: frame.nextRevision = 2 + (next() % 400); break;
      case 5: frame.sealedPayload += "="; break;
      case 6: c.authorized = false; break;
      case 7: frame.plaintext = "fake-secret-value"; break;
    }
    outputIsMinimal(preflightOpaqueSyncMutation(frame, c));
  }
});

test("bounded synthetic role and tenant mutations always fail closed", () => {
  const next = random(0x11223344);
  const request = {vaultId: vault, itemId: item, operation: "read"};
  const original = () => ({
    principalId: owner, tenantId: tenant, vaultTenantId: tenant, vaultId: vault,
    vaultOwnerId: owner, resourceItemId: item, resourceVaultId: vault,
    resourceTenantId: tenant, sessionActive: true, sessionNotRevoked: true,
    membershipActive: true, policyCurrent: true, grantVerified: true,
    grantedRole: "owner", policyVersion: 3, sessionPolicyVersion: 3
  });
  for (let i = 0; i < 300; i++) {
    const ctx = original();
    switch (next() % 10) {
      case 0: ctx.tenantId = other; break;
      case 1: ctx.vaultTenantId = other; break;
      case 2: ctx.vaultOwnerId = other; break;
      case 3: ctx.resourceVaultId = other; break;
      case 4: ctx.resourceItemId = other; break;
      case 5: ctx.sessionActive = false; break;
      case 6: ctx.sessionNotRevoked = false; break;
      case 7: ctx.grantVerified = false; break;
      case 8: ctx.policyVersion = ctx.sessionPolicyVersion + 1; break;
      case 9: ctx.plaintext = "fake-secret-value"; break;
    }
    outputIsMinimal(screenSyntheticVaultAccess(request, ctx));
  }
});

test("bounded client-field schema mutations always reject values and extra data", () => {
  const next = random(0xAABBCCDD);
  const template = () => ({schemaVersion: 0, kind: "login", fieldNames: ["username", "password"]});
  for (let i = 0; i < 300; i++) {
    const v = template();
    switch (next() % 7) {
      case 0: v.schemaVersion = 1; break;
      case 1: v.kind = "unknown"; break;
      case 2: v.fieldNames = ["password", "username"]; break;
      case 3: v.fieldNames = ["username", "username"]; break;
      case 4: v.fieldNames = ["username", "password", "secret-value"]; break;
      case 5: v.password = "fake-secret-value"; break;
      case 6: v.fieldNames = []; break;
    }
    outputIsMinimal(screenSyntheticClientItemTemplate(v));
  }
});
