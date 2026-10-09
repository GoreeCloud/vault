import test from "node:test";
import assert from "node:assert/strict";
import { preflightOpaqueSyncMutation as preflight } from "../src/opaque-sync-preflight.mjs";
const vault="11111111-1111-4111-8111-111111111111",item="22222222-2222-4222-8222-222222222222";
const frame=()=>({schemaVersion:0,operation:"create",vaultId:vault,itemId:item,previousRevision:0,nextRevision:1,sealedPayload:Buffer.alloc(64,11).toString("base64url")});
const context=()=>({expectedVaultId:vault,expectedPreviousRevision:0,authorized:true});
test("sync preflight never performs Proxy value gets",()=>{
 let reads=0;
 const proxy=new Proxy(frame(),{get(){reads++;throw Error("should not be read")}});
 assert.equal(preflight(proxy,context()).candidate,true);
 assert.equal(reads,0);
});
test("sync preflight never invokes accessor getters",()=>{
 let called=0;
 const f=frame();
 Object.defineProperty(f,"vaultId",{get(){called++;return vault}});
 assert.equal(preflight(f,context()).candidate,false);
 assert.equal(called,0);
});
