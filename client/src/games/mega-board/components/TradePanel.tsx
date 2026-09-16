import {
  BOARD_SPACES,
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import {
  getBusTicketCard,
  getGameCard,
} from "../../../../../shared/games/mega-board/cards";
import type {
  GamePlayer,
  GameState,
  TradeOffer,
} from "../../../../../shared/games/mega-board/game-state";
import { styles } from "../styles/gameStyles";
import { tradeTransferKey, type TradeDraft } from "../types/trade";

const BOARD_ORDER = new Map(BOARD_SPACES.map((space, index) => [space.id, index] as const));

function orderedPropertyIds(ids: number[]): number[] {
  return [...ids].sort((first, second) =>
    (BOARD_ORDER.get(first) ?? Number.MAX_SAFE_INTEGER) -
    (BOARD_ORDER.get(second) ?? Number.MAX_SAFE_INTEGER),
  );
}

interface TradePanelProps {
  playerId: string;
  gameState: GameState;
  tradeDraft: TradeDraft;
  isSubmittingTrade: boolean;
  theme: {
    secondaryBackground: string;
    mutedText: string;
    border: string;
  };
  onDraftChange: (nextDraft: TradeDraft) => void;
  onPropose: () => void;
  onAccept: (tradeId: string) => void;
  onDecline: (tradeId: string) => void;
  onRejectAllTrades: (enabled: boolean) => void;
}

function propertyName(propertyId: number): string {
  return getBoardSpace(propertyId)?.name ?? `Property ${propertyId}`;
}

function mortgageInterest(propertyId: number): number {
  const space = getBoardSpace(propertyId);
  return isOwnableBoardSpace(space) ? Math.ceil(space.mortgage * 0.1) : 0;
}

function busTicketName(ticketId: string): string {
  const ticket = getBusTicketCard(ticketId);
  return ticket?.expiresOtherTickets ? "All Tickets Expire Bus Ticket" : "Bus Ticket";
}

function jailCardName(cardId: string): string {
  const card = getGameCard(cardId);
  const deckName = card?.deck === "chance" ? "Chance" : "Community Chest";
  return `${deckName} Get Out of Jail Free`;
}

function ItemLines({
  cash,
  propertyIds,
  busTicketIds,
  jailCardIds,
}: {
  cash: number;
  propertyIds: number[];
  busTicketIds: string[];
  jailCardIds: string[];
}) {
  const hasNothing =
    cash === 0 &&
    propertyIds.length === 0 &&
    busTicketIds.length === 0 &&
    jailCardIds.length === 0;

  if (hasNothing) return <span>Nothing selected</span>;

  return (
    <>
      {cash > 0 && <span>£{cash.toLocaleString()}</span>}
      {orderedPropertyIds(propertyIds).map((propertyId) => (
        <span key={`property-${propertyId}`}>{propertyName(propertyId)}</span>
      ))}
      {busTicketIds.map((ticketId) => (
        <span key={`bus-${ticketId}`}>{busTicketName(ticketId)}</span>
      ))}
      {jailCardIds.map((cardId) => (
        <span key={`jail-${cardId}`}>{jailCardName(cardId)}</span>
      ))}
    </>
  );
}

function LegacyTradeSummary({
  trade,
  gameState,
  theme,
}: {
  trade: TradeOffer;
  gameState: GameState;
  theme: TradePanelProps["theme"];
}) {
  const proposer = gameState.players.find((player) => player.id === trade.proposerId);
  const recipient = gameState.players.find((player) => player.id === trade.recipientId);

  return (
    <div
      style={{
        ...styles.tradeSummary,
        background: theme.secondaryBackground,
        borderColor: theme.border,
      }}
    >
      <strong>{proposer?.name ?? "Player"} offers</strong>
      <ItemLines
        cash={trade.proposerCash}
        propertyIds={trade.proposerPropertyIds}
        busTicketIds={trade.proposerBusTicketIds}
        jailCardIds={trade.proposerJailCardIds}
      />
      {trade.recipientMortgageInterest > 0 && (
        <span>{recipient?.name ?? "Recipient"} pays £{trade.recipientMortgageInterest} Bank interest</span>
      )}
      <span style={styles.tradeDivider}>for</span>
      <strong>{recipient?.name ?? "Player"} offers</strong>
      <ItemLines
        cash={trade.recipientCash}
        propertyIds={trade.recipientPropertyIds}
        busTicketIds={trade.recipientBusTicketIds}
        jailCardIds={trade.recipientJailCardIds}
      />
      {trade.proposerMortgageInterest > 0 && (
        <span>{proposer?.name ?? "Proposer"} pays £{trade.proposerMortgageInterest} Bank interest</span>
      )}
    </div>
  );
}

function MultiPartyTradeSummary({
  trade,
  gameState,
  theme,
}: {
  trade: TradeOffer;
  gameState: GameState;
  theme: TradePanelProps["theme"];
}) {
  const name = (id: string) => gameState.players.find((player) => player.id === id)?.name ?? "Player";
  const participantIds = trade.participantIds ?? [];
  const accepted = new Set(trade.acceptedPlayerIds ?? [trade.proposerId]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          ...styles.tradeSummary,
          background: theme.secondaryBackground,
          borderColor: theme.border,
        }}
      >
        <strong>{participantIds.length}-way atomic deal</strong>
        {(trade.transfers ?? []).map((transfer, index) => (
          <div
            key={`${transfer.fromPlayerId}-${transfer.toPlayerId}-${index}`}
            style={{ display: "grid", gap: 3, padding: "8px 0", borderTop: index ? `1px solid ${theme.border}` : undefined }}
          >
            <strong>{name(transfer.fromPlayerId)} → {name(transfer.toPlayerId)}</strong>
            <ItemLines
              cash={transfer.cash}
              propertyIds={transfer.propertyIds}
              busTicketIds={transfer.busTicketIds}
              jailCardIds={transfer.jailCardIds}
            />
          </div>
        ))}
        {participantIds.map((id) => {
          const interest = trade.mortgageInterestByPlayerId?.[id] ?? 0;
          return interest > 0 ? <span key={`interest-${id}`}>{name(id)} pays £{interest} Bank mortgage-transfer interest</span> : null;
        })}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {participantIds.map((id) => (
          <span
            key={id}
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: 999,
              padding: "5px 9px",
              fontSize: 12,
              opacity: accepted.has(id) ? 1 : 0.7,
            }}
          >
            {accepted.has(id) ? "✓" : "○"} {name(id)}
          </span>
        ))}
      </div>
    </div>
  );
}

