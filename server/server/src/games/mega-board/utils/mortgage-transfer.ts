import {
  getBoardSpace,
  isOwnableBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";
import type {
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

export function getMortgageTransferInterest(
  gameState: GameState,
  propertyIds: number[],
): number {
  return propertyIds.reduce(
    (total, propertyId) => {
      if (
        !gameState.mortgagedProperties[
          propertyId
        ]
      ) {
        return total;
      }

      const space = getBoardSpace(
        propertyId,
      );

      if (!isOwnableBoardSpace(space)) {
        return total;
      }

      return (
        total +
        Math.ceil(
          space.mortgage * 0.1,
        )
      );
    },
    0,
  );
}
