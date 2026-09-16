import {
  BOARD_SPACES,
  getBoardSpace,
  getPropertyGroupColour,
  getPropertyGroupSpaces,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  type PropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board";
import {
  getSingleDevelopmentEligibility,
  planGroupDevelopmentToLevel,
} from "../../../../../shared/games/mega-board/development";
import type {
  BuildingLevel,
  GameState,
} from "../../../../../shared/games/mega-board/game-state";
import { styles } from "../styles/gameStyles";

interface PropertyManagementPanelProps {
  playerId: string;
  gameState: GameState;
  isBuilding: boolean;
  isManagingAsset: boolean;
  theme: {
    secondaryBackground: string;
    text: string;
    mutedText: string;
    border: string;
  };
  onBuild: (spaceId: number) => void;
  onBuildGroupTo: (spaceId: number, targetLevel: 5 | 6) => void;
  onMortgage: (spaceId: number) => void;
  onUnmortgage: (spaceId: number) => void;
  onSellBuilding: (spaceId: number) => void;
  onBuildDepot: (spaceId: number) => void;
  onSellDepot: (spaceId: number) => void;
}

function developmentLabel(level: BuildingLevel): string {
  switch (level) {
    case 0: return "No buildings";
    case 1: return "1 house";
    case 2: return "2 houses";
    case 3: return "3 houses";
    case 4: return "4 houses";
    case 5: return "Hotel";
    case 6: return "Skyscraper";
  }
}

export function PropertyManagementPanel({
  playerId,
  gameState,
  isBuilding,
  isManagingAsset,
  theme,
  onBuild,
  onBuildGroupTo,
  onMortgage,
  onUnmortgage,
  onSellBuilding,
  onBuildDepot,
  onSellDepot,
}: PropertyManagementPanelProps) {
  const activePlayer = gameState.players[gameState.currentPlayerIndex];
  const player = gameState.players.find((candidate) => candidate.id === playerId);

  if (!player) return null;

  const ownedColourProperties = BOARD_SPACES.filter(
    (space): space is PropertyBoardSpace =>
      isPropertyBoardSpace(space) && gameState.propertyOwners[space.id] === playerId,
  );

  const ownedAssets = [...player.properties]
    .sort((a, b) => a - b)
    .map((spaceId) => getBoardSpace(spaceId))
    .filter(isOwnableBoardSpace);

  const personalInventory = ownedColourProperties.reduce(
    (totals, property) => {
      const level = gameState.propertyDevelopments[property.id] ?? 0;
      if (level >= 1 && level <= 4) totals.houses += level;
      else if (level === 5) totals.hotels += 1;
      else if (level === 6) totals.skyscrapers += 1;
      return totals;
    },
    { houses: 0, hotels: 0, skyscrapers: 0, depots: 0 },
  );

  personalInventory.depots = player.properties.filter(
    (spaceId) => Boolean(gameState.railroadDepots[spaceId]),
  ).length;

  const hasMandatoryDecision = Boolean(
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingDebt ||
    gameState.pendingAuction ||
    gameState.pendingMegaAction ||
    gameState.pendingSpeedDieAction,
  );

  const canDevelopNow = Boolean(
    activePlayer?.id === playerId &&
    !player.isBankrupt &&
    gameState.phase === "playing" &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision") &&
    !hasMandatoryDecision,
  );

  const isDebtDebtor = gameState.pendingDebt?.debtorId === playerId;
  const canManageAssetsNow =
    (activePlayer?.id === playerId || isDebtDebtor) &&
    gameState.phase === "playing" &&
    !gameState.pendingPurchase;

  const canLiquidateNow =
    canManageAssetsNow &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision" ||
      gameState.turnPhase === "debt");

  const canInvestNow =
    canManageAssetsNow &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision");

  const groupTargetRows = [...new Set(ownedColourProperties.map((property) => property.group))]
    .map((groupName) => {
      const groupSpaces = getPropertyGroupSpaces(groupName);
      const ownedGroupSpaces = groupSpaces.filter(
        (candidate) => gameState.propertyOwners[candidate.id] === playerId,
      );
      if (ownedGroupSpaces.length < groupSpaces.length - 1) return null;

      const anchorProperty = ownedGroupSpaces[0];
      if (!anchorProperty) return null;

      const hotelPlan = planGroupDevelopmentToLevel(gameState, playerId, anchorProperty.id, 5);
      const skyscraperPlan = planGroupDevelopmentToLevel(gameState, playerId, anchorProperty.id, 6);
      const needsHotelTarget = ownedGroupSpaces.some(
        (candidate) => (gameState.propertyDevelopments[candidate.id] ?? 0) < 5,
      );
      const completeGroup = ownedGroupSpaces.length === groupSpaces.length;
      const needsSkyscraperTarget = completeGroup && groupSpaces.some(
        (candidate) => (gameState.propertyDevelopments[candidate.id] ?? 0) < 6,
      );

      if (!needsHotelTarget && !needsSkyscraperTarget) return null;

      return {
        groupName,
        anchorProperty,
        ownedCount: ownedGroupSpaces.length,
        groupCount: groupSpaces.length,
        hotelPlan,
        skyscraperPlan,
        needsHotelTarget,
        needsSkyscraperTarget,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return (
    <section style={styles.propertyManager}>
      <div>
        <p style={styles.eyebrow}>Property manager</p>
        <h3 style={styles.propertyManagerTitle}>Manage your portfolio</h3>
        <p style={{ ...styles.propertyManagerText, color: theme.mutedText }}>
          Build, sell, mortgage and manage Train Depots from the same asset card.
        </p>
      </div>

      <div
        style={{
          ...styles.bankInventory,
          background: theme.secondaryBackground,
          borderColor: theme.border,
        }}
      >
        <span title="Available cash">💷 £{player.cash.toLocaleString()}</span>
        <span title="Your houses">🏠 {personalInventory.houses}</span>
        <span title="Your hotels">🏨 {personalInventory.hotels}</span>
        <span title="Your skyscrapers">🏙️ {personalInventory.skyscrapers}</span>
        <span title="Your Train Depots">🚉 {personalInventory.depots}</span>
      </div>

      {groupTargetRows.length > 0 && (
        <div className="property-group-target-list" aria-label="Colour group target development">
          {groupTargetRows.map((row) => {
            const hotelCashShort = row.hotelPlan.totalCost > 0 && player.cash < row.hotelPlan.totalCost;
            const skyscraperCashShort = row.skyscraperPlan.totalCost > 0 && player.cash < row.skyscraperPlan.totalCost;
            const hotelEnabled = Boolean(
              row.needsHotelTarget &&
              row.hotelPlan.ok &&
              canDevelopNow &&
              !isBuilding,
            );
            const skyscraperEnabled = Boolean(
              row.needsSkyscraperTarget &&
              row.skyscraperPlan.ok &&
              canDevelopNow &&
              !isBuilding,
            );
            const label = row.groupName
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return (
              <div
                key={row.groupName}
                className="property-group-target-row"
                style={{ background: theme.secondaryBackground, borderColor: theme.border }}
              >
                <span
                  className="property-group-target-colour"
                  style={{ background: getPropertyGroupColour(row.groupName) }}
                />
                <div className="property-group-target-copy">
                  <strong>{label} group</strong>
                  <small style={{ color: theme.mutedText }}>
                    Target the whole developable group at once · {row.ownedCount}/{row.groupCount} owned
                  </small>
                </div>
                <div className="property-group-target-actions">
                  {row.needsHotelTarget && (
                    <button
                      type="button"
                      onClick={() => onBuildGroupTo(row.anchorProperty.id, 5)}
                      disabled={!hotelEnabled}
                      className="property-build-action is-bulk"
                      title={row.hotelPlan.reason ?? `Raise every owned property in this group to Hotel level for £${row.hotelPlan.totalCost.toLocaleString()}.`}
                    >
                      {hotelEnabled
                        ? `Group to Hotels • £${row.hotelPlan.totalCost.toLocaleString()}`
                        : hotelCashShort
                          ? `Need £${row.hotelPlan.totalCost.toLocaleString()} for Hotels`
                          : "Hotels unavailable"}
                    </button>
                  )}
                  {row.needsSkyscraperTarget && (
                    <button
                      type="button"
                      onClick={() => onBuildGroupTo(row.anchorProperty.id, 6)}
                      disabled={!skyscraperEnabled}
                      className="property-build-action is-bulk"
                      title={row.skyscraperPlan.reason ?? `Raise the complete colour group to Skyscraper level for £${row.skyscraperPlan.totalCost.toLocaleString()}.`}
                    >
                      {skyscraperEnabled
                        ? `Group to Skyscrapers • £${row.skyscraperPlan.totalCost.toLocaleString()}`
                        : skyscraperCashShort
                          ? `Need £${row.skyscraperPlan.totalCost.toLocaleString()} for Skyscrapers`
                          : "Skyscrapers unavailable"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ownedAssets.length === 0 ? (
        <p style={{ ...styles.emptyPropertyText, color: theme.mutedText }}>
          You do not own any properties or assets yet.
        </p>
      ) : (
        <div className="property-management-list property-management-unified" style={styles.propertyManagementList}>
          {ownedAssets.map((space) => {
            const mortgaged = Boolean(gameState.mortgagedProperties[space.id]);
            const isProperty = isPropertyBoardSpace(space);
            const isRailroad = isRailroadBoardSpace(space);
            const level = isProperty
              ? (gameState.propertyDevelopments[space.id] ?? 0)
              : 0;
            const hasDepot = isRailroad && Boolean(gameState.railroadDepots[space.id]);
            const unmortgageCost = Math.ceil(space.mortgage * 1.1);
            const groupHasBuildings = isProperty
              ? getPropertyGroupSpaces(space.group).some(
                  (candidate) =>
                    gameState.propertyOwners[candidate.id] === playerId &&
                    (gameState.propertyDevelopments[candidate.id] ?? 0) > 0,
                )
              : false;

            const canMortgage =
              canLiquidateNow &&
              !mortgaged &&
              !groupHasBuildings &&
              !hasDepot &&
              !isManagingAsset;

            const canUnmortgage =
              canInvestNow &&
              mortgaged &&
              player.cash >= unmortgageCost &&
              !isManagingAsset;

            const canSellLevel =
              canLiquidateNow &&
              isProperty &&
              level > 0 &&
              !mortgaged &&
              !isManagingAsset;

            const canBuildDepot =
              canInvestNow &&
              isRailroad &&
              !mortgaged &&
              !hasDepot &&
              player.cash >= (isRailroad ? space.depotCost : 0) &&
              gameState.bankInventory.depots > 0 &&
              !isManagingAsset;

            const canSellDepot =
              canLiquidateNow &&
              isRailroad &&
              hasDepot &&
              !isManagingAsset;

            const single = isProperty
              ? getSingleDevelopmentEligibility(gameState, playerId, space.id)
              : null;
            /*
             * The server already rejects unaffordable development, but the
             * controls must mirror that truth before the player clicks. Keep
             * an explicit cash gate here so stale/partial eligibility data can
             * never leave a green Build button active without enough cash.
             */
            const singleCost = isProperty ? space.houseCost : 0;
            const singleAffordable = player.cash >= singleCost;
            const singleEnabled = Boolean(
              isProperty &&
              !mortgaged &&
              level < 6 &&
              canDevelopNow &&
              single?.ok &&
              singleAffordable &&
              !isBuilding,
            );
            const warning = isProperty && !mortgaged && level < 6
              ? !canDevelopNow
                ? hasMandatoryDecision
                  ? "Finish the current mandatory decision before developing."
                  : activePlayer?.id !== playerId
                    ? "You can only develop during your own turn."
                    : undefined
                : !single?.ok
                  ? single?.reason
                  : undefined
              : undefined;

            const accent = isProperty
              ? getPropertyGroupColour(space.group)
              : isRailroad
                ? "#343941"
                : "#7b8794";

            return (
              <div
                key={space.id}
                className={`property-development-card property-unified-card ${mortgaged ? "is-mortgaged" : ""}`}
                style={{
                  ...styles.propertyManagementCard,
                  background: theme.secondaryBackground,
                  borderColor: mortgaged ? "#b42318" : accent,
                }}
              >
                <span
                  style={{
                    ...styles.propertyManagerColour,
                    background: accent,
                  }}
                />

                <div style={styles.propertyManagerBody}>
                  <strong>{space.name}</strong>
                  <span style={{ ...styles.propertyManagerMeta, color: theme.mutedText }}>
                    {mortgaged
                      ? `Mortgaged • Release £${unmortgageCost.toLocaleString()}`
                      : isProperty
                        ? `${developmentLabel(level)}${level < 6 ? ` • Next build £${space.houseCost.toLocaleString()}` : " • Maximum development"}`
                        : isRailroad
                          ? hasDepot
                            ? `Train Depot installed • Mortgage £${space.mortgage.toLocaleString()}`
                            : `No Train Depot • Mortgage £${space.mortgage.toLocaleString()}`
                          : `Mortgage £${space.mortgage.toLocaleString()}`}
                  </span>
                  {warning && (
                    <span style={{ ...styles.propertyManagerWarning, color: theme.mutedText }}>
                      {warning}
                    </span>
                  )}
                </div>

                <div className="property-development-actions property-unified-actions">
                  {isProperty && !mortgaged && level < 6 && (
                    <button
                      type="button"
                      onClick={() => onBuild(space.id)}
                      disabled={!singleEnabled}
                      className="property-build-action"
                      title={
                        !singleAffordable
                          ? `You need £${singleCost.toLocaleString()} but only have £${player.cash.toLocaleString()}.`
                          : single?.ok
                            ? `Add the next legal building for £${singleCost.toLocaleString()}`
                            : single?.reason
                      }
                    >
                      {!singleAffordable
                        ? `Need £${singleCost.toLocaleString()}`
                        : level === 5
                          ? `Build Skyscraper • £${singleCost.toLocaleString()}`
                          : `Build • £${singleCost.toLocaleString()}`}
                    </button>
                  )}

                  {isProperty && !mortgaged && level > 0 && (
                    <button
                      type="button"
                      onClick={() => onSellBuilding(space.id)}
                      disabled={!canSellLevel}
                      className="property-build-action is-sell"
                    >
                      Sell level • £{Math.floor(space.houseCost / 2).toLocaleString()}
                    </button>
                  )}

                  {mortgaged ? (
                    <button
                      type="button"
                      onClick={() => onUnmortgage(space.id)}
                      disabled={!canUnmortgage}
                      className="property-build-action is-asset"
                    >
                      Unmortgage • £{unmortgageCost.toLocaleString()}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onMortgage(space.id)}
                      disabled={!canMortgage}
                      className="property-build-action is-asset"
                    >
                      Mortgage • £{space.mortgage.toLocaleString()}
                    </button>
                  )}

                  {isRailroad && (
                    <button
                      type="button"
                      onClick={() => hasDepot ? onSellDepot(space.id) : onBuildDepot(space.id)}
                      disabled={hasDepot ? !canSellDepot : !canBuildDepot}
                      className={`property-build-action ${hasDepot ? "is-sell" : "is-depot"}`}
                    >
                      {hasDepot
                        ? `Sell depot • £${Math.floor(space.depotCost / 2).toLocaleString()}`
                        : `Build depot • £${space.depotCost.toLocaleString()}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