function destinationSelect(
  value: string,
  owner: GamePlayer,
  participants: GamePlayer[],
  disabled: boolean,
  onChange: (value: string) => void,
  theme: TradePanelProps["theme"],
) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      style={{
        ...styles.tradeInput,
        width: "auto",
        minWidth: 125,
        padding: "6px 8px",
        background: theme.secondaryBackground,
        borderColor: theme.border,
      }}
    >
      <option value="">Keep</option>
      {participants
        .filter((candidate) => candidate.id !== owner.id)
        .map((candidate) => (
          <option key={candidate.id} value={candidate.id}>Give to {candidate.name}</option>
        ))}
    </select>
  );
}

function ParticipantOfferEditor({
  player,
  participants,
  gameState,
  tradeDraft,
  disabled,
  theme,
  onDraftChange,
}: {
  player: GamePlayer;
  participants: GamePlayer[];
  gameState: GameState;
  tradeDraft: TradeDraft;
  disabled: boolean;
  theme: TradePanelProps["theme"];
  onDraftChange: (draft: TradeDraft) => void;
}) {
  const otherPlayers = participants.filter((candidate) => candidate.id !== player.id);

  const updateRecipientMap = (
    field: "propertyRecipients" | "busTicketRecipients" | "jailCardRecipients",
    itemId: string,
    targetId: string,
  ) => {
    const next = { ...tradeDraft[field] };
    if (targetId) next[itemId] = targetId;
    else delete next[itemId];
    onDraftChange({ ...tradeDraft, [field]: next });
  };

  return (
    <div
      className="mega-trade-party-editor"
      style={{
        ...styles.tradeColumn,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <strong>{player.id === participants[0]?.id ? "You give" : `${player.name} gives`}</strong>

      {otherPlayers.map((target) => {
        const key = tradeTransferKey(player.id, target.id);
        return (
          <label key={key} style={styles.tradeLabel}>
            Cash → {target.name}
            <input
              type="number"
              min={0}
              max={player.cash}
              disabled={disabled}
              value={tradeDraft.cashTransfers[key] ?? 0}
              onChange={(event) => {
                const next = { ...tradeDraft.cashTransfers };
                const amount = Math.max(0, Number(event.target.value) || 0);
                if (amount > 0) next[key] = amount;
                else delete next[key];
                onDraftChange({ ...tradeDraft, cashTransfers: next });
              }}
              inputMode="numeric"
              style={{
                ...styles.tradeInput,
                background: theme.secondaryBackground,
                borderColor: theme.border,
              }}
            />
          </label>
        );
      })}

      {player.properties.length > 0 && <span style={styles.tradeSectionLabel}>Properties / assets</span>}
      {orderedPropertyIds(player.properties).map((propertyId) => {
        const level = gameState.propertyDevelopments[propertyId] ?? 0;
        const mortgaged = Boolean(gameState.mortgagedProperties[propertyId]);
        const hasDepot = Boolean(gameState.railroadDepots[propertyId]);
        const detail = level > 0
          ? ` · development level ${level}${mortgaged ? ` · mortgaged £${mortgageInterest(propertyId)} interest` : ""}`
          : hasDepot
            ? ` · Train Depot${mortgaged ? ` · mortgaged £${mortgageInterest(propertyId)} interest` : ""}`
            : mortgaged
              ? ` · mortgaged £${mortgageInterest(propertyId)} interest`
              : "";
        return (
          <div key={propertyId} style={{ ...styles.tradeCheckRow, justifyContent: "space-between", gap: 8 }}>
            <span>{propertyName(propertyId)}{detail}</span>
            {destinationSelect(
              tradeDraft.propertyRecipients[String(propertyId)] ?? "",
              player,
              participants,
              disabled,
              (targetId) => updateRecipientMap("propertyRecipients", String(propertyId), targetId),
              theme,
            )}
          </div>
        );
      })}

      {(player.busTicketIds.length > 0 || player.getOutOfJailCardIds.length > 0) && (
        <span style={styles.tradeSectionLabel}>Special cards</span>
      )}
      {player.busTicketIds.map((ticketId, index) => (
        <div key={ticketId} style={{ ...styles.tradeCheckRow, justifyContent: "space-between", gap: 8 }}>
          <span>{busTicketName(ticketId)} #{index + 1}</span>
          {destinationSelect(
            tradeDraft.busTicketRecipients[ticketId] ?? "",
            player,
            participants,
            disabled,
            (targetId) => updateRecipientMap("busTicketRecipients", ticketId, targetId),
            theme,
          )}
        </div>
      ))}
      {player.getOutOfJailCardIds.map((cardId) => (
        <div key={cardId} style={{ ...styles.tradeCheckRow, justifyContent: "space-between", gap: 8 }}>
          <span>{jailCardName(cardId)}</span>
          {destinationSelect(
            tradeDraft.jailCardRecipients[cardId] ?? "",
            player,
            participants,
            disabled,
            (targetId) => updateRecipientMap("jailCardRecipients", cardId, targetId),
            theme,
          )}
        </div>
      ))}
    </div>
  );
}

export function TradePanel({
  playerId,
  gameState,
  tradeDraft,
  isSubmittingTrade,
  theme,
  onDraftChange,
  onPropose,
  onAccept,
  onDecline,
  onRejectAllTrades,
}: TradePanelProps) {
  const currentPlayer = gameState.players.find((player) => player.id === playerId);
  const pendingTrade = gameState.pendingTrade;
  const lastTradeResult = gameState.lastTradeResult;
  const rejectAllThisTurn = gameState.tradeRejectAllTurnByPlayerId?.[playerId] === gameState.turnNumber;

  if (!currentPlayer) return null;

  if (pendingTrade) {
    const participantIds = pendingTrade.participantIds ?? [pendingTrade.proposerId, pendingTrade.recipientId];
    const isParticipant = participantIds.includes(playerId);
    const isProposer = pendingTrade.proposerId === playerId;
    const accepted = new Set(pendingTrade.acceptedPlayerIds ?? (isProposer ? [playerId] : []));
    const needsMyApproval = Boolean(pendingTrade.multiParty
      ? isParticipant && !isProposer && !accepted.has(playerId)
      : pendingTrade.recipientId === playerId);

    return (
      <section style={styles.tradePanel}>
        <div>
          <p style={styles.eyebrow}>Pending trade</p>
          <h3 style={styles.tradeTitle}>
            {pendingTrade.multiParty ? `${participantIds.length}-way deal` : "Trade proposal"}
          </h3>
        </div>

        {pendingTrade.multiParty ? (
          <MultiPartyTradeSummary trade={pendingTrade} gameState={gameState} theme={theme} />
        ) : (
          <LegacyTradeSummary trade={pendingTrade} gameState={gameState} theme={theme} />
        )}

        {needsMyApproval && (
          <div style={styles.tradeButtons}>
            <button
              type="button"
              onClick={() => onAccept(pendingTrade.id)}
              disabled={isSubmittingTrade}
              style={styles.primaryButton}
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onDecline(pendingTrade.id)}
              disabled={isSubmittingTrade}
              style={styles.dangerButton}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onRejectAllTrades(true)}
              disabled={isSubmittingTrade}
              className="trade-reject-all-button"
            >
              Decline all this turn
            </button>
          </div>
        )}

        {pendingTrade.multiParty && isParticipant && !isProposer && accepted.has(playerId) && (
          <p style={{ ...styles.tradeHelp, color: theme.mutedText }}>
            ✓ You accepted. Waiting for every other participant before anything transfers.
          </p>
        )}

        {isProposer && (
          <button
            type="button"
            onClick={() => onDecline(pendingTrade.id)}
            disabled={isSubmittingTrade}
            style={styles.secondaryActionButton}
          >
            Cancel {pendingTrade.multiParty ? "deal" : "trade"}
          </button>
        )}

        {!isParticipant && (
          <p style={{ ...styles.tradeHelp, color: theme.mutedText }}>
            {pendingTrade.multiParty
              ? `${participantIds.length} other players are reviewing a multi-party deal.`
              : "Two other players are reviewing a trade."}
          </p>
        )}
      </section>
    );
  }

  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const canPropose =
    activePlayer?.id === playerId &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision");

  const availableRecipients = gameState.players.filter(
    (player) => player.id !== playerId && !player.isBankrupt,
  );
  const selectedRecipients = tradeDraft.recipientIds
    .map((id) => gameState.players.find((player) => player.id === id))
    .filter((player): player is GamePlayer => Boolean(player && !player.isBankrupt));
  const participants = [currentPlayer, ...selectedRecipients];
  const isMultiParty = selectedRecipients.length >= 2;
  const hasAnyValue =
    Object.values(tradeDraft.cashTransfers).some((value) => Number(value) > 0) ||
    Object.values(tradeDraft.propertyRecipients).some(Boolean) ||
    Object.values(tradeDraft.busTicketRecipients).some(Boolean) ||
    Object.values(tradeDraft.jailCardRecipients).some(Boolean);

  const toggleRecipient = (recipientId: string, checked: boolean) => {
    let recipientIds = checked
      ? [...tradeDraft.recipientIds.filter((id) => id !== recipientId), recipientId].slice(0, 3)
      : tradeDraft.recipientIds.filter((id) => id !== recipientId);
    // Changing the participant set invalidates transfer destinations, so clear
    // the matrix rather than risk silently redirecting assets.
    onDraftChange({
      recipientIds,
      cashTransfers: {},
      propertyRecipients: {},
      busTicketRecipients: {},
      jailCardRecipients: {},
    });
  };

  const lastResultInvolvesMe = Boolean(
    lastTradeResult &&
    (lastTradeResult.participantIds ?? [lastTradeResult.proposerId, lastTradeResult.recipientId]).includes(playerId),
  );

  return (
    <section className="mega-trade-panel" style={styles.tradePanel}>
      {lastTradeResult && lastResultInvolvesMe && (
        <div className={`trade-result-banner is-${lastTradeResult.status}`}>
          <strong>
            {lastTradeResult.status === "accepted" ? "✓ Deal accepted" :
              lastTradeResult.status === "cancelled" ? "Deal cancelled" : "✕ Deal rejected"}
          </strong>
          <span>{lastTradeResult.message}</span>
        </div>
      )}

      <div>
        <p style={styles.eyebrow}>Trading</p>
        <h3 style={styles.tradeTitle}>Make a deal</h3>
        <p style={{ ...styles.tradeHelp, color: theme.mutedText }}>
          Invite up to three other players for a 2-player, 3-way or 4-way atomic deal. Cash and individual assets can move directly between any participants. Nothing transfers until every invited player accepts the exact deal.
        </p>
      </div>

      <div className="trade-preference-row">
        <span>{rejectAllThisTurn ? "Rejecting all incoming deals this turn" : "Incoming deals allowed"}</span>
        <button type="button" onClick={() => onRejectAllTrades(!rejectAllThisTurn)}>
          {rejectAllThisTurn ? "Accept deals again" : "Reject all deals this turn"}
        </button>
      </div>

      {!canPropose && (
        <p style={{ ...styles.tradeHelp, color: theme.mutedText }}>
          Trade proposals can be created before your roll, during optional actions, or while resolving Jail.
        </p>
      )}

      <div className="mega-trade-recipient-grid">
        <span className="mega-trade-section-heading" style={styles.tradeSectionLabel}>Deal participants · choose 1–3</span>
        {availableRecipients.map((player) => {
          const checked = tradeDraft.recipientIds.includes(player.id);
          const atLimit = tradeDraft.recipientIds.length >= 3 && !checked;
          return (
            <label key={player.id} style={styles.tradeCheckRow}>
              <input
                type="checkbox"
                checked={checked}
                disabled={!canPropose || atLimit}
                onChange={(event) => toggleRecipient(player.id, event.target.checked)}
              />
              <span>
                {player.name}
                {player.isAi ? ` · AI ${player.aiDifficulty ?? "normal"}` : player.autopilotEnabled ? " · Autopilot" : ""}
              </span>
            </label>
          );
        })}
      </div>

      {isMultiParty && (
        <div
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 10,
            padding: 10,
            background: theme.secondaryBackground,
          }}
        >
          <strong>{participants.length}-way deal</strong>
          <p style={{ ...styles.tradeHelp, color: theme.mutedText, marginBottom: 0 }}>
            Every participant must accept. If anyone declines, disconnects through bankruptcy/forfeit, or can no longer afford their side, the entire deal is cancelled.
          </p>
        </div>
      )}

      {selectedRecipients.length > 0 && (
        <div className="mega-trade-offer-grid">
          {participants.map((participant) => (
            <ParticipantOfferEditor
              key={participant.id}
              player={participant}
              participants={participants}
              gameState={gameState}
              tradeDraft={tradeDraft}
              disabled={!canPropose}
              theme={theme}
              onDraftChange={onDraftChange}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onPropose}
        disabled={
          isSubmittingTrade ||
          selectedRecipients.length === 0 ||
          !hasAnyValue ||
          !canPropose
        }
        style={{
          ...styles.primaryButton,
          opacity:
            isSubmittingTrade || selectedRecipients.length === 0 || !hasAnyValue || !canPropose
              ? 0.5
              : 1,
        }}
      >
        {selectedRecipients.length >= 2
          ? `Send ${participants.length}-way deal`
          : "Send trade proposal"}
      </button>
    </section>
  );
}
