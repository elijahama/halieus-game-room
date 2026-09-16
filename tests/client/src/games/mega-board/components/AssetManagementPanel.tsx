import {
  BOARD_SPACES,
  getBoardSpace,
  getPropertyGroupSpaces,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
} from "../../../../../shared/games/mega-board/board";

import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state";

import { styles } from "../styles/gameStyles";


const BOARD_ORDER = new Map(BOARD_SPACES.map((space, index) => [space.id, index] as const));

function compareBoardOrder(first: number, second: number): number {
  return (BOARD_ORDER.get(first) ?? Number.MAX_SAFE_INTEGER) -
    (BOARD_ORDER.get(second) ?? Number.MAX_SAFE_INTEGER);
}
interface AssetManagementPanelProps {
  playerId: string;
  gameState: GameState;
  isManagingAsset: boolean;
  theme: {
    secondaryBackground: string;
    mutedText: string;
    border: string;
  };
  onMortgage: (spaceId: number) => void;
  onUnmortgage: (spaceId: number) => void;
  onSellBuilding: (spaceId: number) => void;
  onBuildDepot: (spaceId: number) => void;
  onSellDepot: (spaceId: number) => void;
}

export function AssetManagementPanel({
  playerId,
  gameState,
  isManagingAsset,
  theme,
  onMortgage,
  onUnmortgage,
  onSellBuilding,
  onBuildDepot,
  onSellDepot,
}: AssetManagementPanelProps) {
  const player =
    gameState.players.find(
      (candidate) =>
        candidate.id === playerId,
    );

  const activePlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  if (!player) {
    return null;
  }

  const isDebtDebtor = gameState.pendingDebt?.debtorId === playerId;
  const canManageNow =
    (activePlayer?.id === playerId || isDebtDebtor) &&
    gameState.phase === "playing" &&
    !gameState.pendingPurchase;

  const canLiquidateNow =
    canManageNow &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision" ||
      gameState.turnPhase === "debt");

  const canInvestNow =
    canManageNow &&
    (gameState.turnPhase === "roll" ||
      gameState.turnPhase === "optional-actions" ||
      gameState.turnPhase === "jail-decision");

  const ownedAssets =
    [...player.properties]
      .sort(compareBoardOrder)
      .map((spaceId) =>
        getBoardSpace(spaceId),
      )
      .filter(isOwnableBoardSpace);

  return (
    <section style={styles.assetPanel}>
      <div>
        <p style={styles.eyebrow}>
          Asset management
        </p>

        <h3 style={styles.assetTitle}>
          Mortgages and sales
        </h3>

        <p
          style={{
            ...styles.assetHelp,
            color: theme.mutedText,
          }}
        >
          Mortgage undeveloped assets for cash. Train Depots cost £100, double station rent and sell back for £50.
        </p>
      </div>

      {ownedAssets.length === 0 ? (
        <p
          style={{
            ...styles.emptyPropertyText,
            color: theme.mutedText,
          }}
        >
          You do not own any mortgageable assets.
        </p>
      ) : (
        <div style={styles.assetList}>
          {ownedAssets.map((space) => {
            const mortgaged =
              Boolean(
                gameState
                  .mortgagedProperties[
                  space.id
                ],
              );

            const development =
              isPropertyBoardSpace(space)
                ? gameState
                    .propertyDevelopments[
                    space.id
                  ] ?? 0
                : 0;

            const isRailroad =
              isRailroadBoardSpace(space);

            const hasDepot =
              isRailroad &&
              Boolean(
                gameState.railroadDepots[
                  space.id
                ],
              );

            const unmortgageCost =
              Math.ceil(
                space.mortgage * 1.1,
              );

            const groupHasBuildings =
              isPropertyBoardSpace(space) &&
              getPropertyGroupSpaces(space.group).some(
                (candidate) =>
                  gameState.propertyOwners[candidate.id] === playerId &&
                  (gameState.propertyDevelopments[candidate.id] ?? 0) > 0,
              );

            const canMortgage =
              canLiquidateNow &&
              !mortgaged &&
              !groupHasBuildings &&
              !hasDepot &&
              !isManagingAsset;

            const canUnmortgage =
              canInvestNow &&
              mortgaged &&
              player.cash >=
                unmortgageCost &&
              !isManagingAsset;

            const canSell =
              canLiquidateNow &&
              isPropertyBoardSpace(space) &&
              development > 0 &&
              !mortgaged &&
              !isManagingAsset;

            const canBuildDepot =
              canInvestNow &&
              isRailroad &&
              !mortgaged &&
              !hasDepot &&
              player.cash >=
                (isRailroad
                  ? space.depotCost
                  : 0) &&
              gameState.bankInventory.depots > 0 &&
              !isManagingAsset;

            const canSellDepot =
              canLiquidateNow &&
              isRailroad &&
              hasDepot &&
              !isManagingAsset;

            return (
              <div
                key={space.id}
                style={{
                  ...styles.assetCard,
                  background:
                    theme.secondaryBackground,
                  borderColor: mortgaged
                    ? "#b42318"
                    : theme.border,
                }}
              >
                <div style={styles.assetBody}>
                  <strong>
                    {space.name}
                  </strong>

                  <span
                    style={{
                      ...styles.assetMeta,
                      color:
                        theme.mutedText,
                    }}
                  >
                    {mortgaged
                      ? `Mortgaged • Release £${unmortgageCost.toLocaleString()}`
                      : `Mortgage £${space.mortgage.toLocaleString()}`}
                  </span>

                  {development > 0 && (
                    <span
                      style={{
                        ...styles.assetMeta,
                        color:
                          theme.mutedText,
                      }}
                    >
                      Development level {development} • Sell £
                      {Math.floor(
                        isPropertyBoardSpace(
                          space,
                        )
                          ? space.houseCost /
                              2
                          : 0,
                      ).toLocaleString()}
                    </span>
                  )}

                  {isRailroad && (
                    <span
                      style={{
                        ...styles.assetMeta,
                        color:
                          theme.mutedText,
                      }}
                    >
                      {hasDepot
                        ? `Train Depot installed • Sell £${Math.floor(space.depotCost / 2).toLocaleString()}`
                        : `Train Depot £${space.depotCost.toLocaleString()} • Doubles rent`}
                    </span>
                  )}
                </div>

                <div style={styles.assetButtons}>
                  {mortgaged ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUnmortgage(
                          space.id,
                        )
                      }
                      disabled={
                        !canUnmortgage
                      }
                      style={{
                        ...styles.assetButton,
                        opacity:
                          canUnmortgage
                            ? 1
                            : 0.5,
                      }}
                    >
                      Unmortgage
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onMortgage(
                          space.id,
                        )
                      }
                      disabled={
                        !canMortgage
                      }
                      style={{
                        ...styles.assetButton,
                        opacity:
                          canMortgage
                            ? 1
                            : 0.5,
                      }}
                    >
                      Mortgage
                    </button>
                  )}

                  {isPropertyBoardSpace(
                    space,
                  ) &&
                    development > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onSellBuilding(
                            space.id,
                          )
                        }
                        disabled={!canSell}
                        style={{
                          ...styles.sellButton,
                          opacity:
                            canSell
                              ? 1
                              : 0.5,
                        }}
                      >
                        Sell level
                      </button>
                    )}


                  {isRailroad && (
                    <button
                      type="button"
                      onClick={() =>
                        hasDepot
                          ? onSellDepot(
                              space.id,
                            )
                          : onBuildDepot(
                              space.id,
                            )
                      }
                      disabled={
                        hasDepot
                          ? !canSellDepot
                          : !canBuildDepot
                      }
                      style={{
                        ...(hasDepot
                          ? styles.sellButton
                          : styles.depotButton),
                        opacity:
                          (hasDepot
                            ? canSellDepot
                            : canBuildDepot)
                            ? 1
                            : 0.5,
                      }}
                    >
                      {hasDepot
                        ? "Sell depot"
                        : "Build depot"}
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
