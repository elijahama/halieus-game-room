import { useEffect, useRef, useState } from "react";
import type { ActiveMatch } from "../../../../shared/platform/active-match";
import { accountApi } from "../accounts/api";
import "./admin-feedback-notice.css";

export function ActiveMatchNotice({ accountId, onReturn }: {
  accountId: string;
  onReturn: (match: ActiveMatch) => Promise<string | null>;
}) {
  const [matches, setMatches] = useState<ActiveMatch[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (document.visibilityState === "hidden") { controller?.abort(); return; }
      if (controller) return;
      controller = new AbortController();
      try {
        const result = await accountApi<{ matches: ActiveMatch[] }>("/accounts/active-matches", { cache: "no-store", signal: controller.signal });
        if (!cancelled) setMatches(previous => JSON.stringify(previous) === JSON.stringify(result.matches) ? previous : result.matches);
      } catch { if (!cancelled) setMatches([]); }
      finally { controller = null; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 10_000);
    const trigger = () => void refresh();
    window.addEventListener("focus", trigger);
    window.addEventListener("online", trigger);
    document.addEventListener("visibilitychange", trigger);
    return () => {
      mounted.current = false;
      cancelled = true; controller?.abort(); clearInterval(timer);
      window.removeEventListener("focus", trigger);
      window.removeEventListener("online", trigger);
      document.removeEventListener("visibilitychange", trigger);
    };
  }, [accountId]);
  async function returnTo(match: ActiveMatch) {
    setBusy(true); setError("");
    try {
      const result = await accountApi<{ matches: ActiveMatch[] }>("/accounts/active-matches", { cache: "no-store" });
      if (!mounted.current) return;
      setMatches(result.matches);
      const live = result.matches.find(item => item.matchId === match.matchId);
      if (live) setError(await onReturn(live) ?? "");
    } catch { setMatches([]); }
    finally { setBusy(false); }
  }
  return <>{matches.map(match => <aside key={match.matchId} className="hgr-admin-feedback-notice" aria-label="Active Mega Board game">
    <div><strong>Mega Board · {match.code} · {match.paused ? "Paused" : "Game in progress"}</strong>
      <small>{match.paused ? "Moves and timers are frozen. Returning does not resume the game."
        : match.yourTurn ? "Your turn — Continue game to make your move."
        : "Your seat is still in this game."}</small>
      {match.notice && <small key={match.notice.id}>Latest public decision: {match.notice.title} — {match.notice.message}</small>}
      {error && <small role="status">{error}</small>}
    </div>
    <button type="button" className="button-outline" disabled={busy} onClick={() => void returnTo(match)}>Return to game</button>
  </aside>)}</>;
}
