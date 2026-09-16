import { useEffect, useRef, useState } from "react";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import type { LobbyState } from "../types/lobby";
import type { TradeDraft } from "../types/trade";
import { PropertyManagementPanel } from "./PropertyManagementPanel";
import { TradePanel } from "./TradePanel";
import { DebtPanel } from "./DebtPanel";


interface GameSidebarProps {
  lobby: LobbyState;
  gameState: GameState;
  connectionStatus: string;
  isSpectator?: boolean;
  isBuilding: boolean;
  isManagingAsset: boolean;
  isSubmittingTrade: boolean;
  isResolvingDebt: boolean;
  tradeDraft: TradeDraft;
  theme: {
    cardBackground: string;
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onBuild: (spaceId: number) => void;
  onBuildTo: (spaceId: number, targetLevel: 5 | 6) => void;
  onBuildGroupTo: (spaceId: number, targetLevel: 5 | 6) => void;
  onMortgage: (spaceId: number) => void;
  onUnmortgage: (spaceId: number) => void;
  onSellBuilding: (spaceId: number) => void;
  onBuildDepot: (spaceId: number) => void;
  onSellDepot: (spaceId: number) => void;
  onTradeDraftChange: (draft: TradeDraft) => void;
  onTradePropose: () => void;
  onTradeAccept: (tradeId: string) => void;
  onTradeDecline: (tradeId: string) => void;
  onRejectAllTrades: (enabled: boolean) => void;
  onPayDebt: () => void;
  onAutoLiquidateDebt: () => void;
  onDeclareBankruptcy: () => void;
  closeSignal?: number;
  openSignal?: number;
  openPanel?: ActionPanel;
  onOpenChange?: (open: boolean, panel: ActionPanel) => void;
}

type ActionPanel = "properties" | "trade" | "history" | null;

function blockingLabel(gameState: GameState): string {
  if (gameState.pendingPurchase) return "Property decision";
  if (gameState.pendingCard) return "Card decision";
  if (gameState.pendingAuction) return "Auction";
  if (gameState.pendingSpeedDieAction) return "Speed Die decision";
  if (gameState.pendingMegaAction) return "Mega decision";
  if (gameState.pendingDebt) return "Debt decision";
  if (gameState.turnPhase === "jail-decision") return "Jail decision";
  return gameState.turnPhase.replaceAll("-", " ");
}

export function GameSidebar({
  lobby,
  gameState,
  connectionStatus,
  isSpectator = false,
  isBuilding,
  isManagingAsset,
  isSubmittingTrade,
  isResolvingDebt,
  tradeDraft,
  theme,
  onBuild,
  onBuildTo,
  onBuildGroupTo,
  onMortgage,
  onUnmortgage,
  onSellBuilding,
  onBuildDepot,
  onSellDepot,
  onTradeDraftChange,
  onTradePropose,
  onTradeAccept,
  onTradeDecline,
  onRejectAllTrades,
  onPayDebt,
  onAutoLiquidateDebt,
  onDeclareBankruptcy,
  closeSignal = 0,
  openSignal = 0,
  openPanel = null,
  onOpenChange,
}: GameSidebarProps) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActionPanel>(null);
  const [optionalActionSeconds, setOptionalActionSeconds] = useState(150);
  const optionalActionDeadlineRef = useRef<number | null>(null);
  const optionalActionTurnKeyRef = useRef<string | null>(null);
  const handledTradeResultIdRef = useRef<string | null>(gameState.lastTradeResult?.id ?? null);
  const previousRejectAllActiveRef = useRef(
    gameState.tradeRejectAllTurnByPlayerId?.[lobby.playerId] === gameState.turnNumber,
  );
  const previousRollSequenceRef = useRef(gameState.rollSequence ?? 0);

  useEffect(() => {
    if (closeSignal > 0) setPopupOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    if (openSignal > 0) {
      setActivePanel(openPanel);
      setPopupOpen(true);
    }
  }, [openPanel, openSignal]);

  useEffect(() => {
    onOpenChange?.(popupOpen, activePanel);
  }, [activePanel, onOpenChange, popupOpen]);

