interface TrackedUpdate {
  action?: string;
  state: string;
  updatedAt: string;
  phase: string;
  reason: string | null;
}

// Update remains bounded by its 50-minute finalizer. The shorter Windows
// lifecycle actions have a separate conservative three-minute receipt window.
// This only marks an unconfirmed receipt; it NEVER stops or repeats an action.
export function expireUnreportedUpdates(operations: TrackedUpdate[], now: number): void {
  for (const operation of operations) {
    if (operation.state !== "running") continue;
    const lastReport = Date.parse(operation.updatedAt);
    const lifecycle = ["start", "restart", "close"].includes(operation.action || "");
    const expiry = lifecycle ? 3 * 60_000 : 55 * 60_000;
    if (!Number.isFinite(lastReport) || now - lastReport < expiry) continue;
    operation.state = "failed";
    operation.phase = lifecycle ? "Remote action completion not confirmed" : "Update completion not confirmed";
    operation.reason = lifecycle
      ? "The owner-PC bridge did not confirm this action. Inspect the local Control audit before retrying; the command may have run. It was not repeated."
      : "The owner-PC bridge stopped reporting this update. Completion could not be confirmed. Check the owner PC before retrying; this does not stop an updater still running there.";
    operation.updatedAt = new Date(now).toISOString();
  }
}
