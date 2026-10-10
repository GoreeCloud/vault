import test from "node:test";
import assert from "node:assert/strict";
import { planSyntheticOfflineQueue } from "../src/synthetic-offline-queue.mjs";

const V = "11111111-1111-4111-8111-111111111111";
const I = "22222222-2222-4222-8222-222222222222";
const snapshot = () => ({schemaVersion:0,vaultId:V,itemId:I,revision:0,status:"empty"});
const create = () => ({schemaVersion:0,vaultId:V,itemId:I,expectedRevision:0,operation:"create"});
const rejected = {candidate:false,reason:"invalid-queue-shape"};

test("never invokes a caller-controlled array length getter", () => {
  let lengthGets = 0;
  const input = new Proxy([create()], {
    get(target, key, receiver) {
      if (key === "length") { lengthGets++; throw Error("hostile length get"); }
      return Reflect.get(target, key, receiver);
    }
  });
  const result = planSyntheticOfflineQueue(snapshot(), input);
  assert.deepEqual(result, {
    candidate:true, reason:"synthetic-queue-plan-only",
    plan:{finalRevision:1,finalStatus:"active",steps:1}
  });
  assert.equal(lengthGets, 0);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.plan));
});

test("a deceptive length property get cannot inflate or truncate the plan", () => {
  let gets = 0;
  const input = new Proxy([create()], {
    get(target, key, receiver) {
      if (key === "length") { gets++; return 16; }
      return Reflect.get(target, key, receiver);
    }
  });
  assert.equal(planSyntheticOfflineQueue(snapshot(), input).plan.steps, 1);
  assert.equal(gets, 0);
});

test("inconsistent, throwing or accessor descriptor metadata fails closed", () => {
  const mismatched = new Proxy([create()], {
    getOwnPropertyDescriptor(target, key) {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
      return key === "length" ? {...descriptor, value:2} : descriptor;
    }
  });
  const throws = new Proxy([create()], {
    getOwnPropertyDescriptor(target, key) {
      if (key === "length") throw Error("malicious descriptor trap");
      return Reflect.getOwnPropertyDescriptor(target, key);
    }
  });
  for (const input of [mismatched, throws]) {
    assert.deepEqual(planSyntheticOfflineQueue(snapshot(), input), rejected);
  }
});

test("a malformed queue never returns fixture identifiers or partial proposal", () => {
  const decorated = [create()];
  decorated.plaintext = "synthetic-test-value";
  const result = planSyntheticOfflineQueue(snapshot(), decorated);
  assert.deepEqual(result, rejected);
  assert.ok(Object.isFrozen(result));
  for (const value of [V, I, "synthetic-test-value"]) {
    assert.equal(JSON.stringify(result).includes(value), false);
  }
});
