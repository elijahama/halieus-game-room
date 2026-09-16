import {
  getGameCard,
} from "../../../../../shared/games/mega-board/cards";

import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state";

import { styles } from "../styles/gameStyles";

interface CardPanelProps {
  playerId: string;
  gameState: GameState;
  isResolvingCard: boolean;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onContinue: () => void;
}



export function cardActionLabel(card: ReturnType<typeof getGameCard>): string {
  if (!card) return "Resolve card";
  switch (card.effect.type) {
    case "collect":
      return `Collect £${card.effect.amount}`;
    case "pay-bank":
      return `Pay £${card.effect.amount}`;
    case "move-to":
      return "Move token";
    case "move-nearest":
      return `Move to nearest ${card.effect.target === "railroad" ? "station" : "utility"}`;
    case "move-back":
      return `Move back ${card.effect.spaces}`;
    case "go-to-jail":
      return "Go to Jail";
    case "get-out-of-jail":
      return "Keep card";
    case "pay-each-player":
      return `Pay each player £${card.effect.amount}`;
    case "collect-from-each-player":
      return `Collect £${card.effect.amount} from each player`;
    case "repairs":
      return "Pay repair costs";
  }
}
export function CardPanel({
  playerId,
  gameState,
  isResolvingCard,
  theme,
  onContinue,
}: CardPanelProps) {
  const pending =
    gameState.pendingCard;

  if (!pending) {
    return null;
  }

  const card =
    getGameCard(
      pending.cardId,
    );

  if (!card) {
    return null;
  }

  const drawingPlayer =
    gameState.players.find(
      (player) =>
        player.id ===
        pending.playerId,
    );

  const isMine =
    pending.playerId === playerId;

  const isChance =
    card.deck === "chance";

  return (
    <section
      className={`card-reveal-panel ${
        isChance
          ? "is-chance-card"
          : "is-community-card"
      }`}
      style={{
        ...styles.cardPopup,
        background:
          isChance
            ? "#f4a723"
            : "#5aa6d6",
        borderColor: theme.border,
        color: "#111111",
      }}
    >
      <span style={styles.cardDeckName}>
        {isChance
          ? "CHANCE"
          : "COMMUNITY CHEST"}
      </span>

      <div style={styles.cardIcon}>
        {isChance ? "?" : "🏛️"}
      </div>

      <h3 style={styles.cardTitle}>
        {card.title}
      </h3>

      <p style={styles.cardDescription}>
        {card.description}
      </p>

      <div className="card-action-summary">
        <span>Action</span>
        <strong>{cardActionLabel(card)}</strong>
      </div>

      {!isMine && (
        <p style={styles.cardWaitingText}>
          Waiting for{" "}
          {drawingPlayer?.name ??
            "the player"}{" "}
          to continue.
        </p>
      )}

      {isMine && (
        <button
          type="button"
          onClick={onContinue}
          disabled={isResolvingCard}
          style={{
            ...styles.cardContinueButton,
            opacity:
              isResolvingCard
                ? 0.6
                : 1,
          }}
        >
          {isResolvingCard
            ? "Working..."
            : "OK"}
        </button>
      )}
    </section>
  );
}
