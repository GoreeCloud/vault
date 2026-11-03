import test from "node:test";
import assert from "node:assert/strict";
import { auditVaultLogins } from "../src/health.mjs";

function login(id, password, website = "https://example.test") {
  return { id, title: "Example " + id, type: "login", password, website };
}

test("flags repeated, short and common passwords without returning secrets", () => {
  const items = [
    login("a", "long-reused-test-secret"),
    login("b", "long-reused-test-secret"),
    login("c", "password", "http://insecure.example"),
    { id: "note", type: "note", title: "Private", password: "super-private-note" }
  ];
  const report = auditVaultLogins(items);
  assert.equal(report.loginsReviewed, 3);
  assert.equal(report.passwordsReviewed, 3);
  assert.equal(report.reusedCount, 2);
  assert.equal(report.shortCount, 1);
  assert.equal(report.commonCount, 1);
  assert.equal(report.httpCount, 1);
  assert.equal(report.findings.length, 3);
  assert.equal(JSON.stringify(report).includes("long-reused-test-secret"), false);
  assert.equal(JSON.stringify(report).includes("super-private-note"), false);
});

test("only logs in scope and does not mistake missing TOTP for missing MFA", () => {
  const report = auditVaultLogins([
    login("a", "a-long-non-reused-example-password"),
    { id: "note", type: "note", title: "note", password: "123" }
  ]);
  assert.equal(report.loginsReviewed, 1);
  assert.equal(report.findings.length, 0);
  assert.equal(Object.hasOwn(report, "missingMfaCount"), false);
});

test("empty vaults, absent passwords and non-array inputs", () => {
  assert.deepEqual(auditVaultLogins([]).findings, []);
  const empty = auditVaultLogins([login("a", "")]);
  assert.equal(empty.passwordsReviewed, 0);
  assert.equal(empty.findings.length, 0);
  assert.throws(() => auditVaultLogins(null), TypeError);
});
