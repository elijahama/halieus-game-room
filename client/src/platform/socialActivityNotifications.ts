import { useCallback, useEffect, useState } from "react";
import type { HgrSocialActivityEntry, HgrSocialActivitySnapshot } from "../../../shared/platform/social-activity";
import { accountApi } from "./accounts/api";
import { deriveSocialActivityNotices, type HgrSocialActivityNotice } from "./socialActivityTransitions";

type SavedSocialActivity = {
  updatedAt: number;
  snapshot: HgrSocialActivityEntry[];
  items: HgrSocialActivityNotice[];
};
const PREFIX = "halieus-social-activity-v1:";
const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000;
const MAX_NOTICES = 40;
const POLL_MS = 10_000;

function load(accountId: string): SavedSocialActivity {
  try {
    const value = JSON.parse(localStorage.getItem(PREFIX + accountId) ?? "{}");
    return {
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
      snapshot: Array.isArray(value.snapshot) ? value.snapshot.slice(0, 300) : [],
      items: Array.isArray(value.items) ? value.items.filter((item: HgrSocialActivityNotice) =>
        item && typeof item.id === "string" && typeof item.title === "string").slice(0, MAX_NOTICES) : [],
    };
  } catch {
    return { updatedAt: 0, snapshot: [], items: [] };
  }
}
function store(accountId: string, value: SavedSocialActivity) {
  try { localStorage.setItem(PREFIX + accountId, JSON.stringify(value)); }
  catch { /* Browsers may disable local storage; an open session still works. */ }
}

export function useSocialActivityNotifications(accountId: string | null) {
  const [items, setItems] = useState<HgrSocialActivityNotice[]>([]);
  const [active, setActive] = useState<HgrSocialActivityEntry[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!accountId) {
      setItems([]); setActive([]); setError("");
      return;
    }
    const saved = load(accountId);
    setItems(saved.items);
    setActive(saved.snapshot);
    let previous: HgrSocialActivityEntry[] | null =
      Date.now() - saved.updatedAt < SNAPSHOT_MAX_AGE_MS ? saved.snapshot : null;
    let running = true, loading = false;
    const refresh = async () => {
      if (!running || loading || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const result = await accountApi<HgrSocialActivitySnapshot>("/accounts/social/activity");
        if (!running) return;
        const now = Date.now();
        const newItems = deriveSocialActivityNotices(previous, result.entries, now);
        previous = result.entries;
        setActive(result.entries);
        setItems((current) => {
          const next = [...newItems, ...current].slice(0, MAX_NOTICES);
          store(accountId, { updatedAt: now, snapshot: result.entries, items: next });
          return next;
        });
        setError("");
      } catch {
        if (running) setError("Friend activity could not refresh. Previously received notices are preserved.");
      } finally {
        loading = false;
      }
    };
    const onResume = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    void refresh();
    return () => {
      running = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
    };
  }, [accountId]);

  const updateItems = useCallback((change: (current: HgrSocialActivityNotice[]) => HgrSocialActivityNotice[]) => {
    if (!accountId) return;
    setItems((current) => {
      const next = change(current);
      const existing = load(accountId);
      store(accountId, { ...existing, items: next });
      return next;
    });
  }, [accountId]);

  const markRead = useCallback(() => updateItems((current) =>
    current.map((item) => item.read ? item : { ...item, read: true })), [updateItems]);
  const clear = useCallback(() => updateItems(() => []), [updateItems]);
  return {
    items, active, error,
    unreadCount: items.filter((item) => !item.read).length,
    markRead, clear,
  };
}
