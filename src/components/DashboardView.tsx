"use client";

import Link from "next/link";
import { useLiveDashboard } from "@/lib/use-dashboard";
import { BandwidthGauges } from "@/components/BandwidthGauges";
import { StatCards } from "@/components/StatCards";
import { BandwidthChart } from "@/components/BandwidthChart";
import { ClientTable } from "@/components/ClientTable";
import { EventsFeed } from "@/components/EventsFeed";
import { ConnectionStatus } from "@/components/ConnectionStatus";

interface Props {
  consoleId: string;
  consoleName: string;
  otherConsoleId: string;
  otherConsoleName: string;
  otherConsoleHref?: string;
  otherLinks?: { label: string; href: string }[];
}

export function DashboardView({ consoleId, consoleName, otherConsoleId, otherConsoleName, otherConsoleHref = `/${otherConsoleId}`, otherLinks }: Props) {
  const state = useLiveDashboard(consoleId);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{consoleName} Dashboard</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Live UniFi Network Monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <ConnectionStatus
            connected={state.connected}
            lastUpdate={state.lastUpdate}
            error={state.error}
          />
          <Link
            href={otherConsoleHref}
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:bg-[var(--card-hover)] transition-colors"
          >
            {otherConsoleName} →
          </Link>
          <Link
            href={`/admin?console=${consoleId}`}
            className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:bg-[var(--card-hover)] transition-colors"
          >
            Admin →
          </Link>
          {otherLinks?.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-4 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] text-sm hover:bg-[var(--card-hover)] transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        <BandwidthGauges
          rxRate={state.totalRxRate}
          txRate={state.totalTxRate}
          wlanBytes={state.bandwidth.wlanBytes}
          connected={state.connected}
          wanPorts={state.bandwidth.wanPorts}
        />

        <StatCards
          wifiCount={state.wifiCount}
          wiredCount={state.wiredCount}
          uniqueGuests={state.uniqueGuests}
          connected={state.connected}
        />

        <BandwidthChart connected={state.connected} consoleId={consoleId} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClientTable clients={state.clients} />
          <EventsFeed events={state.events} />
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-[var(--muted)]">
        {consoleName} Dashboard · Data via UniFi Site Manager API · Stored in DuckDB
      </footer>
    </div>
  );
}
