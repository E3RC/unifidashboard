"use client";

import React from "react";
import { useLiveDashboard, formatUptime } from "@/lib/use-dashboard";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import Link from "next/link";
import type { UniFiDevice, UniFiPort, UniFiClient } from "@/lib/types";

interface PoEEntry {
  deviceName: string;
  deviceMac: string;
  port: UniFiPort;
  client: UniFiClient;
  deviceUptime: number;
}

export function BunkerBoxView({ consoleId }: { consoleId: string }) {
  const state = useLiveDashboard(consoleId);

  const clientBySwPort = new Map<string, UniFiClient>();
  for (const c of state.clients) {
    if (c.swMac && c.swPort != null) {
      clientBySwPort.set(`${c.swMac}:${c.swPort}`, c);
    }
  }

  const entries: PoEEntry[] = [];
  for (const dev of state.devices) {
    for (const port of dev.portTable) {
      if (!(port.portPoe && port.poeMode && port.poeMode !== "off" && port.up)) continue;
      const client = port.connectedMac
        ? state.clients.find((c) => c.mac === port.connectedMac) || null
        : clientBySwPort.get(`${dev.mac}:${port.portIdx}`) || null;
      if (!client) continue;
      entries.push({
        deviceName: dev.name || dev.model || dev.mac,
        deviceMac: dev.mac,
        port,
        client,
        deviceUptime: dev.uptime,
      });
    }
  }

  entries.sort((a, b) => a.deviceName.localeCompare(b.deviceName) || a.port.portIdx - b.port.portIdx);

  const connectedNow = entries.length;

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;
    let pos = 0;
    const id = setInterval(() => {
      pos += 1;
      if (pos >= maxScroll) pos = 0;
      el.scrollTop = pos;
    }, 80);
    return () => clearInterval(id);
  }, [connectedNow, state.connected]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BunkerBox Connections</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Databunker1 PoE Ports</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus
            connected={state.connected}
            lastUpdate={state.lastUpdate}
            error={state.error}
          />
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:bg-[var(--card-hover)] transition-colors"
          >
            Dashboard →
          </Link>
          <Link
            href="/databunker1"
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:bg-[var(--card-hover)] transition-colors"
          >
            Databunker1 →
          </Link>
        </div>
      </header>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div ref={scrollRef} className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] z-10">
              <tr className="text-left text-xs text-[var(--muted)] uppercase tracking-wider">
                <th className="p-3 font-medium">Switch</th>
                <th className="p-3 font-medium">Port</th>
                <th className="p-3 font-medium">PoE Mode</th>
                <th className="p-3 font-medium">Connected Client</th>
                <th className="p-3 font-medium">MAC</th>
                <th className="p-3 font-medium">Switch Uptime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-[var(--muted)]">
                    {state.connected ? "No active PoE ports found" : "Waiting for data..."}
                  </td>
                </tr>
              ) : (
                entries.map((e, i) => (
                  <tr key={`${e.deviceMac}-${e.port.portIdx}`} className="hover:bg-[var(--card-hover)] transition-colors">
                    <td className="p-3 font-medium">{e.deviceName}</td>
                    <td className="p-3">{e.port.name || `Port ${e.port.portIdx}`}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        {e.port.poeMode}
                      </span>
                    </td>
                    <td className="p-3">
                      <span>{e.client.name || e.client.hostname || "—"}</span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {e.client.mac}
                    </td>
                    <td className="p-3 text-[var(--muted)]">
                      {formatUptime(e.port.uptime ?? e.deviceUptime)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">{connectedNow}</div>
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mt-1">Connected Now</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--muted)]">—</div>
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mt-1">Total Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--muted)]">—</div>
            <div className="text-xs text-[var(--muted)] uppercase tracking-wider mt-1">Month to Date</div>
          </div>
        </div>
      </footer>

      <footer className="mt-4 text-center text-xs text-[var(--muted)]">
        Databunker1 · BunkerBox Connections · Live via UniFi Site Manager API
      </footer>
    </div>
  );
}
