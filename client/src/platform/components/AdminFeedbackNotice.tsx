import { useEffect, useState } from "react";
import { accountApi } from "../accounts/api";
import "./admin-feedback-notice.css";

type Summary = { count: number; firstId: string | null };
export function AdminFeedbackNotice({ accountId, onOpen }: { accountId: string; onOpen: (id: string) => void }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stale, setStale] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let running = false;
    setSummary(null); setStale(false);
    const refresh = async () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      try {
        const result = await accountApi<Summary>("/admin/feedback/notifications", { cache: "no-store" });
        if (!cancelled) { setSummary(result); setStale(false); }
      } catch { if (!cancelled) setStale(true); }
      finally { running = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    const onRefresh = () => void refresh();
    window.addEventListener("focus", onRefresh);
    window.addEventListener("hgr:feedback-updated", onRefresh);
    document.addEventListener("visibilitychange", onRefresh);
    return () => {
      cancelled = true; clearInterval(timer);
      window.removeEventListener("focus", onRefresh);
      window.removeEventListener("hgr:feedback-updated", onRefresh);
      document.removeEventListener("visibilitychange", onRefresh);
    };
  }, [accountId]);
  if (!summary?.count || !summary.firstId) return null;
  return <aside className="hgr-admin-feedback-notice" aria-label="Admin feedback notification">
    <div role="status" aria-live="polite"><strong>{summary.count} feedback {summary.count === 1 ? "item needs" : "items need"} a response</strong>
      <small>{stale ? "Could not refresh. This count may be out of date." : "Open or reviewing feedback is waiting in your admin inbox."}</small></div>
    <button type="button" className="button-outline" onClick={() => onOpen(summary.firstId!)}>Review feedback</button>
  </aside>;
}
