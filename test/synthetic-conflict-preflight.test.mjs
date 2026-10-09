import test from "node:test";
import assert from "node:assert/strict";
import {screenSyntheticConflict as screen} from "../src/synthetic-conflict-preflight.mjs";
const f=(x={})=>({schemaVersion:0,baseRevision:2,localRevision:3,remoteRevision:4,localStatus:"active",remoteStatus:"active",...x});
test("divergent edits are immutable, metadata-only review proposals",()=>{
  const input=f(),r=screen(input);
  assert.deepEqual(r,{candidate:true,reason:"concurrent-changes",plan:{action:"manual-conflict-review",requiresHumanReview:true}});
  assert.ok(Object.isFrozen(r) && Object.isFrozen(r.plan));assert.deepEqual(input,f());
});
test("deletion conflicts must never auto-resurrect",()=>{
  for(const [a,b] of [["active","tombstone"],["tombstone","active"],["tombstone","tombstone"]])
    assert.equal(screen(f({localStatus:a,remoteStatus:b})).plan.action,"quarantine-delete-conflict");
});
test("single-sided advances require review",()=>{
  assert.deepEqual(screen(f({localRevision:2})).plan,{action:"review-remote",requiresHumanReview:true});
  assert.deepEqual(screen(f({remoteRevision:2})).plan,{action:"review-local",requiresHumanReview:true});
});
test("rejects stale, unsafe, secret-bearing and invalid fixtures",()=>{
  for(const x of [f({localRevision:1}),f({remoteRevision:1}),f({baseRevision:-1}),f({localRevision:2.5}),
    f({remoteRevision:Number.MAX_SAFE_INTEGER+1}),f({schemaVersion:1}),f({localStatus:"empty"}),
    f({password:"secret"}),f({ciphertext:"secret"}),null,[],{}]) assert.equal(screen(x).candidate,false);
  assert.deepEqual(screen(f({localRevision:2,remoteRevision:2})),{candidate:false,reason:"no-revision-change"});
});
test("accessors, prototype chains and throwing proxies fail closed",()=>{
  const getter=f();Object.defineProperty(getter,"localRevision",{get(){throw Error("getter");}});
  const proxy=new Proxy(f(),{ownKeys(){throw Error("trap");}});
  for(const x of [getter,proxy,Object.create(f())]) assert.deepEqual(screen(x),{candidate:false,reason:"invalid-conflict-fixture"});
});
test("outputs never echo secret or identifier fields",()=>{
  const output=JSON.stringify(screen(f()));
  for(const value of ["password","ciphertext","vaultId","itemId","username"]) assert.equal(output.includes(value),false);
});
