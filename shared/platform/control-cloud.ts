import type {
  HalieusControlActionId,
  HalieusControlAuditEntry,
  HalieusControlOperationState,
  HalieusControlStatus,
} from "./control.js";

export const HGR_CONTROL_CLOUD_PROTOCOL = "hgr-control-cloud-v1" as const;

export const HGR_CONTROL_CLOUD_ACTIONS = [
  "status",
  "start",
  "restart",
  "close",
  "update",
  "logs",
  "open-site",
  "open-github",
] as const;

export const HGR_CONTROL_CLOUD_READ_ACTIONS = [
  "status",
  "logs",
] as const;

export const HGR_CONTROL_CLOUD_MUTATING_ACTIONS = [
  "start",
  "restart",
  "close",
  "update",
] as const;

export const HGR_CONTROL_CLOUD_LINK_ACTIONS = [
  "open-site",
  "open-github",
] as const;

export type HalieusCloudControlActionId =
  (typeof HGR_CONTROL_CLOUD_ACTIONS)[number];
export type HalieusCloudControlReadActionId =
  (typeof HGR_CONTROL_CLOUD_READ_ACTIONS)[number];

type AssertCloudActionSubset<T extends readonly HalieusControlActionId[]> = T;
export const HGR_CONTROL_CLOUD_ACTION_SUBSET: AssertCloudActionSubset<
  typeof HGR_CONTROL_CLOUD_ACTIONS
> = HGR_CONTROL_CLOUD_ACTIONS;

export interface HalieusCloudDeviceHello {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  deviceId: string;
  machineName: string;
  hgrVersion: string;
  connectedAt: string;
}

export interface HalieusCloudDeviceSummary {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  deviceId: string;
  label: string;
  ownerAccountId: string;
  machineName: string;
  createdAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  hgrVersion: string | null;
  online: boolean;
}

export interface HalieusCloudDeviceEnrollment {
  ok: true;
  device: HalieusCloudDeviceSummary;
  token: string;
}

export interface HalieusCloudAgentHeartbeat {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  deviceId: string;
  machineName: string;
  hgrVersion: string;
  agentStartedAt: string;
}

export interface HalieusCloudControlRequest {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  requestId: string;
  deviceId: string;
  action: HalieusCloudControlActionId;
  requestedAt: string;
  confirmationId?: string;
}

export interface HalieusCloudRelayCommand extends HalieusCloudControlRequest {
  action: HalieusCloudControlReadActionId;
}

export type HalieusCloudRelayPayload =
  | HalieusControlStatus
  | HalieusControlAuditEntry[]
  | null;

export interface HalieusCloudControlResult {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  requestId: string;
  deviceId: string;
  action: HalieusCloudControlActionId;
  state: HalieusControlOperationState;
  finishedAt: string | null;
  reason: string | null;
  payload?: HalieusCloudRelayPayload;
}

export interface HalieusCloudDeviceStatus {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  deviceId: string;
  online: boolean;
  lastSeenAt: string;
  hgrVersion: string | null;
}
