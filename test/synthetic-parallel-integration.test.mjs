import test from "node:test";
import assert from "node:assert/strict";
import { planSyntheticProfileSwitch } from "../src/synthetic-profile-switch.mjs";
import { screenSyntheticIdempotency } from "../src/synthetic-idempotency-preflight.mjs";

const profileState = () => ({
  schemaVersion: 0, revision: 5, activeSlot: 1,
  profiles: [
    { slot: 1, mode: "synced", lockState: "locked", pendingEdits: 0 },
    { slot: 2, mode: "local-only", lockState: "locked", pendingEdits: 0 }
  ]
});
const request = () => ({schemaVersion:0,expectedRevision:5,targetSlot:2,intent:"switch"});
const metadata = () => ({
  schemaVersion:0,expectedRevision:5,observedRevision:5,observedStatus:"active",
  requestSequence:4,lastAcceptedSequence:3,operation:"replace"
});

test("independent candidate proposals do not imply authenticated operations", () => {
  const p=planSyntheticProfileSwitch(profileState(),request());
  const i=screenSyntheticIdempotency(metadata());
  assert.equal(p.candidate,true);
  assert.equal(i.candidate,true);
  assert.ok(Object.isFrozen(p)&&Object.isFrozen(p.proposal));
  assert.ok(Object.isFrozen(i)&&Object.isFrozen(i.plan));
  assert.equal(i.plan.requiresAuthenticatedAtomicAuthority,true);
  assert.equal(p.proposal.requiresIndependentProfileKeyCustody,true);
  for(const result of [p,i]) {
    assert.equal(Object.hasOwn(result,"authorized"),false);
    assert.equal(Object.hasOwn(result,"authenticated"),false);
    assert.equal(Object.hasOwn(result,"committed"),false);
    assert.equal(Object.hasOwn(result,"vaultSecret"),false);
  }
});

test("duplicate synthetic proposals still pass, proving no state mutation or replay lock", () => {
  const s=profileState(),r=request(),m=metadata();
  for(let n=0;n<2;n++) {
    assert.equal(planSyntheticProfileSwitch(s,r).candidate,true);
    assert.equal(screenSyntheticIdempotency(m).candidate,true);
  }
  assert.deepEqual(s,profileState());
  assert.deepEqual(m,metadata());
});

test("invalid cross-workflow claims fail closed independently", () => {
  const state=profileState();
  state.profiles[0].lockState="unlocked";
  assert.equal(planSyntheticProfileSwitch(state,request()).candidate,false);
  assert.equal(screenSyntheticIdempotency({...metadata(),requestSequence:3}).candidate,false);
  assert.equal(screenSyntheticIdempotency({...metadata(),observedStatus:"tombstone"}).candidate,false);
  assert.equal(planSyntheticProfileSwitch({...profileState(),secret:"fake-fixture-value"},request()).candidate,false);
  assert.equal(screenSyntheticIdempotency({...metadata(),secret:"fake-fixture-value"}).candidate,false);
});
