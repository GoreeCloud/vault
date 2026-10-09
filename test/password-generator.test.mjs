import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePassword } from "../src/password-generator.mjs";

test("defaults to a strong 28-character mixed password", () => {
  for (let i = 0; i < 50; i++) {
    const p = generatePassword();
    assert.equal(p.length, 28);
    assert.match(p, /[a-z]/);
    assert.match(p, /[A-Z]/);
    assert.match(p, /[0-9]/);
    assert.match(p, /[!@#$%^&*()\-_=+\[\]{}:,.?]/);
  }
});

test("does not include deselected classes or ambiguous characters", () => {
  const p = generatePassword({ length: 32, symbols: false, digits: false, excludeAmbiguous: true });
  assert.match(p, /^[A-HJ-NP-Za-km-z]+$/);
  assert.doesNotMatch(p, /[0O1lI]/);
  assert.match(p, /[a-z]/);
  assert.match(p, /[A-Z]/);
});

test("rejects weak, malformed, ambiguous or unsupported configurations", () => {
  const invalid = [
    null, [], "hello", { length: 4 }, { length: 16.5 },
    { length: 257 }, { lowercase: false, uppercase: false, digits: false, symbols: false },
    { length: 16, lowercase: false, uppercase: false, symbols: false },
    { uppercase: "yes" }, { excludeAmbiguous: "true" }, { debug: true }
  ];
  for (const input of invalid) assert.throws(() => generatePassword(input));
});

test("generates independent outputs without caching or writing credentials", () => {
  const passwords = new Set(Array.from({length: 100}, () => generatePassword()));
  assert.equal(passwords.size, 100);
});

test("rejects configs whose old alphabet-size upper bound overstated strength", () => {
  assert.throws(() => generatePassword({length: 21}), RangeError);
  assert.throws(() => generatePassword({length: 22, symbols: false}), RangeError);
  const eligible = generatePassword({length: 22});
  assert.equal(eligible.length, 22);
  assert.match(eligible, /[a-z]/);
  assert.match(eligible, /[A-Z]/);
  assert.match(eligible, /[0-9]/);
  assert.match(eligible, /[^A-Za-z0-9]/);
});

test("boundary estimates always use enabled class sizes, including ambiguous-exclusion", () => {
  assert.throws(() => generatePassword({length: 22, excludeAmbiguous: true, symbols: false}), RangeError);
  const safe = generatePassword({length: 28, excludeAmbiguous: true});
  assert.doesNotMatch(safe, /[0O1lI]/);
});
