import { useEffect, useMemo, useState } from "react";
import { getBoardSpace } from "../../../../../shared/games/mega-board/board";
import type { GameState, LiveTradePreview, MultiPartyTradeTransfer, TradeOffer } from "../../../../../shared/games/mega-board/game-state";

interface Props {
  gameState: GameState;
  livePreview: LiveTradePreview | null;
  viewerPlayerId?: string | null;
}

function legacyTransfers(trade: TradeOffer): MultiPartyTradeTransfer[] {
  if (trade.multiParty && trade.transfers) return trade.transfers;
  return [
    {
      fromPlayerId: trade.proposerId,
      toPlayerId: trade.recipientId,
      cash: trade.proposerCash,
      propertyIds: trade.proposerPropertyIds,
      busTicketIds: trade.proposerBusTicketIds,
      jailCardIds: trade.proposerJailCardIds,
    },
    {
      fromPlayerId: trade.recipientId,
      toPlayerId: trade.proposerId,
      cash: trade.recipientCash,
      propertyIds: trade.recipientPropertyIds,
      busTicketIds: trade.recipientBusTicketIds,
      jailCardIds: trade.recipientJailCardIds,
    },
  ].filter((leg) => leg.cash > 0 || leg.propertyIds.length > 0 || leg.busTicketIds.length > 0 || leg.jailCardIds.length > 0);
}

function propertyName(id: number): string {
  return getBoardSpace(id)?.name ?? `Property ${id}`;
}

export function LiveTradeOverlay({ gameState, livePreview, viewerPlayerId = null }: Props) {
  const pending = gameState.pendingTrade;
  const activePlayerId = gameState.players[gameState.currentPlayerIndex]?.id ?? null;
  const model = useMemo(() => {
    if (pending) {
      return {
        proposerId: pending.proposerId,
        participantIds: pending.participantIds ?? [pending.proposerId, pending.recipientId],
        transfers: legacyTransfers(pending),
        stage: "proposed" as const,
        acceptedPlayerIds: pending.acceptedPlayerIds ?? [pending.proposerId],
        revision: pending.createdAt,
      };
    }
    if (!livePreview || gameState.phase !== "playing" || livePreview.proposerId !== activePlayerId) return null;
    const transfers = livePreview.transfers.filter(
      (leg) => leg.cash > 0 || leg.propertyIds.length > 0 || leg.busTicketIds.length > 0 || leg.jailCardIds.length > 0,
    );
    if (transfers.length === 0) return null;
    return { ...livePreview, transfers, acceptedPlayerIds: [livePreview.proposerId] };
  }, [activePlayerId, gameState.phase, livePreview, pending]);
  const negotiationKey = model ? `${model.proposerId}:${model.participantIds.join(",")}` : "";
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (negotiationKey) setMinimized(false);
  }, [negotiationKey]);

  if (!model) return null;
  // The proposer already has the editable My Trade view. The live overlay is for everybody else following the negotiation.
  if (viewerPlayerId && model.proposerId === viewerPlayerId) return null;

  const playerById = new Map(gameState.players.map((player) => [player.id, player]));
  const participants = model.participantIds.map((id) => playerById.get(id)).filter(Boolean);
  const names = participants.map((player) => player!.name);
  const negotiationLabel = names.length <= 2
    ? `${names[0] ?? "A player"} is negotiating with ${names[1] ?? "another player"}`
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)} are negotiating`;

  if (minimized) {
    return (
      <button type="button" className="live-trade-minimized" onClick={() => setMinimized(false)}>
        <span>🤝</span><strong>Deal in progress</strong><small>{negotiationLabel}</small>
      </button>
    );
  }

  return (
    <aside className="live-trade-overlay" aria-live="polite" aria-label="Live deal negotiation">
      <header className="live-trade-header">
        <div>
          <p className="modal-eyebrow">Live deal</p>
          <h2>{negotiationLabel}</h2>
          <small>{model.stage === "draft" ? "Terms update live while the proposal is being built." : "Proposal sent. Waiting for the remaining participants."}</small>
        </div>
        <button type="button" aria-label="Minimise live deal" onClick={() => setMinimized(true)}>—</button>
      </header>

      <div className={`live-trade-participants live-trade-count-${Math.min(4, participants.length)}`}>
        {participants.map((participant) => {
          const player = participant!;
          const outgoing = model.transfers.filter((leg) => leg.fromPlayerId === player.id);
          const accepted = model.acceptedPlayerIds.includes(player.id);
          return (
            <section key={player.id} className={`live-trade-party ${player.id === model.proposerId ? "is-proposer" : ""}`}>
              <div className="live-trade-party-head">
                <span>{player.name.slice(0, 1).toUpperCase()}</span>
                <div><strong>{player.name}</strong><small>{player.id === model.proposerId ? "Proposing" : model.stage === "proposed" ? (accepted ? "Accepted" : "Reviewing") : "In negotiation"}</small></div>
                {model.stage === "proposed" && <b className={accepted ? "is-accepted" : ""}>{accepted ? "✓" : "…"}</b>}
              </div>
              <div className="live-trade-offer-list">
                {outgoing.length === 0 && <em>Nothing offered yet</em>}
                {outgoing.map((leg, index) => {
                  const target = playerById.get(leg.toPlayerId)?.name ?? "player";
                  return (
                    <div className="live-trade-leg" key={`${leg.fromPlayerId}-${leg.toPlayerId}-${index}`}>
                      <small>To {target}</small>
                      {leg.cash > 0 && <span className="live-trade-cash">£{leg.cash.toLocaleString()}</span>}
                      {leg.propertyIds.map((id) => <span className="live-trade-property" key={id}>{propertyName(id)}</span>)}
                      {leg.busTicketIds.length > 0 && <span>🚌 Bus Ticket ×{leg.busTicketIds.length}</span>}
                      {leg.jailCardIds.length > 0 && <span>🔑 Get Out of Jail Free ×{leg.jailCardIds.length}</span>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <footer className="live-trade-footer">
        <span className="live-trade-pulse" />
        <strong>{model.stage === "draft" ? "Proposal changing live" : "Current proposed terms"}</strong>
        <small>Only deal participants can edit or accept these terms.</small>
      </footer>
    </aside>
  );
}
