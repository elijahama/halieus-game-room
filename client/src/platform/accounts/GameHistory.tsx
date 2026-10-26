import { useEffect, useRef, useState } from "react";
import { accountApi } from "./api";
import { MegaReplayViewer } from "../../games/mega-board/components/MegaReplayViewer";
import type { HgrGameReplayArchive } from "../../../../shared/platform/game-replay";
import type { GameActivityEntry } from "../../../../shared/games/mega-board/game-state";
import "./game-history.css";

type Match = { id: string; gameId: string; finishedAt: number; players: HgrGameReplayArchive["players"]; truncated: boolean };
const MAX_REPORT_BYTES = 1024 * 1024;
export function GameHistory() {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ id: string; archive: HgrGameReplayArchive } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [report, setReport] = useState("");
  const requestId = useRef(0);
  useEffect(() => () => { requestId.current++; }, []);
  async function load(offset = 0) {
    const ticket = ++requestId.current;
    setBusy(true); setError("");
    try {
      const result = await accountApi<{ matches: Match[]; nextOffset: number | null }>(`/game-history?offset=${offset}`);
      if (ticket !== requestId.current) return;
      setMatches(previous => offset ? [...previous, ...result.matches] : result.matches);
      setNextOffset(result.nextOffset);
    } catch (err) { if (ticket === requestId.current) setError(err instanceof Error ? err.message : "History unavailable."); }
    finally { if (ticket === requestId.current) setBusy(false); }
  }
  async function select(id: string) {
    const ticket = ++requestId.current;
    setBusy(true); setError(""); setSelected(null); setReport("");
    try {
      const result = await accountApi<{ archive: HgrGameReplayArchive }>(`/game-history/${id}`);
      if (ticket === requestId.current) setSelected({ id, archive: result.archive });
    } catch (err) { if (ticket === requestId.current) setError(err instanceof Error ? err.message : "Replay unavailable."); }
    finally { if (ticket === requestId.current) setBusy(false); }
  }
  async function download(format: "json" | "text") {
    if (!selected) return;
    setError("");
    try {
      const base = import.meta.env.VITE_SERVER_URL?.trim() || "";
      const response = await fetch(`${base}/game-history/${selected.id}?format=${format}`, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Download unavailable. Check that you are still signed in.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `hgr-${selected.id}.${format === "text" ? "txt" : "json"}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : "Download failed."); }
  }
  function review(text: string) {
    if (!text.trim()) { setError("Paste a report or choose a text file first."); return; }
    if (new Blob([text]).size > MAX_REPORT_BYTES || text.includes("\0")) { setError("Choose a plain-text report up to 1 MB."); return; }
    requestId.current++; setBusy(false); setError(""); setSelected(null); setReport(text);
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!/\.txt$/i.test(file.name) || file.size > MAX_REPORT_BYTES) { setError("Choose a .txt report up to 1 MB."); return; }
    try { const text = await file.text(); setDraft(text); review(text); }
    catch { setError("That file could not be read."); }
  }
  const archive = selected?.archive;
  const activity: GameActivityEntry[] = archive?.events.map(event => ({
    id: `event-${event.sequence}`, at: event.at, turnNumber: event.turn ?? 0,
    kind: event.category as GameActivityEntry["kind"], message: event.description,
    ...(event.actorId ? { playerId: event.actorId } : {}),
  })) ?? [];
  return <section className="hgr-game-history">
    <button type="button" className="button-outline" aria-expanded={open} onClick={() => {
      setOpen(!open); if (!open) void load();
    }}>Game History {open ? "−" : "+"}</button>
    {open && <div className="hgr-history-content">
      <h3>Completed matches</h3>
      <p>Recorded Mega Board matches appear here. Other games are being added separately.</p>
      <button type="button" disabled={busy} onClick={() => void load()}>Refresh history</button>
      {busy && <p role="status">Loading…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !matches.length && <p>No recorded matches yet. Only matches recorded after this feature is installed are available.</p>}
      <ul className="hgr-history-matches">{matches.map(match => <li key={match.id}>
        <button type="button" disabled={busy} onClick={() => void select(match.id)}>
          <strong>{match.gameId === "mega-board" ? "Mega Board" : match.gameId}</strong>
          <span>{new Date(match.finishedAt).toLocaleString()}</span>
          <span>{match.players.map(player => player.name).join(", ")}</span>
          {match.truncated && <small>Partial checkpoint replay</small>}
        </button>
      </li>)}</ul>
      {nextOffset !== null && <button disabled={busy} type="button" onClick={() => void load(nextOffset)}>Load more matches</button>}
      {archive && <section aria-label="Recorded match review">
        <h3>Match report</h3>
        <p>{archive.players.map(player => `${player.name}: ${player.result ?? "Finished"}`).join(" · ")}</p>
        <p>{archive.events.length} recorded actions · {archive.track.frames.length} checkpoints · {Math.max(0, Math.round((archive.finishedAt - archive.startedAt) / 60000))} minutes</p>
        <p role="note">{archive.track.truncated ? "Partial replay: earlier checkpoints are no longer retained." : "Shows retained checkpoints and recorded events; this is not a full deterministic game recording."}</p>
        <div className="hgr-history-actions">
          <button type="button" onClick={() => void download("json")}>Download JSON</button>
          <button type="button" onClick={() => void download("text")}>Download text</button>
        </div>
        {archive.track.kind === "mega-board-checkpoints"
          ? <MegaReplayViewer key={selected!.id} frames={archive.track.frames} activity={activity} roomCode={archive.roomCode} />
          : <ol>{archive.events.map(event => <li key={event.sequence}>{event.description}</li>)}</ol>}
      </section>}
      <details className="hgr-history-import"><summary>Paste or upload a game report</summary>
        <p>Review a text report from any game. Imported reports stay in this browser view and do not change verified history or ratings. Text alone cannot recreate visual checkpoints.</p>
        <label>Paste report<textarea value={draft} maxLength={MAX_REPORT_BYTES} onChange={event => setDraft(event.target.value)} rows={8} /></label>
        <div className="hgr-history-actions"><button type="button" onClick={() => review(draft)}>Review pasted report</button>
          <label>Upload .txt report<input type="file" accept=".txt,text/plain" onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
        </div>
      </details>
      {report && <section aria-label="Imported report"><h3>Imported report — unverified</h3><pre>{report}</pre><button type="button" onClick={() => { setReport(""); setDraft(""); }}>Clear imported report</button></section>}
    </div>}
  </section>;
}
