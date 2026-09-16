import { getGameCard } from "../../../../../shared/games/mega-board/cards";
import type { LastCardDraw } from "../../../../../shared/games/mega-board/game-state";
import { cardActionLabel } from "./CardPanel";

interface CardEventPopupProps {
  draw: LastCardDraw;
  playerName: string;
}

export function CardEventPopup({ draw, playerName }: CardEventPopupProps) {
  const card = getGameCard(draw.cardId);
  if (!card) return null;
  const isChance = card.deck === "chance";

  return (
    <div className="card-event-popup-layer" role="status" aria-live="polite">
      <section className={`card-event-popup card-reveal-panel ${isChance ? "is-chance-card" : "is-community-card"}`}>
        <span className="card-event-deck">{isChance ? "CHANCE" : "COMMUNITY CHEST"}</span>
        <span className="card-event-icon" aria-hidden="true">{isChance ? "?" : "🏛️"}</span>
        <strong>{card.title}</strong>
        <p>{card.description}</p>
        <div className="card-event-action-summary">
          <span>ACTION</span>
          <b>{cardActionLabel(card)}</b>
        </div>
        <small>{playerName} drew this card.</small>
        <span className="card-event-ok" aria-hidden="true">OK</span>
      </section>
    </div>
  );
}
