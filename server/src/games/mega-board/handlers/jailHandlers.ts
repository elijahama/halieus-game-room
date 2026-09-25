import { publicProgressionState } from "../../../platform/progression.js";
import { pushGlobalNotice, recordActivity } from "../utils/activity.js";
import { recordCashFlow, recordDiceRoll } from "../utils/stats.js";
import type {
  Server,
  Socket,
} from "socket.io";

import {
  JAIL_FINE,
} from "../../../../../shared/games/mega-board/game-rules.js";

import type {
  GamePlayer,
  GameState,
} from "../../../../../shared/games/mega-board/game-state.js";

import {
  rooms,
} from "../state/rooms.js";

import type {
  GameStateResponse,
  RoomCodePayload,
} from "../types/game.js";

import {
  useGetOutOfJailCard,
} from "../utils/cards.js";

import {
  createDebt,
} from "../utils/debt.js";

import {
  rollTwoDice,
} from "../utils/dice.js";

import {
  addToFreeParkingPot,
} from "../utils/free-parking.js";

import {
  advanceTurn,
  emitGameState,
} from "../utils/game-state.js";

import {
  moveAfterJailRoll,
} from "../utils/jail.js";

import {
  requireTurnPhase,
  setTurnPhase,
} from "../utils/turn-engine.js";

interface ValidJailContext {
  ok: true;
  code: string;
  gameState: GameState;
  player: GamePlayer;
}

interface InvalidJailContext {
  ok: false;
  reason: string;
}

function getJailContext(
  socket: Socket,
  payload: RoomCodePayload,
): ValidJailContext | InvalidJailContext {
  const code =
    payload.code
      ?.trim()
      .toUpperCase();

  const room = code
    ? rooms.get(code)
    : undefined;

  if (
    !code ||
    !room?.started ||
    !room.gameState
  ) {
    return {
      ok: false,
      reason:
        "The game could not be found.",
    };
  }

  const gameState = room.gameState;

  const phaseError =
    requireTurnPhase(
      gameState,
      ["jail-decision"],
    );

  if (phaseError) {
    return {
      ok: false,
      reason: phaseError,
    };
  }

  const player =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  if (
    !player ||
    player.id !== socket.id
  ) {
    return {
      ok: false,
      reason:
        "Only the current player can choose a Jail action.",
    };
  }

  if (!player.inJail) {
    return {
      ok: false,
      reason:
        "You are not currently in Jail.",
    };
  }

  return {
    ok: true,
    code,
    gameState,
    player,
  };
}

