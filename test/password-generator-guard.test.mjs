import test from "node:test";
import assert from "node:assert/strict";
import { generatePassword } from "../src/password-generator.mjs";

const throwsGeneric = input => assert.throws(() => generatePassword(input), TypeError);

test("inherited generator configuration is rejected", () => {
  throwsGeneric(Object.create({ symbols: false }));
  throwsGeneric(new Date());
  throwsGeneric(Object.create([]));
});

test("accessors are rejected without invoking them", () => {
  let read = 0;
  const input = {};
  Object.defineProperty(input, "symbols", { get() { read++; throw Error("not called"); } });
  throwsGeneric(input);
  assert.equal(read, 0);
});

test("symbol properties, unexpected keys and malicious proxies fail closed", () => {
  const symbols = { length: 32 }; symbols[Symbol("unknown")] = true;
  throwsGeneric(symbols);
  throwsGeneric({ debug: true });
  throwsGeneric(new Proxy({}, { ownKeys() { throw Error("untrusted"); } }));
  throwsGeneric(new Proxy({}, { getPrototypeOf() { throw Error("untrusted"); } }));
});

test("null-prototype configuration with own data fields still generates", () => {
  const input = Object.assign(Object.create(null), { length: 32, symbols: false });
  const result = generatePassword(input);
  assert.equal(result.length, 32);
  assert.doesNotMatch(result, /[!@#$%^&*()\-_=+\[\]{}:,.?]/);
  const frozen = generatePassword(Object.freeze({ length: 36, excludeAmbiguous: true }));
  assert.equal(frozen.length, 36);
  assert.doesNotMatch(frozen, /[0O1lI]/);
});
