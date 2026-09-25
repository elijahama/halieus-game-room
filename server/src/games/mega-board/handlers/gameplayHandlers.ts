import { publicProgressionState } from "../../../platform/progression.js";
import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  BOARD_SPACE_COUNT,
  JAIL_POSITION,
  getBoardSpace,
} from "../../../../../shared/games/mega-board/board.js";

import {
  GO_SALARY,
} from "../../../../../shared/games/mega-board/game-rules.js";

import type {
  PendingSpeedDieAction,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
  RoomCodePayload,
} from "../types/game.js";

import {
  drawCard,
} from "../utils/cards.js";

import {
  rollGameDice,
} from "../utils/dice.js";

import {
  isSpeedDieActive,
} from "../utils/speed-die-lifecycle.js";

import {
  advanceTurn,
  emitGameState,
} from "../utils/game-state.js";

import {
  resolveLandedSpace,
} from "../utils/space-resolution.js";

import { recordCashFlow, recordDiceRoll } from "../utils/stats.js";

import {
  collectAutomaticBusResultTicket,
} from "../utils/mega-rules.js";

import {
  requireTurnPhase,
  setTurnPhase,
  syncBlockingTurnPhase,
} from "../utils/turn-engine.js";

export function registerGameplayHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:roll",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const code =
        payload.code
          ?.trim()
          .toUpperCase();

      if (!code) {
        acknowledge({
          ok: false,
          reason:
            "Game code is required.",
        });
        return;
      }

      const room = rooms.get(code);

      if (
        !room?.started ||
        !room.gameState
      ) {
        acknowledge({
          ok: false,
          reason:
            "The game has not started.",
        });
        return;
      }

      const gameState = room.gameState;

      if (
        gameState.phase !== "playing"
      ) {
        acknowledge({
          ok: false,
          reason:
            gameState.phase ===
            "ordering"
              ? "Turn order must be decided before normal gameplay begins."
              : "The game is not currently in progress.",
        });
        return;
      }

      const phaseError =
        requireTurnPhase(
          gameState,
          ["roll"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      if (
        gameState.pendingCard ||
        gameState.pendingDebt ||
        gameState.pendingPurchase ||
        gameState.pendingAuction ||
        gameState.pendingMegaAction ||
        gameState.pendingSpeedDieAction
      ) {
        acknowledge({
          ok: false,
          reason:
            "Resolve the current action before rolling again.",
        });
        return;
      }

      const currentPlayer =
        gameState.players[
          gameState.currentPlayerIndex
        ];

      if (!currentPlayer) {
        acknowledge({
          ok: false,
          reason:
            "The current player could not be found.",
        });
        return;
      }

      if (
        currentPlayer.id !== socket.id
      ) {
        acknowledge({
          ok: false,
          reason:
            "It is not your turn.",
        });
        return;
      }

      if (currentPlayer.autopilotEnabled && !currentPlayer.isAi) {
        acknowledge({
          ok: false,
          reason: "Autopilot is controlling this seat. Take Control before rolling manually.",
          state: publicProgressionState(gameState),
        });
        return;
      }

      const rollAcceptedAt = Date.now();
      const previousAcceptedRollAt = gameState.lastAcceptedRollAtByPlayerId?.[currentPlayer.id] ?? 0;
      if (rollAcceptedAt - previousAcceptedRollAt < 900) {
        acknowledge({
          ok: false,
          reason: "That roll was ignored because another roll was just accepted.",
          state: publicProgressionState(gameState),
        });
        return;
      }
      gameState.lastAcceptedRollAtByPlayerId ??= {};
      gameState.lastAcceptedRollAtByPlayerId[currentPlayer.id] = rollAcceptedAt;

      if (currentPlayer.inJail) {
        setTurnPhase(
          gameState,
          "jail-decision",
        );

        acknowledge({
          ok: false,
          reason:
            "Choose a Jail action before rolling.",
          state: publicProgressionState(gameState),
        });
        return;
      }

      const rollStartPosition = currentPlayer.position;
      gameState.awaitingReroll = false;

      setTurnPhase(
        gameState,
        "resolve-space",
      );

      const speedDieActive = isSpeedDieActive(gameState);
      const roll = rollGameDice(speedDieActive);
      recordDiceRoll(gameState, currentPlayer);
      const {
        white1,
        white2,
        speed,
        whiteTotal,
        movementTotal,
      } = roll;

      const rolledDoubles =
        white1 === white2;

      const rolledTriples =
        typeof speed === "number" &&
        white1 === white2 &&
        white1 === speed;

      gameState.lastDiceRoll = {
        white1,
        white2,
        speed,
        movementTotal,
        doublesStage: rolledDoubles && !rolledTriples ? Math.min(3, gameState.consecutiveDoubles + 1) as 1 | 2 | 3 : 0,
      };
      gameState.rollSequence = (gameState.rollSequence ?? 0) + 1;

      if (rolledTriples) {
        gameState.consecutiveDoubles = 0;
        gameState.awaitingReroll = false;
        gameState.pendingSpeedDieAction = {
          type: "triple",
          playerId: currentPlayer.id,
          resumeAction:
            "advance-turn",
          whiteDiceTotal: whiteTotal,
          tripleValue: speed,
        };

        setTurnPhase(
          gameState,
          "speed-die-choice",
        );

        const startSpace = getBoardSpace(rollStartPosition)?.name ?? `space ${rollStartPosition}`;
        const activityMessage =
          `${currentPlayer.name} rolled triple ${speed}s and may choose any destination. Roll #${gameState.rollSequence}: ${white1} + ${white2} + ${speed}; start ${startSpace} (${rollStartPosition}); destination pending.`;
        recordActivity(gameState, activityMessage, "roll", currentPlayer.id);

        emitGameState(
          io,
          code,
          gameState,
        );

        acknowledge({
          ok: true,
          state: publicProgressionState(gameState),
          roll,
        });

        console.log(activityMessage);
        return;
      }

      let playerGetsAnotherTurn =
        false;
      let turnAlreadyAdvanced =
        false;
      let turnMessage = "";

      if (rolledDoubles) {
        gameState.consecutiveDoubles +=
          1;

        if (
          gameState.consecutiveDoubles >=
          3
        ) {
          currentPlayer.position =
            JAIL_POSITION;
          currentPlayer.inJail = true;
          currentPlayer.jailTurns = 0;
          gameState.consecutiveDoubles = 0;

          advanceTurn(gameState);
          turnAlreadyAdvanced = true;

          turnMessage =
            `${currentPlayer.name} rolled three consecutive doubles and was sent to Jail.`;
          pushGlobalNotice(gameState, {
            kind: "jail-event",
            title: "🚔 Sent to Jail",
            message: turnMessage,
            playerId: currentPlayer.id,
            presentation: "major",
            steps: [
              `${currentPlayer.name} rolled doubles three times in a row.`,
              "The turn ends immediately.",
              `${currentPlayer.name} has been moved to Jail.`,
            ],
            durationMs: 4600,
          });
        } else {
          playerGetsAnotherTurn = true;
        }
      } else {
        gameState.consecutiveDoubles = 0;
      }

      if (!turnAlreadyAdvanced) {
        const resumeAction =
          playerGetsAnotherTurn
            ? "reroll"
            : "advance-turn";

        if (speed === "bus") {
          const ticketAward = collectAutomaticBusResultTicket(
            gameState,
            currentPlayer,
          );
          const pendingAction: PendingSpeedDieAction = {
            type: "bus",
            playerId: currentPlayer.id,
            resumeAction,
            whiteDiceTotal: whiteTotal,
            white1,
            white2,
          };
          gameState.pendingSpeedDieAction = pendingAction;
          gameState.awaitingReroll = false;
          setTurnPhase(gameState, "speed-die-choice");
          const ticketSummary = ticketAward.awardedTicketId
            ? " A Bus Ticket was awarded automatically."
            : " No ordinary Bus Ticket remains to award.";
          turnMessage = `${currentPlayer.name} rolled Bus and must choose ${white1}, ${white2}, or ${whiteTotal}.${ticketSummary}`;
        } else {
          if (speed === "mr-monopoly") {
            const pendingAction: PendingSpeedDieAction = {
              type: "mr-monopoly",
              playerId: currentPlayer.id,
              resumeAction,
              whiteDiceTotal: whiteTotal,
            };
            gameState.pendingSpeedDieAction = pendingAction;
          }

          const previousPosition =
            currentPlayer.position;

        const nextPosition =
          (
            previousPosition +
            movementTotal
          ) % BOARD_SPACE_COUNT;

        const passedGo =
          previousPosition +
            movementTotal >=
          BOARD_SPACE_COUNT;

        currentPlayer.position =
          nextPosition;

        if (passedGo) {
          currentPlayer.cash +=
            GO_SALARY;
          recordCashFlow(gameState, currentPlayer, GO_SALARY);
          pushGlobalNotice(gameState, {
            kind: "go",
            title: "🏁 Passed GO",
            message: `${currentPlayer.name} passed GO and collected £${GO_SALARY.toLocaleString()}.`,
            playerId: currentPlayer.id,
            presentation: "standard",
            durationMs: 2800,
          });
        }

        const resolution =
          resolveLandedSpace({
            gameState,
            player: currentPlayer,
            diceTotal:
              movementTotal,
            resumeAction,
          });

        turnMessage = resolution.message;

        if (resolution.nextCardDeck) {
          const card = drawCard(
            gameState,
            resolution.nextCardDeck,
            currentPlayer.id,
            resumeAction,
          );

          turnMessage =
            `${currentPlayer.name} drew ${card.title}.`;
        }

          if (resolution.turnAdvanced) {
            playerGetsAnotherTurn = false;
            turnAlreadyAdvanced = true;
          }
        }
      }

      gameState.movedThisTurn = true;

      if (!turnAlreadyAdvanced) {
        if (gameState.pendingPurchase) {
          gameState.awaitingReroll =
            playerGetsAnotherTurn;

          setTurnPhase(
            gameState,
            "purchase",
          );
        } else if (
          gameState.pendingCard
        ) {
          setTurnPhase(
            gameState,
            "card",
          );
        } else if (
          gameState.pendingDebt
        ) {
          setTurnPhase(
            gameState,
            "debt",
          );
        } else if (
          gameState.pendingMegaAction
        ) {
          setTurnPhase(
            gameState,
            "mega-choice",
          );
        } else if (
          gameState
            .pendingSpeedDieAction
        ) {
          gameState.awaitingReroll =
            false;

          setTurnPhase(
            gameState,
            "speed-die-choice",
          );
        } else if (
          playerGetsAnotherTurn
        ) {
          gameState.awaitingReroll =
            true;

          setTurnPhase(
            gameState,
            "roll",
          );
        } else {
          setTurnPhase(
            gameState,
            "optional-actions",
          );
        }
      }

      syncBlockingTurnPhase(
        gameState,
      );

      gameState.movedThisTurn = false;

      const speedLabel =
        speed === "bus"
          ? "Bus"
          : speed ===
              "mr-monopoly"
            ? "Mr. Monopoly"
            : String(speed);

      const endPosition = currentPlayer.position;
      const startSpace = getBoardSpace(rollStartPosition)?.name ?? `space ${rollStartPosition}`;
      const endSpace = getBoardSpace(endPosition)?.name ?? `space ${endPosition}`;
      const movementDetail = speed === "bus"
        ? `movement choice pending from ${startSpace} (${rollStartPosition})`
        : `start ${startSpace} (${rollStartPosition}) · move ${movementTotal} · end ${endSpace} (${endPosition})`;
      const activityMessage =
        `${turnMessage} Speed Die: ${speedLabel}. Roll #${gameState.rollSequence}: ${white1} + ${white2}${speed === null ? "" : ` + ${speedLabel}`} · ${movementDetail}.`;
      recordActivity(gameState, activityMessage, "roll", currentPlayer.id);

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
        roll,
      });

      console.log(activityMessage);
    },
  );
}
