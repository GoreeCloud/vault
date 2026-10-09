import test from "node:test";
import assert from "node:assert/strict";
import { preflightSyntheticMigrationDryRun as preflight } from "../src/synthetic-migration-preflight.mjs";

const plan = () => ({
  schemaVersion: 0,
  sourceFormat: "bitwarden-json",
  sourceItemCount: 120,
  sourceAttachmentCount: 4,
  sourceReadOnlyClaim: true,
  temporaryPlaintextClaim: false,
  dryRun: true,
  explicitUserConsentClaim: true,
  destinationEmptyClaim: true,
  backupReadyClaim: true,
  checksumEvidenceClaim: true
});

test("only produces a frozen no-write dry-run proposal", () => {
  const result = preflight(plan());
  assert.deepEqual(result, {
    candidate: true,
    reason: "synthetic-migration-dry-run-only",
    proposal: { mode: "dry-run-no-write" }
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.proposal), true);
});

test("write mode and unsafe migration claims fail closed", () => {
  for (const p of [
    { ...plan(), dryRun: false },
    { ...plan(), sourceReadOnlyClaim: false },
    { ...plan(), temporaryPlaintextClaim: true },
    { ...plan(), explicitUserConsentClaim: false },
    { ...plan(), destinationEmptyClaim: false },
    { ...plan(), backupReadyClaim: false },
    { ...plan(), checksumEvidenceClaim: false }
  ]) assert.equal(preflight(p).candidate, false);
});

test("rejects unknown formats and unbounded or malformed counts", () => {
  for (const p of [
    { ...plan(), sourceFormat: "arbitrary-binary" },
    { ...plan(), sourceItemCount: -1 },
    { ...plan(), sourceItemCount: 1_000_001 },
    { ...plan(), sourceAttachmentCount: 100_001 },
    { ...plan(), sourceAttachmentCount: 1.5 },
    { ...plan(), schemaVersion: 1 }
  ]) assert.equal(preflight(p).candidate, false);
});

test("strict shape excludes secret-bearing or file-content fields", () => {
  for (const p of [
    { ...plan(), password: "unique-secret-fixture" },
    { ...plan(), archiveBytes: "fixture" },
    { ...plan(), masterKey: "fixture" },
    { ...plan(), checksum: "actual-value-not-accepted" }
  ]) {
    const result = preflight(p);
    assert.equal(result.candidate, false);
    assert.equal(JSON.stringify(result).includes("unique-secret-fixture"), false);
  }
});

test("accessors, symbols, unusual prototypes and proxies fail closed", () => {
  const accessor = plan();
  Object.defineProperty(accessor, "dryRun", { get() { throw Error("no"); } });
  const symbol = plan(); symbol[Symbol("x")] = "fixture";
  const proxy = new Proxy(plan(), { ownKeys() { throw Error("trap"); } });
  for (const p of [accessor, symbol, proxy, [], null, Object.create(Date.prototype)]) {
    assert.equal(preflight(p).candidate, false);
  }
});


test("proxy cannot override declared no-write, consent, or recovery claims via property get", () => {
  for (const [key, badValue, permittedValue] of [
    ["dryRun", false, true],
    ["sourceReadOnlyClaim", false, true],
    ["temporaryPlaintextClaim", true, false],
    ["explicitUserConsentClaim", false, true],
    ["destinationEmptyClaim", false, true],
    ["checksumEvidenceClaim", false, true]
  ]) {
    let reads = 0;
    const data = {...plan(), [key]:badValue};
    const trick = new Proxy(data, {
      get(target, property, receiver) {
        if (property === key) { reads++; return permittedValue; }
        return Reflect.get(target, property, receiver);
      }
    });
    assert.equal(preflight(trick).candidate, false, key);
    assert.equal(reads, 0, "unexpected property read: " + key);
  }
});
