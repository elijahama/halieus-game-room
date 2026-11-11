import {
  BOARD_SPACES,
  getBoardSpace,
  getPropertyGroupColour,
  getPropertyGroupSpaces,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  isUtilityBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type { GamePlayer, GameState } from "../../../../../shared/games/mega-board/game-state";
import type { BoardSpace, PropertyGroup } from "../../../../../shared/games/mega-board/board";
import type { LobbyState } from "../types/lobby";

import { MegaTokenGlyph } from "./MegaTokenGlyph";

const PROPERTY_GROUPS: ReadonlyArray<{ key: PropertyGroup; label: string }> = [
  { key: "brown", label: "Brown" },
  { key: "light-blue", label: "Light blue" },
  { key: "pink", label: "Pink" },
  { key: "orange", label: "Orange" },
  { key: "red", label: "Red" },
  { key: "yellow", label: "Yellow" },
  { key: "green", label: "Green" },
  { key: "dark-blue", label: "Dark blue" },
];

interface PortfolioGroup {
  key: string;
  label: string;
  colour: string;
  owned: BoardSpace[];
  total: number;
  collapsedLabel: "Full set" | "Majority set" | null;
}

export function groupOwnedPortfolio(ownedIds: ReadonlySet<number>): PortfolioGroup[] {
  const groups = [
    ...PROPERTY_GROUPS.map(({ key, label }) => ({
      key,
      label,
      colour: getPropertyGroupColour(key),
      spaces: getPropertyGroupSpaces(key),
    })),
    {
      key: "stations",
      label: "Stations",
      colour: "#6f7889",
      spaces: BOARD_SPACES.filter(isRailroadBoardSpace),
    },
    {
      key: "utilities",
      label: "Utilities",
      colour: "#93a8bf",
      spaces: BOARD_SPACES.filter(isUtilityBoardSpace),
    },
  ];
  return groups.flatMap(({ key, label, colour, spaces }) => {
    const owned = spaces.filter((space) => ownedIds.has(space.id));
    if (!owned.length) return [];
    const collapsedLabel = owned.length === spaces.length
      ? "Full set"
      : owned.length > spaces.length / 2
        ? "Majority set"
        : null;
    return [{ key, label, colour, owned, total: spaces.length, collapsedLabel }];
  });
}

interface PlayerRailProps {
  lobby: LobbyState;
  gameState: GameState;
  players?: GamePlayer[];
  headerTitle?: string;
  className?: string;
  isSpectator?: boolean;
  highlightedPlayerId?: string | null;
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
  highlightedPlayerId = null,
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
        ["--rail-player-count" as string]: String(Math.max(1, visiblePlayers.length)),
      }}
    >
      <header className="player-rail-header">
        <div>
          <p>Players</p>
          <h2>{headerTitle}</h2>
        </div>
        <span>
          {visiblePlayers.length}/{activePlayers.length} · {activePlayers.filter((player) => player.isConnected).length} online
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
          const portfolioGroups = groupOwnedPortfolio(ownedSpaceIds);

          return (
            <article
              key={player.id}
              className={`player-rail-card ${isCurrent ? "is-current" : ""} ${
                isYou ? "is-you" : ""
              } ${player.isBankrupt ? "is-bankrupt" : ""} ${player.id === highlightedPlayerId ? "is-followed" : ""} ${onPlayerSelect ? "is-clickable" : ""}`}
              style={{
                background: theme.secondaryBackground,
                borderColor: isCurrent ? "#e3ad25" : theme.border,
                ["--player-colour" as string]: player.colour,
                ["--rail-card-weight" as string]: String(Math.min(6, 1 + Math.sqrt(orderedOwnedSpaces.length))),
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

              <div className="player-property-strip" aria-label={`${player.name} properties, ${orderedOwnedSpaces.length} owned`}>
                <span className="player-property-count">Owned · {orderedOwnedSpaces.length}</span>
                {portfolioGroups.length === 0 ? (
                  <small style={{ color: theme.mutedText }}>No properties yet</small>
                ) : portfolioGroups.map((group) => {
                  const chips = group.owned.map((space) => {
                    const spaceId = space.id;
                    const mortgaged = Boolean(gameState.mortgagedProperties[spaceId]);
                    const propertyColour = isPropertyBoardSpace(space)
                      ? getPropertyGroupColour(space.group)
                      : isRailroadBoardSpace(space)
                        ? "#6f7889"
                        : "#93a8bf";
                    const development = gameState.propertyDevelopments[spaceId] ?? 0;
                    const hasDepot = Boolean(gameState.railroadDepots[spaceId]);
                    return (
                      <span
                        key={spaceId}
                        className={`player-property-chip ${mortgaged ? "is-mortgaged" : ""}`}
                        title={`${space.name}${mortgaged ? " • Mortgaged" : ""}`}
                        style={{ borderColor: mortgaged ? "#dc2626" : propertyColour }}
                      >
                        <i style={{ background: mortgaged ? "#ef4444" : propertyColour }} />
                        <span className="player-property-chip-name">{space.name}</span>
                        {development > 0 && (
                          <small className="player-property-development">
                            {development <= 4 ? `🏠${development}` : development === 5 ? "🏨" : "🏙️"}
                          </small>
                        )}
                        {hasDepot && <small className="player-property-development">🚉</small>}
                      </span>
                    );
                  });
                  const groupContents = (
                    <div className="player-property-group-chips">{chips}</div>
                  );
                  return (
                    <section
                      className="player-property-group"
                      key={group.key}
                      style={{ ["--portfolio-group-colour" as string]: group.colour }}
                      aria-label={`${group.label}: ${group.owned.length} of ${group.total} owned`}
                    >
                      {group.collapsedLabel ? (
                        <details
                          className="player-property-group-fold"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <summary className="player-property-group-heading">
                            <span className="player-property-group-dot" aria-hidden="true" />
                            <strong>{group.label}</strong>
                            <span className="player-property-group-set">{group.collapsedLabel}</span>
                            <small>{group.owned.length}/{group.total}</small>
                          </summary>
                          {groupContents}
                        </details>
                      ) : (
                        <>
                          <div className="player-property-group-heading">
                            <span className="player-property-group-dot" aria-hidden="true" />
                            <strong>{group.label}</strong>
                            <small>{group.owned.length}/{group.total}</small>
                          </div>
                          {groupContents}
                        </>
                      )}
                    </section>
                  );
                })}
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
