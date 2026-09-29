export type HalieusMaintenanceState = "scheduled" | "restarting";

export interface HalieusMaintenanceNotice {
  id: string;
  state: HalieusMaintenanceState;
  reason: string;
  targetVersion: string | null;
  announcedAt: number;
  restartAt: number | null;
  estimatedSeconds: number | null;
}

export interface HalieusServerReadyPayload {
  message: string;
  version: string;
  releaseFingerprint: string;
}
