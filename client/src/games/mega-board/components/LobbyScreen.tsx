import { ModalPortal } from "../../../platform/components/ModalPortal";
import { TURN_TIMER_PRESET_SECONDS } from "../../../../../shared/games/mega-board/game-rules";
import { useEffect, useState } from "react";

import type { AiDifficulty } from "../../../../../shared/games/mega-board/game-state";
import type { LobbyState } from "../types/lobby";
import type { HalieusPersonalStats } from "../../../../../shared/platform/accounts";

import { BackToGameRoomButton } from "../../../platform/components/BackToGameRoomButton";
import { GameBrandIcon } from "../../../platform/components/GameBrandIcon";
import { GAME_BY_ID } from "../../../platform/games/catalog";
import { InviteLobbyPanel } from "../../../platform/components/InviteLobbyPanel";
import { InviteLobbyBar } from "../../../platform/components/InviteLobbyBar";
import { SkinLibraryButton } from "../../../platform/components/SkinLibraryButton";
import { accountApi } from "../../../platform/accounts/api";

const MEGA_ACCENT = GAME_BY_ID["mega-board"].accent;
const EMPTY_STATS: HalieusPersonalStats = { played: 0, wins: 0, winRate: 0, byGame: [], recent: [] };

interface LobbyScreenProps {
  lobby: LobbyState;
  connectionStatus: string;
  ranked: boolean;
  blitz: boolean;
  message: string;
  recoveryKey: string | null;
  darkMode: boolean;
  theme: {
    pageBackground: string;
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    border: string;
    mutedText: string;
  };
  onToggleDarkMode: () => void;
  onStartGame: () => void;
  onLeaveLobby: () => void;
  onBackToGameRoom: () => void;
  onAddAi: (difficulty: AiDifficulty) => void;
  onRemoveAi: (playerId: string) => void;
  onTurnTimerChange: (seconds: number) => void;
  isUpdatingTurnTimer: boolean;
  betaMode?: boolean;
  onBoardStyleChange?: (style: string) => Promise<void>;
}

