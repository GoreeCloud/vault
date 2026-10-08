import test from "node:test";
import assert from "node:assert/strict";
import { screenSyntheticClientItemTemplate as screen } from "../src/synthetic-client-item-schema.mjs";

const draft = (kind = "login", fieldNames = ["username", "password"]) =>
  ({ schemaVersion: 0, kind, fieldNames });

test("screens six client-private synthetic item categories", () => {
  for (const [kind, fieldNames] of [
    ["login", ["username", "password", "website"]],
    ["secure-note", ["title", "body"]],
    ["payment-card", ["cardholder", "cardNumber", "expiration"]],
    ["identity", ["fullName", "email"]],
    ["passkey", ["rpId", "credentialId", "userHandle"]],
    ["ssh-key", ["publicKey", "privateKey"]]
  ]) {
    const result = screen(draft(kind, fieldNames));
    assert.deepEqual(result, { candidate: true, reason: "client-template-fixture-only" });
    assert.equal(Object.isFrozen(result), true);
    assert.deepEqual(Object.keys(result), ["candidate", "reason"]);
  }
});

test("rejects plain values and unexpected secret-bearing properties", () => {
  for (const candidate of [
    { ...draft(), password: "fixture" },
    { ...draft(), username: "fixture" },
    { ...draft(), ciphertext: "unreviewed" },
    { ...draft(), extra: {} },
    { ...draft(), fieldNames: ["username", "a-real-password"] },
    draft("identity", ["fullName", "personal@email.invalid"])
  ]) assert.equal(screen(candidate).candidate, false);
});

test("requires canonical, unique known field names in increasing order", () => {
  for (const fields of [
    [], ["password", "username"], ["username", "username"],
    ["username", "password", "password"], ["USERNAME"], ["website", "username"],
    ["password", "passkey"], [undefined], [12],
    ["username", "password", "website", "totp", "notes", "overflow"]
  ]) assert.equal(screen(draft("login", fields)).candidate, false);
});

test("unknown item categories and production-looking schema versions fail closed", () => {
  for (const candidate of [
    draft("organization", ["user"]),
    draft("__proto__", ["anything"]),
    draft("toString", ["anything"]),
    { ...draft(), schemaVersion: 1 },
    { ...draft(), schemaVersion: -1 },
    { ...draft(), schemaVersion: "0" },
    { ...draft(), kind: null },
    { ...draft(), fieldNames: "username" }
  ]) assert.equal(screen(candidate).candidate, false);
});

test("rejects sparse, decorated, inherited and accessor-based arrays", () => {
  const withHole = new Array(2);
  withHole[1] = "password";
  const decorated = ["username"]; decorated.debug = "fixture";
  const accessor = ["username"];
  Object.defineProperty(accessor, "0", { get() { throw Error("unexpected"); } });
  class Custom extends Array {}
  const subclassed = new Custom("username");
  for (const fields of [withHole, decorated, accessor, subclassed]) {
    assert.equal(screen(draft("login", fields)).candidate, false);
  }
});

test("invalid request prototypes and throwing getters or proxies fail closed", () => {
  const sym = draft(); sym[Symbol("test")] = "ignored?";
  const getter = draft();
  Object.defineProperty(getter, "fieldNames", { get() { throw Error("nope"); } });
  const trap = new Proxy(draft(), { ownKeys() { throw Error("trap"); } });
  const arrayTrap = new Proxy(["username"], { ownKeys() { throw Error("array trap"); } });
  for (const candidate of [
    null, 0, "login", [], Object.create(Date.prototype), sym, getter, trap,
    draft("login", arrayTrap)
  ]) assert.equal(screen(candidate).candidate, false);
});

test("reason strings never echo client types, field names or supplied values", () => {
  const success = JSON.stringify(screen(draft()));
  const failure = JSON.stringify(screen({ ...draft(), secret: "unique-secret-fixture" }));
  assert.equal(success.includes("login"), false);
  assert.equal(success.includes("username"), false);
  assert.equal(failure.includes("unique-secret-fixture"), false);
});
