import { SKIN_CATALOG, DEFAULT_SKIN_PREFERENCES } from "../../../../../shared/platform/skins";
import { TURN_TIMER_PRESET_SECONDS } from "../../../../../shared/games/mega-board/game-rules";
import { useEffect, useState } from "react";

import type { AiDifficulty } from "../../../../../shared/games/mega-board/game-state";
import type { LobbyState } from "../types/lobby";
import type { HalieusPersonalStats } from "../../../../../shared/platform/accounts";

import { BackToGameRoomButton } from "../../../platform/components/BackToGameRoomButton";
import { GameBrandIcon } from "../../../platform/components/GameBrandIcon";
import { RecoveryKeyPanel } from "../../../platform/components/RecoveryKeyPanel";
import { GAME_BY_ID } from "../../../platform/games/catalog";
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
  theme,
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
  const host = activePlayers.find((player) => player.isHost);
  const turnTimerSeconds = lobby.turnTimerSeconds ?? (blitz ? 150 : 45);

  return (
    <main
      className="lobby-shell lobby-shell-v2 poker-page mega-lobby-poker-standard page-enter"
      data-ui-revision="mega-lobby-poker-standard"
      data-blitz={blitz ? "true" : "false"}
      style={{
        background: theme.pageBackground,
        color: theme.text,
        ["--game-accent" as string]: "var(--hgr-brand)",
        ["--game-identity-accent" as string]: MEGA_ACCENT,
      }}
    >
      <header className="poker-header mega-poker-header">
        <div className="poker-brand-lockup">
          <GameBrandIcon game="mega-board" className="poker-logo-token mega-poker-logo-token" />
          <div>
            <p>Halieus Game Room</p>
            <h1>Mega Board</h1>
          </div>
        </div>

        <div className="mega-poker-header-tools">
          <div className="poker-room-meta">
            <span>Room <strong>{lobby.code}</strong></span>
            <span>{blitz ? "⚡ Blitz" : ranked ? "🏆 Ranked" : "Casual"}</span>
            <span>{activePlayers.length}/8 players</span>
            <span>{turnTimerSeconds}s turns</span>
            <span className={connectionStatus === "Connected" ? "is-online" : ""}><i aria-hidden="true" />{connectionStatus}</span>
          </div>
          <BackToGameRoomButton onClick={onBackToGameRoom} />
        </div>
      </header>

      <section className="poker-lobby-shell mega-poker-lobby-shell">
        <article
          className="poker-lobby-card glass-card mega-poker-lobby-card"
          style={{ background: theme.cardBackground, borderColor: theme.border }}
        >
          <div>
            <p className="poker-eyebrow">Private room</p>
            <h2>{blitz ? "Blitz Mega Board" : "Mega Board"}</h2>
            <p className="poker-lobby-copy">
              Bring everyone in, choose the shared board and start when the room is ready.
              Room code <strong>{lobby.code}</strong>.
            </p>
          </div>

          <dl className="poker-settings-summary">
            <div><dt>Room code</dt><dd>{lobby.code}</dd></div>
            <div><dt>Match</dt><dd>{blitz ? "⚡ Blitz" : ranked ? "🏆 Ranked" : "Casual"}</dd></div>
            <div><dt>Players</dt><dd>{activePlayers.length} / 8</dd></div>
            <div className="mega-poker-timer-setting">
              <dt>Turn timer</dt>
              <dd>
                {isHost ? (
                  <select
                    aria-label="Turn timer"
                    value={turnTimerSeconds}
                    disabled={isUpdatingTurnTimer}
                    onChange={(event) => onTurnTimerChange(Number(event.target.value))}
                  >
                    {TURN_TIMER_PRESET_SECONDS.map((seconds) => (
                      <option key={seconds} value={seconds}>{seconds} seconds</option>
                    ))}
                  </select>
                ) : (
                  `${turnTimerSeconds}s`
                )}
              </dd>
            </div>
            <div><dt>Host</dt><dd>{host?.name ?? "—"}</dd></div>
            <div><dt>Board</dt><dd>{SKIN_CATALOG.find(skin => skin.slot === "mega-board" && skin.id === (lobby.boardStyle ?? DEFAULT_SKIN_PREFERENCES["mega-board"]))?.label ?? "Classic Board"}</dd></div>
          </dl>

          {blitz && (
            <section className="poker-ranked-lobby-tools mega-blitz-lobby-note" aria-label="Blitz rules">
              <div>
                <span>Blitz lobby</span>
                <strong>Fast-start property deal</strong>
                <small>All 37 ownable assets are shuffled and dealt round-robin as evenly as mathematically possible.</small>
              </div>
            </section>
          )}

          <section className="poker-variant-roadmap mega-board-style-roadmap" aria-label="Mega Board appearance">
            <div className="poker-variant-roadmap-heading">
              <span>Board appearance</span>
              <small>The host chooses the shared board; your HGR theme and accessibility remain personal.</small>
            </div>
            <SkinLibraryButton
              stats={personalStats}
              betaMode={betaMode}
              slots={["mega-board"]}
              roomStyle={lobby.boardStyle ?? "classic-board"}
              onRoomStyleChange={onBoardStyleChange}
              readOnly={!isHost}
            />
          </section>

          <RecoveryKeyPanel recoveryKey={recoveryKey} />

          {lobby.hostDisconnectDeadline && (
            <div className="host-warning">
              The host is reconnecting. This room closes automatically if they do not return within 90 seconds.
            </div>
          )}

          {isHost ? (
            <div className="poker-lobby-actions poker-lobby-actions-v2 mega-poker-lobby-actions">
              <label className="poker-global-ai-control">
                <span>AI difficulty <small>Applies to new AI players</small></span>
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as AiDifficulty)}
                  disabled={ranked || roomIsFull}
                  aria-label="Mega Board AI difficulty"
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
              <button
                type="button"
                className="button-outline"
                disabled={ranked || roomIsFull}
                onClick={() => onAddAi(difficulty)}
              >
                ＋ Add AI player
              </button>
              <button
                type="button"
                className="button-primary"
                disabled={activePlayers.length < 2}
                onClick={onStartGame}
              >
                Start game
              </button>
              <button type="button" className="button-danger" onClick={onLeaveLobby}>End room</button>
            </div>
          ) : (
            <div className="mega-poker-guest-actions">
              <button type="button" className="button-danger" onClick={onLeaveLobby}>Leave lobby</button>
            </div>
          )}
        </article>

        <section className="poker-player-list mega-poker-player-list" aria-label="Mega Board players">
          {activePlayers.map((player, index) => (
            <article key={player.id} className="poker-player-list-card">
              <span className="poker-avatar">{player.name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{player.name}</strong>
                <small>
                  {player.isHost
                    ? "Host"
                    : player.isAi
                      ? `AI player · ${player.aiDifficulty ?? "normal"}`
                      : player.isConnected
                        ? "Connected"
                        : "Reconnecting"}
                </small>
              </div>
              <b>Seat {index + 1}</b>
              {isHost && player.isAi && (
                <button
                  type="button"
                  className="poker-remove-ai"
                  onClick={() => onRemoveAi(player.id)}
                  aria-label={`Remove ${player.name}`}
                >
                  ×
                </button>
              )}
            </article>
          ))}
        </section>

        {message && <p role="status" aria-live="polite" className="status-toast poker-status-toast">{message}</p>}
      </section>
    </main>
  );
}
