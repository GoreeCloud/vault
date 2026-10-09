/**
 * DEVELOPMENT ONLY: bounded metadata-only conflict proposal. NOT a merge engine.
 * No secrets, ciphertext, identifiers, persistence, auth, or network access.
 */
const FIELDS = Object.freeze(["schemaVersion","baseRevision","localRevision","remoteRevision","localStatus","remoteStatus"]);
const STATES = new Set(["active","tombstone"]);
const deny = () => Object.freeze({candidate:false,reason:"invalid-conflict-fixture"});
function copy(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const proto=Object.getPrototypeOf(input);
  if (proto!==Object.prototype && proto!==null) return null;
  const keys=Reflect.ownKeys(input);
  if (keys.length!==FIELDS.length) return null;
  const out=Object.create(null);
  for(const key of keys) {
    if(typeof key!=="string" || !FIELDS.includes(key)) return null;
    const d=Object.getOwnPropertyDescriptor(input,key);
    if(!d || !Object.hasOwn(d,"value")) return null;
    out[key]=d.value;
  }
  return out;
}
export function screenSyntheticConflict(input) {
  try {
    const x=copy(input);
    if(!x || x.schemaVersion!==0) return deny();
    for(const k of ["baseRevision","localRevision","remoteRevision"])
      if(!Number.isSafeInteger(x[k]) || x[k]<0) return deny();
    if(!STATES.has(x.localStatus) || !STATES.has(x.remoteStatus)) return deny();
    if(x.localRevision<x.baseRevision || x.remoteRevision<x.baseRevision) return deny();
    if(x.localRevision===x.baseRevision && x.remoteRevision===x.baseRevision)
      return Object.freeze({candidate:false,reason:"no-revision-change"});
    let reason,action;
    if(x.localRevision===x.baseRevision) {
      reason="remote-advanced";action="review-remote";
    } else if(x.remoteRevision===x.baseRevision) {
      reason="local-advanced";action="review-local";
    } else {
      reason="concurrent-changes";
      action=x.localStatus==="tombstone" || x.remoteStatus==="tombstone"
        ? "quarantine-delete-conflict" : "manual-conflict-review";
    }
    return Object.freeze({candidate:true,reason,plan:Object.freeze({action,requiresHumanReview:true})});
  } catch {return deny();}
}
