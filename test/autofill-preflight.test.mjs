import test from "node:test";
import assert from "node:assert/strict";
import { preflightAutofillCandidate } from "../src/autofill-preflight.mjs";

const eligible = () => ({
  savedUrl: "https://login.example.test/path",
  documentUrl: "https://login.example.test/",
  topLevelUrl: "https://login.example.test/auth",
  frameDepth: 0,
  userInitiated: true,
  vaultUnlocked: true,
  explicitUserConsent: true,
  privateContext: false,
  hostRiskVerdict: {
    decision: "allow",
    assessedOrigin: "https://login.example.test/",
    isCurrent: true
  }
});

test("returns only non-authoritative preflight metadata, never credentials", () => {
  const verdict = preflightAutofillCandidate(eligible());
  assert.deepEqual(verdict, { candidate: true, reason: "preflight-only" });
  assert.equal(Object.isFrozen(verdict), true);
  assert.equal(Object.keys(verdict).length, 2);
});

test("rejects cross-origin and cross-origin-frame candidate matches", () => {
  for (const override of [
    { savedUrl: "https://evil-login.example.test" },
    { savedUrl: "https://login.example.test.evil.invalid" },
    { savedUrl: "http://login.example.test" },
    { documentUrl: "https://other.example.test" },
    { topLevelUrl: "https://www.example.test" },
    { frameDepth: 1 },
    { frameDepth: -1 },
    { frameDepth: "0" }
  ]) {
    const verdict = preflightAutofillCandidate({ ...eligible(), ...override });
    assert.equal(verdict.candidate, false, JSON.stringify(override));
  }
});

test("rejects absent consent, locked vault and private contexts", () => {
  for (const override of [
    { userInitiated: false }, { explicitUserConsent: false },
    { vaultUnlocked: false }, { privateContext: true },
    { explicitUserConsent: undefined }, { privateContext: "false" }
  ]) {
    assert.equal(preflightAutofillCandidate({ ...eligible(), ...override }).candidate, false);
  }
});

test("rejects unknown, stale, mismatched and forged-shape risk evidence", () => {
  for (const risk of [
    undefined, null, {}, [], { decision: "unknown", assessedOrigin: "https://login.example.test", isCurrent: true },
    { decision: "allow", assessedOrigin: "https://login.example.test", isCurrent: false },
    { decision: "allow", assessedOrigin: "https://evil.example.test", isCurrent: true },
    { decision: "allow", assessedOrigin: "http://login.example.test", isCurrent: true },
    { decision: "allow", assessedOrigin: "https://login.example.test", isCurrent: true, override: true }
  ]) {
    assert.equal(preflightAutofillCandidate({ ...eligible(), hostRiskVerdict: risk }).candidate, false);
  }
});

test("rejects malformed input and unexpected keys without throwing", () => {
  for (const input of [
    null, undefined, [], 1, "test",
    { ...eligible(), password: "should-never-pass" },
    { ...eligible(), savedUrl: "https://name:password@login.example.test" },
    { ...eligible(), documentUrl: "//login.example.test" },
    { ...eligible(), documentUrl: "" }
  ]) {
    assert.equal(preflightAutofillCandidate(input).candidate, false);
  }
});

test("missing fields, symbols and accessor properties fail closed", () => {
  const missing = eligible();
  delete missing.hostRiskVerdict;
  const withSymbol = eligible();
  withSymbol[Symbol("risk")] = "fixture";
  const getter = eligible();
  Object.defineProperty(getter, "documentUrl", {
    get() { throw Error("untrusted getter must not run"); }
  });
  const riskGetter = eligible();
  Object.defineProperty(riskGetter.hostRiskVerdict, "decision", {
    get() { throw Error("host-risk accessor must not run"); }
  });
  const inherited = Object.create({ savedUrl: "https://login.example.test" });
  for (const x of [missing, withSymbol, getter, riskGetter, inherited]) {
    assert.deepEqual(Object.keys(preflightAutofillCandidate(x)), ["candidate", "reason"]);
    assert.equal(preflightAutofillCandidate(x).candidate, false);
  }
});

test("malicious proxies cannot crash autofill screening", () => {
  const badRequest = new Proxy(eligible(), { ownKeys() { throw Error("keys blocked"); } });
  const badRisk = new Proxy(eligible().hostRiskVerdict, {
    getOwnPropertyDescriptor() { throw Error("descriptor blocked"); }
  });
  const badProto = new Proxy(eligible(), {
    getPrototypeOf() { throw Error("prototype blocked"); }
  });
  for (const x of [badRequest, badProto, { ...eligible(), hostRiskVerdict: badRisk }]) {
    assert.doesNotThrow(() => preflightAutofillCandidate(x));
    const output = preflightAutofillCandidate(x);
    assert.equal(output.candidate, false);
    assert.equal(Object.isFrozen(output), true);
  }
});

test("deterministic malformed-input sweep always denies without data echo", () => {
  let seed = 0x51F10A;
  function next() {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed >>> 0;
  }
  for (let i = 0; i < 384; i++) {
    const sample = eligible();
    switch (next() % 8) {
      case 0: sample.frameDepth = -1 - (next() % 99); break;
      case 1: sample.savedUrl = "http://login.example.test/" + next(); break;
      case 2: sample.documentUrl = "https://untrusted.invalid/" + next(); break;
      case 3: sample.topLevelUrl = "https://different.invalid/" + next(); break;
      case 4: sample.userInitiated = false; break;
      case 5: sample.explicitUserConsent = undefined; break;
      case 6: sample.hostRiskVerdict = { ...sample.hostRiskVerdict, isCurrent: false }; break;
      case 7: sample["secret_" + next()] = "sensitive-fixture"; break;
    }
    const out = preflightAutofillCandidate(sample);
    assert.equal(out.candidate, false, "mutation " + i);
    assert.equal(JSON.stringify(out).includes("sensitive-fixture"), false);
  }
});
