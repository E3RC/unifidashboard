"use client";

import { useState } from "react";
import type { UniFiClient } from "@/lib/types";
import { formatBytes, formatRate, formatUptime } from "@/lib/use-dashboard";

interface Props {
  clients: UniFiClient[];
}

type Filter = "all" | "wifi" | "wired";

export function ClientTable({ clients }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = clients.filter((c) => {
    if (filter === "wifi" && c.isWired) return false;
    if (filter === "wired" && !c.isWired) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (c.hostname || "").toLowerCase().includes(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.ip || "").toLowerCase().includes(q) ||
        c.mac.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => b.rxRate + b.txRate - (a.rxRate + a.txRate));

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)] gap-3 flex-wrap">
        <h2 className="text-lg font-semibold">Connected Clients ({filtered.length})</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 rounded-lg bg-[var(--background)] p-1">
            {(["all", "wifi", "wired"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-sm capitalize transition-colors ${
                  filter === f
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm outline-none focus:border-[var(--accent)] w-40"
          />
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin max-h-[400px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--card)] z-10">
            <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
              <th className="px-4 py-2 font-medium">Name / Hostname</th>
              <th className="px-4 py-2 font-medium">IP</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium text-right">RX Rate</th>
              <th className="px-4 py-2 font-medium text-right">TX Rate</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
              <th className="px-4 py-2 font-medium">Uptime</th>
              <th className="px-4 py-2 font-medium">Signal</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr
                key={c.mac}
                className="border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors"
              >
                <td className="px-4 py-2">
                  <div className="font-medium">{c.name || c.hostname || "Unknown"}</div>
                  <div className="text-xs text-[var(--muted)] font-mono">{c.mac}</div>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{c.ip || "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      c.isWired
                        ? "bg-[var(--success)]20 text-[var(--success)]"
                        : "bg-[var(--accent)]20 text-[var(--accent)]"
                    }`}
                  >
                    {c.isWired ? "Wired" : "WiFi"}
                  </span>
                  {c.isGuest && (
                    <span className="ml-1 px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
                      Guest
                    </span>
                  )}
                  {c.blocked && (
                    <span className="ml-1 px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                      Blocked
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right font-mono text-[var(--success)]">
                  {formatRate(c.rxRate)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-[var(--accent)]">
                  {formatRate(c.txRate)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-xs text-[var(--muted)]">
                  {formatBytes(c.rxBytes + c.txBytes)}
                </td>
                <td className="px-4 py-2 text-xs text-[var(--muted)]">{formatUptime(c.uptime)}</td>
                <td className="px-4 py-2">
                  {c.signal !== null ? (
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, (c.signal + 100) * 2))}%`,
                            background: c.signal > -60 ? "var(--success)" : c.signal > -75 ? "var(--warning)" : "var(--error)",
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-[var(--muted)]">{c.signal}dBm</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
                  No clients {filter !== "all" ? `(${filter})` : ""} connected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
