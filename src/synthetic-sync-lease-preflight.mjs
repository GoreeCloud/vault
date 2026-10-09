/**
 * DEVELOPMENT ONLY: a metadata-only compare-and-swap proposal.
 * No atomic storage, locks, authentication, persistence, network or secret handling.
 */
const KEYS=["schemaVersion","observedRevision","expectedRevision","proposedRevision","observedStatus","operation"];
const OPS=new Set(["create","replace","delete"]);
const STATES=new Set(["empty","active","tombstone"]);
const reject=reason=>Object.freeze({candidate:false,reason});
export function screenSyntheticSyncLease(input) {
  try {
    if(!input || typeof input!=="object" || Array.isArray(input)) return reject("invalid-fixture");
    const proto=Object.getPrototypeOf(input);
    if(proto!==Object.prototype && proto!==null) return reject("invalid-fixture");
    const keys=Reflect.ownKeys(input);
    if(keys.length!==KEYS.length) return reject("invalid-fixture");
    const x=Object.create(null);
    for(const key of keys) {
      if(typeof key!=="string" || !KEYS.includes(key)) return reject("invalid-fixture");
      const d=Object.getOwnPropertyDescriptor(input,key);
      if(!d || !Object.hasOwn(d,"value")) return reject("invalid-fixture");
      x[key]=d.value;
    }
    if(x.schemaVersion!==0 || !OPS.has(x.operation) || !STATES.has(x.observedStatus))
      return reject("invalid-fixture");
    for(const key of ["observedRevision","expectedRevision","proposedRevision"])
      if(!Number.isSafeInteger(x[key]) || x[key]<0) return reject("invalid-fixture");
    if(x.observedRevision!==x.expectedRevision) return reject("stale-revision");
    if(x.expectedRevision===Number.MAX_SAFE_INTEGER || x.proposedRevision!==x.expectedRevision+1)
      return reject("nonmonotonic-revision");
    if((x.operation==="create" && (x.observedRevision!==0 || x.observedStatus!=="empty")) ||
       (x.operation!=="create" && x.observedStatus!=="active")) return reject("invalid-transition");
    return Object.freeze({candidate:true,reason:"synthetic-lease-proposal-only",
      plan:Object.freeze({operation:x.operation,nextRevision:x.proposedRevision,
        nextStatus:x.operation==="delete"?"tombstone":"active",requiresAtomicAuthority:true})});
  } catch {return reject("invalid-fixture");}
}
