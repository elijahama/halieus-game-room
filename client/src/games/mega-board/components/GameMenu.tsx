import { ModalPortal } from "../../../platform/components/ModalPortal";
import { ConfirmDialog } from "../../../platform/components/ConfirmDialog";
import {
  type FormEvent,
  useEffect,
  useState,
} from "react";

import { DisplaySettingsPanel } from "../../../platform/components/DisplaySettingsPanel";
import { accountApi } from "../../../platform/accounts/api";
import { TURN_TIMER_PRESET_SECONDS } from "../../../../../shared/games/mega-board/game-rules";
import type { MegaReplayFrame } from "../../../../../shared/games/mega-board/replay";
import type { GameActivityEntry } from "../../../../../shared/games/mega-board/game-state";
import { MegaReplayViewer } from "./MegaReplayViewer";
import { socket } from "../../../platform/network/sockets";

interface GameMenuProps {
  open: boolean;
  isHost: boolean;
  gameStarted: boolean;
  roomCode: string;
  recoveryKey: string | null;
  playerName: string;
  isSpectator?: boolean;
  darkMode: boolean;
  soundEnabled: boolean;
  turnTimerSeconds?: number;
  pausedAt?: number | null;
  isUpdatingTurnTimer?: boolean;
  onToggleDarkMode: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onTurnTimerChange?: (seconds: number) => void;
  onClose: () => void;
  onLeave: () => void;
  onForfeit?: () => void;
  onOpenHistory?: () => void;
  onExportReport?: () => void;
  onCopyReport?: () => Promise<void>;
  onEndRoom: () => void;
  replayFrames?: MegaReplayFrame[];
  replayActivities?: GameActivityEntry[];
}

type MenuView =
  | "menu"
  | "leave"
  | "forfeit"
  | "end"
  | "feedback"
  | "saves"
  | "replay";

const FEEDBACK_CATEGORIES = [
  "Bug",
  "UI / layout",
  "Gameplay / rules",
  "Connection / rejoin",
  "Suggestion",
  "Other",
] as const;

