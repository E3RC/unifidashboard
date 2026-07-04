import { EventEmitter } from "events";
import {
  getActiveClients,
  getDevices,
  getBandwidthSnapshot,
  getGuestCount,
  getRecentEvents,
} from "./unifi";
import { run, ensureSchema } from "../db";
import type { ConsoleConfig } from "./consoles";
import type { DashboardState, DashboardEvent } from "./types";

const PERSIST_INTERVAL_MS = 10 * 60 * 1000;

class LiveDataStore {
  private cfg: ConsoleConfig;
  private state: DashboardState;
  private emitter = new EventEmitter();
  private pollTimers: NodeJS.Timeout[] = [];
  private persistTimer: NodeJS.Timeout | null = null;
  private started = false;
  private lastPersist = 0;
  private prevPortBytes: Record<string, { rxBytes: number; txBytes: number; time: number }> = {};

  constructor(cfg: ConsoleConfig) {
    this.cfg = cfg;
    this.state = {
      bandwidth: { rxBytes: 0, txBytes: 0, wanRxBytes: 0, wanTxBytes: 0, wlanBytes: 0, timestamp: 0 },
      totalRxRate: 0,
      totalTxRate: 0,
      wifiCount: 0,
      wiredCount: 0,
      totalClients: 0,
      uniqueGuests: 0,
      clients: [],
      devices: [],
      events: [],
      connected: false,
      lastUpdate: 0,
      error: null,
    };
  }

  get consoleName(): string {
    return this.cfg.name;
  }

  getState(): DashboardState {
    return { ...this.state, events: this.state.events.slice(0, 50) };
  }

  subscribe(listener: (state: DashboardState) => void): () => void {
    this.emitter.on("update", listener);
    return () => this.emitter.off("update", listener);
  }

  private update(partial: Partial<DashboardState>) {
    this.state = { ...this.state, ...partial, lastUpdate: Date.now() };
    this.emitter.emit("update", this.getState());
  }

  async start() {
    if (this.started) return;
    this.started = true;

    try {
      await ensureSchema();
    } catch (err) {
      this.update({ error: `DuckDB init failed: ${(err as Error).message}` });
    }

    try {
      await getActiveClients(this.cfg);
      this.update({ connected: true, error: null });
    } catch (err) {
      this.update({ connected: false, error: `UniFi API connection failed: ${(err as Error).message}` });
    }

    this.pollClients();
    this.pollBandwidth();
    this.pollGuests();
    this.pollEvents();
    this.pollDevices();

    this.pollTimers.push(setInterval(() => this.pollClients(), 5000));
    this.pollTimers.push(setInterval(() => this.pollBandwidth(), 60000));
    this.pollTimers.push(setInterval(() => this.pollGuests(), 30000));
    this.pollTimers.push(setInterval(() => this.pollEvents(), 15000));
    this.pollTimers.push(setInterval(() => this.pollDevices(), 60000));

    this.persistTimer = setInterval(() => this.persistSnapshot(), PERSIST_INTERVAL_MS);
  }

  stop() {
    this.pollTimers.forEach(clearInterval);
    this.pollTimers = [];
    if (this.persistTimer) clearInterval(this.persistTimer);
    this.persistTimer = null;
    this.started = false;
  }

  private async pollClients() {
    try {
      const clients = await getActiveClients(this.cfg);
      const wifi = clients.filter((c) => !c.isWired);
      const wired = clients.filter((c) => c.isWired);
      const totalRxRate = clients.reduce((sum, c) => sum + c.rxRate, 0);
      const totalTxRate = clients.reduce((sum, c) => sum + c.txRate, 0);

      this.update({
        clients,
        wifiCount: wifi.length,
        wiredCount: wired.length,
        totalClients: clients.length,
        totalRxRate,
        totalTxRate,
        error: null,
      });
    } catch (err) {
      this.update({ error: `Client poll failed: ${(err as Error).message}` });
    }
  }

