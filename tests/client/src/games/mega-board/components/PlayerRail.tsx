import {
  BOARD_SPACES,
  getBoardSpace,
  getPropertyGroupColour,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  isUtilityBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type { GamePlayer, GameState } from "../../../../../shared/games/mega-board/game-state";
import type { LobbyState } from "../types/lobby";

import { MegaTokenGlyph } from "./MegaTokenGlyph";

interface PlayerRailProps {
  lobby: LobbyState;
  gameState: GameState;
  players?: GamePlayer[];
  headerTitle?: string;
  className?: string;
  isSpectator?: boolean;
  spectators?: Array<{ id: string; name: string }>;
  showSpectators?: boolean;
  onPlayerSelect?: (playerId: string) => void;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
}

export function PlayerRail({
  lobby,
  gameState,
  players,
  headerTitle = "Table",
  className = "",
  isSpectator = false,
  spectators = [],
  showSpectators = true,
  onPlayerSelect,
  theme,
}: PlayerRailProps) {
  const activePlayers = gameState.players.filter((player) => !player.isBankrupt);
  const visiblePlayers = players ?? activePlayers;
  const bankruptSpectators = gameState.players
    .filter((player) => player.isBankrupt)
    .map((player) => ({ id: `bankrupt:${player.id}`, name: `${player.name} · Bankrupt` }));
  const allSpectators = [
    ...spectators.filter((spectator) => !bankruptSpectators.some((bankrupt) => bankrupt.name.startsWith(`${spectator.name} ·`))),
    ...bankruptSpectators,
  ];

  return (
    <aside
      className={`player-rail player-rail-single ${className}`.trim()}
      aria-label="Players and owned properties"
      style={{
        background: theme.cardBackground,
        borderColor: theme.border,
      }}
    >
      <header className="player-rail-header">
        <div>
          <p>Players</p>
          <h2>{headerTitle}</h2>
        </div>
        <span>
          {visiblePlayers.length}/{gameState.players.length}
        </span>
      </header>

      <div className="player-rail-list">
        {visiblePlayers.map((player) => {
          const index = gameState.players.findIndex((candidate) => candidate.id === player.id);
          const isCurrent = index === gameState.currentPlayerIndex;
          const isYou = player.id === lobby.playerId;
          const currentSpace = getBoardSpace(player.position);
          const ownedSpaceIds = new Set(player.properties);
          const orderedOwnedSpaces = BOARD_SPACES.filter((space) => ownedSpaceIds.has(space.id));

          return (
            <article
              key={player.id}
              className={`player-rail-card ${isCurrent ? "is-current" : ""} ${
                isYou ? "is-you" : ""
              } ${player.isBankrupt ? "is-bankrupt" : ""} ${onPlayerSelect ? "is-clickable" : ""}`}
              style={{
                background: theme.secondaryBackground,
                borderColor: isCurrent ? "#e3ad25" : theme.border,
                ["--player-colour" as string]: player.colour,
              }}
              role={onPlayerSelect ? "button" : undefined}
              tabIndex={onPlayerSelect ? 0 : undefined}
              aria-label={onPlayerSelect ? `View ${player.name}'s player details` : undefined}
              onClick={() => onPlayerSelect?.(player.id)}
              onKeyDown={(event) => {
                if (!onPlayerSelect) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPlayerSelect(player.id);
                }
              }}
            >
              <div className="player-rail-main-row">
                <span
                  className="player-rail-token"
                  style={{ color: player.colour }}
                >
                  <MegaTokenGlyph tokenId={player.tokenId} fallback={player.name.charAt(0).toUpperCase()} />
                </span>

                <div className="player-rail-copy">
                  <div>
                    <strong>{player.name}</strong>
                    {isYou && <em>You</em>}
                  </div>

                  <small style={{ color: theme.mutedText }}>
                    {player.isBankrupt
                      ? "Bankrupt"
                      : player.inJail
                        ? "In Jail"
                        : player.isAi
                          ? `AI • ${player.aiDifficulty ?? "normal"}`
                          : player.autopilotEnabled
                            ? "Autopilot"
                            : player.isConnected
                              ? "Connected"
                              : "Reconnecting"}
                  </small>

                  <div className="player-rail-stats">
                    <span className="player-rail-location" title={`Current location: ${currentSpace?.name ?? `Space ${player.position}`}`}>📍 {currentSpace?.name ?? `Space ${player.position}`}</span>
                    <span className="player-rail-cash" title={isYou || isSpectator ? "Cash" : "Cash is private during active play"}>
                      {isYou || isSpectator
                        ? `£${player.cash.toLocaleString()}`
                        : "£••••"}
                    </span>
                  </div>

                  {(player.busTickets > 0 || player.getOutOfJailCards > 0) && (
                    <div className="player-held-cards" aria-label={`${player.name} held cards and tickets`}>
                      {player.busTickets > 0 && (
                        <span title={`${player.busTickets} Bus Ticket${player.busTickets === 1 ? "" : "s"}`}>
                          🚌 Bus Ticket ×{player.busTickets}
                        </span>
                      )}
                      {player.getOutOfJailCards > 0 && (
                        <span title={`${player.getOutOfJailCards} Get Out of Jail Free card${player.getOutOfJailCards === 1 ? "" : "s"}`}>
                          🎫 Jail Free ×{player.getOutOfJailCards}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <span className="player-rail-order">#{index + 1}</span>
              </div>

              <div className="player-property-strip" aria-label={`${player.name} properties`}>
                {orderedOwnedSpaces.length === 0 ? (
                  <small style={{ color: theme.mutedText }}>No properties yet</small>
                ) : (
                  orderedOwnedSpaces.map((space) => {
                    const spaceId = space.id;
                    const mortgaged = Boolean(gameState.mortgagedProperties[spaceId]);
                    const propertyColour =
                      space && isPropertyBoardSpace(space)
                        ? getPropertyGroupColour(space.group)
                        : space && isRailroadBoardSpace(space)
                          ? "#343941"
                          : space && isUtilityBoardSpace(space)
                            ? "#7b8794"
                            : player.colour;
                    const development = gameState.propertyDevelopments[spaceId] ?? 0;
                    const hasDepot = Boolean(gameState.railroadDepots[spaceId]);

                    return (
                      <span
                        key={spaceId}
                        className={`player-property-chip ${mortgaged ? "is-mortgaged" : ""}`}
                        title={`${space?.name ?? `Space ${spaceId}`}${mortgaged ? " • Mortgaged" : ""}`}
                        style={{
                          borderColor: mortgaged ? "#dc2626" : propertyColour,
                        }}
                      >
                        <i style={{ background: propertyColour }} />
                        <span className="player-property-chip-name">{space?.name ?? `Space ${spaceId}`}</span>
                        {development > 0 && (
                          <small className="player-property-development">
                            {development <= 4 ? `🏠${development}` : development === 5 ? "🏨" : "🏙️"}
                          </small>
                        )}
                        {hasDepot && <small className="player-property-development">🚉</small>}
                      </span>
                    );
                  })
                )}
              </div>
            </article>
          );
        })}
      </div>

      {showSpectators && (
        <section className="spectator-rail-section" aria-label="Spectators">
          <div className="spectator-rail-heading">
            <span>👁 Spectators</span>
            <strong>{allSpectators.length}</strong>
          </div>
          {allSpectators.length > 0 ? (
            <div className="spectator-rail-list">
              {allSpectators.map((spectator) => (
                <span key={spectator.id}>{spectator.name}</span>
              ))}
            </div>
          ) : (
            <small style={{ color: theme.mutedText }}>No spectators</small>
          )}
        </section>
      )}
    </aside>
  );
}
