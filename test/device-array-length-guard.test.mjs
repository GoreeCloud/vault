import test from "node:test";
import assert from "node:assert/strict";
import { planSyntheticDeviceRevocation as plan } from "../src/synthetic-device-revocation.mjs";
const devices = () => [
 {slot:1,deviceStatus:"active",sessionStatus:"active"},
 {slot:2,deviceStatus:"active",sessionStatus:"active"}
];
const state = d => ({schemaVersion:0,revision:4,devices:d});
const request = {schemaVersion:0,expectedRevision:4,initiatorSlot:1,targetSlot:2,action:"revoke-one"};
test("own array length cannot be overridden by a Proxy get trap", () => {
 let gets=0;
 const proxy=new Proxy(devices(),{get(target,key,receiver){if(key==="length"){gets++;return 1;}return Reflect.get(target,key,receiver);}});
 assert.equal(plan(state(proxy),request).candidate,true);
 assert.equal(gets,0);
});
test("array descriptor mismatch fails closed", () => {
 const proxy=new Proxy(devices(),{getOwnPropertyDescriptor(target,key){const d=Reflect.getOwnPropertyDescriptor(target,key);return key==="length"?{...d,value:1}:d;}});
 assert.equal(plan(state(proxy),request).candidate,false);
});
