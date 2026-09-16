import { type FormEvent } from "react";
import { GameBrandIcon } from "../../../platform/components/GameBrandIcon";

import type {
  RoomPreview,
} from "../types/lobby";


interface InviteJoinScreenProps {
  connectionStatus: string;
  roomCode: string;
  playerName: string;
  message: string;
  preview: RoomPreview | null;
  isLoading: boolean;
  isJoining: boolean;
  isRecovering: boolean;
  canResumeSavedSeat: boolean;
  darkMode: boolean;
  theme: {
    pageBackground: string;
    cardBackground: string;
    secondaryBackground: string;
    inputBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onToggleDarkMode: () => void;
  onPlayerNameChange: (
    value: string,
  ) => void;
  playerNameLocked?: boolean;
  onJoin: () => void;
  onRefresh: () => void;
  onResumeSavedSeat: () => void;
  onGoHome: () => void;
}

export function InviteJoinScreen({
  connectionStatus,
  roomCode,
  playerName,
  message,
  preview,
  isLoading,
  isJoining,
  isRecovering,
  canResumeSavedSeat,
  darkMode,
  theme,
  onToggleDarkMode,
  onPlayerNameChange,
  playerNameLocked = false,
  onJoin,
  onRefresh,
  onResumeSavedSeat,
  onGoHome,
}: InviteJoinScreenProps) {
  const unavailable =
    connectionStatus !== "Connected" ||
    isLoading ||
    !preview ||
    !preview.canJoin;

  const capacityPercent = preview
    ? Math.min(
        100,
        Math.round(
          (preview.playerCount /
            preview.maximumPlayers) *
            100,
        ),
      )
    : 0;

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    onJoin();
  };

  return (
    <main
      className="invite-join-shell invite-join-shell-polished page-enter"
      style={{
        background: theme.pageBackground,
        color: theme.text,
      }}
    >
      <div className="invite-join-orb invite-join-orb-one" />
      <div className="invite-join-orb invite-join-orb-two" />
      <div className="home-grid-pattern" />

      <section className="invite-join-stage">
        <section className="invite-join-intro">
          <GameBrandIcon game="mega-board" className="brand-token" />
          <p className="modal-eyebrow">
            Direct lobby invitation
          </p>
          <h1>You have been invited</h1>
          <p>
            {playerNameLocked
              ? "You are signed in. Join this room using your Halieus player identity."
              : "Join this waiting room for one-time play. No permanent account is created."}
          </p>

          <div className="invite-room-code-hero">
            <span>Room code</span>
            <strong>{roomCode}</strong>
          </div>
        </section>

        <section
          className="invite-join-card glass-card"
          style={{
            background: theme.cardBackground,
            borderColor: theme.border,
          }}
        >
          <header className="invite-card-title-row">
            <div>
              <p className="modal-eyebrow">
                Lobby status
              </p>
              <h2>
                {preview?.canJoin
                  ? "Ready to join"
                  : "Checking room"}
              </h2>
            </div>
            <span
              className={`invite-status-pill ${
                preview?.canJoin
                  ? "is-ready"
                  : ""
              }`}
            >
              <i />
              {connectionStatus}
            </span>
          </header>

          <section
            className="invite-room-summary invite-room-summary-polished"
            style={{
              background:
                theme.secondaryBackground,
              borderColor: theme.border,
            }}
          >
            {preview ? (
              <>
                <div>
                  <span>Host</span>
                  <strong>{preview.hostName}</strong>
                </div>
                <div>
                  <span>Players</span>
                  <strong>
                    {preview.playerCount} / {preview.maximumPlayers}
                  </strong>
                </div>
                <div>
                  <span>Match</span>
                  <strong>
                    {preview.blitz
                      ? "Blitz"
                      : preview.ranked
                        ? "Ranked"
                        : "Casual"}
                  </strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>
                    {preview.canJoin
                      ? "Waiting"
                      : "Unavailable"}
                  </strong>
                </div>
                <div className="invite-capacity-row">
                  <span>Lobby capacity</span>
                  <div>
                    <i
                      style={{
                        width:
                          `${capacityPercent}%`,
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="invite-room-loading">
                {isLoading
                  ? "Checking lobby..."
                  : "Lobby unavailable"}
              </div>
            )}
          </section>

          {preview?.reason && (
            <div className="invite-unavailable-message">
              {preview.reason}
            </div>
          )}

          {!preview &&
            !isLoading &&
            message && (
            <div className="invite-unavailable-message">
              {message}
            </div>
          )}

          {canResumeSavedSeat && (
            <section className="invite-resume-card">
              <div>
                <strong>
                  Previous seat found
                </strong>
                <span>
                  Continue your saved place in
                  this room.
                </span>
              </div>
              <button
                type="button"
                className="button-secondary"
                disabled={isRecovering}
                onClick={onResumeSavedSeat}
              >
                {isRecovering
                  ? "Rejoining..."
                  : "Continue previous game"}
              </button>
            </section>
          )}

          <form
            className="invite-join-form"
            onSubmit={submit}
          >
            <label>
              <span>Your player name</span>
              <input
                value={playerName}
                maxLength={24}
                autoComplete="nickname"
                autoFocus
                placeholder="Enter your name"
                disabled={
                  unavailable || isJoining || playerNameLocked
                }
                readOnly={playerNameLocked}
                aria-readonly={playerNameLocked}
                onChange={(event) =>
                  onPlayerNameChange(
                    event.target.value,
                  )
                }
                style={{
                  background:
                    theme.inputBackground,
                  color: theme.text,
                  borderColor: theme.border,
                }}
              />
              {playerNameLocked && <small className="invite-account-name-note">Using your signed-in Halieus display name.</small>}
            </label>

            <button
              type="submit"
              className="invite-join-button"
              disabled={
                unavailable ||
                isJoining ||
                !playerName.trim()
              }
            >
              {isJoining
                ? "Joining lobby..."
                : "Join lobby"}
            </button>
          </form>

          <div className="invite-join-footer">
            <button
              type="button"
              className="text-action-button"
              onClick={onRefresh}
              disabled={isLoading}
            >
              Refresh status
            </button>
            <button
              type="button"
              className="text-action-button"
              onClick={onGoHome}
            >
              Main page
            </button>
          </div>

          {message && preview && (
            <p
              className="status-toast"
              role="status"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
