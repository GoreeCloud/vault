import { randomBytes } from 'node:crypto';

/**
 * Ephemeral one-time challenge tracking for a SINGLE disposable test RP.
 * Requests are scoped to a random opaque identifier and expire. An issuance
 * or verification is never a user identity or authorization grant.
 */
export class ChallengeLedger {
  constructor({ clock = () => Date.now(), ttlMs = 60_000, capacity = 128 } = {}) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 ||
        !Number.isSafeInteger(capacity) || capacity < 1) {
      throw new TypeError('Invalid challenge ledger limits');
    }
    this.clock = clock;
    this.ttlMs = ttlMs;
    this.capacity = capacity;
    this.pending = new Map();
  }

  prune() {
    const now = this.clock();
    for (const [id, value] of this.pending) {
      if (value.expiresAt <= now) this.pending.delete(id);
    }
  }

  issue(type, challenge) {
    if (!['register', 'authenticate'].includes(type) ||
        typeof challenge !== 'string' || challenge.length < 32) {
      throw new TypeError('Invalid challenge type or entropy');
    }
    this.prune();
    if (this.pending.size >= this.capacity) {
      throw new RangeError('Too many pending ceremonies');
    }
    const requestId = randomBytes(24).toString('base64url');
    this.pending.set(requestId, {
      type,
      challenge,
      expiresAt: this.clock() + this.ttlMs,
    });
    return requestId;
  }

  take(type, requestId) {
    if (typeof requestId !== 'string' ||
        !/^[A-Za-z0-9_-]{32}$/.test(requestId)) return null;
    const found = this.pending.get(requestId);
    // Consume even if the caller sent the wrong ceremony type.
    this.pending.delete(requestId);
    if (!found || found.type !== type ||
        found.expiresAt <= this.clock()) return null;
    return found.challenge;
  }
}
