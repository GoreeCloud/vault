import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(
  new URL("../docs/glaze-consumer-preflight.json", import.meta.url), "utf8"));

test("Glaze consumer preflight specifies bounded Stable target, not Development", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.consumer, "GoreeCloud/vault");
  assert.equal(manifest.status, "adoption-required");
  assert.deepEqual(manifest.target, {
    repository: "GoreeCloud/glaze",
    stableVersion: "1.7.0",
    stableRuntime: "js/glaze-v1.7.0.mjs",
    stableScope: "contracts/v1.7/stable-scope.json",
    scopeBlobAtInspection: "187be631e91d1f0640eb144fc258fced3d94828d",
    consumerRegistry: "consumers/registry.json"
  });
});

test("Glaze consumer acceptance cannot be fabricated without review evidence", () => {
  const required = [
    "runtimeImported", "exactRevisionPinned", "renderedReviewed",
    "assistiveTechnologyReviewed", "supportedFormFactorsReviewed",
    "privacySecurityReviewed", "rollbackReviewed", "registeredConsumerAccepted",
    "productionAuthorized"
  ];
  assert.deepEqual(Object.keys(manifest.acceptance).sort(), [...required].sort());
  for (const key of required) assert.equal(manifest.acceptance[key], false,
    `${key} needs real acceptance evidence`);
  const evidence = [
    "runtimeRevision", "renderedReview", "assistiveTechnologyReview",
    "formFactorReview", "privacySecurityReview", "rollbackReview",
    "registryAcceptance", "productionApproval"
  ];
  assert.deepEqual(Object.keys(manifest.evidence).sort(), evidence.sort());
  for (const key of evidence) assert.equal(manifest.evidence[key], null);
});

test("unqualified visual preview does not imply Glaze or credential security", () => {
  const html = readFileSync(new URL("../preview/index.html", import.meta.url), "utf8");
  assert.match(html, /Glaze V1\.7\.0 adoption/);
  assert.match(html, /no runtime import or consumer acceptance/);
  assert.match(html, /NOT A WORKING PASSWORD MANAGER/);
  assert.doesNotMatch(html, /<\s*(script|input|form|textarea)\b/i);
  assert.match(manifest.scopeNote, /unqualified/);
});