export function LobbyScreen({
  lobby,
  connectionStatus,
  ranked,
  blitz,
  message,
  recoveryKey,
  darkMode,
  theme,
  onToggleDarkMode,
  onStartGame,
  onLeaveLobby,
  onBackToGameRoom,
  onAddAi,
  onRemoveAi,
  onTurnTimerChange,
  isUpdatingTurnTimer,
  betaMode = false,
  onBoardStyleChange,
}: LobbyScreenProps) {
  const [difficulty, setDifficulty] = useState<AiDifficulty>("normal");
  const [copied, setCopied] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [personalStats, setPersonalStats] = useState<HalieusPersonalStats>(EMPTY_STATS);

  useEffect(() => {
    let live = true;
    void accountApi<{ stats: HalieusPersonalStats }>("/accounts/me/stats")
      .then((result) => { if (live) setPersonalStats(result.stats ?? EMPTY_STATS); })
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  const currentPlayer = lobby.players.find((player) => player.id === lobby.playerId);
  const isHost = currentPlayer?.isHost ?? false;
  const activePlayers = lobby.players.filter((player) => !player.hasLeft);
  const roomIsFull = activePlayers.length >= 8;

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main
      className="lobby-shell lobby-shell-v2 page-enter"
      data-ui-revision="mega-lobby-v2"
      data-blitz={blitz ? "true" : "false"}
      style={{ background: theme.pageBackground, color: theme.text, ["--game-accent" as string]: MEGA_ACCENT }}
    >

      {inviteOpen && (
        <ModalPortal onClose={() => setInviteOpen(false)}><div className="modal-backdrop lobby-invite-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteOpen(false); }}>
          <section className="lobby-invite-modal" role="dialog" aria-modal="true" aria-label="Invite players to Mega Board">
            <button type="button" className="icon-button lobby-invite-close" aria-label="Close invite panel" onClick={() => setInviteOpen(false)}>×</button>
            <InviteLobbyPanel
              roomCode={lobby.code}
              darkMode={darkMode}
              gameTitle="Mega Board"
              invitePathPrefix="/join"
              spectatorPathPrefix="/spectate/mega"
              accent={MEGA_ACCENT}
              eyebrow="Mega Board invite"
              title="Invite players"
              description="Share this room directly. Friends opening the link land in the correct Mega Board waiting room with this code already loaded."
              theme={theme}
            />
          </section>
        </div></ModalPortal>
      )}

      <section className="lobby-card lobby-card-v2 glass-card" style={{ background: theme.cardBackground, borderColor: theme.border }}>
        <header className="lobby-heading lobby-heading-v2">
          <div className="card-game-brand-lockup lobby-brand-lockup">
            <GameBrandIcon game="mega-board" className="lobby-game-brand-icon" />
            <div>
              <p className="modal-eyebrow">Mega Board lobby</p>
              <h1>Waiting room</h1>
              <span>Bring everyone in, set the table and start when the room is ready.</span>
            </div>
          </div>
          <div className="lobby-heading-actions">
            <BackToGameRoomButton onClick={onBackToGameRoom} />
            <div className={`connection-pill ${connectionStatus === "Connected" ? "is-online" : ""}`}>
              <i />
              {connectionStatus}
            </div>
          </div>
        </header>

        <div className="lobby-overview-grid">
          <button type="button" className="lobby-overview-tile lobby-overview-code" onClick={() => void copyText(lobby.code)}>
            <span>Room code</span>
            <strong>{lobby.code}</strong>
            <small>{copied ? "Copied" : "Click to copy"}</small>
          </button>
          <div className="lobby-overview-tile">
            <span>Match</span>
            <strong>{blitz ? "⚡ Blitz" : ranked ? "🏆 Ranked" : "Casual"}</strong>
            <small>{ranked ? "Competitive room" : blitz ? "Fast-start variant" : "Friends table"}</small>
          </div>
          <div className="lobby-overview-tile">
            <span>Players</span>
            <strong>{activePlayers.length} / 8</strong>
            <small>{roomIsFull ? "Room full" : `${8 - activePlayers.length} seats available`}</small>
          </div>
        </div>

        {blitz && (
          <div className="ranked-scoring-note blitz-mode-note lobby-blitz-note">
            <strong>⚡ Blitz lobby</strong>
            <small>All 37 ownable assets are shuffled together and dealt round-robin. Counts stay as even as mathematically possible without balancing by value, colour or strength.</small>
          </div>
        )}

        <div className="turn-timer-settings-panel">
          <div><strong>Turn timer</strong><small>Locked when the match starts. Reconnecting keeps the existing deadline.</small></div>
          {isHost ? <select aria-label="Turn timer" value={lobby.turnTimerSeconds ?? (blitz ? 150 : 45)} disabled={isUpdatingTurnTimer} onChange={(event) => onTurnTimerChange(Number(event.target.value))}>
            {TURN_TIMER_PRESET_SECONDS.map((seconds) => <option key={seconds} value={seconds}>{seconds} seconds</option>)}
          </select> : <span>{lobby.turnTimerSeconds ?? (blitz ? 150 : 45)} seconds</span>}
        </div>
        <InviteLobbyBar
          accent={MEGA_ACCENT}
          title="Bring friends straight to this Mega Board room"
          onOpen={() => setInviteOpen(true)}
        />

        <div className="lobby-main-grid">
          <section className="players-panel players-panel-v2">
            <div className="section-heading-row lobby-players-heading lobby-players-heading-v2">
              <div>
                <p className="modal-eyebrow">Players</p>
                <h2>Ready list</h2>
                <small>{activePlayers.length < 2 ? "At least two players are needed to start." : "Room is ready when the host is."}</small>
              </div>

              {isHost && (
                <div className="ai-controls lobby-ai-quick-controls" aria-label="Add AI player">
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as AiDifficulty)}
                    disabled={ranked || roomIsFull}
                    title={ranked ? "AI players are unavailable in ranked games." : roomIsFull ? "This lobby is full." : "Choose AI difficulty"}
                    style={{ background: theme.secondaryBackground, color: theme.text, borderColor: theme.border }}
                  >
                    <option value="easy">Easy AI</option>
                    <option value="normal">Normal AI</option>
                    <option value="hard">Hard AI</option>
                  </select>
                  <button type="button" className="button-primary" disabled={ranked || roomIsFull} onClick={() => onAddAi(difficulty)}>+ Add AI</button>
                </div>
              )}
            </div>

            <div className="modern-player-list modern-player-list-v2">
              {activePlayers.map((player, index) => (
                <article key={player.id} className={`modern-player-row ${player.id === lobby.playerId ? "is-you" : ""}`}>
                  <span className="avatar-token">{player.name.charAt(0).toUpperCase()}</span>
                  <div className="player-copy">
                    <strong>{player.name}</strong>
                    <span>{player.isAi ? `AI • ${player.aiDifficulty ?? "normal"}` : player.isConnected ? "Connected" : "Reconnecting"}</span>
                  </div>
                  <div className="player-badges">
                    {player.id === lobby.playerId && <span className="you-badge">You</span>}
                    {player.isHost && <span className="host-badge-modern">♛ Host</span>}
                    <span className="order-badge">#{index + 1}</span>
                    {isHost && player.isAi && <button type="button" className="mini-danger-button" onClick={() => onRemoveAi(player.id)}>Remove</button>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="lobby-side-panel">
            <section className="lobby-side-card lobby-board-appearance-card">
              <p className="modal-eyebrow">Board appearance</p>
              <h2>Table cosmetics</h2>
              <small>The host chooses the shared board before play. Your HGR theme and accessibility remain personal.</small>
              <SkinLibraryButton stats={personalStats} betaMode={betaMode} slots={["mega-board"]} roomStyle={lobby.boardStyle ?? "classic-board"} onRoomStyleChange={onBoardStyleChange} readOnly={!isHost} />
            </section>
            <section className="lobby-side-card">
              <p className="modal-eyebrow">Room access</p>
              <h2>Recovery & status</h2>
              {recoveryKey ? (
                <div className="lobby-recovery-compact">
                  <span>Your recovery key</span>
                  <strong>{recoveryKey}</strong>
                  <small>Use this to reclaim your seat from another browser or device.</small>
                  <button type="button" onClick={() => void copyText(recoveryKey)}>Copy key</button>
                </div>
              ) : (
                <p className="lobby-side-muted">A recovery key is issued to active player seats.</p>
              )}
              {lobby.hostDisconnectDeadline && <div className="host-warning">The host is reconnecting. This room closes automatically if they do not return within 90 seconds.</div>}
            </section>

            <section className="lobby-side-card lobby-start-card">
              <p className="modal-eyebrow">Room controls</p>
              <h2>{isHost ? "Host controls" : "Waiting for host"}</h2>
              <small>{isHost ? "Start when the room is ready, or close the room for everyone." : "The host controls when this match begins."}</small>
              <div className="lobby-actions lobby-actions-v2">
                {isHost && <button type="button" className="button-primary lobby-start-game" onClick={onStartGame} disabled={activePlayers.length < 2}>Start game</button>}
                <button type="button" className="button-danger" onClick={onLeaveLobby}>{isHost ? "End room" : "Leave lobby"}</button>
              </div>
            </section>
          </aside>
        </div>

        {message && <p role="status" aria-live="polite" className="status-toast lobby-status-toast">{message}</p>}
      </section>
    </main>
  );
}
