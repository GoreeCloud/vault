import test from "node:test";
import assert from "node:assert/strict";
import { createVault, openVault } from "../src/crypto.mjs";
import { rotateVaultPassphrase } from "../src/rekey.mjs";

const sample = { version: 1, items: [{
  id: "rekey-example-0001", type: "login", title: "Sample", favorite: false,
  username: "fixture-user", password: "fixture-secret-not-real", website: "https://example.test",
  notes: "", tags: "", totpSecret: ""
}] };
const original = "test-only original passphrase";
const replacement = "test-only new passphrase";

test("authenticated rekey preserves validated documents and rotates keys", async () => {
  const first = await createVault(original, sample);
  const next = await rotateVaultPassphrase(first.envelope, original, replacement);
  assert.notEqual(next.envelope.salt, first.envelope.salt);
  assert.notEqual(next.envelope.iv, first.envelope.iv);
  assert.notEqual(next.envelope.ciphertext, first.envelope.ciphertext);
  assert.deepEqual((await openVault(next.envelope, replacement)).document, sample);
  await assert.rejects(openVault(next.envelope, original), /Unable to unlock/);
  assert.deepEqual((await openVault(first.envelope, original)).document, sample);
});

test("wrong current passphrase cannot change or mutate an encrypted vault", async () => {
  const first = await createVault(original, sample);
  const before = JSON.stringify(first.envelope);
  await assert.rejects(
    rotateVaultPassphrase(first.envelope, "incorrect-old-passphrase", replacement),
    /Unable to unlock/
  );
  assert.equal(JSON.stringify(first.envelope), before);
  assert.deepEqual((await openVault(first.envelope, original)).document, sample);
});

test("rejects malformed, unchanged and short replacement passphrases", async () => {
  const first = await createVault(original);
  await assert.rejects(rotateVaultPassphrase(first.envelope, original, original), /different/);
  await assert.rejects(rotateVaultPassphrase(first.envelope, original, "short"), /12 characters/);
  await assert.rejects(rotateVaultPassphrase(first.envelope, "", replacement), /Current/);
});
