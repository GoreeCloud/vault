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
