/**
 * Server-verified Gamer Score and cosmetic entitlement views refresh together.
 * A game-finished socket notice can arrive slightly before the durable archive
 * commits, so perform a bounded sequence of read-only follow-up checks.
 * No client-side awards are granted and no secret game data is requested.
 */
export const PROGRESSION_RETRY_DELAYS_MS = [400, 1500, 4000, 8000] as const;

export function subscribeToProgressionUpdates(refresh: () => void): () => void {
  const scheduled = new Map<number, number>();
  let active = true;
  const schedule = (delay: number) => {
    const old = scheduled.get(delay);
    if (old !== undefined) window.clearTimeout(old);
    const timer = window.setTimeout(() => {
      scheduled.delete(delay);
      if (active) refresh();
    }, delay);
    scheduled.set(delay, timer);
  };
  const onFinished = () => PROGRESSION_RETRY_DELAYS_MS.forEach(schedule);
  const onFocus = () => schedule(0);
  const onVisible = () => { if (document.visibilityState === "visible") schedule(0); };
  window.addEventListener("halieus:game-activity", onFinished);
  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    active = false;
    for (const timer of scheduled.values()) window.clearTimeout(timer);
    scheduled.clear();
    window.removeEventListener("halieus:game-activity", onFinished);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