export function registerJailHandlers(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "game:jail-pay",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getJailContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      const {
        code,
        gameState,
        player,
      } = context;

      player.inJail = false;
      player.jailTurns = 0;
      gameState.consecutiveDoubles = 0;
      gameState.awaitingReroll = false;

      if (player.cash >= JAIL_FINE) {
        player.cash -= JAIL_FINE;
        recordCashFlow(gameState, player, -JAIL_FINE);

        addToFreeParkingPot(
          gameState,
          JAIL_FINE,
        );

        setTurnPhase(
          gameState,
          "roll",
        );
      } else {
        createDebt(gameState, {
          debtorId: player.id,
          creditorId: null,
          amount: JAIL_FINE,
          reason: "Jail fine",
          resumeAction: "roll",
          freeParkingContribution:
            JAIL_FINE,
        });

        setTurnPhase(
          gameState,
          "debt",
        );
      }

      const payMessage =
        gameState.turnPhase === "debt"
          ? `${player.name} must raise £${JAIL_FINE} to leave Jail.`
          : `${player.name} paid £${JAIL_FINE} and left Jail.`;
      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: gameState.turnPhase === "debt" ? "🚔 Jail Fine Due" : "🔓 Left Jail",
        message: payMessage,
        playerId: player.id,
        presentation: gameState.turnPhase === "debt" ? "standard" : "major",
        durationMs: gameState.turnPhase === "debt" ? 3000 : 3800,
      });
      recordActivity(gameState, payMessage, "jail", player.id);

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );

  socket.on(
    "game:jail-use-card",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getJailContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      const {
        code,
        gameState,
        player,
      } = context;

      const cardError =
        useGetOutOfJailCard(
          gameState,
          player,
        );

      if (cardError) {
        acknowledge({
          ok: false,
          reason: cardError,
        });
        return;
      }

      player.inJail = false;
      player.jailTurns = 0;
      gameState.consecutiveDoubles = 0;
      gameState.awaitingReroll = false;

      setTurnPhase(
        gameState,
        "roll",
      );

      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: "🎫 Get Out of Jail Free",
        message: `${player.name} used a Get Out of Jail Free card and left Jail.`,
        playerId: player.id,
        presentation: "major",
        durationMs: 4000,
      });
      recordActivity(
        gameState,
        `${player.name} used a Get Out of Jail Free card.`,
        "jail",
        player.id,
      );

      emitGameState(
        io,
        code,
        gameState,
      );

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );

  socket.on(
    "game:jail-roll",
    (
      payload: RoomCodePayload,
      acknowledge: (
        response: GameStateResponse,
      ) => void,
    ) => {
      const context =
        getJailContext(
          socket,
          payload,
        );

      if (!context.ok) {
        acknowledge({
          ok: false,
          reason: context.reason,
        });
        return;
      }

      const {
        code,
        gameState,
        player,
      } = context;

      const roll = rollTwoDice();
      recordDiceRoll(gameState, player);
      const rolledDoubles =
        roll.white1 === roll.white2;

      gameState.lastDiceRoll = {
        white1: roll.white1,
        white2: roll.white2,
        speed: null,
        movementTotal: roll.total,
      };
      gameState.rollSequence = (gameState.rollSequence ?? 0) + 1;
      gameState.consecutiveDoubles = 0;
      gameState.awaitingReroll = false;

      let message = "";

      if (rolledDoubles) {
        player.inJail = false;
        player.jailTurns = 0;

        const movement =
          moveAfterJailRoll(
            gameState,
            player,
            roll.total,
          );

        message =
          `${player.name} rolled doubles, left Jail and moved ${roll.total} spaces. ${movement.message}`;
      } else {
        const failedAttempts =
          player.jailTurns + 1;

        if (failedAttempts < 3) {
          player.jailTurns =
            failedAttempts;

          message =
            `${player.name} did not roll doubles and remains in Jail.`;

          advanceTurn(gameState);
        } else {
          player.inJail = false;
          player.jailTurns = 0;

          if (
            player.cash >= JAIL_FINE
          ) {
            player.cash -= JAIL_FINE;
            recordCashFlow(gameState, player, -JAIL_FINE);

            addToFreeParkingPot(
              gameState,
              JAIL_FINE,
            );

            const movement =
              moveAfterJailRoll(
                gameState,
                player,
                roll.total,
              );

            message =
              `${player.name} failed the third Jail roll, paid £${JAIL_FINE} and moved ${roll.total} spaces. ${movement.message}`;
          } else {
            gameState.pendingJailMove = {
              playerId: player.id,
              diceTotal: roll.total,
            };

            createDebt(gameState, {
              debtorId: player.id,
              creditorId: null,
              amount: JAIL_FINE,
              reason:
                "Jail fine after the third failed attempt",
              resumeAction:
                "jail-move",
              freeParkingContribution:
                JAIL_FINE,
            });

            setTurnPhase(
              gameState,
              "debt",
            );

            message =
              `${player.name} failed the third Jail roll and must raise £${JAIL_FINE} before moving ${roll.total} spaces.`;
          }
        }
      }

      pushGlobalNotice(gameState, {
        kind: "jail-event",
        title: rolledDoubles
          ? "🎲 Doubles! Left Jail"
          : player.inJail
            ? "🚔 Still in Jail"
            : gameState.turnPhase === "debt"
              ? "🚔 Third Jail Attempt"
              : "🔓 Released from Jail",
        message,
        playerId: player.id,
        presentation: rolledDoubles || !player.inJail ? "major" : "standard",
        durationMs: rolledDoubles || !player.inJail ? 4200 : 2800,
      });
      recordActivity(gameState, message, "jail", player.id);

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
      console.log(message);
    },
  );
}
