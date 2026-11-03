import test from "node:test";
import assert from "node:assert/strict";
import { guardedWrite, VaultWriteConflict } from "../src/storage.mjs";

function makeStorage(initial = null, fail = false) {
  let stored = initial;
  return {
    getItem: key => key === "vault" ? stored : null,
    setItem(key, value) {
      assert.equal(key, "vault");
      if (fail) throw new Error("quota exceeded");
      stored = value;
    }
  };
}
function makeLocks() {
  let tail = Promise.resolve();
  return {
    request(name, options, operation) {
      assert.equal(name, "goreecloud-vault-local-v1");
      assert.equal(options.mode, "exclusive");
      const run = tail.catch(() => {}).then(operation);
      tail = run;
      return run;
    }
  };
}
const write = (storage, locks, expected, next, isCurrent = () => true) =>
  guardedWrite(storage, { key: "vault", expected, next, locks, isCurrent });

test("creates a vault once, rejects an outdated second-tab initial create", async () => {
  const storage = makeStorage();
  const locks = makeLocks();
  const calls = await Promise.allSettled([
    write(storage, locks, null, "encrypted-A"),
    write(storage, locks, null, "encrypted-B")
  ]);
  assert.equal(calls.filter(v => v.status === "fulfilled").length, 1);
  assert.equal(calls.filter(v => v.status === "rejected").length, 1);
  assert.ok(["encrypted-A", "encrypted-B"].includes(storage.getItem("vault")));
});

test("rejects stale revisions without clobbering the authoritative value", async () => {
  const storage = makeStorage("version-one");
  const locks = makeLocks();
  await write(storage, locks, "version-one", "version-two");
  await assert.rejects(write(storage, locks, "version-one", "stale-third"), VaultWriteConflict);
  assert.equal(storage.getItem("vault"), "version-two");
});

test("locks out a queued write after session revocation", async () => {
  const storage = makeStorage("encrypted");
  const locks = makeLocks();
  let sessionActive = true;
  sessionActive = false;
  await assert.rejects(write(storage, locks, "encrypted", "late", () => sessionActive),
    /session expired/);
  assert.equal(storage.getItem("vault"), "encrypted");
});

test("storage errors leave ciphertext unchanged", async () => {
  const storage = makeStorage("unchanged", true);
  await assert.rejects(write(storage, makeLocks(), "unchanged", "replace"), /quota exceeded/);
  assert.equal(storage.getItem("vault"), "unchanged");
});

test("unsupported Web Locks fails closed without writing", async () => {
  const storage = makeStorage("unchanged");
  await assert.rejects(write(storage, undefined, "unchanged", "replace"), /Web Locks/);
  assert.equal(storage.getItem("vault"), "unchanged");
});

test("invalid arguments fail before accessing storage", async () => {
  await assert.rejects(guardedWrite({}, {}), TypeError);
});
