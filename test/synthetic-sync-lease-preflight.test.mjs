import test from "node:test";
import assert from "node:assert/strict";
import {screenSyntheticSyncLease as screen} from "../src/synthetic-sync-lease-preflight.mjs";
const f=(p={})=>({schemaVersion:0,observedRevision:3,expectedRevision:3,proposedRevision:4,observedStatus:"active",operation:"replace",...p});
test("returns frozen review-only CAS proposal",()=>{
 const x=f(),r=screen(x);
 assert.deepEqual(r,{candidate:true,reason:"synthetic-lease-proposal-only",
  plan:{operation:"replace",nextRevision:4,nextStatus:"active",requiresAtomicAuthority:true}});
 assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.plan));assert.deepEqual(x,f());
});
test("supports bounded create and delete proposals",()=>{
 assert.equal(screen(f({observedRevision:0,expectedRevision:0,proposedRevision:1,observedStatus:"empty",operation:"create"})).plan.nextStatus,"active");
 assert.equal(screen(f({operation:"delete"})).plan.nextStatus,"tombstone");
});
test("stale reads and impossible revisions fail closed",()=>{
 for(const x of [f({observedRevision:2}),f({proposedRevision:5}),f({proposedRevision:3}),f({observedRevision:-1}),
 f({expectedRevision:1.5}),f({proposedRevision:Number.MAX_SAFE_INTEGER+1}),
 f({observedRevision:Number.MAX_SAFE_INTEGER,expectedRevision:Number.MAX_SAFE_INTEGER,proposedRevision:Number.MAX_SAFE_INTEGER})])
 assert.equal(screen(x).candidate,false);
});
test("rejects resurrection, duplicate create, wrong states and secret fields",()=>{
 for(const x of [f({observedStatus:"tombstone"}),f({operation:"create"}),f({operation:"delete",observedStatus:"empty"}),
 f({password:"secret"}),f({ciphertext:"secret"}),f({schemaVersion:1}),f({operation:"merge"}),null,[],{}])
 assert.equal(screen(x).candidate,false);
});
test("prototype, getter and proxy traps fail closed",()=>{
 const getter=f();Object.defineProperty(getter,"operation",{get(){throw Error("getter");}});
 const proxy=new Proxy(f(),{ownKeys(){throw Error("trap");}});
 for(const x of [getter,proxy,Object.create(f())])
 assert.deepEqual(screen(x),{candidate:false,reason:"invalid-fixture"});
});
test("two checks of same revision both pass: never an atomic authority",()=>{
 assert.equal(screen(f()).candidate,true);
 assert.equal(screen(f()).candidate,true);
});
