import type {
  UniFiClient,
  UniFiDevice,
  UniFiPort,
  BandwidthSnapshot,
  DashboardEvent,
} from "./types";
import { BROKEN_EVENT_KEYS } from "./types";
import type { ConsoleConfig } from "./consoles";

const BASE_URL = "https://api.ui.com/v1/connector/consoles";

function apiBase(cfg: ConsoleConfig): string {
  return `${BASE_URL}/${cfg.consoleId}/network`;
}

async function apiRequest<T = any>(
  cfg: ConsoleConfig,
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: Record<string, unknown>,
): Promise<T> {
  if (!cfg.apiKey || !cfg.consoleId) {
    throw new Error(`UNIFI_API_KEY and UNIFI_CONSOLE_ID must be set for console "${cfg.id}". See SETUP.md.`);
  }

  const url = `${apiBase(cfg)}${path}`;
  const headers: Record<string, string> = {
    "X-API-KEY": cfg.apiKey,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
    await new Promise((r) => setTimeout(r, waitMs));
    return apiRequest<T>(cfg, path, method, body);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`UniFi API ${res.status}: ${text || res.statusText} (${method} ${path})`);
  }

  return res.json() as Promise<T>;
}

function mapClient(raw: any): UniFiClient {
  return {
    mac: raw.mac || "",
    hostname: raw.hostname || raw.ip || null,
    name: raw.name || raw.hostname || null,
    isWired: raw.is_wired ?? false,
    rxBytes: raw.rx_bytes || 0,
    txBytes: raw.tx_bytes || 0,
    rxRate: raw.rx_rate || 0,
    txRate: raw.tx_rate || 0,
    rxPackets: raw.rx_packets || 0,
    txPackets: raw.tx_packets || 0,
    signal: raw.signal ?? null,
    uptime: raw.uptime || 0,
    ip: raw.ip || null,
    vlan: raw.vlan ?? null,
    essid: raw.essid || null,
    apMac: raw.ap_mac || raw.bssid || null,
    isGuest: raw.is_guest ?? false,
    blocked: raw.blocked ?? false,
    swMac: raw.sw_mac || null,
    swPort: raw.sw_port ?? null,
  };
}

function mapPort(raw: any): UniFiPort {
  return {
    portIdx: raw.port_idx ?? 0,
    name: raw.name || null,
    portconfId: raw.portconf_id || null,
    opMode: raw.op_mode || null,
    enabled: raw.port_overrides_enabled ?? null,
    poeMode: raw.poe_mode || null,
    poeOn: raw.poe_on ?? null,
    rxBytes: raw.rx_bytes || 0,
    txBytes: raw.tx_bytes || 0,
    speed: raw.speed ?? null,
    fullDuplex: raw.full_duplex ?? null,
    up: raw.up ?? null,
    portPoe: raw.port_poe ?? null,
    connectedMac: raw.mac || null,
    uptime: raw.up_time ?? raw.time_active ?? null,
  };
}

function mapDevice(raw: any): UniFiDevice {
  return {
    mac: raw.mac || "",
    deviceId: raw.device_id || raw._id || "",
    name: raw.name || null,
    model: raw.model || null,
    type: raw.type || "unknown",
    ip: raw.ip || null,
    version: raw.version || null,
    uptime: raw.uptime || 0,
    disabled: raw.disabled ?? false,
    state: raw.state ?? 0,
    adoptable: raw.adoptable ?? false,
    portTable: (raw.port_table || []).map(mapPort),
    rxBytes: raw.rx_bytes || 0,
    txBytes: raw.tx_bytes || 0,
  };
}

function mapEvent(raw: any): DashboardEvent {
  const key = raw.key || "";
  const isBroken = BROKEN_EVENT_KEYS.includes(key);
  let severity: "info" | "warning" | "error" = "info";
  if (isBroken) severity = "error";
  else if (key.startsWith("EVT_AP") || key.startsWith("EVT_SW") || key.startsWith("EVT_GW")) severity = "warning";

  const msg = raw.msg || raw.message || formatEventMsg(key, raw);

  return {
    id: `${raw._id || raw.key}-${raw.time || Date.now()}`,
    time: (raw.time || Math.floor(Date.now() / 1000)) * 1000,
    key,
    msg,
    severity,
    isBroken,
  };
}

function formatEventMsg(key: string, raw: any): string {
  const params = raw.parameters || {};
  if (params.CLIENT) {
    return `${key}: client ${params.CLIENT.id || params.CLIENT.name || "unknown"}`;
  }
  if (params.AP) {
    return `${key}: AP ${params.AP.id || params.AP.name || "unknown"}`;
  }
  if (params.SW) {
    return `${key}: switch ${params.SW.id || params.SW.name || "unknown"}`;
  }
  if (params.GW) {
    return `${key}: gateway ${params.GW.id || params.GW.name || "unknown"}`;
  }
  return key;
}

