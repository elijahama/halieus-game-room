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
  const [fetchStatus, setFetchStatus] = useState<"loading" | "ready" | "error">("loading");
  const requestedMatch = new URLSearchParams(window.location.search).get("resumeMatch");
  const targetMatch = requestedMatch && /^mega-[A-Z0-9]{4,12}-[0-9]{10,16}$/.test(requestedMatch)
    ? requestedMatch : null;
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
        if (!cancelled) {
          setMatches(previous => JSON.stringify(previous) === JSON.stringify(result.matches) ? previous : result.matches);
          setFetchStatus("ready");
        }
      } catch { if (!cancelled) { setMatches([]); setFetchStatus("error"); } }
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
      setFetchStatus("ready");
      const live = result.matches.find(item => item.matchId === match.matchId);
      if (live) setError(await onReturn(live) ?? "");
    } catch { setMatches([]); setFetchStatus("error"); }
    finally { setBusy(false); }
  }
  const orderedMatches = targetMatch
    ? [...matches].sort((a, b) => Number(b.matchId === targetMatch) - Number(a.matchId === targetMatch))
    : matches;
  return <>
    {targetMatch && fetchStatus === "ready" && !matches.some(item => item.matchId === targetMatch) &&
      <aside className="hgr-admin-feedback-notice" role="status">
        <div><strong>Live match unavailable</strong>
          <small>This match is no longer available for this account. It may have finished or expired.</small>
        </div>
      </aside>}
    {targetMatch && fetchStatus === "error" &&
      <aside className="hgr-admin-feedback-notice" role="status">
        <div><strong>Could not check your match</strong>
          <small>Check your connection and reopen HGR to refresh your live games.</small>
        </div>
      </aside>}
    {orderedMatches.map(match => <aside key={match.matchId} className="hgr-admin-feedback-notice" aria-label="Active Mega Board game">
    <div><strong>Mega Board · {match.code} · {match.paused ? "Paused" : "Game in progress"}</strong>
      <small>{match.paused ? "Moves and timers are frozen. Returning does not resume the game."
        : match.yourTurn ? "Your turn — Continue game to make your move."
        : "Your seat is still in this game."}</small>
      {match.notice && <small key={match.notice.id}>Latest public decision: {match.notice.title} — {match.notice.message}</small>}
      {error && <small role="status">{error}</small>}
    </div>
    <button type="button" className="button-outline" disabled={busy} onClick={() => void returnTo(match)}>{targetMatch === match.matchId ? "Continue game" : "Return to game"}</button>
  </aside>)}</>;
}
