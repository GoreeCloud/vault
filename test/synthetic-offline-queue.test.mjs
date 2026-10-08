import test from "node:test";
import assert from "node:assert/strict";
import {planSyntheticOfflineQueue as plan} from "../src/synthetic-offline-queue.mjs";
const V="11111111-1111-4111-8111-111111111111", I="22222222-2222-4222-8222-222222222222",
OTHER="33333333-3333-4333-8333-333333333333";
const state=(revision=0,status="empty")=>({schemaVersion:0,vaultId:V,itemId:I,revision,status});
const edit=(operation,expectedRevision)=>({schemaVersion:0,vaultId:V,itemId:I,operation,expectedRevision});
const ordered=()=>[edit("create",0),edit("replace",1),edit("delete",2)];

test("create replace delete produces immutable tombstone-only metadata",()=>{
  const source=state(),q=ordered();
  const result=plan(source,q);
  assert.deepEqual(result,{candidate:true,reason:"synthetic-queue-plan-only",
    plan:{finalRevision:3,finalStatus:"tombstone",steps:3}});
  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(result.plan),true);
  assert.deepEqual(source,state());assert.deepEqual(q,ordered());
});
test("a later stale edit discards an otherwise valid prefix without returning partial proposals",()=>{
  assert.deepEqual(plan(state(),[edit("create",0),edit("replace",1),edit("replace",1)]),
    {candidate:false,reason:"sequence-rejected"});
});
test("rejects duplicate creates, replay, mutation after delete and resurrection",()=>{
  for(const q of [
    [edit("create",0),edit("create",1)],
    [edit("create",0),edit("replace",0)],
    [edit("create",0),edit("delete",1),edit("replace",2)],
    [edit("create",0),edit("delete",1),edit("create",2)],
    [edit("replace",0)],[edit("delete",0)]
  ]) assert.equal(plan(state(),q).candidate,false);
});
test("rejects other vault or item IDs even in later queued changes",()=>{
  for(const q of [
    [{...edit("create",0),vaultId:OTHER}],
    [{...edit("create",0),itemId:OTHER}],
    [edit("create",0),{...edit("replace",1),vaultId:OTHER}],
    [edit("create",0),{...edit("replace",1),itemId:OTHER}]
  ]) assert.equal(plan(state(),q).candidate,false);
});
test("rejects empty, overlong, sparse, decorated, accessor, proxy and subclassed queues",()=>{
  const tooMany=Array.from({length:17},(_,i)=>edit(i===0?"create":"replace",i));
  const hole=new Array(2);hole[0]=edit("create",0);
  const decorated=[edit("create",0)];decorated.debug="fixture";
  const accessor=[edit("create",0)];
  Object.defineProperty(accessor,"0",{get(){throw Error("getter");}});
  class Custom extends Array {}
  const subclass=new Custom(edit("create",0));
  const hostile=new Proxy([edit("create",0)],{ownKeys(){throw Error("trap");}});
  for(const q of [[],tooMany,hole,decorated,accessor,subclass,hostile,null,{}]) {
    assert.equal(plan(state(),q).candidate,false);
  }
});
test("invalid snapshots and malicious prototypes or accessors fail closed",()=>{
  const getter=state();
  Object.defineProperty(getter,"vaultId",{get(){throw Error("no");}});
  const proxy=new Proxy(state(),{getOwnPropertyDescriptor(){throw Error("proxy");}});
  for(const s of [null,[],getter,proxy,{...state(),password:"fixture"},
    {...state(),schemaVersion:1},state(3,"tombstone"),state(Number.MAX_SAFE_INTEGER,"active")]) {
    assert.equal(plan(s,ordered()).candidate,false);
  }
});
test("proposals and rejected errors do not echo identifiers or secret-like values",()=>{
  const positive=JSON.stringify(plan(state(),ordered()));
  const negative=JSON.stringify(plan(state(),[{...edit("create",0),password:"fixture"}]));
  for(const value of [V,I,"password","ciphertext","fixture"]) {
    assert.equal(positive.includes(value),false);assert.equal(negative.includes(value),false);
  }
});
test("two proposals can pass against identical stale snapshot: not atomic",()=>{
  const s=state(5,"active"),q=[edit("replace",5)];
  assert.equal(plan(s,q).candidate,true);
  assert.equal(plan(s,q).candidate,true);
  assert.equal(plan(state(6,"active"),q).candidate,false);
});
test("16 queued synthetic steps accepted, never persisted or transmitted",()=>{
  const q=Array.from({length:16},(_,i)=>edit(i===0?"create":"replace",i));
  assert.deepEqual(plan(state(),q).plan,{finalRevision:16,finalStatus:"active",steps:16});
});