  const currentGamePlayer = gameState.players.find((player) => player.id === lobby.playerId);
  const activeGamePlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentGamePlayer?.id === activeGamePlayer?.id;
  const autopilotActive = Boolean(currentGamePlayer?.autopilotEnabled);
  const pendingTradeParticipants = gameState.pendingTrade?.participantIds ??
    (gameState.pendingTrade ? [gameState.pendingTrade.proposerId, gameState.pendingTrade.recipientId] : []);
  const incomingTradeForMe = Boolean(
    gameState.pendingTrade &&
    gameState.pendingTrade.proposerId !== lobby.playerId &&
    pendingTradeParticipants.includes(lobby.playerId) &&
    !(gameState.pendingTrade.acceptedPlayerIds ?? []).includes(lobby.playerId),
  );
  const outgoingTradeForMe = gameState.pendingTrade?.proposerId === lobby.playerId;
  const tradeInvolvesMe = pendingTradeParticipants.includes(lobby.playerId);
  const rejectAllThisTurn =
    gameState.tradeRejectAllTurnByPlayerId?.[lobby.playerId] === gameState.turnNumber;

  const jailDecisionForMe = Boolean(
    isMyTurn &&
    activeGamePlayer?.inJail &&
    gameState.turnPhase === "jail-decision"
  );

  const hasBlockingDecision = Boolean(
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingAuction ||
    gameState.pendingSpeedDieAction ||
    gameState.pendingMegaAction ||
    gameState.pendingDebt ||
    jailDecisionForMe,
  );

