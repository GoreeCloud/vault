import test from "node:test";
import assert from "node:assert/strict";
import { screenSyntheticIdempotency as screen } from "../src/synthetic-idempotency-preflight.mjs";

const fixture = (overrides = {}) => ({
  schemaVersion: 0, expectedRevision: 3, observedRevision: 3,
  observedStatus: "active", requestSequence: 6, lastAcceptedSequence: 5,
  operation: "replace", ...overrides
});
const deny = (reason) => ({candidate:false,reason});

test("returns a frozen, identifier-free proposal for a valid replace", () => {
  const input = fixture();
  const result = screen(input);
  assert.deepEqual(result, {candidate:true,reason:"synthetic-idempotency-proposal-only",
    plan:{nextSequence:6,nextRevision:4,nextStatus:"active",
      requiresAuthenticatedAtomicAuthority:true}});
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.plan));
  assert.deepEqual(input, fixture());
});

test("proposes initial create and active-to-tombstone delete only", () => {
  assert.equal(screen(fixture({operation:"create",observedStatus:"empty",
    expectedRevision:0,observedRevision:0})).plan.nextStatus,"active");
  assert.equal(screen(fixture({operation:"delete"})).plan.nextStatus,"tombstone");
});

test("rejects stale observations, replay and sequence gaps", () => {
  assert.deepEqual(screen(fixture({observedRevision:2})),deny("stale-revision"));
  for (const requestSequence of [0,4,5])
    assert.deepEqual(screen(fixture({requestSequence})),deny("replayed-sequence"));
  for (const requestSequence of [7,100])
    assert.deepEqual(screen(fixture({requestSequence})),deny("sequence-gap"));
});

test("rejects invalid state transitions and inconsistent revision-zero claims", () => {
  for (const input of [
    fixture({operation:"create"}),
    fixture({operation:"replace",observedStatus:"empty",observedRevision:0,expectedRevision:0}),
    fixture({operation:"delete",observedStatus:"empty",observedRevision:0,expectedRevision:0}),
    fixture({operation:"replace",observedStatus:"tombstone"}),
    fixture({operation:"create",observedStatus:"tombstone"}),
    fixture({observedStatus:"empty"}),
    fixture({observedRevision:0,expectedRevision:0,observedStatus:"active"}),
    fixture({observedRevision:0,expectedRevision:0,observedStatus:"tombstone"})
  ]) assert.deepEqual(screen(input),deny("invalid-transition"));
});

test("rejects numeric overflow, nonintegers, negatives and NaN", () => {
  assert.deepEqual(screen(fixture({expectedRevision:Number.MAX_SAFE_INTEGER,
    observedRevision:Number.MAX_SAFE_INTEGER})),deny("revision-overflow"));
  assert.deepEqual(screen(fixture({lastAcceptedSequence:Number.MAX_SAFE_INTEGER,
    requestSequence:Number.MAX_SAFE_INTEGER})),deny("replayed-sequence"));
  for (const key of ["expectedRevision","observedRevision","requestSequence","lastAcceptedSequence"]) {
    for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER+1, "5", null]) {
      assert.deepEqual(screen(fixture({[key]:value})),deny("invalid-fixture"));
    }
  }
});

test("rejects unsupported protocol versions, operations, states and extra fields", () => {
  for (const input of [fixture({schemaVersion:1}), fixture({operation:"restore"}),
    fixture({observedStatus:"suspended"}), fixture({password:"test-secret"}),
    fixture({ciphertext:"not-real-bytes"}), {schemaVersion:0}]) {
    assert.deepEqual(screen(input),deny("invalid-fixture"));
  }
});

test("refuses accessors, inherited records, arrays, symbols and hostile traps", () => {
  const accessor=fixture();
  Object.defineProperty(accessor,"observedStatus",{get(){throw Error("should not read getter");}});
  const decorated=fixture();decorated[Symbol("private")]="opaque";
  const forged=new Proxy(fixture(),{ownKeys(){throw Error("no");}});
  const throwingDescriptor=new Proxy(fixture(),{getOwnPropertyDescriptor(){throw Error("no");}});
  class Subclass { constructor() {Object.assign(this,fixture());} }
  for (const input of [accessor,decorated,forged,throwingDescriptor,new Subclass(),
    Object.create(fixture()),[],null,undefined]) {
    assert.deepEqual(screen(input),deny("invalid-fixture"));
  }
});

test("never uses a Proxy get trap to read untrusted metadata", () => {
  let gets=0;
  const proxy=new Proxy(fixture(),{
    get(target,key) {gets++;if(key==="observedStatus") return "tombstone";
      return Reflect.get(target,key);}
  });
  assert.equal(screen(proxy).candidate,true);
  assert.equal(gets,0);
});

test("rejects legacy six-field fixture without the observed lifecycle status", () => {
  const legacy=fixture();delete legacy.observedStatus;
  assert.deepEqual(screen(legacy),deny("invalid-fixture"));
});

test("two identical passing proposals do not prove replay resistance or atomicity", () => {
  const input=fixture();
  assert.equal(screen(input).candidate,true);
  assert.equal(screen(input).candidate,true);
});

test("negative responses are frozen and omit all provided secret-like fields", () => {
  const bad=fixture({vaultId:"some-id",password:"synthetic-example-value"});
  const result=screen(bad);
  assert.deepEqual(result,deny("invalid-fixture"));
  assert.ok(Object.isFrozen(result));
  assert.ok(!JSON.stringify(result).includes("synthetic-example-value"));
});
