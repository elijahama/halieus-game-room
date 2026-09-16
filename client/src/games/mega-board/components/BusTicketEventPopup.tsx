import type { GlobalGameNotice } from "../../../../../shared/games/mega-board/game-state";

interface BusTicketEventPopupProps {
  notice: GlobalGameNotice;
  onDismiss?: () => void;
}

export function BusTicketEventPopup({ notice, onDismiss }: BusTicketEventPopupProps) {
  const isExpiry = notice.kind === "bus-ticket-expiry";

  return (
    <div className="bus-ticket-event-layer" aria-live="assertive" role="status">
      <article className={`bus-ticket-event-popup card-reveal-panel ${isExpiry ? "is-expiry" : "is-gained"}`}>
        <span className="bus-ticket-event-eyebrow">BUS TICKET</span>
        <span className="bus-ticket-event-icon" aria-hidden="true">🚌</span>
        <strong>{isExpiry ? "All Other Bus Tickets Expire" : "Bus Ticket Collected"}</strong>
        <p>
          {isExpiry
            ? "Keep the ticket you just drew. Every other held Bus Ticket expires."
            : "Keep this Bus Ticket for later use."}
        </p>
        <div className="bus-ticket-action-summary">
          <span>ACTION</span>
          <b>{isExpiry ? "Keep this ticket" : "Keep Bus Ticket"}</b>
        </div>
        {isExpiry && <small className="bus-ticket-expiry-detail">{notice.message}</small>}
        <button type="button" className="bus-ticket-event-ok" onClick={onDismiss}>OK</button>
      </article>
    </div>
  );
}
