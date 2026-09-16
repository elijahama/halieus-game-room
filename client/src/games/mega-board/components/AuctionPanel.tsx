import {
  useEffect,
  useState,
} from "react";

import {
  getBoardSpace,
} from "../../../../../shared/games/mega-board/board";

import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state";

import {
  styles,
} from "../styles/gameStyles";

interface AuctionPanelProps {
  playerId: string;
  gameState: GameState;
  isResolving: boolean;
  isSpectator?: boolean;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onBid: (amount: number) => void;
  onWithdraw: () => void;
}

export function AuctionPanel({
  playerId,
  gameState,
  isResolving,
  isSpectator = false,
  theme,
  onBid,
  onWithdraw,
}: AuctionPanelProps) {
  const auction =
    gameState.pendingAuction;

  const minimumBid = auction
    ? auction.currentBid +
      auction.minimumIncrement
    : 0;

  const [remainingMs, setRemainingMs] =
    useState(() =>
      auction
        ? Math.max(
            0,
            auction.endsAt - Date.now(),
          )
        : 0,
    );


  useEffect(() => {
    if (!auction) {
      setRemainingMs(0);
      return;
    }

    const updateTimer = () => {
      setRemainingMs(
        Math.max(
          0,
          auction.endsAt - Date.now(),
        ),
      );
    };

    updateTimer();

    const interval = window.setInterval(
      updateTimer,
      200,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    auction?.id,
    auction?.endsAt,
  ]);

  if (!auction) {
    return null;
  }

  const timerStarted = Boolean(auction.highestBidderId);

  const remainingSeconds =
    Math.ceil(remainingMs / 1000);

  const timerExpired =
    timerStarted && remainingMs <= 0;

  const timerUrgent =
    !timerExpired &&
    remainingSeconds <= 5;

  const timerWindowSeconds = 8;

  const timerProgress =
    timerStarted
      ? Math.max(
          0,
          Math.min(
            100,
            (
              remainingMs /
              (timerWindowSeconds * 1000)
            ) * 100,
          ),
        )
      : 100;

  const space = getBoardSpace(
    auction.spaceId,
  );

  const player =
    gameState.players.find(
      (candidate) =>
        candidate.id === playerId,
    );

  const highestBidder =
    auction.highestBidderId
      ? gameState.players.find(
          (candidate) =>
            candidate.id ===
            auction.highestBidderId,
        )
      : undefined;

  const isActive =
    auction.activeBidderIds.includes(
      playerId,
    );

  const isHighestBidder =
    auction.highestBidderId ===
    playerId;

  const canWithdraw =
    isActive &&
    !timerExpired &&
    !isHighestBidder &&
    !isResolving;

  const canBidIncrement = (
    increase: number,
  ): boolean =>
    Boolean(player) &&
    isActive &&
    !timerExpired &&
    !isResolving &&
    player!.cash >=
      auction.currentBid + increase;

  return (
    <section
      className={`auction-presentation ${
        timerUrgent
          ? "is-auction-urgent"
          : ""
      }`}
      style={{
        ...styles.auctionPanel,
        background:
          theme.cardBackground,
        borderColor: timerUrgent
          ? "#dc2626"
          : "#e6b94f",
        color: theme.text,
      }}
    >
      <div
        style={styles.auctionHeader}
      >
        <div>
          <span
            style={
              styles.auctionEyebrow
            }
          >
            {timerStarted ? "LIVE TIMED AUCTION" : "LIVE AUCTION"}
          </span>

          <h3
            style={
              styles.auctionTitle
            }
          >
            {space?.name ??
              "Unowned asset"}
          </h3>
        </div>

        <span
          className="auction-hammer-animation"
          style={
            styles.auctionHammer
          }
        >
          🔨
        </span>
      </div>

      <div
        aria-live="polite"
        style={{
          ...styles.auctionTimer,
          background: timerUrgent
            ? "rgba(220, 38, 38, 0.12)"
            : theme.secondaryBackground,
          borderColor: timerUrgent
            ? "#dc2626"
            : theme.border,
        }}
      >
        <span
          style={{
            color: timerUrgent
              ? "#dc2626"
              : theme.mutedText,
          }}
        >
          {timerStarted ? "Time left" : "Countdown"}
        </span>

        <strong
          style={{
            ...styles.auctionTimerValue,
            color: timerUrgent
              ? "#dc2626"
              : theme.text,
          }}
        >
          {!timerStarted
            ? "Ready"
            : timerExpired
            ? "0s"
            : `${remainingSeconds}s`}
        </strong>

        <small
          style={{
            color: timerUrgent
              ? "#dc2626"
              : theme.mutedText,
          }}
        >
          {!timerStarted
            ? "The 8-second timer starts with the first valid bid."
            : timerExpired
            ? "Time expired. Finalising result..."
            : "Every valid bid resets the timer to 8 seconds."}
        </small>

        <div
          className="auction-countdown-track"
          aria-hidden="true"
        >
          <span
            style={{
              width:
                `${timerProgress}%`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          ...styles.auctionBidDisplay,
          background:
            theme.secondaryBackground,
          borderColor: theme.border,
        }}
      >
        <span>Current bid</span>
        <strong>
          £{auction.currentBid.toLocaleString()}
        </strong>
        <small
          style={{
            color: theme.mutedText,
          }}
        >
          {highestBidder
            ? `Leading: ${highestBidder.name}`
            : `Opening bid: £${minimumBid.toLocaleString()}`}
        </small>
      </div>

      <div
        style={styles.auctionPlayers}
      >
        {gameState.players
          .filter(
            (candidate) =>
              !candidate.isBankrupt,
          )
          .map((candidate) => {
            const active =
              auction.activeBidderIds.includes(
                candidate.id,
              );

            const leading =
              auction.highestBidderId ===
              candidate.id;

            const latestBid =
              auction.bidsByPlayerId[
                candidate.id
              ];

            return (
              <div
                key={candidate.id}
                style={{
                  ...styles.auctionPlayerRow,
                  background:
                    theme.secondaryBackground,
                  borderColor: leading
                    ? "#e6b94f"
                    : theme.border,
                  opacity: active
                    ? 1
                    : 0.55,
                }}
              >
                <span
                  style={{
                    ...styles.auctionPlayerToken,
                    background:
                      candidate.colour,
                  }}
                >
                  {candidate.name
                    .charAt(0)
                    .toUpperCase()}
                </span>

                <div
                  style={
                    styles.auctionPlayerBody
                  }
                >
                  <strong>
                    {candidate.name}
                  </strong>

                  <small
                    style={{
                      color:
                        theme.mutedText,
                    }}
                  >
                    {leading
                      ? `Highest bid £${auction.currentBid.toLocaleString()}`
                      : !active
                        ? "Withdrawn"
                        : latestBid
                          ? `Last bid £${latestBid.toLocaleString()}`
                          : candidate.id === playerId || isSpectator
                            ? `Cash £${candidate.cash.toLocaleString()}`
                            : "Cash private"}
                  </small>
                </div>
              </div>
            );
          })}
      </div>

      {isActive ? (
        <>
          <div
            style={
              styles.auctionQuickBids
            }
          >
            {[10, 50, 100].map(
              (increase) => (
                <button
                  key={increase}
                  type="button"
                  onClick={() =>
                    onBid(
                      auction.currentBid +
                        increase,
                    )
                  }
                  disabled={
                    !canBidIncrement(
                      increase,
                    )
                  }
                  style={{
                    ...styles.auctionQuickButton,
                    borderColor:
                      theme.border,
                    color: theme.text,
                    background:
                      theme.secondaryBackground,
                    opacity: timerExpired
                      ? 0.5
                      : 1,
                  }}
                >
                  +£{increase}
                </button>
              ),
            )}
          </div>

          <small
            className="auction-increment-help"
            style={{ color: theme.mutedText }}
          >
            Bids increase only by £10, £50 or £100.
          </small>

          <div
            style={
              styles.auctionActions
            }
          >
            <button
              type="button"
              onClick={onWithdraw}
              disabled={!canWithdraw}
              style={{
                ...styles.auctionWithdrawButton,
                borderColor:
                  theme.border,
                color: theme.text,
                opacity: canWithdraw
                  ? 1
                  : 0.5,
              }}
            >
              {timerExpired
                ? "Auction closed"
                : isHighestBidder
                  ? "Leading bid"
                  : "Withdraw"}
            </button>
          </div>
        </>
      ) : (
        <p
          style={{
            ...styles.auctionWaitingText,
            color: theme.mutedText,
          }}
        >
          {timerExpired
            ? "Time expired. Waiting for the server to finalise the result."
            : "You have withdrawn. Waiting for the remaining bidders."}
        </p>
      )}
    </section>
  );
}
