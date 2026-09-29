export type HalieusControlActionId =
  | "status"
  | "start"
  | "restart"
  | "close"
  | "update"
  | "logs"
  | "open-site"
  | "open-github";

export type HalieusControlActionKind =
  | "read"
  | "local-process"
  | "link";

export type HalieusControlConfirmation =
  | "none"
  | "confirm";

export interface HalieusControlActionDefinition {
  id: HalieusControlActionId;
  label: string;
  description: string;
  kind: HalieusControlActionKind;
  confirmation: HalieusControlConfirmation;
}

export const HGR_CONTROL_ACTIONS = [
  {
    id: "status",
    label: "Status",
    description: "Read HGR Control, version and repository status.",
    kind: "read",
    confirmation: "none",
  },
  {
    id: "start",
    label: "Start HGR",
    description: "Start the dedicated local HGR app window.",
    kind: "local-process",
    confirmation: "none",
  },
  {
    id: "restart",
    label: "Restart HGR",
    description: "Restart the dedicated local HGR app window without updating or deploying.",
    kind: "local-process",
    confirmation: "none",
  },
  {
    id: "close",
    label: "Close HGR",
    description: "Close the dedicated local HGR app window.",
    kind: "local-process",
    confirmation: "confirm",
  },
  {
    id: "update",
    label: "Update HGR",
    description: "Run the approved HGR update/validation/deploy flow, then restart on success.",
    kind: "local-process",
    confirmation: "confirm",
  },
  {
    id: "logs",
    label: "View logs",
    description: "Read recent HGR Control operation output.",
    kind: "read",
    confirmation: "none",
  },
  {
    id: "open-site",
    label: "Open HGR",
    description: "Open the HGR website from the controller device.",
    kind: "link",
    confirmation: "none",
  },
  {
    id: "open-github",
    label: "Open GitHub",
    description: "Open the HGR repository from the controller device.",
    kind: "link",
    confirmation: "none",
  },
] as const satisfies readonly HalieusControlActionDefinition[];

export interface HalieusControlRepositoryStatus {
  branch: string | null;
  commit: string | null;
  dirty: boolean | null;
}

export interface HalieusControlActionStatus {
  id: HalieusControlActionId;
  label: string;
  kind: HalieusControlActionKind;
  confirmation: HalieusControlConfirmation;
  implemented: boolean;
}

export interface HalieusControlStatus {
  ok: true;
  agent: "online";
  hgrVersion: string;
  machine: {
    name: string;
    platform: NodeJS.Platform;
  };
  repository: HalieusControlRepositoryStatus;
  actions: HalieusControlActionStatus[];
  timestamp: string;
}
