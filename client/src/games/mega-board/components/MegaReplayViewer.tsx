import { useEffect, useMemo, useState } from "react";
import type { GameActivityEntry } from "../../../../../shared/games/mega-board/game-state";
import type { MegaReplayFrame } from "../../../../../shared/games/mega-board/replay";
import { BOARD_SPACES, getBoardSpace } from "../../../../../shared/games/mega-board/board";
import { buildMegaMoveTranscript, formatMegaMoveRows } from "../utils/moveNotation";

interface ReplayViewerProps {
  frames: MegaReplayFrame[];
  activity: GameActivityEntry[];
  roomCode: string;
}

export function MegaReplayViewer({ frames, activity, roomCode }: ReplayViewerProps) {
  const [index, setIndex] = useState(() => Math.max(0, frames.length - 1));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [copyStatus, setCopyStatus] = useState("");
  const [showAllMoves, setShowAllMoves] = useState(false);
  const rows = useMemo(() => formatMegaMoveRows(activity, frames.at(-1)?.players ?? []), [activity, frames]);
  const visibleRows = showAllMoves ? rows : rows.slice(-200);
  const frameIndexByActivityId = useMemo(() => {
    const ids = new Map<string, number>();
    for (let position = 0; position < frames.length; position += 1) {
      const activityId = frames[position].lastActivityId;
      if (activityId) ids.set(activityId, position);
    }
    return ids;
  }, [frames]);
  const availableIndex = Math.min(index, Math.max(0, frames.length - 1));
  const frame = frames[availableIndex];

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const ticker = window.setInterval(() => {
      setIndex(current => {
        if (current >= frames.length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 1100 / speed);
    return () => window.clearInterval(ticker);
  }, [playing, frames.length, speed]);

  // Activity entries and replay frames share a server activity ID. Only offer
  // navigation for an exact retained checkpoint; older actions remain copyable.
  const frameForMove = (entry: GameActivityEntry): number =>
    frameIndexByActivityId.get(entry.id) ?? -1;

  const selectMove = (entry: GameActivityEntry) => {
    const target = frameForMove(entry);
    if (target < 0) return;
    setPlaying(false);
    setIndex(target);
  };

  const transcript = () =>
    buildMegaMoveTranscript(roomCode, activity, frames.at(-1)?.players ?? []);

  const copyMoves = async () => {
    try {
      await navigator.clipboard.writeText(transcript());
      setCopyStatus("Move list copied. Paste it into a message or document.");
    } catch {
      setCopyStatus("Clipboard unavailable. Use Download moves to share a text file.");
    }
  };

  const downloadMoves = () => {
    const blob = new Blob(["\uFEFF", transcript()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mega-board-${roomCode}-moves.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="mega-replay-viewer" aria-label="Read-only Mega Board replay and move notation">
    <div className="mega-replay-heading">
      <strong>Move-by-move record</strong>
      <small>{rows.length} recorded actions · {frames.length} replay checkpoints</small>
    </div>
    <div className="mega-replay-controls">
      <button type="button" disabled={!rows.length} onClick={() => void copyMoves()}>Copy move list</button>
      <button type="button" disabled={!rows.length} onClick={downloadMoves}>Download moves .txt</button>
    </div>
    {copyStatus && <p role="status">{copyStatus}</p>}
    <ol className="mega-replay-move-list" aria-label="Recorded moves and actions">
      {rows.length === 0 && <li>No actions have been recorded yet.</li>}
      {visibleRows.map(row => {
        const activityEntry = activity[row.number - 1];
        const matchingFrame = activityEntry ? frameForMove(activityEntry) : -1;
        const selected = matchingFrame === availableIndex && matchingFrame >= 0;
        return <li key={row.id}>
          <button type="button" disabled={matchingFrame < 0} aria-current={selected ? "step" : undefined}
            title={matchingFrame < 0 ? "Not available in the retained replay checkpoints" : "Jump to recorded board checkpoint"}
            onClick={() => activityEntry && selectMove(activityEntry)}>
            <span className="mega-move-number">{String(row.number).padStart(3, "0")}.</span>
            <span className="mega-move-kind">T{row.turn} · {row.kind.toUpperCase()}</span>
            <span>{row.actor}: {row.description}</span>
          </button>
        </li>;
      })}
    </ol>
    {rows.length > 200 && (
      <button type="button" className="mega-replay-show-all" onClick={() => setShowAllMoves(value => !value)}>
        {showAllMoves ? "Show latest 200 moves" : `Show all ${rows.length} recorded moves`}
      </button>
    )}
    {frame ? <>
      <div className="mega-replay-heading">
        <strong>Turn {frame.turn} · {frame.players.find(player => player.id === frame.activePlayerId)?.name ?? "Match"} · {frame.phase.replaceAll("-", " ")}</strong>
        <small>{new Date(frame.at).toLocaleString("en-GB")}</small>
      </div>
      <div className="mega-replay-board" aria-label="Recorded board positions">
        {BOARD_SPACES.map((space, n) => {
          const occupants = frame.players.filter(player => player.position === space.id && !player.bankrupt);
          const owner = frame.players.find(player => player.id === frame.propertyOwners[space.id]);
          return <div key={space.id} className="mega-replay-space"
            style={{ borderTop: owner ? "3px solid " + owner.colour : undefined }}
            title={space.name + (owner ? ` · owned by ${owner.name}` : "")}>
            <span>{n + 1}</span>
            <small>{space.name}</small>
            <div className="mega-replay-tokens">
              {occupants.map(player => <b key={player.id} title={player.name} style={{ background: player.colour }} />)}
            </div>
          </div>;
        })}
      </div>
      <div className="mega-replay-player-summary">
        {frame.players.map(player => <span key={player.id}>
          <b style={{ color: player.colour }}>{player.name}</b> · {getBoardSpace(player.position)?.name ?? "Unknown space"} · £{player.cash.toLocaleString("en-GB")} · {player.owned.length} assets{player.bankrupt ? " · Out" : ""}
        </span>)}
      </div>
      <p className="mega-replay-event">{frame.label}</p>
      <div className="mega-replay-controls">
        <button type="button" onClick={() => { setPlaying(false); setIndex(0); }}>First</button>
        <button type="button" onClick={() => { setPlaying(false); setIndex(i => Math.max(0, i - 1)); }}>Previous</button>
        <button type="button" onClick={() => { if (availableIndex >= frames.length - 1) setIndex(0); setPlaying(x => !x); }} aria-pressed={playing}>{playing ? "Pause" : "Play"}</button>
        <button type="button" onClick={() => { setPlaying(false); setIndex(i => Math.min(frames.length - 1, i + 1)); }}>Next</button>
        <button type="button" onClick={() => { setPlaying(false); setIndex(frames.length - 1); }}>Last</button>
        <select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}>
          <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
        </select>
      </div>
      <input type="range" min={0} max={Math.max(0, frames.length - 1)} step={1} value={availableIndex}
        aria-label="Replay checkpoint" onChange={event => { setPlaying(false); setIndex(Number(event.target.value)); }}/>
      <small>Checkpoint {availableIndex + 1} of {frames.length}. Recent server-confirmed board states only; playback never changes the live match.</small>
    </> : <p role="status">Replay checkpoints begin with future server-confirmed game actions. Older matches have a move list only.</p>}
  </div>;
}
