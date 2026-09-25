import { SKIN_CATALOG } from "./skins";

const KEY = "halieus-mega-board-match-appearance-v1";
const snapshots = new Map<string, string>();

/** Personal cosmetics only: no shared board or gameplay mutation.
 * Freeze each match on this browser, including refresh/recovery/parked rooms.
 * Preferences changed elsewhere apply to the next match.
 */
export function matchBoardAppearance(match: string | null, equipped: string): string {
  if (!match) return equipped;
  if (snapshots.has(match)) return snapshots.get(match)!;
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {}; } catch { /* Storage is optional. */ }
  const selected = SKIN_CATALOG.some(skin => skin.slot === "mega-board" && skin.id === saved[match]) ? saved[match] : equipped;
  snapshots.set(match, selected);
  if (snapshots.size > 20) snapshots.delete(snapshots.keys().next().value!);
  try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries([...Object.entries(saved).slice(-19), [match, selected]]))); } catch { /* In-memory lock still applies. */ }
  return selected;
}
