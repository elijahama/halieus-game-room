import {
  getBoardSpace,
  getPropertyGroupSpaces,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import type { GameState } from "../../../../../shared/games/mega-board/game-state";
import { styles } from "../styles/gameStyles";

interface DebtPanelProps {
  playerId: string;
  gameState: GameState;
  isResolvingDebt: boolean;
  isManagingAsset: boolean;
  theme: {
    secondaryBackground: string;
    mutedText: string;
    border: string;
  };
  onPayDebt: () => void;
  onAutoLiquidate: () => void;
  onManualLiquidation: () => void;
  onMortgage: (spaceId: number) => void;
  onSellBuilding: (spaceId: number) => void;
  onDeclareBankruptcy: () => void;
}

export function DebtPanel({
  playerId,
  gameState,
  isResolvingDebt,
  isManagingAsset,
  theme,
  onPayDebt,
  onAutoLiquidate,
  onManualLiquidation,
  onMortgage,
  onSellBuilding,
  onDeclareBankruptcy,
}: DebtPanelProps) {
  const debt = gameState.pendingDebt;
  if (!debt) return null;

  const debtor = gameState.players.find((player) => player.id === debt.debtorId);
  const creditor = debt.creditorId
    ? gameState.players.find((player) => player.id === debt.creditorId)
    : null;
  const sharedCreditors = debt.creditorShares
    ?.map((share) => ({
      ...share,
      creditor: gameState.players.find((player) => player.id === share.creditorId),
    }))
    .filter((share) => Boolean(share.creditor));
  const isDebtor = debt.debtorId === playerId;
  const cash = debtor?.cash ?? 0;
  const shortfall = Math.max(0, debt.amount - cash);
  const covered = shortfall === 0;

  /*
   * Debt should not force the player to hunt through a separate management
   * screen. Surface the two most common emergency actions directly beside the
   * amount owed while retaining the full property manager for unusual cases.
   */
  const debtPropertyOptions = isDebtor && debtor
    ? debtor.properties
        .map((spaceId) => getBoardSpace(spaceId))
        .filter(isPropertyBoardSpace)
        .map((space) => {
          const mortgaged = Boolean(gameState.mortgagedProperties[space.id]);
          const development = gameState.propertyDevelopments[space.id] ?? 0;
          const group = getPropertyGroupSpaces(space.group);
          const groupHasBuildings = group.some(
            (candidate) =>
              gameState.propertyOwners[candidate.id] === debtor.id &&
              (gameState.propertyDevelopments[candidate.id] ?? 0) > 0,
          );
          const highestDevelopment = Math.max(
            0,
            ...group.map((candidate) => gameState.propertyDevelopments[candidate.id] ?? 0),
          );
          const canSellEvenly = development > 0 && development === highestDevelopment;
          const bankCanDowngrade = development === 5
            ? gameState.bankInventory.houses >= 4
            : development === 6
              ? gameState.bankInventory.hotels >= 1
              : true;

          return {
            space,
            mortgaged,
            development,
            canMortgage:
              !mortgaged &&
              !groupHasBuildings &&
              !isResolvingDebt &&
              !isManagingAsset,
            canSellBuilding:
              !mortgaged &&
              canSellEvenly &&
              bankCanDowngrade &&
              !isResolvingDebt &&
              !isManagingAsset,
          };
        })
        .filter((option) => !option.mortgaged || option.development > 0)
    : [];

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
        {debt.reason}
        {sharedCreditors?.length
          ? ` • Shared between: ${sharedCreditors.map((share) => `${share.creditor?.name ?? "Player"} £${share.amount.toLocaleString()}`).join(" · ")}`
          : creditor
            ? ` • Creditor: ${creditor.name}`
            : " • Creditor: Bank"}
      </p>

      {isDebtor && (
        <>
          <div className={`debt-progress ${covered ? "is-covered" : ""}`}>
            <div><span>Debt coverage</span><strong>{covered ? "Ready to pay" : `£${shortfall.toLocaleString()} remaining`}</strong></div>
            <div><span style={{ width: `${Math.min(100, (cash / Math.max(1, debt.amount)) * 100)}%` }} /></div>
          </div>

          {!covered && debtPropertyOptions.length > 0 && (
            <section className="debt-property-options" aria-label="Emergency property options">
              <div className="debt-property-options-heading">
                <div>
                  <strong>🏠 Property options</strong>
                  <small style={{ color: theme.mutedText }}>
                    Mortgage clear properties or sell buildings to raise the missing £{shortfall.toLocaleString()}.
                  </small>
                </div>
                <button type="button" onClick={onManualLiquidation} disabled={isResolvingDebt}>
                  Full manager
                </button>
              </div>

              <div className="debt-property-option-list">
                {debtPropertyOptions.map(({ space, mortgaged, development, canMortgage, canSellBuilding }) => {
                  const saleValue = Math.floor(space.houseCost / 2);
                  return (
                    <article key={space.id} className="debt-property-option" style={{ borderColor: theme.border }}>
                      <div>
                        <strong>{space.name}</strong>
                        <small style={{ color: theme.mutedText }}>
                          {mortgaged
                            ? "Already mortgaged"
                            : development > 0
                              ? `Development level ${development}`
                              : `Mortgage value £${space.mortgage.toLocaleString()}`}
                        </small>
                      </div>
                      <div className="debt-property-option-actions">
                        {development > 0 && (
                          <button
                            type="button"
                            className="property-build-action is-sell"
                            onClick={() => onSellBuilding(space.id)}
                            disabled={!canSellBuilding}
                            title={canSellBuilding ? `Sell one legal development level for £${saleValue.toLocaleString()}` : "Buildings must be sold evenly and the Bank must have the required replacement pieces."}
                          >
                            Sell building • £{saleValue.toLocaleString()}
                          </button>
                        )}
                        {!mortgaged && (
                          <button
                            type="button"
                            className="property-build-action is-asset"
                            onClick={() => onMortgage(space.id)}
                            disabled={!canMortgage}
                            title={canMortgage ? `Mortgage ${space.name} for £${space.mortgage.toLocaleString()}` : "Sell all buildings in this colour group before mortgaging."}
                          >
                            Mortgage • £{space.mortgage.toLocaleString()}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <p style={{ ...styles.debtHelp, color: theme.mutedText }}>
            Auto Liquidate raises only what is needed. Full Manager opens every legal building, depot and mortgage action without enabling Autopilot.
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
              <strong>🛠 Full Property Manager</strong>
              <small>Open all buildings, depots and mortgage controls</small>
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
