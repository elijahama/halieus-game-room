import { useEffect, useState } from "react";
import type { HalieusGameFinishedNotice } from "../../../../shared/platform/game-activity";
import { socket } from "../network/sockets";

const STORAGE_KEY = "halieus-game-activity-v1";

function storeNotice(notice: HalieusGameFinishedNotice) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as HalieusGameFinishedNotice[];
    const next = [notice, ...existing.filter((item) => item.id !== notice.id)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("halieus:game-activity", { detail: next }));
  } catch {
    // Activity notices are convenience UI only; storage failure must never affect gameplay.
  }
}

function formatDuration(ms?: number): string | null {
  if (ms == null) return null;
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}h ${minutes}m ${seconds}s` : minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function GlobalGameActivity() {
  const [notice, setNotice] = useState<HalieusGameFinishedNotice | null>(null);

  useEffect(() => {
    let timer: number | null = null;
    const onFinished = (incoming: HalieusGameFinishedNotice) => {
      if (!incoming?.id || !incoming?.gameTitle || !incoming?.code) return;
      storeNotice(incoming);
      setNotice(incoming);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setNotice((current) => current?.id === incoming.id ? null : current), incoming.result ? 9000 : 6000);
    };
    socket.on("platform:game-finished", onFinished);
    return () => {
      socket.off("platform:game-finished", onFinished);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!notice) return null;
  const duration = formatDuration(notice.result?.durationMs);
  return (
    <aside className={`halieus-global-finish-notice ${notice.result ? "has-result-snapshot" : ""}`} role="status" aria-live="polite">
      <span aria-hidden="true">✓</span>
      <div className="halieus-global-finish-copy">
        <small>{notice.gameTitle} · Room {notice.code}</small>
        <strong>{notice.result?.headline ?? notice.message}</strong>
        {notice.result?.subtitle && <p>{notice.result.subtitle}{duration ? ` · ${duration}` : ""}</p>}
        {notice.result?.rows?.length ? (
          <div className="halieus-global-result-rows" aria-label={`${notice.gameTitle} final standings`}>
            {notice.result.rows.slice(0, 3).map((row) => <span key={`${row.rank}-${row.name}`}><b>#{row.rank}</b><strong>{row.name}</strong><em>{row.detail}</em></span>)}
          </div>
        ) : null}
      </div>
      <button type="button" aria-label="Dismiss game-finished notification" onClick={() => setNotice(null)}>×</button>
    </aside>
  );
}
