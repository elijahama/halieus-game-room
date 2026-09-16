import {
  getBoardSpace,
  getPropertyGroupColour,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  isUtilityBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";

interface PlayerDetailsModalProps {
  gameState: GameState;
  playerId: string;
  viewerPlayerId: string;
  isSpectator?: boolean;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onClose: () => void;
  onManageProperties: () => void;
  onMakeDeal: (playerId: string) => void;
}

export function PlayerDetailsModal({
  gameState,
  playerId,
  viewerPlayerId,
  isSpectator = false,
  theme,
  onClose,
  onManageProperties,
  onMakeDeal,
}: PlayerDetailsModalProps) {
  const player = gameState.players.find((candidate) => candidate.id === playerId);
  const viewer = gameState.players.find((candidate) => candidate.id === viewerPlayerId);
  if (!player) return null;

  const isSelf = player.id === viewerPlayerId;
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const rejectAllThisTurn =
    gameState.tradeRejectAllTurnByPlayerId?.[player.id] === gameState.turnNumber;
  const tradePhaseAllowed = Boolean(
    viewer &&
    activePlayer?.id === viewer.id &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision"),
  );
  const canMakeDeal = Boolean(
    !isSelf &&
      !isSpectator &&
      viewer &&
      !viewer.isBankrupt &&
      !player.isBankrupt &&
      tradePhaseAllowed &&
      !gameState.pendingTrade &&
      !rejectAllThisTurn,
  );

  const dealDisabledReason = isSelf
    ? "This is your own player card."
    : isSpectator
      ? "Spectators cannot make trade offers."
      : player.isBankrupt
        ? "Bankrupt players cannot trade."
        : rejectAllThisTurn
          ? `${player.name} is rejecting deals for this turn.`
          : gameState.pendingTrade
            ? "Another trade is already being reviewed."
            : !tradePhaseAllowed
              ? "Deals can be proposed on your turn before rolling, during optional actions, or while resolving Jail."
              : "";

  const assets = [...player.properties]
    .sort((a, b) => a - b)
    .map((spaceId) => getBoardSpace(spaceId))
    .filter((space): space is NonNullable<typeof space> => Boolean(space));

  return (
    <div
      className="player-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="player-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${player.name} player details`}
        style={{
          background: theme.cardBackground,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        <header className="player-detail-header">
          <span className="player-detail-token" style={{ background: player.colour }}>
            {player.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <p>PLAYER #{gameState.players.findIndex((candidate) => candidate.id === player.id) + 1}</p>
            <h2>{player.name}{isSelf ? " · You" : ""}</h2>
            <span style={{ color: theme.mutedText }}>
              {player.isBankrupt
                ? "Bankrupt"
                : player.inJail
                  ? "In Jail"
                  : player.isAi
                    ? `AI · ${player.aiDifficulty ?? "normal"}`
                    : player.autopilotEnabled
                      ? "Autopilot"
                      : player.isConnected
                        ? "Connected"
                        : "Reconnecting"}
            </span>
          </div>
          <button type="button" className="player-detail-close" aria-label="Close player details" onClick={onClose}>×</button>
        </header>

        <div className="player-detail-status-row">
          <span>📍 {getBoardSpace(player.position)?.name ?? `Space ${player.position}`}</span>
          <span>{player.busTickets > 0 ? `🚌 ${player.busTickets} Bus Ticket${player.busTickets === 1 ? "" : "s"}` : "🚌 No Bus Tickets"}</span>
          <span>{player.getOutOfJailCards > 0 ? `🎫 ${player.getOutOfJailCards} Jail Free` : "🎫 No Jail Free card"}</span>
          {isSelf || isSpectator ? <span>💷 £{player.cash.toLocaleString()}</span> : <span title="Opponent cash is private">💷 Private</span>}
        </div>

        <div className="player-detail-portfolio-heading">
          <strong>Portfolio</strong>
          <span>{assets.length} asset{assets.length === 1 ? "" : "s"}</span>
        </div>

        <div className="player-detail-assets">
          {assets.length === 0 ? (
            <p className="player-detail-empty" style={{ color: theme.mutedText }}>No properties or assets yet.</p>
          ) : assets.map((space) => {
            const mortgaged = Boolean(gameState.mortgagedProperties[space.id]);
            const development = gameState.propertyDevelopments[space.id] ?? 0;
            const depot = Boolean(gameState.railroadDepots[space.id]);
            const accent = isPropertyBoardSpace(space)
              ? getPropertyGroupColour(space.group)
              : isRailroadBoardSpace(space)
                ? "#343941"
                : isUtilityBoardSpace(space)
                  ? "#7b8794"
                  : player.colour;
            const developmentText = development > 0
              ? development <= 4
                ? `${development} house${development === 1 ? "" : "s"}`
                : development === 5
                  ? "Hotel"
                  : "Skyscraper"
              : null;

            return (
              <article
                key={space.id}
                className={`player-detail-asset ${mortgaged ? "is-mortgaged" : ""}`}
                style={{ borderColor: mortgaged ? "#dc2626" : accent, background: theme.secondaryBackground }}
              >
                <i style={{ background: accent }} />
                <div>
                  <strong>{space.name}</strong>
                  <small style={{ color: theme.mutedText }}>
                    {[developmentText, depot ? "Train Depot" : null, mortgaged ? "Mortgaged" : null].filter(Boolean).join(" · ") || "Owned"}
                  </small>
                </div>
              </article>
            );
          })}
        </div>

        <footer className="player-detail-actions">
          {isSelf ? (
            <button type="button" className="player-detail-primary" onClick={onManageProperties}>🏘 Manage Properties</button>
          ) : (
            <button
              type="button"
              className="player-detail-primary"
              disabled={!canMakeDeal}
              title={dealDisabledReason || `Make a deal with ${player.name}`}
              onClick={() => onMakeDeal(player.id)}
            >
              🤝 Make Deal
            </button>
          )}
          {!isSelf && !canMakeDeal && dealDisabledReason && (
            <small style={{ color: theme.mutedText }}>{dealDisabledReason}</small>
          )}
        </footer>
      </section>
    </div>
  );
}
