import { APP_VERSION } from "../../../shared/version.js";
import { RELEASE_FINGERPRINT } from "../../../shared/release.js";

const REPO = "elijahama/halieus-game-room";
const RELEASE_URL = "https://raw.githubusercontent.com/" + REPO + "/main/RELEASE.json";
export const RELEASE_AVAILABILITY_TTL_MS = 5 * 60_000;

export type ReleaseAvailabilityStatus = "available" | "current" | "unverified";
export interface ReleaseAvailability {
  status: ReleaseAvailabilityStatus;
  installedVersion: string;
  installedFingerprint: string;
  candidateVersion: string | null;
  candidateFingerprint: string | null;
  checkedAt: string;
  source: "merged-main";
}

function parts(version: string): number[] | null {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) return null;
  const numbers = version.split(".").map(Number);
  return numbers.every(n => Number.isSafeInteger(n) && n <= 99999) ? numbers : null;
}

export function newerRelease(candidate: string, installed: string): boolean {
  const left = parts(candidate);
  const right = parts(installed);
  if (!left || !right) return false;
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i];
  }
  return false;
}

/** Public GitHub release identity is data, never an update command. */
export function classifyRelease(
  data: unknown,
  installedVersion = APP_VERSION,
  installedFingerprint = RELEASE_FINGERPRINT,
  now = new Date().toISOString(),
): ReleaseAvailability {
  const base: ReleaseAvailability = {
    status: "unverified", installedVersion, installedFingerprint,
    candidateVersion: null, candidateFingerprint: null,
    checkedAt: now, source: "merged-main",
  };
  if (!data || typeof data !== "object" || Array.isArray(data)) return base;
  const value = data as Record<string, unknown>;
  if (value.product !== "Halieus Game Room" ||
      typeof value.version !== "string" || !parts(value.version) ||
      typeof value.fingerprint !== "string" ||
      typeof value.sourceHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.sourceHash) ||
      value.fingerprint !== "hgr-" + value.version + "-" + value.sourceHash.slice(0, 16) ||
      value.algorithm !== "sha256" ||
      !Number.isSafeInteger(value.integrityFileCount) || (value.integrityFileCount as number) < 1) {
    return base;
  }
  base.candidateVersion = value.version;
  base.candidateFingerprint = value.fingerprint;
  if (newerRelease(value.version, installedVersion)) base.status = "available";
  else if (value.version === installedVersion && value.fingerprint === installedFingerprint)
    base.status = "current";
  // A same-version fingerprint mismatch or an older main release is NOT
  // silently promoted to "update available": it requires release audit.
  return base;
}

let cached: { at: number; data: ReleaseAvailability } | null = null;
let pending: Promise<ReleaseAvailability> | null = null;

export async function currentReleaseAvailability(
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<ReleaseAvailability> {
  if (cached && now - cached.at < RELEASE_AVAILABILITY_TTL_MS) return cached.data;
  if (!pending) {
    pending = (async () => {
      const response = await fetcher(RELEASE_URL, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
      if (!response.ok) throw new Error("Merged GitHub release not available.");
      const raw = await response.json();
      const data = classifyRelease(raw);
      if (data.status !== "unverified") cached = { at: Date.now(), data };
      return data;
    })().finally(() => { pending = null; });
  }
  return pending;
}


/** The manifest is only a candidate until its exact generated main commit
 * and preceding release-identity workflow have been verified. Never deploy here. */
export async function verifyPackagedRelease(candidate: ReleaseAvailability, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (candidate.status !== "available" || !candidate.candidateFingerprint || !candidate.candidateVersion) return false;
  const api = "https://api.github.com/repos/" + REPO;
  async function json(url: string): Promise<any> {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "User-Agent": "HGR-Control-release-watch" },
      signal: AbortSignal.timeout(8000), redirect: "error",
    });
    if (!response.ok) throw new Error("Release packaging evidence unavailable.");
    return response.json();
  }
  try {
    const head = await json(api + "/commits/main");
    const sha = head?.sha;
    const parent = head?.parents?.[0]?.sha;
    if (typeof sha !== "string" || !/^[a-f0-9]{40}$/.test(sha) ||
        typeof parent !== "string" || !/^[a-f0-9]{40}$/.test(parent) ||
        head?.parents?.length !== 1 || head?.commit?.message !== "chore: refresh HGR release identity") return false;
    const pinned = classifyRelease(await json("https://raw.githubusercontent.com/" + REPO + "/" + sha + "/RELEASE.json"),
      candidate.installedVersion, candidate.installedFingerprint);
    if (pinned.status !== "available" || pinned.candidateFingerprint !== candidate.candidateFingerprint ||
        pinned.candidateVersion !== candidate.candidateVersion) return false;
    const runs = await json(api + "/actions/workflows/release-identity.yml/runs?branch=main&head_sha=" + parent + "&status=success&per_page=10");
    return Array.isArray(runs?.workflow_runs) && runs.workflow_runs.some((run: any) =>
      run.head_sha === parent && run.head_branch === "main" &&
      run.path === ".github/workflows/release-identity.yml" &&
      run.status === "completed" && run.conclusion === "success");
  } catch { return false; }
}

/** A single non-overlapping, read-only polling iteration, injectable for tests. */
export function createControlReleaseCheck(deps: {
  hasSubscribers: () => boolean;
  readRelease: () => Promise<ReleaseAvailability>;
  needsNotice: (release: ReleaseAvailability) => boolean;
  verify: (release: ReleaseAvailability) => Promise<boolean>;
  notify: (release: ReleaseAvailability) => Promise<void>;
}) {
  let running = false;
  return async function check(): Promise<void> {
    if (running || !deps.hasSubscribers()) return;
    running = true;
    try {
      const release = await deps.readRelease();
      if (release.status === "available" && deps.needsNotice(release) && await deps.verify(release)) {
        await deps.notify(release);
      }
    } catch {
      // Fail closed; the next five-minute tick retries discovery, not deployment.
      console.warn("[HGR] Control release notification check unavailable.");
    } finally { running = false; }
  };
}
