import { recordActivity } from "../utils/activity.js";
import { recordCashFlow } from "../utils/stats.js";
import type { Server, Socket } from "socket.io";

import {
  BOARD_SPACES,
  getBoardSpace,
  isOwnableBoardSpace,
  isPropertyBoardSpace,
  isRailroadBoardSpace,
  type PropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import type {
  BuildingLevel,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";

import {
  requireTurnPhase,
} from "../utils/turn-engine.js";

import {
  settleDebtIfAffordable,
} from "../utils/debt.js";

import {
  resumePendingJailMove,
} from "../utils/jail.js";

import type {
  GameStateResponse,
} from "../types/game.js";

import {
  emitGameState,
} from "../utils/game-state.js";

interface PropertyActionPayload {
  code: string;
  spaceId: number;
}

function getDevelopmentLevel(
  gameState: GameState,
  spaceId: number,
): BuildingLevel {
  return (
    gameState.propertyDevelopments[
      spaceId
    ] ?? 0
  );
}

function getGroupProperties(
  property: PropertyBoardSpace,
): PropertyBoardSpace[] {
  return BOARD_SPACES.filter(
    (space): space is PropertyBoardSpace =>
      space.type === "property" &&
      space.group === property.group,
  );
}

function ownerHasGroupBuildings(
  gameState: GameState,
  property: PropertyBoardSpace,
  ownerId: string,
): boolean {
  return getGroupProperties(property).some(
    (groupProperty) =>
      gameState.propertyOwners[groupProperty.id] === ownerId &&
      getDevelopmentLevel(
        gameState,
        groupProperty.id,
      ) > 0,
  );
}

function canSellEvenly(
  gameState: GameState,
  property: PropertyBoardSpace,
): boolean {
  const group =
    getGroupProperties(property);

  const targetLevel =
    getDevelopmentLevel(
      gameState,
      property.id,
    );

  const highestLevel = Math.max(
    ...group.map((groupProperty) =>
      getDevelopmentLevel(
        gameState,
        groupProperty.id,
      ),
    ),
  );

  return targetLevel === highestLevel;
}

function validatePlayerTurn(
  gameState: GameState,
  socketId: string,
): string | null {
  if (gameState.phase !== "playing") {
    return "Property management is only available during gameplay.";
  }

  if (gameState.pendingPurchase) {
    return "Resolve the current property purchase first.";
  }

  if (gameState.pendingCard) {
    return "Resolve the drawn card first.";
  }

  if (
    gameState.pendingDebt &&
    gameState.pendingDebt.debtorId !==
      socketId
  ) {
    return "Another player must resolve their debt first.";
  }

  const currentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];
  const isDebtDebtor =
    gameState.pendingDebt?.debtorId ===
    socketId;

  if (
    (!currentPlayer ||
      currentPlayer.id !== socketId) &&
    !isDebtDebtor
  ) {
    return "You can only manage assets during your own turn, unless you are resolving a transferred mortgage debt.";
  }

  return null;
}

function sellOneDevelopmentLevel(
  gameState: GameState,
  currentLevel: BuildingLevel,
): string | null {
  if (currentLevel === 0) {
    return "This property has no buildings to sell.";
  }

  if (
    currentLevel >= 1 &&
    currentLevel <= 4
  ) {
    gameState.bankInventory.houses += 1;
    return null;
  }

  if (currentLevel === 5) {
    if (
      gameState.bankInventory.houses < 4
    ) {
      return "The bank does not have four houses available to replace this hotel.";
    }

    gameState.bankInventory.hotels += 1;
    gameState.bankInventory.houses -= 4;
    return null;
  }

  if (currentLevel === 6) {
    if (
      gameState.bankInventory.hotels < 1
    ) {
      return "The bank does not have a hotel available to replace this skyscraper.";
    }

    gameState.bankInventory.skyscrapers += 1;
    gameState.bankInventory.hotels -= 1;
    return null;
  }

  return "Invalid development level.";
}

function getRoomCode(
  code: string | undefined,
): string {
  return code?.trim().toUpperCase() ?? "";
}

export function registerAssetHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:mortgage",
    (
      payload: PropertyActionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        getRoomCode(payload.code);

      const room = code
        ? rooms.get(code)
        : undefined;

      if (
        !code ||
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const turnPhaseError =
        requireTurnPhase(
          gameState,
          [
            "roll",
            "optional-actions",
            "jail-decision",
            "debt",
          ],
        );

      if (turnPhaseError) {
        acknowledge({
          ok: false,
          reason: turnPhaseError,
        });
        return;
      }

      const turnError =
        validatePlayerTurn(
          gameState,
          socket.id,
        );

      if (turnError) {
        acknowledge({
          ok: false,
          reason: turnError,
        });
        return;
      }

      const space =
        getBoardSpace(payload.spaceId);

      if (!isOwnableBoardSpace(space)) {
        acknowledge({
          ok: false,
          reason:
            "That board space cannot be mortgaged.",
        });
        return;
      }

      if (
        gameState.propertyOwners[
          space.id
        ] !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own this asset.",
        });
        return;
      }

      if (
        gameState.mortgagedProperties[
          space.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "This asset is already mortgaged.",
        });
        return;
      }

      if (
        isPropertyBoardSpace(space) &&
        ownerHasGroupBuildings(gameState, space, socket.id)
      ) {
        acknowledge({
          ok: false,
          reason:
            "Sell all buildings you own in this colour group before mortgaging one of your properties in the group.",
        });
        return;
      }

      if (
        isRailroadBoardSpace(space) &&
        gameState.railroadDepots[
          space.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "Sell the Train Depot before mortgaging this railway station.",
        });
        return;
      }

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "The player could not be found.",
        });
        return;
      }

      const mortgageValue =
        space.mortgage;

      gameState.mortgagedProperties[
        space.id
      ] = true;

      player.cash += mortgageValue;
      recordCashFlow(gameState, player, mortgageValue);

      const debtSettled =
        settleDebtIfAffordable(
          gameState,
        );

      if (debtSettled) {
        resumePendingJailMove(
          gameState,
        );
      }
      const activityMessage = `${player.name} mortgaged ${space.name} for £${mortgageValue}.`;
      recordActivity(gameState, activityMessage, "mortgage", player.id);


      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:unmortgage",
    (
      payload: PropertyActionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        getRoomCode(payload.code);

      const room = code
        ? rooms.get(code)
        : undefined;

      if (
        !code ||
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const turnPhaseError =
        requireTurnPhase(
          gameState,
          ["roll", "optional-actions", "jail-decision"],
        );

      if (turnPhaseError) {
        acknowledge({
          ok: false,
          reason: turnPhaseError,
        });
        return;
      }

      const turnError =
        validatePlayerTurn(
          gameState,
          socket.id,
        );

      if (turnError) {
        acknowledge({
          ok: false,
          reason: turnError,
        });
        return;
      }

      const space =
        getBoardSpace(payload.spaceId);

      if (!isOwnableBoardSpace(space)) {
        acknowledge({
          ok: false,
          reason:
            "That board space cannot be unmortgaged.",
        });
        return;
      }

      if (
        gameState.propertyOwners[
          space.id
        ] !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own this asset.",
        });
        return;
      }

      if (
        !gameState.mortgagedProperties[
          space.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "This asset is not mortgaged.",
        });
        return;
      }

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "The player could not be found.",
        });
        return;
      }

      const mortgageValue =
        space.mortgage;

      const unmortgageCost =
        Math.ceil(
          mortgageValue * 1.1,
        );

      if (
        player.cash <
        unmortgageCost
      ) {
        acknowledge({
          ok: false,
          reason:
            `You need £${unmortgageCost.toLocaleString()} to unmortgage ${space.name}.`,
        });
        return;
      }

      player.cash -=
        unmortgageCost;
      recordCashFlow(gameState, player, -unmortgageCost);

      gameState.mortgagedProperties[
        space.id
      ] = false;
      const activityMessage = `${player.name} unmortgaged ${space.name} for £${unmortgageCost}.`;
      recordActivity(gameState, activityMessage, "mortgage", player.id);


      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:sell-building",
    (
      payload: PropertyActionPayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        getRoomCode(payload.code);

      const room = code
        ? rooms.get(code)
        : undefined;

      if (
        !code ||
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const turnPhaseError =
        requireTurnPhase(
          gameState,
          [
            "roll",
            "optional-actions",
            "jail-decision",
            "debt",
          ],
        );

      if (turnPhaseError) {
        acknowledge({
          ok: false,
          reason: turnPhaseError,
        });
        return;
      }

      const turnError =
        validatePlayerTurn(
          gameState,
          socket.id,
        );

      if (turnError) {
        acknowledge({
          ok: false,
          reason: turnError,
        });
        return;
      }

      const space =
        getBoardSpace(payload.spaceId);

      if (
        !isPropertyBoardSpace(space)
      ) {
        acknowledge({
          ok: false,
          reason:
            "Only buildings on colour properties can be sold.",
        });
        return;
      }

      if (
        gameState.propertyOwners[
          space.id
        ] !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "You do not own this property.",
        });
        return;
      }

      if (
        gameState.mortgagedProperties[
          space.id
        ]
      ) {
        acknowledge({
          ok: false,
          reason:
            "A mortgaged property cannot contain buildings.",
        });
        return;
      }

      const currentLevel =
        getDevelopmentLevel(
          gameState,
          space.id,
        );

      if (currentLevel === 0) {
        acknowledge({
          ok: false,
          reason:
            "This property has no buildings to sell.",
        });
        return;
      }

      if (
        !canSellEvenly(
          gameState,
          space,
        )
      ) {
        acknowledge({
          ok: false,
          reason:
            "You must sell evenly across the colour group.",
        });
        return;
      }

      const inventoryError =
        sellOneDevelopmentLevel(
          gameState,
          currentLevel,
        );

      if (inventoryError) {
        acknowledge({
          ok: false,
          reason: inventoryError,
        });
        return;
      }

      const player =
        gameState.players.find(
          (candidate) =>
            candidate.id === socket.id,
        );

      if (!player) {
        acknowledge({
          ok: false,
          reason:
            "The player could not be found.",
        });
        return;
      }

      const refund =
        Math.floor(
          space.houseCost / 2,
        );

      player.cash += refund;
      recordCashFlow(gameState, player, refund);

      gameState.propertyDevelopments[
        space.id
      ] =
        (currentLevel - 1) as BuildingLevel;

      const debtSettled =
        settleDebtIfAffordable(
          gameState,
        );

      if (debtSettled) {
        resumePendingJailMove(
          gameState,
        );
      }
      const activityMessage = `${player.name} sold one development level from ${space.name} for £${refund}.`;
      recordActivity(gameState, activityMessage, "mortgage", player.id);


      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: gameState,
      });
      console.log(activityMessage);
    },
  );
}
