/**
 * DEVELOPMENT ONLY: metadata-only queue *proposal*, not storage, crypto,
 * sync, retries, atomic transactions, authorization, or replay defense.
 * Schema 0 is unshippable; never pass real records to this module.
 */
import { simulateSyntheticRevisionStep } from "./synthetic-revision-model.mjs";

const SNAPSHOT = Object.freeze(["schemaVersion","vaultId","itemId","revision","status"]);
const denied = reason => Object.freeze({candidate:false,reason});

function copySnapshot(source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) return null;
  const p = Object.getPrototypeOf(source);
  if (p !== Object.prototype && p !== null) return null;
  const keys = Reflect.ownKeys(source);
  if (keys.length !== SNAPSHOT.length) return null;
  const dest = Object.create(null);
  for (const k of keys) {
    if (typeof k !== "string" || !SNAPSHOT.includes(k)) return null;
    const d = Object.getOwnPropertyDescriptor(source,k);
    if (!d || !Object.hasOwn(d,"value")) return null;
    dest[k] = d.value;
  }
  return dest;
}

function copyQueue(input) {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype) return null;
  // Snapshot the *own data descriptor*, never the caller's [[Get]] trap.
  // Hostile proxies may still fabricate descriptors: this is fixture hygiene,
  // not integrity, authorization, or a real offline queue.
  const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
  const count = lengthDescriptor?.value;
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, "value") ||
      !Number.isSafeInteger(count) || count < 1 || count > 16) return null;
  const keys = Reflect.ownKeys(input);
  if (keys.length !== count+1 || !keys.includes("length")) return null;
  const copy = [];
  for (let i=0;i<count;i++) {
    const d = Object.getOwnPropertyDescriptor(input,String(i));
    if (!d || !Object.hasOwn(d,"value")) return null;
    copy.push(d.value);
  }
  return copy;
}

/**
 * A successful result only proposes final revision/status/count. Two calls
 * against the same stale snapshot can both succeed: never trust as atomic.
 */
export function planSyntheticOfflineQueue(snapshotInput,intentsInput) {
  try {
    let state = copySnapshot(snapshotInput);
    const queue = copyQueue(intentsInput);
    if (!state || !queue) return denied("invalid-queue-shape");
    for (const intent of queue) {
      const result = simulateSyntheticRevisionStep(state,intent);
      if (!result.candidate) return denied("sequence-rejected");
      state = {
        schemaVersion:state.schemaVersion,vaultId:state.vaultId,itemId:state.itemId,
        revision:result.proposal.revision,status:result.proposal.status
      };
    }
    return Object.freeze({candidate:true,reason:"synthetic-queue-plan-only",
      plan:Object.freeze({finalRevision:state.revision,finalStatus:state.status,steps:queue.length})});
  } catch {
    return denied("invalid-queue-shape");
  }
}
