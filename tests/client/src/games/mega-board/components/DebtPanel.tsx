import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import { styles } from "../styles/gameStyles";

interface DebtPanelProps {
  playerId: string;
  gameState: GameState;
  isResolvingDebt: boolean;
  theme: {
    secondaryBackground: string;
    mutedText: string;
    border: string;
  };
  onPayDebt: () => void;
  onAutoLiquidate: () => void;
  onManualLiquidation: () => void;
  onDeclareBankruptcy: () => void;
}

export function DebtPanel({
  playerId,
  gameState,
  isResolvingDebt,
  theme,
  onPayDebt,
  onAutoLiquidate,
  onManualLiquidation,
  onDeclareBankruptcy,
}: DebtPanelProps) {
  const debt = gameState.pendingDebt;
  if (!debt) return null;

  const debtor = gameState.players.find((player) => player.id === debt.debtorId);
  const creditor = debt.creditorId
    ? gameState.players.find((player) => player.id === debt.creditorId)
    : null;
  const isDebtor = debt.debtorId === playerId;
  const cash = debtor?.cash ?? 0;
  const shortfall = Math.max(0, debt.amount - cash);
  const covered = shortfall === 0;

  return (
    <section
      className="debt-resolution-card"
      style={{
        ...styles.debtPanel,
        background: theme.secondaryBackground,
        borderColor: "#b42318",
      }}
    >
      <p style={styles.eyebrow}>Debt resolution</p>
      <h3 style={styles.debtTitle}>
        {isDebtor ? "You must resolve a debt" : `${debtor?.name ?? "A player"} is resolving debt`}
      </h3>

      <div style={styles.debtFigures} className="debt-figures-clean">
        <span>Owed<strong>£{debt.amount.toLocaleString()}</strong></span>
        <span>Cash<strong>£{cash.toLocaleString()}</strong></span>
        <span>Still needed<strong>£{shortfall.toLocaleString()}</strong></span>
      </div>

      <p style={{ ...styles.debtReason, color: theme.mutedText }}>
        {debt.reason}{creditor ? ` • Creditor: ${creditor.name}` : " • Creditor: Bank"}
      </p>

      {isDebtor && (
        <>
          <div className={`debt-progress ${covered ? "is-covered" : ""}`}>
            <div><span>Debt coverage</span><strong>{covered ? "Ready to pay" : `£${shortfall.toLocaleString()} remaining`}</strong></div>
            <div><span style={{ width: `${Math.min(100, (cash / Math.max(1, debt.amount)) * 100)}%` }} /></div>
          </div>

          <p style={{ ...styles.debtHelp, color: theme.mutedText }}>
            Auto Liquidate raises only what is needed. Manual Liquidation opens your normal asset tools without enabling Autopilot.
          </p>

          <div className="debt-resolution-actions">
            <button
              type="button"
              className="debt-action-auto"
              onClick={onAutoLiquidate}
              disabled={isResolvingDebt || covered}
            >
              <strong>⚡ Auto Liquidate{shortfall > 0 ? ` £${shortfall.toLocaleString()}` : ""}</strong>
              <small>Raise only enough cash to cover the shortfall</small>
            </button>
            <button
              type="button"
              className="debt-action-manual"
              onClick={onManualLiquidation}
              disabled={isResolvingDebt}
            >
              <strong>🛠 Manual Liquidation</strong>
              <small>Choose buildings, depots and mortgages yourself</small>
            </button>
          </div>

          <div style={styles.debtButtons} className="debt-payment-actions">
            <button
              type="button"
              onClick={onPayDebt}
              disabled={isResolvingDebt || !covered}
              style={{ ...styles.primaryButton, opacity: isResolvingDebt || !covered ? 0.5 : 1 }}
            >
              {covered ? `Pay £${debt.amount.toLocaleString()} debt` : "Pay debt"}
            </button>
            <button
              type="button"
              onClick={onDeclareBankruptcy}
              disabled={isResolvingDebt}
              style={styles.dangerButton}
            >
              Declare bankruptcy
            </button>
          </div>
        </>
      )}
    </section>
  );
}
