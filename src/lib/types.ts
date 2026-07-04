export interface UniFiClient {
  mac: string;
  hostname: string | null;
  name: string | null;
  isWired: boolean;
  rxBytes: number;
  txBytes: number;
  rxRate: number;
  txRate: number;
  rxPackets: number;
  txPackets: number;
  signal: number | null;
  uptime: number;
  ip: string | null;
  vlan: number | null;
  essid: string | null;
  apMac: string | null;
  isGuest: boolean;
  blocked: boolean;
  swMac: string | null;
  swPort: number | null;
}

export interface UniFiDevice {
  mac: string;
  deviceId: string;
  name: string | null;
  model: string | null;
  type: string;
  ip: string | null;
  version: string | null;
  uptime: number;
  disabled: boolean;
  state: number;
  adoptable: boolean;
  portTable: UniFiPort[];
  rxBytes: number;
  txBytes: number;
}

export interface UniFiPort {
  portIdx: number;
  name: string | null;
  portconfId: string | null;
  opMode: string | null;
  enabled: boolean | null;
  poeMode: string | null;
  poeOn: boolean | null;
  rxBytes: number;
  txBytes: number;
  speed: number | null;
  fullDuplex: boolean | null;
  up: boolean | null;
  portPoe: boolean | null;
  connectedMac: string | null;
  uptime: number | null;
}

export interface WanPortInfo {
  name: string;
  portIdx: number;
  rxRate: number;
  txRate: number;
  speed: number | null;
  up: boolean | null;
}

export interface BandwidthSnapshot {
  rxBytes: number;
  txBytes: number;
  wanRxBytes: number;
  wanTxBytes: number;
  wlanBytes: number;
  timestamp: number;
  wanPorts?: WanPortInfo[];
}

export interface DashboardState {
  bandwidth: BandwidthSnapshot;
  totalRxRate: number;
  totalTxRate: number;
  wifiCount: number;
  wiredCount: number;
  totalClients: number;
  uniqueGuests: number;
  clients: UniFiClient[];
  devices: UniFiDevice[];
  events: DashboardEvent[];
  connected: boolean;
  lastUpdate: number;
  error: string | null;
}

export interface DashboardEvent {
  id: string;
  time: number;
  key: string;
  msg: string;
  severity: "info" | "warning" | "error";
  isBroken: boolean;
}

export const BROKEN_EVENT_KEYS = [
  "EVT_AP_LOCKED",
  "EVT_AP_RESTARTED_UNEXPECTEDLY",
  "EVT_AP_ADOPT_FAILED",
  "EVT_AP_UPGRADE_FAILED",
  "EVT_SW_LOST_CONTACT",
  "EVT_SW_RESTARTED_UNEXPECTEDLY",
  "EVT_GW_TERMINATE",
  "EVT_GW_RESTARTED_UNEXPECTEDLY",
  "EVT_FW_DOWNLOAD_FAILED",
  "EVT_FW_UPGRADE_FAILED",
  "EVT_FW_UPGRADE_ERROR",
  "EVT_DS_LIMIT_REACHED",
  "EVT_STA_DENY",
  "EVT_IP_CONFLICT",
  "EVT_ROGUE_AP",
];