  useEffect(() => {
    const turnKey = `${gameState.turnNumber}:${gameState.currentPlayerIndex}:${activeGamePlayer?.id ?? "none"}`;
    const isOptionalActionContext = gameState.turnPhase === "optional-actions" || Boolean(
      gameState.pendingTrade && outgoingTradeForMe,
    );

    if (!isMyTurn || !isOptionalActionContext) {
      optionalActionDeadlineRef.current = null;
      optionalActionTurnKeyRef.current = null;
      setOptionalActionSeconds(150);
      return;
    }

    if (optionalActionTurnKeyRef.current !== turnKey) {
      optionalActionTurnKeyRef.current = turnKey;
      optionalActionDeadlineRef.current = gameState.optionalActionDeadline;
    } else if (gameState.optionalActionDeadline) {
      // Keep the last authoritative deadline for this turn. A trade-state packet
      // must never visually bounce the clock back to 2:30 if the deadline is
      // momentarily omitted while the proposal UI updates.
      optionalActionDeadlineRef.current = gameState.optionalActionDeadline;
    }

    const deadline = gameState.optionalActionDeadline ?? optionalActionDeadlineRef.current;
    if (!deadline) {
      setOptionalActionSeconds(150);
      return;
    }

    const update = () => {
      setOptionalActionSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [
    activeGamePlayer?.id,
    gameState.currentPlayerIndex,
    gameState.optionalActionDeadline,
    gameState.pendingTrade?.id,
    gameState.turnNumber,
    gameState.turnPhase,
    isMyTurn,
    outgoingTradeForMe,
  ]);

  useEffect(() => {
    const debtForMe = gameState.pendingDebt?.debtorId === lobby.playerId;

    // Only an incoming trade that needs a manual human decision is allowed to
    // summon the Trade dialog. Outgoing offers do not need to steal focus, and
    // automated/autopilot trades must stay non-blocking so repeated AI offers
    // cannot create an open -> expire -> reopen UI loop.
    if (incomingTradeForMe && !autopilotActive && !hasBlockingDecision) {
      setActivePanel("trade");
      setPopupOpen(true);
    } else if (debtForMe) {
      // Open the debt dialog when debt first arrives, but do not force the
      // active panel back to null on every render. Manual Liquidation switches
      // to the Properties panel and must stay there while the debt is active.
      if (!popupOpen) {
        setActivePanel(null);
        setPopupOpen(true);
      }
    } else if (autopilotActive && activePanel === "trade" && tradeInvolvesMe) {
      setPopupOpen(false);
      setActivePanel(null);
    } else if (!debtForMe && popupOpen && activePanel === null) {
      setPopupOpen(false);
    }
  }, [
    activePanel,
    autopilotActive,
    gameState.pendingDebt,
    hasBlockingDecision,
    incomingTradeForMe,
    lobby.playerId,
    popupOpen,
    tradeInvolvesMe,
  ]);

  useEffect(() => {
    const result = gameState.lastTradeResult;
    if (!result || handledTradeResultIdRef.current === result.id) return;

    const involvesMe = (result.participantIds ?? [result.proposerId, result.recipientId]).includes(lobby.playerId);
    if (!involvesMe || gameState.pendingTrade || activePanel !== "trade" || !popupOpen) return;

    // A result can arrive one state update before pendingTrade is cleared. Do not mark it
    // handled until the trade is truly terminal, otherwise the follow-up render would
    // permanently skip this close timer and leave the Trade panel stranded open.
    const closeTimer = window.setTimeout(() => {
      handledTradeResultIdRef.current = result.id;
      setPopupOpen(false);
      setActivePanel(null);
    }, 1400);

    return () => window.clearTimeout(closeTimer);
  }, [
    activePanel,
    gameState.lastTradeResult,
    gameState.pendingTrade,
    lobby.playerId,
    popupOpen,
  ]);

  useEffect(() => {
    const previous = previousRejectAllActiveRef.current;
    previousRejectAllActiveRef.current = rejectAllThisTurn;

    if (!previous && rejectAllThisTurn && popupOpen && activePanel === "trade") {
      const timer = window.setTimeout(() => {
        setPopupOpen(false);
        setActivePanel(null);
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [activePanel, popupOpen, rejectAllThisTurn]);

  useEffect(() => {
    const currentSequence = gameState.rollSequence ?? 0;
    const previousSequence = previousRollSequenceRef.current;
    previousRollSequenceRef.current = currentSequence;

    // Once a roll starts, the dice/token presentation owns the foreground.
    // Close any optional management dialog so the roll is never layered on top
    // of Properties or Trade.
    if (currentSequence !== previousSequence && popupOpen && activePanel) {
      setPopupOpen(false);
      setActivePanel(null);
    }
  }, [activePanel, gameState.rollSequence, popupOpen]);

  useEffect(() => {
    const boardDecisionOwnsFocus = Boolean(
      gameState.pendingPurchase ||
      gameState.pendingCard ||
      gameState.pendingAuction ||
      gameState.pendingSpeedDieAction ||
      gameState.pendingMegaAction
    );

    if (boardDecisionOwnsFocus && popupOpen && activePanel) {
      setPopupOpen(false);
      setActivePanel(null);
    }
  }, [
    activePanel,
    gameState.pendingAuction,
    gameState.pendingCard,
    gameState.pendingMegaAction,
    gameState.pendingPurchase,
    gameState.pendingSpeedDieAction,
    popupOpen,
  ]);

  const optionalTimeLabel = `${Math.floor(optionalActionSeconds / 60)}:${String(optionalActionSeconds % 60).padStart(2, "0")}`;

  return (
    <>


      {popupOpen && (
        <div className={`turn-actions-popup-layer ${activePanel ? `is-${activePanel}` : "is-decision"}`}>
          <section
            className="turn-actions-popup"
            role="dialog"
            aria-label={activePanel === "properties" ? "Properties" : activePanel === "trade" ? "Trade" : activePanel === "history" ? "Match history" : "Match decision"}
            style={{ background: theme.cardBackground, borderColor: theme.border, color: theme.text }}
          >
            <header className="turn-actions-popup-header">
              <div>
                <p className="modal-eyebrow">
                  {isSpectator ? "Match tools" : isMyTurn ? "Your turn" : "Controls"}
                </p>
                <h2>
                  {activePanel === "properties"
                    ? "Properties"
                    : activePanel === "trade"
                      ? "Trade"
                      : activePanel === "history"
                        ? "Match History"
                        : gameState.pendingDebt?.debtorId === lobby.playerId
                          ? "Debt Resolution"
                          : "Match Decision"}
                </h2>
                <small style={{ color: theme.mutedText }}>
                  {isSpectator
                    ? "Review the match"
                    : autopilotActive
                      ? "Autopilot is playing. Use Take Control in the header whenever you want."
                      : hasBlockingDecision
                        ? `${blockingLabel(gameState)} is active. Complete it on the board.`
                        : activePanel
                          ? "Detailed match control"
                          : `Phase: ${gameState.turnPhase.replaceAll("-", " ")}`}
                </small>
              </div>
              {isMyTurn && (gameState.turnPhase === "optional-actions" || Boolean(gameState.pendingTrade && outgoingTradeForMe)) && (
                <div className={`turn-timer-chip ${optionalActionSeconds <= 30 ? "is-urgent" : ""}`}>
                  <span>Turn time</span>
                  <strong>{optionalTimeLabel}</strong>
                </div>
              )}
              <button
                type="button"
                className="turn-actions-popup-close"
                aria-label="Close panel"
                onClick={() => setPopupOpen(false)}
              >
                ×
              </button>
            </header>

            {hasBlockingDecision && isMyTurn && (
              <div className="turn-actions-blocking-notice" role="status">
                <strong>⏳ {blockingLabel(gameState)}</strong>
                <span>{jailDecisionForMe
                  ? "Choose your Jail outcome on the board when ready. You can still manage assets and trade first."
                  : "Complete the required decision on the board to continue."}</span>
              </div>
            )}



            {!isSpectator && currentGamePlayer && (
              <DebtPanel
                playerId={lobby.playerId}
                gameState={gameState}
                isResolvingDebt={isResolvingDebt}
                theme={theme}
                onPayDebt={onPayDebt}
                onAutoLiquidate={onAutoLiquidateDebt}
                onManualLiquidation={() => {
                  setActivePanel("properties");
                  setPopupOpen(true);
                }}
                onDeclareBankruptcy={onDeclareBankruptcy}
              />
            )}

            {activePanel && (
              <div className="turn-actions-detail-header">
                <strong>
                  {activePanel === "properties"
                    ? "Property & asset management"
                    : activePanel === "trade"
                      ? "Trading"
                      : "Match history"}
                </strong>
                <button type="button" onClick={() => setPopupOpen(false)}>Close</button>
              </div>
            )}

            <div className={`turn-actions-popup-scroll ${activePanel ? "has-detail" : ""}`}>
              {!activePanel && (autopilotActive || hasBlockingDecision) && (
                <div className="turn-actions-popup-hint is-compact" style={{ background: theme.secondaryBackground, borderColor: theme.border }}>
                  <strong>{autopilotActive ? "Autopilot active" : blockingLabel(gameState)}</strong>
                  <span style={{ color: theme.mutedText }}>
                    {autopilotActive
                      ? "Use Take Control in the header to resume manual play."
                      : "Complete the required decision on the board to continue."}
                  </span>
                </div>
              )}

              {!isSpectator && activePanel === "properties" && (
                <div className="sidebar-tab-panel">
                  <PropertyManagementPanel
                    playerId={lobby.playerId}
                    gameState={gameState}
                    isBuilding={isBuilding}
                    isManagingAsset={isManagingAsset}
                    theme={theme}
                    onBuild={onBuild}
                    onBuildGroupTo={onBuildGroupTo}
                    onMortgage={onMortgage}
                    onUnmortgage={onUnmortgage}
                    onSellBuilding={onSellBuilding}
                    onBuildDepot={onBuildDepot}
                    onSellDepot={onSellDepot}
                  />
                </div>
              )}

              {!isSpectator && activePanel === "trade" && (
                <div className="sidebar-tab-panel">
                  <TradePanel
                    playerId={lobby.playerId}
                    gameState={gameState}
                    tradeDraft={tradeDraft}
                    isSubmittingTrade={isSubmittingTrade}
                    theme={theme}
                    onDraftChange={onTradeDraftChange}
                    onPropose={onTradePropose}
                    onAccept={onTradeAccept}
                    onDecline={onTradeDecline}
                    onRejectAllTrades={onRejectAllTrades}
                  />
                </div>
              )}

              {activePanel === "history" && (
                <div className="sidebar-tab-panel activity-history">
                  <div className="history-heading">
                    <div>
                      <p className="modal-eyebrow">Match log</p>
                      <h3>Recent actions</h3>
                    </div>
                    <span>{gameState.activityLog?.length ?? 0}</span>
                  </div>
                  {(gameState.activityLog?.length ?? 0) === 0 ? (
                    <p style={{ color: theme.mutedText }}>Actions will appear here as the match progresses.</p>
                  ) : (
                    [...gameState.activityLog].slice(-40).reverse().map((entry) => (
                      <article key={entry.id} className={`history-entry history-${entry.kind}`} style={{ borderColor: theme.border }}>
                        <span>Turn {entry.turnNumber}</span>
                        <strong>{entry.message}</strong>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
