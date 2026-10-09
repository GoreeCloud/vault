/**
 * Development-only descriptor snapshot for hostile fixture metadata.
 *
 * A Proxy may falsify descriptors; this helper does NOT establish trusted
 * identity, integrity, attestation, consent, encryption, or authorization.
 * It intentionally never reads caller properties via [[Get]] and refuses
 * accessors, inherited records, symbols, arrays, and unexpected keys.
 */
export function snapshotSyntheticExactRecord(input, expectedKeys) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
    const proto = Object.getPrototypeOf(input);
    if (proto !== Object.prototype && proto !== null) return null;
    const own = Reflect.ownKeys(input);
    if (own.length !== expectedKeys.length) return null;
    const snapshot = Object.create(null);
    for (const key of own) {
      if (typeof key !== "string" || !expectedKeys.includes(key)) return null;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.hasOwn(descriptor, "value")) return null;
      snapshot[key] = descriptor.value;
    }
    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}