export function GameMenu({
  open,
  isHost,
  gameStarted,
  roomCode,
  recoveryKey,
  playerName,
  isSpectator = false,
  darkMode,
  soundEnabled,
  turnTimerSeconds,
  pausedAt = null,
  isUpdatingTurnTimer = false,
  onToggleDarkMode,
  onToggleSound,
  onToggleFullscreen,
  onTurnTimerChange,
  onClose,
  onLeave,
  onForfeit,
  onOpenHistory,
  onExportReport,
  onCopyReport,
  onEndRoom,
  replayFrames = [],
  replayActivities = [],
}: GameMenuProps) {
  const [view, setView] =
    useState<MenuView>("menu");
  const [copied, setCopied] =
    useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [copyReportStatus, setCopyReportStatus] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [pauseStatus, setPauseStatus] = useState("");
  const [pauseBusy, setPauseBusy] = useState(false);
  const [saveSlots, setSaveSlots] = useState<Array<{slot:string;at:number;turn:number;players:number}>>([]);
  const [
    feedbackCategory,
    setFeedbackCategory,
  ] = useState(
    FEEDBACK_CATEGORIES[0],
  );
  const [
    feedbackDetails,
    setFeedbackDetails,
  ] = useState("");
  const [
    feedbackStatus,
    setFeedbackStatus,
  ] = useState("");
  const [
    feedbackSending,
    setFeedbackSending,
  ] = useState(false);

  useEffect(() => {
    if (!open) {
      setView("menu");
      setCopied(false);
      setFeedbackStatus("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        if (view !== "menu") {
          setView("menu");
          return;
        }

        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, onClose, view]);

  if (!open) return null;

  type SaveReply = { ok: boolean; reason?: string; saved?: {slot:string;at:number;turn:number;players:number}; saves?: Array<{slot:string;at:number;turn:number;players:number}> };
  const openSaves = () => {
    setSaveStatus("Checking saved games…");
    setView("saves");
    socket.timeout(9000).emit("game:saves-list", { code: roomCode }, (error: Error | null, reply: SaveReply) => {
      if (error || !reply?.ok) return setSaveStatus(reply?.reason ?? "Could not read saved games.");
      setSaveSlots(reply.saves ?? []);
      setSaveStatus("");
    });
  };
  const saveAction = (action: "game:save-slot" | "game:restore-slot", slot: string) => {
    setSaveBusy(true);
    setSaveStatus(action === "game:save-slot" ? "Saving server checkpoint…" : "Restoring server checkpoint…");
    socket.timeout(12000).emit(action, { code: roomCode, slot }, (error: Error | null, reply: SaveReply) => {
      setSaveBusy(false);
      if (error || !reply?.ok) return setSaveStatus(reply?.reason ?? "The saved game operation failed.");
      if (action === "game:restore-slot") { setSaveStatus("Checkpoint restored for this room."); return; }
      setSaveSlots(items => [...items.filter(item => item.slot !== slot), reply.saved!]);
      setSaveStatus("Saved on the game server.");
    });
  };

  const toggleRoomPause = () => {
    const action = pausedAt ? "game:resume-room" : "game:pause-room";
    setPauseBusy(true);
    setPauseStatus(pausedAt ? "Resuming server timers…" : "Pausing server timers…");
    socket.timeout(12000).emit(action, { code: roomCode }, (error: Error | null, reply: { ok: boolean; reason?: string }) => {
      setPauseBusy(false);
      setPauseStatus(error || !reply?.ok ? (reply?.reason ?? "The pause request failed.") : pausedAt ? "Match resumed." : "Match paused. Players may reconnect before resuming.");
    });
  };

  const copyRecoveryKey = async () => {
    if (!recoveryKey) return;

    try {
      await navigator.clipboard.writeText(
        recoveryKey,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const submitFeedback = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const details =
      feedbackDetails.trim();

    if (details.length < 4) {
      setFeedbackStatus(
        "Add a little more detail first.",
      );
      return;
    }

    setFeedbackSending(true);
    setFeedbackStatus(
      "Sending feedback…",
    );

    try {
      await accountApi("/feedback", {
        method: "POST",
        body: JSON.stringify({
          source: "game",
          category: feedbackCategory,
          details,
          gameId: "mega-board",
          gameName: "Mega Board",
          roomCode,
          playerName: playerName.trim() || "Unknown player",
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      setFeedbackDetails("");
      setFeedbackStatus(
        "Feedback saved. You can follow replies from your profile.",
      );
    } catch {
      setFeedbackStatus(
        "Could not save feedback. Try again.",
      );
    } finally {
      setFeedbackSending(false);
    }
  };

  if (view === "leave" || view === "forfeit" || view === "end") return <ConfirmDialog open title={view === "end" ? "End this game?" : view === "forfeit" ? "Forfeit this match?" : "Leave this room?"} message={view === "end" ? "This closes the saved room for every player." : view === "forfeit" ? "Your player is eliminated. The match continues for everyone else and you remain as a spectator." : "You can join another lobby after leaving."} destructive confirmLabel={view === "end" ? "End game" : view === "forfeit" ? "Forfeit match" : "Leave"} onCancel={() => setView("menu")} onConfirm={() => { const action = view === "end" ? onEndRoom : view === "forfeit" ? onForfeit : onLeave; action?.(); }} />;
  return (
    <ModalPortal onClose={onClose}><div
      className="modal-backdrop game-menu-top-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="game-menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-menu-title"
      >
        <div className="modal-handle" />

        {view === "saves" && (
          <section className="mega-saves-view">
            <header className="modal-heading-row"><div><p className="modal-eyebrow">Mega Board · Server saves</p><h2>Saved Games</h2></div><button className="icon-button" type="button" onClick={() => setView("menu")}>×</button></header>
            <p>Three private server save slots. Save between decisions; this does not pause a live match. Only the host can restore, only in an unranked human-only room with all other players disconnected.</p>
            <div className="mega-saves-slots">
              {["slot-1","slot-2","slot-3"].map(slot => {
                const saved = saveSlots.find(entry => entry.slot === slot);
                return <div key={slot} className="mega-save-slot">
                  <div><strong>Save {slot.slice(-1)}</strong><small>{saved ? `Turn ${saved.turn} · ${new Date(saved.at).toLocaleString("en-GB")}` : "Empty"}</small></div>
                  <button type="button" disabled={saveBusy} onClick={() => saveAction("game:save-slot", slot)}>{saved ? "Overwrite" : "Save"}</button>
                  {saved && <button type="button" disabled={saveBusy} onClick={() => { if (window.confirm("Restore this older checkpoint? Only use when other players have disconnected. This overwrites the current board progress.")) saveAction("game:restore-slot", slot); }}>Restore</button>}
                </div>;
              })}
            </div>
            {saveStatus && <p role="status">{saveStatus}</p>}
            <button className="menu-action" type="button" onClick={() => setView("menu")}>Back to game menu</button>
          </section>
        )}
        {view === "replay" && (
          <section className="mega-replay-view">
            <header className="modal-heading-row"><div><p className="modal-eyebrow">Mega Board · Read-only</p><h2>Recent Replay</h2></div><button className="icon-button" type="button" onClick={() => setView("menu")}>×</button></header>
            <MegaReplayViewer frames={replayFrames} activity={replayActivities} roomCode={roomCode}/>
            <button className="menu-action" type="button" onClick={() => setView("menu")}>Back to game menu</button>
          </section>
        )}
        {view === "menu" && (
          <>
            <header className="modal-heading-row">
              <div>
                <p className="modal-eyebrow">
                  Room {roomCode}
                </p>
                <h2 id="game-menu-title">
                  Game menu
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Close game menu"
                onClick={onClose}
              >
                ×
              </button>
            </header>

            <button
              type="button"
              className="menu-action menu-action-primary"
              onClick={onClose}
            >
              <span>▶</span>
              <span>
                <strong>{pausedAt ? "View paused board" : "Resume game"}</strong>
                <small>
                  {pausedAt ? "This closes the menu; the game remains paused" : "Return to the board"}
                </small>
              </span>
            </button>

            {/* Secondary display controls live inside the menu so the persistent game bar stays uncluttered. */}
            <DisplaySettingsPanel
              darkMode={darkMode}
              soundEnabled={soundEnabled}
              onToggleDarkMode={onToggleDarkMode}
              onToggleSound={onToggleSound}
              onToggleFullscreen={onToggleFullscreen}
            />

            {gameStarted && turnTimerSeconds != null && (
              <div className="turn-timer-settings-panel">
                <div>
                  <strong>⏱ Turn timer settings</strong>
                  <small>Locked for this match. The host sets this in the waiting room.</small>
                </div>
                <span className="turn-timer-settings-value">
                  {turnTimerSeconds < 60 ? `${turnTimerSeconds} sec` : `${Math.floor(turnTimerSeconds / 60)}:${String(turnTimerSeconds % 60).padStart(2, "0")}`}
                </span>
              </div>
            )}

            {gameStarted && pausedAt != null && (
              <p role="status" className="mega-pause-indicator">⏸ Match paused since {new Date(pausedAt).toLocaleTimeString("en-GB")}. Game actions are locked until the host resumes.</p>
            )}
            {gameStarted && !isSpectator && isHost && (
              <>
                <button type="button" disabled={pauseBusy} className="menu-action" onClick={toggleRoomPause}>
                  <span>{pausedAt ? "▶" : "⏸"}</span><span><strong>{pausedAt ? "Resume match" : "Pause match"}</strong><small>{pausedAt ? "Requires every active player to reconnect first" : "Unranked human-only pilot · other seats must be offline"}</small></span>
                </button>
                {pauseStatus && <p role="status">{pauseStatus}</p>}
              </>
            )}
            {gameStarted && !isSpectator && isHost && !pausedAt && (
              <button type="button" className="menu-action" onClick={openSaves}>
                <span>💾</span><span><strong>Saved Games</strong><small>Three private server checkpoints · host controls</small></span>
              </button>
            )}
            {gameStarted && (
              <button type="button" className="menu-action" onClick={() => setView("replay")}>
                <span>⏪</span><span><strong>Recent Replay</strong><small>Review recorded board states without changing the game</small></span>
              </button>
            )}
            {gameStarted && onOpenHistory && (
              <button
                type="button"
                className="menu-action"
                onClick={onOpenHistory}
              >
                <span>🕘</span>
                <span>
                  <strong>Match History</strong>
                  <small>Review completed rolls, purchases and major events</small>
                </span>
              </button>
            )}

            {gameStarted && onCopyReport && (
              <button type="button" className="menu-action" onClick={() => {
                void onCopyReport().then(() =>
                  setCopyReportStatus("Match report copied. Paste it into a message or document.")
                ).catch(() => setCopyReportStatus("Clipboard unavailable. Use Export Match Report instead."));
              }}>
                <span>📋</span>
                <span><strong>Copy Match Report</strong><small>Copy the complete report, including numbered moves</small></span>
              </button>
            )}
            {copyReportStatus && <p role="status">{copyReportStatus}</p>}
            {gameStarted && onExportReport && (
              <button
                type="button"
                className="menu-action"
                onClick={onExportReport}
              >
                <span>📄</span>
                <span>
                  <strong>Export Match Report</strong>
                  <small>Download a diagnostic text report for analysis</small>
                </span>
              </button>
            )}

            <button
              type="button"
              className="menu-action menu-action-feedback"
              onClick={() =>
                setView("feedback")
              }
            >
              <span>💬</span>
              <span>
                <strong>
                  Send feedback
                </strong>
                <small>
                  Report a bug, layout issue
                  or suggestion
                </small>
              </span>
            </button>

            {recoveryKey && (
              <div className="recovery-key-panel">
                <div>
                  <span>Recovery key</span>
                  <strong>{recoveryKey}</strong>
                </div>
                <button
                  type="button"
                  onClick={copyRecoveryKey}
                >
                  {copied
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>
            )}

            {gameStarted && !isSpectator && onForfeit && (
              <button
                type="button"
                className="menu-action menu-action-danger"
                onClick={() =>
                  setView("forfeit")
                }
              >
                <span>🏳</span>
                <span>
                  <strong>Forfeit match</strong>
                  <small>
                    Eliminate only your player. The match continues and you can keep watching.
                  </small>
                </span>
              </button>
            )}

            {isHost && (
              <button
                type="button"
                className="menu-action menu-action-danger"
                onClick={() =>
                  setView("end")
                }
              >
                <span>■</span>
                <span>
                  <strong>
                    End game for everyone
                  </strong>
                  <small>
                    Close the room and delete
                    its save
                  </small>
                </span>
              </button>
            )}

            {(isSpectator || (!gameStarted && !isHost)) && (
              <button
                type="button"
                className="menu-action menu-action-danger"
                onClick={() =>
                  setView("leave")
                }
              >
                <span>↩</span>
                <span>
                  <strong>
                    {isSpectator
                      ? "Leave spectator view"
                      : "Leave lobby"}
                  </strong>
                  <small>
                    {isSpectator
                      ? "Return to the home screen"
                      : "Exit this waiting room"}
                  </small>
                </span>
              </button>
            )}
          </>
        )}

        {view === "feedback" && (
          <form
            className="feedback-form"
            onSubmit={
              submitFeedback
            }
          >
            <header className="modal-heading-row">
              <div>
                <p className="modal-eyebrow">
                  Beta feedback
                </p>
                <h2 id="game-menu-title">
                  Tell me what happened
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                aria-label="Back to game menu"
                onClick={() =>
                  setView("menu")
                }
              >
                ←
              </button>
            </header>

            <p className="feedback-help">
              Room and browser details are
              attached automatically.
            </p>

            <label>
              <span>Category</span>
              <select
                value={
                  feedbackCategory
                }
                onChange={(event) =>
                  setFeedbackCategory(
                    event.target.value as
                      typeof feedbackCategory,
                  )
                }
              >
                {FEEDBACK_CATEGORIES.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              <span>
                What went wrong or what
                should change?
              </span>
              <textarea
                value={feedbackDetails}
                onChange={(event) =>
                  setFeedbackDetails(
                    event.target.value,
                  )
                }
                rows={6}
                maxLength={4000}
                placeholder="Example: The trade panel covered the bottom-right property on my tablet."
              />
            </label>

            <div className="feedback-meta">
              <span>
                Player:{" "}
                <strong>
                  {playerName ||
                    "Unknown"}
                </strong>
              </span>
              <span>
                Room:{" "}
                <strong>
                  {roomCode}
                </strong>
              </span>
            </div>

            {feedbackStatus && (
              <p
                className="feedback-status"
                role="status"
              >
                {feedbackStatus}
              </p>
            )}

            <div className="confirmation-buttons">
              <button
                type="button"
                className="button-muted"
                onClick={() =>
                  setView("menu")
                }
              >
                Back
              </button>
              <button
                type="submit"
                className="button-primary"
                disabled={
                  feedbackSending
                }
              >
                {feedbackSending
                  ? "Sending…"
                  : "Send feedback"}
              </button>
            </div>
          </form>
        )}


      </section>
    </div></ModalPortal>
  );
}
