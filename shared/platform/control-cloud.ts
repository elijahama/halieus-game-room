import type {
  HalieusControlActionId,
  HalieusControlOperationState,
} from "./control.js";

export const HGR_CONTROL_CLOUD_PROTOCOL = "hgr-control-cloud-v1" as const;

export const HGR_CONTROL_CLOUD_ACTIONS = [
  "status",
  "start",
  "restart",
  "close",
  "update",
  "logs",
] as const;

export type HalieusCloudControlActionId =
  (typeof HGR_CONTROL_CLOUD_ACTIONS)[number];

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

export interface HalieusCloudControlRequest {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  requestId: string;
  deviceId: string;
  action: HalieusCloudControlActionId;
  requestedAt: string;
  confirmationId?: string;
}

export interface HalieusCloudControlResult {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  requestId: string;
  deviceId: string;
  action: HalieusCloudControlActionId;
  state: HalieusControlOperationState;
  finishedAt: string | null;
  reason: string | null;
}

export interface HalieusCloudDeviceStatus {
  protocol: typeof HGR_CONTROL_CLOUD_PROTOCOL;
  deviceId: string;
  online: boolean;
  lastSeenAt: string;
  hgrVersion: string | null;
}
