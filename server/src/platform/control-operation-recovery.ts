interface TrackedUpdate {
  state: string;
  updatedAt: string;
  phase: string;
  reason: string | null;
}

// Longer than the bridge's 50-minute observation window; no process is killed.
export function expireUnreportedUpdates(operations: TrackedUpdate[], now: number): void {
  for (const operation of operations) {
    if (operation.state !== "running") continue;
    const lastReport = Date.parse(operation.updatedAt);
    if (!Number.isFinite(lastReport) || now - lastReport < 55 * 60 * 1000) continue;
    operation.state = "failed";
    operation.phase = "Update completion not confirmed";
    operation.reason = "The owner-PC bridge stopped reporting this update. Completion could not be confirmed. Check the owner PC before retrying; this does not stop an updater still running there.";
    operation.updatedAt = new Date(now).toISOString();
  }
}
