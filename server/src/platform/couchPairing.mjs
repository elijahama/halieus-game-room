import { randomBytes } from "node:crypto";

// Internal pairing primitive only. Callers must supply verified account IDs, enforce
// rate limits and maintenance, and atomically bind the consumed pair to a room.
// Pending data is process-local; no credentials or browser sessions are stored.
export class CouchPairingRegistry {
  constructor({ now = Date.now, generateCode = () => randomBytes(5).toString("hex").toUpperCase(), ttlMs = 300000, maxPending = 256 } = {}) {
    if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || !Number.isSafeInteger(maxPending) || maxPending <= 0) throw new Error("Invalid pairing limits");
    this.now = now;
    this.generateCode = generateCode;
    this.ttlMs = ttlMs;
    this.maxPending = maxPending;
    this.pending = new Map();
  }
  prune() {
    const now = this.now();
    for (const [code, pair] of this.pending) if (pair.expiresAt <= now) this.pending.delete(code);
  }
  create(hostAccountId) {
    this.prune();
    if (typeof hostAccountId !== "string" || !hostAccountId.trim()) return null;
    if ([...this.pending.values()].some(p => p.hostAccountId === hostAccountId || p.guestAccountId === hostAccountId)) return null;
    if (this.pending.size >= this.maxPending) return null;
    for (let i = 0; i < 8; i++) {
      const code = this.generateCode();
      if (!/^[A-F0-9]{10}$/.test(code) || this.pending.has(code)) continue;
      const expiresAt = this.now() + this.ttlMs;
      this.pending.set(code, {hostAccountId, guestAccountId: null, expiresAt});
      return {code, expiresAt};
    }
    return null;
  }
  request(code, guestAccountId) {
    this.prune();
    if (typeof guestAccountId !== "string" || !guestAccountId.trim()) return false;
    const pair = this.pending.get(code);
    if (!pair || pair.hostAccountId === guestAccountId) return false;
    if (pair.guestAccountId === guestAccountId) return true;
    if (pair.guestAccountId !== null || [...this.pending.values()].some(p => p.hostAccountId === guestAccountId || p.guestAccountId === guestAccountId)) return false;
    pair.guestAccountId = guestAccountId;
    return true;
  }
  inspect(code, hostAccountId) {
    this.prune();
    const pair = this.pending.get(code);
    return pair && pair.hostAccountId === hostAccountId ? {...pair} : null;
  }
  approve(code, hostAccountId, bind = () => true) {
    const pair = this.inspect(code, hostAccountId);
    if (!pair || !pair.guestAccountId) return null;
    const approved = {hostAccountId: pair.hostAccountId, guestAccountId: pair.guestAccountId, game: "connect-four"};
    // The synchronous binder must either commit the whole room binding or do nothing.
    // Consume before invoking it to prevent reentrant approval of the same code.
    this.pending.delete(code);
    try {
      if (bind(Object.freeze({...approved})) === true) return approved;
    } catch {
      // Do not expose internal exceptions or credentials to the caller.
    }
    // Fail closed: a rejected binding burns the invitation. Both users must re-pair.
    return null;
  }
  cancel(code, accountId) {
    this.prune();
    const pair = this.pending.get(code);
    if (!pair || !accountId || (pair.hostAccountId !== accountId && pair.guestAccountId !== accountId)) return false;
    return this.pending.delete(code);
  }
}
