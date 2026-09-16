import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getBoardSpace,
} from "../../../../../shared/games/mega-board/board";

import type {
  GameState,
  PendingMegaAction,
} from "../../../../../shared/games/mega-board/game-state";

import {
  styles,
} from "../styles/gameStyles";

interface MegaActionPanelProps {
  action: PendingMegaAction;
  gameState: GameState;
  playerId: string;
  isResolving: boolean;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onBusMove: (position: number) => void;
  onBusCancel: () => void;
  onBirthdayCash: () => void;
  onBirthdayTicket: () => void;
  onAuctionSelect: (spaceId: number) => void;
}

export function MegaActionPanel({
  action,
  gameState,
  playerId,
  isResolving,
  theme,
  onBusMove,
  onBusCancel,
  onBirthdayCash,
  onBirthdayTicket,
  onAuctionSelect,
}: MegaActionPanelProps) {
  const options = useMemo(
    () =>
      action.type === "bus-ticket"
        ? action.allowedPositions
        : action.type === "auction-space"
          ? action.eligibleSpaceIds
          : [],
    [action],
  );

  const [selectedId, setSelectedId] =
    useState(options[0] ?? 0);

  useEffect(() => {
    setSelectedId(options[0] ?? 0);
  }, [action.type, options.join(",")]);

  const player = gameState.players.find(
    (candidate) =>
      candidate.id === action.playerId,
  );
  const isMine =
    action.playerId === playerId;

  return (
    <section
      style={{
        ...styles.megaActionPanel,
        background:
          theme.secondaryBackground,
        borderColor: theme.border,
        color: theme.text,
      }}
    >
      <p style={styles.megaActionEyebrow}>
        Mega action
      </p>

      {action.type === "bus-ticket" && (
        <>
          <h3 style={styles.megaActionTitle}>
            Ride the Bus
          </h3>
          <p
            style={{
              ...styles.megaActionDescription,
              color: theme.mutedText,
            }}
          >
            Move forward to any space remaining on this side of the board. The ticket is used permanently.
          </p>

          {isMine ? (
            <>
              <label
                style={styles.megaActionLabel}
              >
                Destination
                <select
                  value={selectedId}
                  disabled={isResolving}
                  onChange={(event) =>
                    setSelectedId(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  style={{
                    ...styles.megaActionSelect,
                    background:
                      theme.secondaryBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  {options.map((position) => (
                    <option
                      key={position}
                      value={position}
                    >
                      {position}. {getBoardSpace(position)?.name ?? "Unknown space"}
                    </option>
                  ))}
                </select>
              </label>

              <div
                style={styles.megaActionButtons}
              >
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={() =>
                    onBusMove(selectedId)
                  }
                  style={{
                    ...styles.megaActionPrimaryButton,
                    opacity: isResolving
                      ? 0.55
                      : 1,
                  }}
                >
                  Use Ticket
                </button>
                <button
                  type="button"
                  disabled={isResolving}
                  onClick={onBusCancel}
                  style={{
                    ...styles.megaActionSecondaryButton,
                    opacity: isResolving
                      ? 0.55
                      : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <WaitingText
              playerName={player?.name}
              theme={theme}
            />
          )}
        </>
      )}

      {action.type ===
        "birthday-gift" && (
        <>
          <h3 style={styles.megaActionTitle}>
            Birthday Gift
          </h3>
          <p
            style={{
              ...styles.megaActionDescription,
              color: theme.mutedText,
            }}
          >
            Choose £100 from the Bank or take one Bus Ticket for later.
          </p>

          {isMine ? (
            <div
              style={styles.megaActionButtons}
            >
              <button
                type="button"
                disabled={isResolving}
                onClick={onBirthdayCash}
                style={{
                  ...styles.megaActionPrimaryButton,
                  opacity: isResolving
                    ? 0.55
                    : 1,
                }}
              >
                Collect £100
              </button>
              <button
                type="button"
                disabled={
                  isResolving ||
                  gameState.busTicketsRemaining < 1
                }
                onClick={onBirthdayTicket}
                style={{
                  ...styles.megaActionTicketButton,
                  opacity:
                    isResolving ||
                    gameState.busTicketsRemaining < 1
                      ? 0.55
                      : 1,
                }}
              >
                Take Bus Ticket
              </button>
            </div>
          ) : (
            <WaitingText
              playerName={player?.name}
              theme={theme}
            />
          )}
        </>
      )}

      {action.type ===
        "auction-space" && (
        <>
          <h3 style={styles.megaActionTitle}>
            Choose an Auction
          </h3>
          <p
            style={{
              ...styles.megaActionDescription,
              color: theme.mutedText,
            }}
          >
            Select any unowned asset. The normal timed auction starts immediately.
          </p>

          {isMine ? (
            <>
              <label
                style={styles.megaActionLabel}
              >
                Unowned asset
                <select
                  value={selectedId}
                  disabled={isResolving}
                  onChange={(event) =>
                    setSelectedId(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  style={{
                    ...styles.megaActionSelect,
                    background:
                      theme.secondaryBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  {options.map((spaceId) => {
                    const space =
                      getBoardSpace(spaceId);

                    return (
                      <option
                        key={spaceId}
                        value={spaceId}
                      >
                        {spaceId}. {space?.name ?? "Unknown asset"}
                        {space && "price" in space
                          ? ` • £${space.price}`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </label>

              <button
                type="button"
                disabled={
                  isResolving ||
                  options.length === 0
                }
                onClick={() =>
                  onAuctionSelect(selectedId)
                }
                style={{
                  ...styles.megaActionPrimaryButton,
                  opacity:
                    isResolving ||
                    options.length === 0
                      ? 0.55
                      : 1,
                }}
              >
                Start Auction
              </button>
            </>
          ) : (
            <WaitingText
              playerName={player?.name}
              theme={theme}
            />
          )}
        </>
      )}
    </section>
  );
}

function WaitingText({
  playerName,
  theme,
}: {
  playerName?: string;
  theme: MegaActionPanelProps["theme"];
}) {
  return (
    <p
      style={{
        ...styles.megaActionWaitingText,
        color: theme.mutedText,
      }}
    >
      Waiting for {playerName ?? "the active player"} to choose.
    </p>
  );
}
