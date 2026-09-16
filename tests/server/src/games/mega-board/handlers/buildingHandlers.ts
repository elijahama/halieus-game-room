import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { recordCashFlow } from "../utils/stats.js";
import type { Server, Socket } from "socket.io";

import {
  getBoardSpace,
  isPropertyBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";
import {
  getSingleDevelopmentEligibility,
  planDevelopmentToLevel,
  planGroupDevelopmentToLevel,
} from "../../../../../shared/games/mega-board/development.js";
import type {
  BuildingLevel,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import { rooms } from "../state/rooms.js";
import { requireTurnPhase } from "../utils/turn-engine.js";
import type { GameStateResponse } from "../types/game.js";
import { emitGameState } from "../utils/game-state.js";

interface BuildPayload {
  code: string;
  spaceId: number;
}

interface BuildToPayload extends BuildPayload {
  targetLevel: 5 | 6;
}

interface BuildGroupToPayload extends BuildPayload {
  targetLevel: 5 | 6;
}

function validateBuildTurn(
  gameState: GameState,
  socketId: string,
): string | null {
  const phaseError = requireTurnPhase(gameState, ["roll", "optional-actions", "jail-decision"]);
  if (phaseError) return phaseError;

  if (
    gameState.phase !== "playing" ||
    gameState.pendingPurchase ||
    gameState.pendingCard ||
    gameState.pendingDebt ||
    gameState.pendingAuction ||
    gameState.pendingMegaAction ||
    gameState.pendingSpeedDieAction
  ) {
    return "Finish the current mandatory game decision before developing property.";
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== socketId) {
    return "You can only build during your own turn.";
  }

  if (currentPlayer.isBankrupt) {
    return "Bankrupt spectators cannot develop property.";
  }

  return null;
}

function applyOneBuilding(
  gameState: GameState,
  spaceId: number,
): void {
  const currentLevel = gameState.propertyDevelopments[spaceId] ?? 0;

  if (currentLevel <= 3) {
    gameState.bankInventory.houses -= 1;
  } else if (currentLevel === 4) {
    gameState.bankInventory.hotels -= 1;
    gameState.bankInventory.houses += 4;
  } else if (currentLevel === 5) {
    gameState.bankInventory.skyscrapers -= 1;
    gameState.bankInventory.hotels += 1;
  }

  gameState.propertyDevelopments[spaceId] = (currentLevel + 1) as BuildingLevel;
}

export function registerBuildingHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:build",
    (
      payload: BuildPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }

      if (!Number.isInteger(payload.spaceId)) {
        acknowledge({ ok: false, reason: "A valid property ID is required." });
        return;
      }

      const gameState = room.gameState;
      const turnError = validateBuildTurn(gameState, socket.id);
      if (turnError) {
        acknowledge({ ok: false, reason: turnError });
        return;
      }

      const player = gameState.players[gameState.currentPlayerIndex]!;
      const space = getBoardSpace(payload.spaceId);
      if (!isPropertyBoardSpace(space)) {
        acknowledge({ ok: false, reason: "Buildings can only be placed on colour properties." });
        return;
      }

      const eligibility = getSingleDevelopmentEligibility(gameState, player.id, space.id);
      if (!eligibility.ok) {
        acknowledge({ ok: false, reason: eligibility.reason ?? "That development is not legal right now." });
        return;
      }

      player.cash -= eligibility.cost;
      recordCashFlow(gameState, player, -eligibility.cost);
      applyOneBuilding(gameState, space.id);

      const level = gameState.propertyDevelopments[space.id] ?? 0;
      const levelName = level <= 4 ? `${level} house${level === 1 ? "" : "s"}` : level === 5 ? "a Hotel" : "a Skyscraper";
      const activityMessage = `${player.name} developed ${space.name} to ${levelName}.`;
      pushGlobalNotice(gameState, {
        kind: "development",
        title: level >= 5 ? (level === 5 ? "🏨 Hotel Built" : "🏙️ Skyscraper Built") : "🏠 Property Developed",
        message: activityMessage,
        playerId: player.id,
        presentation: level >= 5 ? "major" : "standard",
        durationMs: level >= 5 ? 4200 : 2800,
      });
      recordActivity(gameState, activityMessage, "building", player.id);
      emitGameState(io, code, gameState);
      acknowledge({ ok: true, state: gameState });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:build-to",
    (
      payload: BuildToPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }

      if (!Number.isInteger(payload.spaceId) || (payload.targetLevel !== 5 && payload.targetLevel !== 6)) {
        acknowledge({ ok: false, reason: "A valid property and development target are required." });
        return;
      }

      const gameState = room.gameState;
      const turnError = validateBuildTurn(gameState, socket.id);
      if (turnError) {
        acknowledge({ ok: false, reason: turnError });
        return;
      }

      const player = gameState.players[gameState.currentPlayerIndex]!;
      const target = getBoardSpace(payload.spaceId);
      if (!isPropertyBoardSpace(target)) {
        acknowledge({ ok: false, reason: "Buildings can only be placed on colour properties." });
        return;
      }

      const plan = planDevelopmentToLevel(gameState, player.id, target.id, payload.targetLevel);
      if (!plan.ok) {
        acknowledge({ ok: false, reason: plan.reason ?? "That bulk development is not legal right now." });
        return;
      }

      player.cash -= plan.totalCost;
      recordCashFlow(gameState, player, -plan.totalCost);
      gameState.bankInventory = plan.endingInventory;
      for (const step of plan.steps) {
        gameState.propertyDevelopments[step.spaceId] = step.toLevel;
      }

      const targetName = payload.targetLevel === 5 ? "Hotel" : "Skyscraper";
      const activityMessage = `${player.name} built a ${targetName} directly on ${target.name} for £${plan.totalCost.toLocaleString()}.`;
      pushGlobalNotice(gameState, {
        kind: "development",
        title: payload.targetLevel === 5 ? "🏨 House Shortage: Direct Hotel" : "🏙️ Building Shortage: Direct Skyscraper",
        message: activityMessage,
        playerId: player.id,
        presentation: "major",
        steps: [
          `${player.name} invested £${plan.totalCost.toLocaleString()} in ${target.name}.`,
          `A Bank building shortage blocked the normal route, so unavailable intermediate pieces were skipped legally.`,
          `${target.name} is now developed to ${targetName}.`,
        ],
        durationMs: 4800,
      });
      recordActivity(gameState, activityMessage, "building", player.id);
      emitGameState(io, code, gameState);
      acknowledge({ ok: true, state: gameState });
      console.log(activityMessage);
    },
  );

  socket.on(
    "game:build-group-to",
    (
      payload: BuildGroupToPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }

      if (!Number.isInteger(payload.spaceId) || (payload.targetLevel !== 5 && payload.targetLevel !== 6)) {
        acknowledge({ ok: false, reason: "A valid colour group and development target are required." });
        return;
      }

      const gameState = room.gameState;
      const turnError = validateBuildTurn(gameState, socket.id);
      if (turnError) {
        acknowledge({ ok: false, reason: turnError });
        return;
      }

      const player = gameState.players[gameState.currentPlayerIndex]!;
      const anchor = getBoardSpace(payload.spaceId);
      if (!isPropertyBoardSpace(anchor)) {
        acknowledge({ ok: false, reason: "Group development is only available for colour properties." });
        return;
      }

      const plan = planGroupDevelopmentToLevel(
        gameState,
        player.id,
        anchor.id,
        payload.targetLevel,
      );
      if (!plan.ok) {
        acknowledge({ ok: false, reason: plan.reason ?? "That group development is not legal right now." });
        return;
      }

      player.cash -= plan.totalCost;
      recordCashFlow(gameState, player, -plan.totalCost);
      gameState.bankInventory = plan.endingInventory;
      for (const step of plan.steps) {
        gameState.propertyDevelopments[step.spaceId] = step.toLevel;
      }

      const targetName = payload.targetLevel === 5 ? "Hotels" : "Skyscrapers";
      const affectedNames = plan.steps
        .map((step) => getBoardSpace(step.spaceId)?.name)
        .filter((name): name is string => Boolean(name));
      const activityMessage = `${player.name} developed the ${anchor.group.replace("-", " ")} group to ${targetName} for £${plan.totalCost.toLocaleString()}.`;
      pushGlobalNotice(gameState, {
        kind: "development",
        title: payload.targetLevel === 5 ? "🏨 Group to Hotels" : "🏙️ Group to Skyscrapers",
        message: activityMessage,
        playerId: player.id,
        presentation: "standard",
        durationMs: 3200,
      });
      recordActivity(
        gameState,
        `${activityMessage} Updated: ${affectedNames.join(", ")}.`,
        "building",
        player.id,
      );
      emitGameState(io, code, gameState);
      acknowledge({ ok: true, state: gameState });
      console.log(activityMessage);
    },
  );

}
