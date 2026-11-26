/**
 * Pure calculation for operation-scoped Control task telemetry.
 * The caller must freeze the task manifest/history at operation start and
 * authenticate, sequence-check and persist task observations before rendering.
 * This module never starts, retries, completes or authorises an update.
 */
export type UpdateTaskState = "queued" | "running" | "passed" | "failed" | "skipped";
export interface UpdateTaskDefinition {
  id: string;
  /** Sequential stages; members of the same stage may execute in parallel. */
  stage: number;
  /** Comparable, successful historical durations in milliseconds. */
  historicalDurationsMs: readonly number[];
  allowSkip?: boolean;
}
export interface UpdateTaskObservation {
  id: string;
  state: UpdateTaskState;
  startedAtMs?: number;
  units?: { completed: number; total: number };
}
export interface UpdateProgressInput {
  tasks: readonly UpdateTaskDefinition[];
  observations: readonly UpdateTaskObservation[];
  observedAtMs: number;
  nowMs: number;
  /** Transport-specific freshness window; never advance progress on a timer. */
  staleAfterMs: number;
  operationState: "running" | "succeeded" | "failed" | "rejected";
  finalReceiptVerified: boolean;
}
export interface UpdateProgressEstimate {
  percent: number;
  weightBasis: "historical" | "task-count";
  passed: number;
  skipped: number;
  total: number;
  active: string[];
  eta: {
    status: "estimating" | "calculating" | "overrun" | "stale" | "unavailable" | "complete";
    remainingMs: number | null;
  };
}
const validPositive = (value: number) => Number.isFinite(value) && value > 0;
const medianDuration = (samples: readonly number[]): number | null => {
  const sorted = samples.filter(validPositive).slice().sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : sorted[mid - 1] / 2 + sorted[mid] / 2;
};
const fraction = (units: UpdateTaskObservation["units"]): number | null => {
  if (!units || !Number.isSafeInteger(units.total) || !Number.isSafeInteger(units.completed) ||
      units.total <= 0 || units.completed < 0 || units.completed > units.total) return null;
  return units.completed / units.total;
};
export function estimateControlUpdate(input: UpdateProgressInput): UpdateProgressEstimate {
  if (!input.tasks.length || !Number.isFinite(input.nowMs) || !Number.isFinite(input.observedAtMs) ||
      input.observedAtMs > input.nowMs || !validPositive(input.staleAfterMs)) {
    throw new Error("Invalid update telemetry timing or task manifest");
  }
  const definitions = new Map(input.tasks.map(task => [task.id, task]));
  if (definitions.size !== input.tasks.length ||
      input.tasks.some(task => !task.id || !Number.isSafeInteger(task.stage) || task.stage < 0)) {
    throw new Error("Invalid or duplicate update tasks");
  }
  const observations = new Map(input.observations.map(task => [task.id, task]));
  const allowed = new Set<UpdateTaskState>(["queued", "running", "passed", "failed", "skipped"]);
  if (observations.size !== input.observations.length ||
      input.observations.some(task => !definitions.has(task.id) || !allowed.has(task.state) ||
        (task.state === "skipped" && !definitions.get(task.id)?.allowSkip))) {
    throw new Error("Invalid, unknown or unauthorized skipped task observation");
  }
  const estimates = input.tasks.map(task => medianDuration(task.historicalDurationsMs));
  const historical = estimates.every(value => value !== null);
  // All or nothing: do not mix arbitrary unit weights and milliseconds.
  const maxWeight = historical ? Math.max(...estimates.map(value => value!)) : 1;
  const weights = historical ? estimates.map(value => value! / maxWeight) : input.tasks.map(() => 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let resolvedWeight = 0, passed = 0, skipped = 0, overrun = false, incompleteEstimate = false, failed = false;
  const active: string[] = [];
  const stages = new Map<number, number>();
  input.tasks.forEach((task, index) => {
    const observation = observations.get(task.id);
    const state = observation?.state ?? "queued";
    if (state === "passed" || state === "skipped") {
      if (state === "passed") passed++; else skipped++;
      resolvedWeight += weights[index];
      return;
    }
    if (state === "failed") failed = true;
    if (state === "running") active.push(task.id);
    const measured = state === "queued" ? null : fraction(observation?.units);
    if (measured !== null) resolvedWeight += weights[index] * Math.min(0.99, measured);
    const historicalMs = estimates[index];
    let remaining: number | null = historicalMs;
    if (state === "running") {
      const started = observation?.startedAtMs;
      if (started === undefined || !Number.isFinite(started) || started > input.observedAtMs) {
        remaining = null;
      } else {
        const elapsedAtSample = input.observedAtMs - started;
        const elapsedNow = input.nowMs - started;
        const exceeded = historicalMs !== null && elapsedNow >= historicalMs;
        overrun ||= exceeded;
        // Project only from a real measurement, not an animated countdown.
        if (measured !== null && measured > 0 && measured < 1 &&
            (observation?.units?.completed ?? 0) >= 2 && elapsedAtSample >= 1000) {
          remaining = elapsedAtSample * (1 - measured) / measured;
        } else if (historicalMs !== null && !exceeded && measured !== 1) {
          remaining = historicalMs - elapsedNow;
        } else {
          remaining = null;
        }
      }
    }
    if (remaining === null || !validPositive(remaining)) incompleteEstimate = true;
    else stages.set(task.stage, Math.max(stages.get(task.stage) ?? 0, remaining));
  });
  const complete = input.operationState === "succeeded" && input.finalReceiptVerified &&
    passed + skipped === input.tasks.length;
  const percent = complete ? 100 : Math.min(99, Math.max(0, Math.floor(resolvedWeight / totalWeight * 100)));
  const stale = input.nowMs - input.observedAtMs > input.staleAfterMs;
  const remainingMs = [...stages.values()].reduce((sum, ms) => sum + ms, 0);
  let eta: UpdateProgressEstimate["eta"];
  if (complete) eta = { status: "complete", remainingMs: 0 };
  else if (input.operationState !== "running" || failed) eta = { status: "unavailable", remainingMs: null };
  else if (stale) eta = { status: "stale", remainingMs: null };
  else if (overrun) eta = { status: "overrun", remainingMs: incompleteEstimate || !validPositive(remainingMs) ? null : remainingMs };
  else if (incompleteEstimate || !validPositive(remainingMs)) eta = { status: "calculating", remainingMs: null };
  else eta = { status: "estimating", remainingMs };
  return { percent, weightBasis: historical ? "historical" : "task-count", passed, skipped, total: input.tasks.length, active, eta };
}
