/**
 * Share one authoritative in-flight calculation per account, without serialising
 * unrelated users behind a single global Gamer Score archive rebuild.
 * Do not cache completed results: a completed match must be visible on refresh.
 */
export function perAccountSingleFlight<V>(
  rebuild: (accountId: string) => Promise<V>,
): (accountId: string) => Promise<V> {
  const inFlight = new Map<string, Promise<V>>();
  return (accountId) => {
    const existing = inFlight.get(accountId);
    if (existing) return existing;
    const task = Promise.resolve().then(() => rebuild(accountId));
    inFlight.set(accountId, task);
    const clear = () => {
      if (inFlight.get(accountId) === task) inFlight.delete(accountId);
    };
    void task.then(clear, clear);
    return task;
  };
}
