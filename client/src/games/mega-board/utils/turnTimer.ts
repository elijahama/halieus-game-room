/* Header-only presentation of the server's existing Mega Board deadlines.
 * Never start a second local turn clock or pretend blocked decisions are timed.
 */
export interface MegaTurnTimerState {
  turnPhase: string;
  turnRollDeadline?: number | null;
  turnRollDeadlinePlayerId?: string | null;
  optionalActionDeadline?: number | null;
  pendingTrade?: unknown;
}

export interface MegaTimerPlayer {
  id: string;
  name: string;
  isAi?: boolean;
  autopilotEnabled?: boolean;
}

export interface MegaTurnTimerDisplay {
  value: string;
  title: string;
  urgent: boolean;
  status: "running" | "paused" | "automatic" | "waiting";
}

export function readMegaTurnTimer(
  state: MegaTurnTimerState,
  player: MegaTimerPlayer | undefined,
  now: number,
): MegaTurnTimerDisplay {
  if (!player) {
    return { value: "—", title: "Waiting for the next player.", urgent: false, status: "waiting" };
  }

  const isRoll = state.turnPhase === "roll";
  const isOptional = state.turnPhase === "optional-actions";
  const isAutomaticRoll = isRoll && (player.isAi || player.autopilotEnabled);
  if (isAutomaticRoll) {
    return { value: "Auto", title: `${player.name}'s roll is being handled automatically.`, urgent: false, status: "automatic" };
  }

  const deadline = isRoll && state.turnRollDeadlinePlayerId === player.id
    ? state.turnRollDeadline
    : isOptional && !state.pendingTrade ? state.optionalActionDeadline : null;
  if (typeof deadline === "number" && Number.isFinite(deadline) && deadline > 0) {
    const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
    const value = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
    return {
      value,
      title: `${player.name}: ${isRoll ? "roll" : "optional actions"} countdown (server deadline).`,
      urgent: remaining <= 10,
      status: "running",
    };
  }

  if ((!isRoll && !isOptional) || Boolean(state.pendingTrade)) {
    return { value: "Paused", title: `${player.name}'s turn is in a decision phase without a running deadline.`, urgent: false, status: "paused" };
  }
  return { value: "—", title: `${player.name}'s turn has no active server countdown yet.`, urgent: false, status: "waiting" };
}
