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
  onEndRoom: () => void;
}

type MenuView =
  | "menu"
  | "leave"
  | "forfeit"
  | "end"
  | "feedback";

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
  onEndRoom,
}: GameMenuProps) {
  const [view, setView] =
    useState<MenuView>("menu");
  const [copied, setCopied] =
    useState(false);
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
                <strong>Resume game</strong>
                <small>
                  Return to the board
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
