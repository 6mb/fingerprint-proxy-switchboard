export interface SessionResponse {
  authRequired: boolean;
  authenticated: boolean;
}

export interface VersionInfo {
  version?: string;
  meta?: string;
}

export interface CountryInfo {
  code?: string;
  name?: string;
}

export interface NodeInfo {
  name: string;
  type: string;
  source: string;
  country?: CountryInfo;
  delay: number | null;
  status: "ok" | "warn" | "bad" | "down" | "error" | "untested" | string;
  updatedAt?: string | null;
  error?: string;
}

export interface EgressInfo {
  ok: boolean;
  ip: string;
  country?: CountryInfo;
  city?: string;
  region?: string;
  asn?: number | null;
  asOrganization?: string;
  fraudScore?: number | null;
  isResidential?: boolean | null;
  isBroadcast?: boolean | null;
  updatedAt?: string | null;
  error?: string;
}

export interface SlotInfo {
  id: number;
  name: string;
  port: number;
  selected: string;
  selectedNode?: NodeInfo | null;
  choices: string[];
  choiceDetails: NodeInfo[];
  http: string;
  socks5: string;
  egress: EgressInfo;
}

export interface SourceSummary {
  nodeCount: number;
  types: string[];
  countries: CountryInfo[];
  sources: string[];
  errors: string[];
}

export interface AuthSummary {
  proxyAuthConfigured: boolean;
  proxyUsername: string;
  panelAuthRequired: boolean;
}

export interface StatusResponse {
  version: VersionInfo;
  slots: SlotInfo[];
  nodes: NodeInfo[];
  auth: AuthSummary;
  source: SourceSummary;
}

export interface DelayResult {
  ok: boolean;
  name: string;
  delay: number | null;
  status: string;
  updatedAt: string;
  error?: string;
}

export interface DelaysResponse {
  ok: boolean;
  tested: number;
  healthy: number;
  results: DelayResult[];
}

export interface SourceRecord {
  id: number | null;
  name: string;
  kind: "path" | "url" | "url_file";
  value: string;
  preview: string;
  enabled: boolean;
  saved: boolean;
}

export interface SourcesResponse {
  sources: SourceRecord[];
  sourcesPath: string;
}

export interface PanelSettingsResponse {
  slotPorts: number[];
  slotCount: number;
  slotGroups: string[];
  settingsPath: string;
}

export interface SaveSourcesResponse {
  ok: boolean;
  saved?: {
    count: number;
  };
  generated?: {
    nodes?: number;
    source_errors?: string[];
  };
}

export interface ReloadResponse {
  ok: boolean;
  generated: {
    nodes: number;
    source_errors?: string[];
  };
}

export interface SavePanelSettingsResponse {
  ok: boolean;
  saved?: {
    slotPorts: number[];
    slotCount: number;
  };
  settings: PanelSettingsResponse;
  generated?: {
    nodes?: number;
    source_errors?: string[];
  };
}

export interface LoginPayload {
  token: string;
}

export interface SelectSlotPayload {
  name: string;
}

export interface DelayPayload {
  name: string;
}

export interface DelayBatchPayload {
  names?: string[];
}

export interface SaveSourcesPayload {
  sources: Array<{
    id: number | null;
    name: string;
    kind: "path" | "url" | "url_file";
    value: string;
    enabled: boolean;
    keep: boolean;
  }>;
  reload: boolean;
}

export interface SavePanelSettingsPayload {
  slotPorts: number[];
}

export type ProbeSlotResponse = EgressInfo;
