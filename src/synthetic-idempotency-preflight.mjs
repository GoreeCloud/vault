/** DEVELOPMENT ONLY. Untrusted metadata preflight; never enforces idempotency. */
const fields=["schemaVersion","expectedRevision","observedRevision","requestSequence","lastAcceptedSequence","operation"];
const operations=new Set(["create","replace","delete"]);
const reject=reason=>Object.freeze({candidate:false,reason});
export function screenSyntheticIdempotency(input){
 try{
  if(!input||typeof input!=="object"||Array.isArray(input))return reject("invalid-fixture");
  const proto=Object.getPrototypeOf(input);
  if(proto!==Object.prototype&&proto!==null)return reject("invalid-fixture");
  const keys=Reflect.ownKeys(input);
  if(keys.length!==fields.length)return reject("invalid-fixture");
  const x=Object.create(null);
  for(const key of keys){
   if(typeof key!=="string"||!fields.includes(key))return reject("invalid-fixture");
   const d=Object.getOwnPropertyDescriptor(input,key);
   if(!d||!Object.hasOwn(d,"value"))return reject("invalid-fixture");
   x[key]=d.value;
  }
  if(x.schemaVersion!==0||!operations.has(x.operation))return reject("invalid-fixture");
  for(const key of ["expectedRevision","observedRevision","requestSequence","lastAcceptedSequence"])
   if(!Number.isSafeInteger(x[key])||x[key]<0)return reject("invalid-fixture");
  if(x.expectedRevision!==x.observedRevision)return reject("stale-revision");
  if(x.requestSequence<=x.lastAcceptedSequence)return reject("replayed-sequence");
  if(x.lastAcceptedSequence===Number.MAX_SAFE_INTEGER||
     x.requestSequence!==x.lastAcceptedSequence+1)return reject("sequence-gap");
  if(x.expectedRevision===Number.MAX_SAFE_INTEGER)return reject("revision-overflow");
  return Object.freeze({candidate:true,reason:"synthetic-idempotency-proposal-only",
   plan:Object.freeze({nextSequence:x.requestSequence,nextRevision:x.expectedRevision+1,
    requiresAuthenticatedAtomicAuthority:true})});
 }catch{return reject("invalid-fixture");}
}
