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
