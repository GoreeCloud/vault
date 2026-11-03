/**
 * Guarded local vault updates.
 *
 * The Web Locks API serializes cooperating same-origin browser tabs. An
 * expected-value check prevents last-writer-wins overwrites; a revoked
 * session guard prevents a queued operation from persisting after lock.
 *
 * Not a substitute for transactional server-side revision enforcement.
 */
export class VaultWriteConflict extends Error {
  constructor(message = "The vault changed in another session. Lock and unlock again.") {
    super(message);
    this.name = "VaultWriteConflict";
  }
}

/**
 * @param {Storage} storage
 * @param {{key: string, expected: string|null, next: string,
 * locks: LockManager, isCurrent: () => boolean}} options
 */
export async function guardedWrite(storage, options) {
  const { key, expected, next, locks, isCurrent } = options ?? {};
  if (!storage || typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function" ||
      typeof key !== "string" || !key ||
      !(expected === null || typeof expected === "string") ||
      typeof next !== "string" || !next ||
      typeof isCurrent !== "function") {
    throw new TypeError("Invalid guarded vault write arguments.");
  }
  if (!locks || typeof locks.request !== "function") {
    throw new Error("This browser does not support Web Locks; encrypted writes are disabled to avoid concurrent data loss.");
  }
  return locks.request("goreecloud-vault-local-v1", { mode: "exclusive" }, async () => {
    if (!isCurrent()) throw new VaultWriteConflict("The vault session expired before the write.");
    if (storage.getItem(key) !== expected) {
      throw new VaultWriteConflict();
    }
    // A synchronous setItem occurs after the final state check, with no
    // await between the comparison and the write.
    storage.setItem(key, next);
    return next;
  });
}