  private async pollBandwidth() {
    try {
      const bw = await getBandwidthSnapshot(this.cfg);
      this.update({ bandwidth: bw, error: null });
    } catch (err) {
      this.update({ error: `Bandwidth poll failed: ${(err as Error).message}` });
    }
  }

  private async pollGuests() {
    try {
      const count = await getGuestCount(this.cfg);
      this.update({ uniqueGuests: count, error: null });
    } catch {
      // non-critical
    }
  }

  private async pollEvents() {
    try {
      const recent = await getRecentEvents(this.cfg, 50);
      const existingIds = new Set(this.state.events.map((e) => e.id));
      const newOnes = recent.filter((e) => !existingIds.has(e.id));
      if (newOnes.length > 0) {
        const merged = [...newOnes, ...this.state.events].slice(0, 200);
        this.update({ events: merged });
        for (const evt of newOnes) {
          await this.persistEvent(evt);
        }
      }
    } catch {
      // non-critical
    }
  }

  private async pollDevices() {
    try {
      const devices = await getDevices(this.cfg);
      const now = Date.now();

      const udm = devices.find((d) => d.type === "udm");
      const wanPorts: { name: string; portIdx: number; rxRate: number; txRate: number; speed: number | null; up: boolean | null }[] = [];
      if (udm) {
        for (const port of udm.portTable) {
          if (port.speed && port.speed >= 1000 && port.up && port.name?.toLowerCase().includes("surf")) {
            const key = `${udm.mac}:${port.portIdx}`;
            const prev = this.prevPortBytes[key];
            const dt = prev ? (now - prev.time) / 1000 : 60;
            const rxRate = prev && dt > 0 ? Math.max(0, (port.rxBytes - prev.rxBytes) / dt) : 0;
            const txRate = prev && dt > 0 ? Math.max(0, (port.txBytes - prev.txBytes) / dt) : 0;
            this.prevPortBytes[key] = { rxBytes: port.rxBytes, txBytes: port.txBytes, time: now };
            wanPorts.push({ name: port.name || `WAN ${port.portIdx}`, portIdx: port.portIdx, rxRate, txRate, speed: port.speed, up: port.up });
          }
        }
      }

      const bw = { ...this.state.bandwidth, wanPorts: wanPorts.length > 0 ? wanPorts : undefined };
      this.update({ devices, bandwidth: bw, error: null });
    } catch (err) {
      this.update({ error: `Device poll failed: ${(err as Error).message}` });
    }
  }

  private async persistSnapshot() {
    if (Date.now() - this.lastPersist < PERSIST_INTERVAL_MS - 5000) return;
    this.lastPersist = Date.now();

    try {
      const now = new Date();
      const s = this.state;

      await run(
        `INSERT INTO client_counts (time, wifi_count, wired_count, total) VALUES (?, ?, ?, ?)`,
        now, s.wifiCount, s.wiredCount, s.totalClients,
      );

      await run(
        `INSERT INTO bandwidth_samples (time, rx_bytes, tx_bytes, wan_rx_bytes, wan_tx_bytes, wlan_bytes) VALUES (?, ?, ?, ?, ?, ?)`,
        now, s.totalRxRate, s.totalTxRate, s.bandwidth.wanRxBytes, s.bandwidth.wanTxBytes, s.bandwidth.wlanBytes,
      );

      await run(
        `INSERT INTO guest_counts (time, unique_guests) VALUES (?, ?)`,
        now, s.uniqueGuests,
      );
    } catch {
      // non-critical — will retry next cycle
    }
  }

  private async persistEvent(event: DashboardEvent) {
    try {
      await run(
        `INSERT INTO events (time, key, msg, severity, is_broken, raw) VALUES (?, ?, ?, ?, ?, ?)`,
        new Date(event.time), event.key, event.msg, event.severity, event.isBroken, JSON.stringify({}),
      );
    } catch {
      // non-critical
    }
  }
}

const stores = new Map<string, LiveDataStore>();

export function getStore(cfg: ConsoleConfig): LiveDataStore {
  let store = stores.get(cfg.id);
  if (!store) {
    store = new LiveDataStore(cfg);
    stores.set(cfg.id, store);
  }
  return store;
}
