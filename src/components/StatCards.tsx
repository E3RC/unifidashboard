"use client";

interface Props {
  wifiCount: number;
  wiredCount: number;
  uniqueGuests: number;
  connected: boolean;
}

export function StatCards({ wifiCount, wiredCount, uniqueGuests, connected }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="WiFi Clients"
        value={wifiCount}
        icon="📶"
        color="var(--accent)"
        connected={connected}
      />
      <StatCard
        label="Hardwired Clients"
        value={wiredCount}
        icon="🔗"
        color="var(--success)"
        connected={connected}
      />
      <StatCard
        label="Unique Guests (24h)"
        value={uniqueGuests}
        icon="👥"
        color="#a855f7"
        connected={connected}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  connected,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
  connected: boolean;
}) {
  return (
    <div
      className="rounded-xl p-5 border border-[var(--border)] flex items-center gap-4"
      style={{ background: "var(--card)" }}
    >
      <div
        className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shrink-0"
        style={{ background: `${color}20` }}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm text-[var(--muted)] uppercase tracking-wide">{label}</div>
        <div
          className="text-3xl font-bold font-mono tabular-nums"
          style={{ color: connected ? color : "var(--muted)" }}
        >
          {connected ? value : "—"}
        </div>
      </div>
    </div>
  );
}
