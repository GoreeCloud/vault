import test from "node:test";
import assert from "node:assert/strict";
import { createVault, validateEnvelope } from "../src/crypto.mjs";
import { verifyEncryptedBackup } from "../src/recovery.mjs";

const example = () => ({ version: 1, items: [{
  id: "backup-test-0001", type: "note", title: "Example", favorite: false,
  username: "", password: "", website: "",
  notes: "dummy local test note", tags: "", totpSecret: ""
}] });

test("verifies a backup by authenticating and validating the full document", async () => {
  const created = await createVault("test-only correct recovery passphrase", example());
  const result = await verifyEncryptedBackup(created.envelope, "test-only correct recovery passphrase");
  assert.deepEqual(result, { itemCount: 1 });
  assert.equal(Object.isFrozen(result), true);
});

test("rejects wrong backup passphrase before any import write", async () => {
  const created = await createVault("test-only correct recovery passphrase", example());
  await assert.rejects(
    verifyEncryptedBackup(created.envelope, "incorrect-test-only-passphrase"),
    /Unable to unlock/
  );
});

test("detects tampering without reporting a valid backup", async () => {
  const created = await createVault("test-only correct recovery passphrase", example());
  const original = created.envelope.ciphertext;
  const tampered = { ...created.envelope, ciphertext: (original[0] === "A" ? "B" : "A") + original.slice(1) };
  await assert.rejects(
    verifyEncryptedBackup(tampered, "test-only correct recovery passphrase"),
    /Unable to unlock/
  );
});

test("rejects oversized encrypted payload before attempting decrypt", async () => {
  const created = await createVault("test-only correct recovery passphrase", example());
  const oversized = { ...created.envelope, ciphertext: "A".repeat(6_000_000) };
  assert.throws(() => validateEnvelope(oversized), /size limit/);
  await assert.rejects(verifyEncryptedBackup(oversized, "test-only correct recovery passphrase"), /size limit/);
});
