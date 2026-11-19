import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ChallengeLedger } from '../src/ledger.mjs';

const exampleChallenge = 'unpredictable-test-challenge-placeholder-not-a-secret';

test('challenges are unpredictable IDs, isolated by ceremony and one-time', () => {
  const ledger = new ChallengeLedger();
  const id1 = ledger.issue('register', exampleChallenge);
  const id2 = ledger.issue('authenticate', exampleChallenge);
  assert.notEqual(id1, id2);
  assert.equal(ledger.take('register', id1), exampleChallenge);
  assert.equal(ledger.take('register', id1), null);
  assert.equal(ledger.take('authenticate', id2), exampleChallenge);
  assert.equal(ledger.take('authenticate', id2), null);
});

test('wrong ceremony type consumes token fail closed', () => {
  const ledger = new ChallengeLedger();
  const id = ledger.issue('register', exampleChallenge);
  assert.equal(ledger.take('authenticate', id), null);
  assert.equal(ledger.take('register', id), null);
});

test('deadline expires, and expiry frees bounded capacity', () => {
  let now = 500;
  const ledger = new ChallengeLedger({
    clock: () => now, ttlMs: 20, capacity: 1,
  });
  const id = ledger.issue('register', exampleChallenge);
  assert.throws(() => ledger.issue('authenticate', exampleChallenge), RangeError);
  now += 20;
  assert.equal(ledger.take('register', id), null);
  const next = ledger.issue('authenticate', exampleChallenge);
  assert.ok(next);
});

test('rejects malformed request identifiers and weak challenge strings', () => {
  const ledger = new ChallengeLedger();
  assert.throws(() => ledger.issue('register', 'abc'), TypeError);
  assert.throws(() => ledger.issue('invalid', exampleChallenge), TypeError);
  assert.equal(ledger.take('register', 'a'.repeat(100)), null);
  assert.equal(ledger.take('register', 'not-valid!'), null);
});
