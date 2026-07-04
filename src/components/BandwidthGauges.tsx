"use client";

import { formatRate } from "@/lib/use-dashboard";
import type { WanPortInfo } from "@/lib/types";

interface Props {
  rxRate: number;
  txRate: number;
  wlanBytes: number;
  connected: boolean;
  wanPorts?: WanPortInfo[];
}

export function BandwidthGauges({ rxRate, txRate, wlanBytes, connected, wanPorts }: Props) {
  const cols = wanPorts && wanPorts.length > 0 ? wanPorts.length + 1 : 3;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={cols !== 3 ? { gridTemplateColumns: `repeat(${Math.min(cols, 4)}, minmax(0, 1fr))` } as React.CSSProperties : undefined}>
      {wanPorts && wanPorts.length > 0 ? (
        wanPorts.map((wan) => (
          <GaugeCard
            key={wan.portIdx}
            label={wan.name}
            value={`↓ ${formatRate(wan.rxRate)} / ↑ ${formatRate(wan.txRate)}`}
            sub={`${wan.speed === 10000 ? "10G" : wan.speed === 1000 ? "1G" : `${wan.speed}M`}`}
            percent={Math.min(((wan.rxRate + wan.txRate) / Math.max(rxRate + txRate, 1)) * 100, 100)}
            color="var(--success)"
            icon="🌐"
            connected={connected}
          />
        ))
      ) : (
        <>
          <GaugeCard
            label="Download"
            value={formatRate(rxRate)}
            percent={Math.min((rxRate / Math.max(rxRate, txRate, 1)) * 100, 100)}
            color="var(--success)"
            icon="↓"
            connected={connected}
          />
          <GaugeCard
            label="Upload"
            value={formatRate(txRate)}
            percent={Math.min((txRate / Math.max(rxRate, txRate, 1)) * 100, 100)}
            color="var(--accent)"
            icon="↑"
            connected={connected}
          />
        </>
      )}
      <GaugeCard
        label="WiFi Traffic"
        value={formatRate(wlanBytes)}
        percent={wlanBytes > 0 ? 100 : 0}
        color="#a855f7"
        icon="📶"
        connected={connected}
      />
    </div>
  );
}

function GaugeCard({
  label,
  value,
  sub,
  percent,
  color,
  icon,
  connected,
}: {
  label: string;
  value: string;
  sub?: string;
  percent: number;
  color: string;
  icon: string;
  connected: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 border border-[var(--border)]"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[var(--muted)] uppercase tracking-wide">{label}</span>
        <span className="text-lg opacity-60">{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${connected ? "" : "opacity-30"}`} style={{ color }}>
        {connected ? value : "—"}
      </div>
      {sub && <div className="text-xs text-[var(--muted)] mt-1">{sub}</div>}
      <div className="mt-3 h-2 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
