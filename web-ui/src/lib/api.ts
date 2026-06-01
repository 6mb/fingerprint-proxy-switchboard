import type {
  DelayBatchPayload,
  DelayPayload,
  DelaysResponse,
  DelayResult,
  LoginPayload,
  PanelSettingsResponse,
  ProbeSlotResponse,
  ReloadResponse,
  SavePanelSettingsPayload,
  SavePanelSettingsResponse,
  SaveSourcesPayload,
  SaveSourcesResponse,
  SelectSlotPayload,
  SessionResponse,
  SourcesResponse,
  StatusResponse,
} from "@/types/api";

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = response.statusText;

    try {
      const body = await response.json();
      message = body.detail || body.message || message;
    } catch {
      // Fall back to the status text.
    }

    throw new ApiError(response.status, message);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response.text() as T;
}

export { ApiError };

export const api = {
  session: () => request<SessionResponse>("/api/session"),
  login: (payload: LoginPayload) =>
    request<{ ok: boolean }>("/api/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/logout", {
      method: "POST",
      body: "{}",
    }),
  status: () => request<StatusResponse>("/api/status"),
  panelSettings: () => request<PanelSettingsResponse>("/api/panel-settings"),
  savePanelSettings: (payload: SavePanelSettingsPayload) =>
    request<SavePanelSettingsResponse>("/api/panel-settings", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sources: () => request<SourcesResponse>("/api/sources"),
  saveSources: (payload: SaveSourcesPayload) =>
    request<SaveSourcesResponse>("/api/sources", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  selectSlot: (slotId: number, payload: SelectSlotPayload) =>
    request<{ ok: boolean; slot: number; selected: string }>(
      `/api/slots/${slotId}/select`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    ),
  probeSlot: (slotId: number) =>
    request<ProbeSlotResponse>(`/api/slots/${slotId}/probe`, {
      method: "POST",
      body: "{}",
    }),
  delay: (payload: DelayPayload) =>
    request<DelayResult>("/api/delay", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  delays: (payload: DelayBatchPayload) =>
    request<DelaysResponse>("/api/delays", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reload: () =>
    request<ReloadResponse>("/api/reload", {
      method: "POST",
      body: "{}",
    }),
};
