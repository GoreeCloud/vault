import test from "node:test";
import assert from "node:assert/strict";
import {
  screenSyntheticBackupManifest as screen,
  planSyntheticRestoreMetadata as restore
} from "../src/synthetic-backup-manifest.mjs";

const B = "11111111-1111-4111-8111-111111111111";
const V = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const manifest = () => ({
  schemaVersion: 0, backupId: B, vaultId: V, snapshotRevision: 7,
  itemCount: 12, opaqueBytes: 4096, format: "synthetic-opaque-backup-v0",
  clientEncryptedClaim: true, serverCanDecryptClaim: false
});
const context = () => ({
  schemaVersion: 0, targetVaultId: V, currentRevision: 0, targetEmpty: true,
  integrityEvidenceClaim: true, rollbackEvidenceClaim: true,
  operatorCanDecryptClaim: false
});

test("synthetic manifest accepts only the bounded metadata vocabulary", () => {
  const result = screen(manifest());
  assert.deepEqual(result, { candidate: true, reason: "synthetic-backup-manifest-only" });
  assert.equal(Object.isFrozen(result), true);
});

test("empty and nonempty manifest counts must agree with opaque size", () => {
  assert.equal(screen({ ...manifest(), itemCount: 0, opaqueBytes: 0 }).candidate, true);
  assert.equal(screen({ ...manifest(), itemCount: 0 }).candidate, false);
  assert.equal(screen({ ...manifest(), opaqueBytes: 0 }).candidate, false);
});

test("restore proposal requires empty matching target and claimed rollback evidence", () => {
  const result = restore(manifest(), context());
  assert.equal(result.candidate, true);
  assert.deepEqual(result.proposal, { action: "restore-to-empty-target-only" });
  for (const c of [
    { ...context(), targetVaultId: OTHER },
    { ...context(), currentRevision: 1 },
    { ...context(), targetEmpty: false },
    { ...context(), integrityEvidenceClaim: false },
    { ...context(), rollbackEvidenceClaim: false },
    { ...context(), operatorCanDecryptClaim: true }
  ]) assert.equal(restore(manifest(), c).candidate, false);
});

test("manifest rejects fake production versions, plaintext fields and malformed metadata", () => {
  for (const m of [
    { ...manifest(), schemaVersion: 1 },
    { ...manifest(), password: "fixture" },
    { ...manifest(), backupId: B.toUpperCase() },
    { ...manifest(), snapshotRevision: -1 },
    { ...manifest(), itemCount: 1_000_001 },
    { ...manifest(), opaqueBytes: -1 },
    { ...manifest(), format: "zip" },
    { ...manifest(), clientEncryptedClaim: false },
    { ...manifest(), serverCanDecryptClaim: true }
  ]) assert.equal(screen(m).candidate, false);
});

test("accessors, symbols, prototypes and hostile proxies fail closed without echo", () => {
  const accessor = manifest();
  Object.defineProperty(accessor, "format", { get() { throw Error("no"); } });
  const symbol = manifest(); symbol[Symbol("x")] = "fixture";
  const proxy = new Proxy(context(), { ownKeys() { throw Error("trap"); } });
  for (const m of [accessor, symbol, [], null, Object.create(Date.prototype)]) {
    assert.equal(screen(m).candidate, false);
  }
  assert.equal(restore(manifest(), proxy).candidate, false);
  const leaked = JSON.stringify(screen({ ...manifest(), secret: "unique-fixture" }));
  assert.equal(leaked.includes("unique-fixture"), false);
  assert.equal(JSON.stringify(screen(manifest())).includes(B), false);
  assert.equal(JSON.stringify(screen(manifest())).includes(V), false);
});