export async function getActiveClients(cfg: ConsoleConfig): Promise<UniFiClient[]> {
  const res = await apiRequest<{ data: any[] }>(cfg, `/api/s/${cfg.site}/stat/sta`);
  return (res.data || []).map(mapClient);
}

export async function getDevices(cfg: ConsoleConfig): Promise<UniFiDevice[]> {
  const res = await apiRequest<{ data: any[] }>(cfg, `/api/s/${cfg.site}/stat/device`);
  return (res.data || []).map(mapDevice);
}

export async function getBandwidthSnapshot(cfg: ConsoleConfig): Promise<BandwidthSnapshot> {
  const now = Math.floor(Date.now() / 1000);
  const tenMinAgo = now - 600;

  try {
    const res = await apiRequest<{ data: any[] }>(
      cfg,
      `/api/s/${cfg.site}/stat/report/5minutes.site`,
      "POST",
      { start: tenMinAgo, end: now },
    );
    const data = res.data || [];
    if (data.length > 0) {
      const latest = data[data.length - 1];
      return {
        rxBytes: latest.bytes?.rx || 0,
        txBytes: latest.bytes?.tx || 0,
        wanRxBytes: latest["wan-rx_bytes"] || 0,
        wanTxBytes: latest["wan-tx_bytes"] || 0,
        wlanBytes: latest["wlan_bytes"] || 0,
        timestamp: now,
      };
    }
  } catch {
    // fall through to health
  }

  const health = await apiRequest<{ data: any[] }>(cfg, `/api/s/${cfg.site}/stat/health`);
  const wlanData = health.data?.find((s: any) => s.subsystem === "wlan");
  return {
    rxBytes: wlanData?.["rx_bytes"] || 0,
    txBytes: wlanData?.["tx_bytes"] || 0,
    wanRxBytes: 0,
    wanTxBytes: 0,
    wlanBytes: wlanData?.["wlan_bytes"] || 0,
    timestamp: now,
  };
}

export async function getGuestCount(cfg: ConsoleConfig): Promise<number> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const dayAgo = now - 86400;
    const res = await apiRequest<{ data: any[] }>(cfg, `/api/s/${cfg.site}/stat/guest`, "POST", {
      within: 86400,
      _start: dayAgo,
      _end: now,
    });
    const data = res.data || [];
    const uniqueMacs = new Set(data.map((g: any) => g.mac));
    return uniqueMacs.size;
  } catch {
    return 0;
  }
}

export async function getRecentEvents(cfg: ConsoleConfig, limit = 50): Promise<DashboardEvent[]> {
  try {
    const res = await apiRequest<{ data: any[] }>(cfg, `/api/s/${cfg.site}/stat/event`, "POST", {
      _sort: "-time",
      _limit: limit,
    });
    const data = res.data || [];
    return data.map(mapEvent);
  } catch {
    return [];
  }
}

export async function toggleDevice(cfg: ConsoleConfig, deviceId: string, disable: boolean): Promise<void> {
  await apiRequest(cfg, `/api/s/${cfg.site}/rest/device/${deviceId}`, "PUT", { disabled: disable });
}

export async function restartDevice(cfg: ConsoleConfig, mac: string, rebootType: "soft" | "hard" = "soft"): Promise<void> {
  await apiRequest(cfg, `/api/s/${cfg.site}/cmd/devmgr`, "POST", { cmd: "restart", mac, reboot_type: rebootType });
}

export async function togglePort(
  cfg: ConsoleConfig,
  deviceId: string,
  portIdx: number,
  portconfId: string | null,
  disable: boolean,
  existingOverrides: any[],
): Promise<void> {
  const overrides = [...(existingOverrides || [])];
  const idx = overrides.findIndex((o) => o.port_idx === portIdx);
  if (disable) {
    const override: Record<string, any> = { port_idx: portIdx, op_mode: "disabled" };
    if (portconfId) override.portconf_id = portconfId;
    if (idx >= 0) overrides[idx] = { ...overrides[idx], ...override };
    else overrides.push(override);
  } else {
    if (idx >= 0) {
      const { op_mode: _op_mode, ...rest } = overrides[idx];
      overrides[idx] = { ...rest, op_mode: "switch" };
    } else {
      overrides.push({ port_idx: portIdx, op_mode: "switch" });
    }
  }
  await apiRequest(cfg, `/api/s/${cfg.site}/rest/device/${deviceId}`, "PUT", { port_overrides: overrides });
}

export async function powerCyclePort(cfg: ConsoleConfig, mac: string, portIdx: number): Promise<void> {
  await apiRequest(cfg, `/api/s/${cfg.site}/cmd/devmgr`, "POST", { cmd: "power-cycle", mac, port_idx: portIdx });
}
