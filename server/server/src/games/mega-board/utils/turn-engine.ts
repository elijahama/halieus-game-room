import type {
  GameState,
  TurnPhase,
} from "../../../../../shared/games/mega-board/game-state.js";

export function setTurnPhase(
  gameState: GameState,
  phase: TurnPhase,
): void {
  gameState.turnPhase = phase;
}

export function requireTurnPhase(
  gameState: GameState,
  allowedPhases: TurnPhase[],
): string | null {
  if (
    allowedPhases.includes(
      gameState.turnPhase,
    )
  ) {
    return null;
  }

  const readable = allowedPhases
    .map((phase) =>
      phase.replaceAll("-", " "),
    )
    .join(" or ");

  return `This action is only available during ${readable}. Current phase: ${gameState.turnPhase.replaceAll("-", " ")}.`;
}

export function syncBlockingTurnPhase(
  gameState: GameState,
): void {
  if (gameState.phase === "finished") {
    gameState.turnPhase = "finished";
    return;
  }

  if (gameState.phase === "ordering") {
    gameState.turnPhase = "ordering";
    return;
  }

  if (gameState.pendingAuction) {
    gameState.turnPhase = "auction";
    return;
  }

  if (gameState.pendingDebt) {
    gameState.turnPhase = "debt";
    return;
  }

  if (gameState.pendingCard) {
    gameState.turnPhase = "card";
    return;
  }

  if (gameState.pendingPurchase) {
    gameState.turnPhase = "purchase";
    return;
  }

  if (gameState.pendingMegaAction) {
    gameState.turnPhase =
      "mega-choice";
    return;
  }

  if (gameState.pendingJailMove) {
    gameState.turnPhase =
      "resolve-space";
    return;
  }

  if (
    gameState.pendingSpeedDieAction
  ) {
    gameState.turnPhase =
      "speed-die-choice";
    return;
  }

  const currentPlayer =
    gameState.players[
      gameState.currentPlayerIndex
    ];

  if (currentPlayer?.inJail) {
    gameState.turnPhase =
      "jail-decision";
    return;
  }

  // Recovery guard: a blocking phase without its matching pending object
  // is not actionable and would otherwise hide the controls forever.
  const staleBlockingPhases: TurnPhase[] = [
    "purchase",
    "auction",
    "card",
    "debt",
    "mega-choice",
    "speed-die-choice",
    "resolve-space",
    "jail-decision",
  ];

  if (staleBlockingPhases.includes(gameState.turnPhase)) {
    gameState.turnPhase = gameState.awaitingReroll
      ? "roll"
      : "optional-actions";
  }
}
