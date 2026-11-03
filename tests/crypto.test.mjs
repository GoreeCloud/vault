import test from "node:test";
import assert from "node:assert/strict";
import { createVault, openVault, sealVault, validateEnvelope, validateDocument } from "../src/crypto.mjs";
import { generatePassword, generateTotp, normalizeWebsite } from "../src/security.mjs";

const sample = () => ({ version: 1, items: [{
  id: "test-id-123456", type: "login", title: "Example", favorite: false,
  username: "user", password: "top-secret", website: "https://example.org",
  notes: "private", tags: "work", totpSecret: ""
}] });

test("encrypts, decrypts and changes IV on save", async () => {
  const { key, envelope } = await createVault("a memorable but long test phrase", sample());
  const opened = await openVault(envelope, "a memorable but long test phrase");
  assert.deepEqual(opened.document, sample());
  assert.equal(JSON.stringify(envelope).includes("top-secret"), false);
  const next = await sealVault(sample(), key, { salt: envelope.salt });
  assert.notEqual(next.iv, envelope.iv);
  assert.notEqual(next.ciphertext, envelope.ciphertext);
});

test("rejects incorrect passphrases and tampered encrypted data", async () => {
  const { envelope } = await createVault("a different long test phrase", sample());
  await assert.rejects(openVault(envelope, "not my password"), /Unable to unlock/);
  const tampered = { ...envelope, ciphertext: envelope.ciphertext.slice(0, -4) + "AAAA" };
  await assert.rejects(openVault(tampered, "a different long test phrase"));
  assert.throws(() => validateEnvelope({ ...envelope, iterations: 1 }));
});

test("rejects cleartext metadata or unreviewed fields outside the v1 ciphertext envelope", async () => {
  const { envelope } = await createVault("synthetic v1 envelope passphrase");
  assert.deepEqual(
    Object.keys(envelope).sort(),
    ["format", "kdf", "iterations", "salt", "iv", "ciphertext"].sort()
  );
  assert.throws(
    () => validateEnvelope({ ...envelope, plaintextCredential: "synthetic-do-not-store" }),
    /Unexpected vault encryption envelope fields/
  );
  assert.throws(
    () => validateEnvelope({ ...envelope, extra: { deviceNote: "plaintext" } }),
    /Unexpected vault encryption envelope fields/
  );
  const missing = { ...envelope };
  delete missing.iv;
  assert.throws(() => validateEnvelope(missing), /Unexpected vault encryption envelope fields/);
  await assert.rejects(
    openVault({ ...envelope, plaintextCredential: "synthetic-do-not-store" }, "synthetic v1 envelope passphrase"),
    /Unexpected vault encryption envelope fields/
  );
});

test("rejects unversioned document and item extension fields even under valid encryption", async () => {
  const good = sample();
  assert.deepEqual(validateDocument(good), good);
  assert.throws(
    () => validateDocument({ ...good, unreviewedRoot: "untrusted metadata" }),
    /Unexpected vault document fields/
  );
  assert.throws(
    () => validateDocument({ ...good, items: [
      { ...good.items[0], unreviewedItem: { arbitrary: "nested data" } }
    ] }),
    /Unexpected vault item fields/
  );
  // The AES-GCM tag may be valid even when the decrypted JSON is outside
  // the supported v1 schema. Authenticate *and* validate both boundaries.
  const passphrase = "synthetic strict-schema test phrase";
  const { key, envelope } = await createVault(passphrase, good);
  const invalid = { ...good, items: [
    { ...good.items[0], extraRecordField: "unreviewed extension" }
  ] };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const forgedCiphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: new TextEncoder().encode("goreecloud.vault.local.v1")
    },
    key,
    new TextEncoder().encode(JSON.stringify(invalid))
  );
  const authenticatedButMalformed = {
    ...envelope,
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(forgedCiphertext).toString("base64")
  };
  await assert.rejects(
    openVault(authenticatedButMalformed, passphrase),
    /Unexpected vault item fields/
  );
});

test("rejects invalid documents and short passphrases", async () => {
  assert.throws(() => validateDocument({ version: 1, items: [{ id: "x" }] }));
  await assert.rejects(createVault("short"), /12 characters/);
});

test("password generator guarantees every selected character class", () => {
  const password = generatePassword({ length: 32 });
  assert.equal(password.length, 32);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /[0-9]/);
  assert.match(password, /[^a-zA-Z0-9]/);
  assert.throws(() => generatePassword({ length: 10 }), RangeError);
  assert.throws(() => generatePassword({ lowercase: false, uppercase: false, digits: false, symbols: false }), RangeError);
});

test("website safety rejects javascript, credential-in-URL and invalid schemes", () => {
  assert.equal(normalizeWebsite("example.com"), "https://example.com/");
  assert.equal(normalizeWebsite("javascript:alert(1)"), "");
  assert.equal(normalizeWebsite("https://person:secret@example.com"), "");
  assert.equal(normalizeWebsite("file:///etc/passwd"), "");
});

test("TOTP matches RFC 6238 SHA-1 test vectors", async () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  assert.equal(await generateTotp(secret, 59_000, { digits: 8 }), "94287082");
  assert.equal(await generateTotp(secret, 1_111_111_109_000, { digits: 8 }), "07081804");
});
