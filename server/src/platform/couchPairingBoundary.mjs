// Transport-independent security boundary. It is deliberately not registered on
// the live Socket.IO server until the room binder and history policy are ready.
// authenticate, eligible, getName and bind must be trusted, synchronous server
// callbacks. eligible must cover maintenance, Beta policy, account state and
// active-match conflicts. bind must atomically commit both seats or do nothing.
export function createCouchPairingBoundary({registry, authenticate, eligible, getName, bind, now = Date.now, windowMs = 60000, accountLimit = 20, sourceLimit = 80, maxBuckets = 4096}) {
  const buckets = new Map();
  const denied = () => ({ok:false, reason:"Pairing unavailable."});
  function allow(keys) {
    const time = now();
    for (const [key, value] of buckets) if (value.until <= time) buckets.delete(key);
    const fresh = keys.filter(([key]) => !buckets.has(key)).length;
    if (buckets.size + fresh > maxBuckets) return false;
    if (keys.some(([key, limit]) => (buckets.get(key)?.count ?? 0) >= limit)) return false;
    for (const [key] of keys) {
      const value = buckets.get(key);
      if (value) value.count++;
      else buckets.set(key, {count:1, until:time+windowMs});
    }
    return true;
  }
  return function handle(context, action, payload) {
    // Context must be constructed by the trusted server transport, never the client.
    const account = authenticate(context);
    if (!account || typeof account.id !== "string" || !account.id.trim() || account.beta || typeof context.source !== "string" || !context.source) return denied();
    if (!allow([[`account:${account.id}`,accountLimit],[`source:${context.source}`,sourceLimit]])) return denied();
    const accountId = account.id;
    const code = typeof payload?.code === "string" && payload.code.length <= 11
      ? payload.code.trim().toUpperCase().replace("-", "") : "";
    if (action === "cancel") return registry.cancel(code, accountId) ? {ok:true} : denied();
    if (!eligible(accountId)) return denied();
    if (action === "create") {
      if (payload?.game !== "connect-four" || payload?.matchMode !== "casual") return denied();
      const invitation = registry.create(accountId);
      return invitation ? {ok:true,...invitation} : denied();
    }
    if (!/^[0-9A-F]{10}$/.test(code)) return denied();
    if (action === "request") return registry.request(code, accountId) ? {ok:true,pending:true} : denied();
    if (action === "inspect") {
      const pair = registry.inspect(code, accountId);
      if (!pair) return denied();
      const guestName = pair.guestAccountId && eligible(pair.guestAccountId) ? getName(pair.guestAccountId) : null;
      return {ok:true,expiresAt:pair.expiresAt,guestName:guestName ?? null};
    }
    if (action === "approve") {
      const pair = registry.approve(code,accountId,approved =>
        eligible(approved.hostAccountId) && eligible(approved.guestAccountId) &&
        bind(context,approved) === true);
      return pair ? {ok:true,paired:true} : denied();
    }
    return denied();
  };
}
