import test from "node:test";
import assert from "node:assert/strict";
import { screenSyntheticOperationalSignal as screen } from "../src/synthetic-observability-signal.mjs";

const signal = () => ({
  schemaVersion: 0, category: "client-health", outcome: "ok",
  durationBucket: "lt-100ms", retryBucket: "0", itemCountBucket: "0",
  offline: false
});

test("bounded operational signals contain only enumerated coarse fields", () => {
  for (const category of ["client-health", "sync-envelope", "backup-envelope", "lock-lifecycle"]) {
    const result = screen({ ...signal(), category });
    assert.deepEqual(result, { candidate: true, reason: "synthetic-operational-signal-only" });
    assert.equal(Object.isFrozen(result), true);
  }
});

test("free-form error text, identifiers and secret-bearing fields are impossible by shape", () => {
  for (const candidate of [
    { ...signal(), userId: "11111111-1111-4111-8111-111111111111" },
    { ...signal(), vaultId: "fixture" },
    { ...signal(), itemId: "fixture" },
    { ...signal(), errorMessage: "password leaked" },
    { ...signal(), url: "https://example.invalid" },
    { ...signal(), stack: "Error: fixture" },
    { ...signal(), password: "fixture" }
  ]) assert.equal(screen(candidate).candidate, false);
});

test("unknown categories and raw numeric telemetry fail closed", () => {
  for (const candidate of [
    { ...signal(), schemaVersion: 1 },
    { ...signal(), category: "credential-used" },
    { ...signal(), outcome: "exception: secret" },
    { ...signal(), durationBucket: 73 },
    { ...signal(), retryBucket: 2 },
    { ...signal(), itemCountBucket: 17 },
    { ...signal(), offline: "false" }
  ]) assert.equal(screen(candidate).candidate, false);
});

test("accessors, decorated shapes and hostile proxies fail closed without echo", () => {
  const accessor = signal();
  Object.defineProperty(accessor, "outcome", { get() { throw Error("no"); } });
  const symbol = signal(); symbol[Symbol("x")] = "fixture";
  const proxy = new Proxy(signal(), { ownKeys() { throw Error("trap"); } });
  for (const candidate of [accessor, symbol, proxy, [], null, Object.create(Date.prototype)]) {
    assert.equal(screen(candidate).candidate, false);
  }
  const result = screen({ ...signal(), errorMessage: "unique-secret-fixture" });
  assert.equal(JSON.stringify(result).includes("unique-secret-fixture"), false);
});
