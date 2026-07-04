"use client";

import { timeAgo } from "@/lib/use-dashboard";

interface Props {
  connected: boolean;
  lastUpdate: number;
  error: string | null;
}

export function ConnectionStatus({ connected, lastUpdate, error }: Props) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: connected ? "var(--success)" : "var(--error)",
            boxShadow: connected ? "0 0 8px var(--success)" : "none",
          }}
        />
        <span style={{ color: connected ? "var(--success)" : "var(--error)" }}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {lastUpdate > 0 && (
        <span className="text-[var(--muted)]">Updated {timeAgo(lastUpdate)}</span>
      )}
      {error && (
        <span className="text-[var(--error)] text-xs truncate max-w-md" title={error}>
          ⚠ {error}
        </span>
      )}
    </div>
  );
}
