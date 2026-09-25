import { publicProgressionState } from "../../../platform/progression.js";
import { recordActivity } from "../utils/activity.js";
import type { Server, Socket } from "socket.io";

import { rooms } from "../state/rooms.js";
import type { GameStateResponse } from "../types/game.js";
import {
  autoLiquidateDebt,
  declareBankruptcy,
  settleDebtIfAffordable,
} from "../utils/debt.js";
import { emitGameState } from "../utils/game-state.js";
import {
  resumePendingJailMove,
} from "../utils/jail.js";
import {
  requireTurnPhase,
  syncBlockingTurnPhase,
} from "../utils/turn-engine.js";

interface DebtActionPayload {
  code: string;
}

export function registerBankruptcyHandlers(
  io: Server,
  socket: Socket,
): void {

  socket.on(
    "game:auto-liquidate-debt",
    (
      payload: DebtActionPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;
      if (!code || !room?.started || !room.gameState) {
        acknowledge({ ok: false, reason: "The game could not be found." });
        return;
      }
      const gameState = room.gameState;
      const phaseError = requireTurnPhase(gameState, ["debt"]);
      if (phaseError) { acknowledge({ ok: false, reason: phaseError }); return; }
      if (gameState.pendingDebt?.debtorId !== socket.id) {
        acknowledge({ ok: false, reason: "You do not have a debt to liquidate." });
        return;
      }
      const result = autoLiquidateDebt(gameState, socket.id);
      const player = gameState.players.find((candidate) => candidate.id === socket.id);
      recordActivity(
        gameState,
        result.raised > 0
          ? `${player?.name ?? "A player"} auto-liquidated £${result.raised} of assets for debt resolution.`
          : `${player?.name ?? "A player"} could not raise more cash automatically.`,
        "debt",
        socket.id,
      );
      emitGameState(io, code, gameState);
      acknowledge({ ok: !result.error, state: publicProgressionState(gameState), ...(result.error ? { reason: result.error } : {}) });
    },
  );
  socket.on(
    "game:pay-debt",
    (
      payload: DebtActionPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({
          ok: false,
          reason: "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["debt"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      if (gameState.pendingDebt?.debtorId !== socket.id) {
        acknowledge({
          ok: false,
          reason: "You do not have a debt to pay.",
        });
        return;
      }

      const debtorName = gameState.players.find((player) => player.id === socket.id)?.name ?? "A player";
      const debtBeforePayment = gameState.pendingDebt;
      const creditorBeforePayment = debtBeforePayment?.creditorId
        ? gameState.players.find((player) => player.id === debtBeforePayment.creditorId)
        : null;
      const sharedCreditorsBeforePayment = debtBeforePayment?.creditorShares
        ?.map((share) => ({
          share,
          creditor: gameState.players.find((player) => player.id === share.creditorId),
        }))
        .filter(({ creditor }) => Boolean(creditor));

      if (!settleDebtIfAffordable(gameState)) {
        acknowledge({
          ok: false,
          reason:
            "You still do not have enough cash to clear the debt.",
        });
        return;
      }

      resumePendingJailMove(
        gameState,
      );

      syncBlockingTurnPhase(gameState);
      const paidMessage = debtBeforePayment?.reason.startsWith("Rent for ")
        ? sharedCreditorsBeforePayment?.length
          ? `${debtorName} paid £${debtBeforePayment.amount} shared maximum rent for ${debtBeforePayment.reason.replace(/^Rent for /, "")} across ${sharedCreditorsBeforePayment.map(({ share, creditor }) => `${creditor?.name ?? "Player"} £${share.amount}`).join(", ")}.`
          : `${debtorName} paid ${creditorBeforePayment?.name ?? "the owner"} £${debtBeforePayment.amount} rent for ${debtBeforePayment.reason.replace(/^Rent for /, "")}.`
        : `${debtorName} cleared their debt.`;
      recordActivity(gameState, paidMessage, "debt", socket.id);
      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );

  socket.on(
    "game:declare-bankruptcy",
    (
      payload: DebtActionPayload,
      acknowledge: (response: GameStateResponse) => void,
    ) => {
      const code = payload.code?.trim().toUpperCase();
      const room = code ? rooms.get(code) : undefined;

      if (!code || !room?.started || !room.gameState) {
        acknowledge({
          ok: false,
          reason: "The game could not be found.",
        });
        return;
      }

      const gameState = room.gameState;

      const phaseError =
        requireTurnPhase(
          gameState,
          ["debt"],
        );

      if (phaseError) {
        acknowledge({
          ok: false,
          reason: phaseError,
        });
        return;
      }

      const bankruptName = gameState.players.find((player) => player.id === socket.id)?.name ?? "A player";
      const error = declareBankruptcy(
        gameState,
        socket.id,
      );

      if (error) {
        acknowledge({
          ok: false,
          reason: error,
        });
        return;
      }

      syncBlockingTurnPhase(gameState);
      recordActivity(gameState, `${bankruptName} declared bankruptcy.`, "debt", socket.id);
      emitGameState(io, code, gameState);

      acknowledge({
        ok: true,
        state: publicProgressionState(gameState),
      });
    },
  );
}
