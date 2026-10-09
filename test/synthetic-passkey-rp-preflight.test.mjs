import test from "node:test";
import assert from "node:assert/strict";
import { preflightSyntheticPasskeyRp as preflight } from "../src/synthetic-passkey-rp-preflight.mjs";

const request = (operation = "get") => ({
  schemaVersion: 0,
  operation,
  rpId: "login.example.test",
  documentUrl: "https://login.example.test/sign-in",
  topLevelUrl: "https://login.example.test/account",
  frameDepth: 0,
  userInitiated: true,
  privateContext: false,
  vaultUnlockedClaim: true,
  hostRiskVerdict: {
    decision: "allow",
    assessedOrigin: "https://login.example.test/check",
    isCurrent: true
  }
});

test("screens create and get only for exact top-level HTTPS host", () => {
  for (const op of ["create", "get"]) {
    const result = preflight(request(op));
    assert.deepEqual(result, {
      candidate: true,
      reason: "synthetic-passkey-rp-preflight-only"
    });
    assert.equal(Object.isFrozen(result), true);
  }
});

test("conservative fixture rejects parent-domain and cross-origin RP expansion", () => {
  for (const q of [
    { ...request(), rpId: "example.test" },
    { ...request(), rpId: "other.example.test" },
    { ...request(), documentUrl: "https://other.example.test/" },
    { ...request(), topLevelUrl: "https://other.example.test/" },
    { ...request(), frameDepth: 1 }
  ]) assert.equal(preflight(q).candidate, false);
});

test("requires user gesture, non-private context, unlock claim and current risk evidence", () => {
  for (const q of [
    { ...request(), userInitiated: false },
    { ...request(), privateContext: true },
    { ...request(), vaultUnlockedClaim: false },
    { ...request(), hostRiskVerdict: { ...request().hostRiskVerdict, decision: "deny" } },
    { ...request(), hostRiskVerdict: { ...request().hostRiskVerdict, isCurrent: false } },
    { ...request(), hostRiskVerdict: { ...request().hostRiskVerdict, assessedOrigin: "https://example.test/" } }
  ]) assert.equal(preflight(q).candidate, false);
});

test("rejects malformed RP IDs, non-HTTPS origins and unsupported operations", () => {
  for (const q of [
    { ...request(), rpId: "LOGIN.EXAMPLE.TEST" },
    { ...request(), rpId: "login.example.test." },
    { ...request(), rpId: "192.168.1.5", documentUrl: "https://192.168.1.5/", topLevelUrl: "https://192.168.1.5/" },
    { ...request(), rpId: "bad..example.test" },
    { ...request(), documentUrl: "http://login.example.test/" },
    { ...request(), operation: "delete" },
    { ...request(), schemaVersion: 1 }
  ]) assert.equal(preflight(q).candidate, false);
});

test("strict shape and hostile objects fail closed without reflecting input", () => {
  const extra = { ...request(), credentialId: "unique-secret-fixture" };
  const accessor = request();
  Object.defineProperty(accessor, "rpId", { get() { throw Error("no"); } });
  const proxy = new Proxy(request(), { ownKeys() { throw Error("trap"); } });
  const verdictAccessor = request();
  Object.defineProperty(verdictAccessor.hostRiskVerdict, "decision", {
    get() { throw Error("no"); }
  });

  for (const q of [extra, accessor, proxy, verdictAccessor, null, [], Object.create(Date.prototype)]) {
    const result = preflight(q);
    assert.equal(result.candidate, false);
    assert.equal(JSON.stringify(result).includes("unique-secret-fixture"), false);
  }
  assert.equal(JSON.stringify(preflight(request())).includes("login.example.test"), false);
});
