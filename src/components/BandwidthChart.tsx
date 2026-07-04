"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

interface TrendPoint {
  time: string;
  rx: number;
  tx: number;
}

interface Props {
  connected: boolean;
  consoleId?: string;
}

export function BandwidthChart({ connected: _connected, consoleId = "databunker1" }: Props) {
  const selectedConsoleId = consoleId;
  const [data, setData] = useState<TrendPoint[]>([]);
  const [range, setRange] = useState<"1h" | "6h" | "24h">("1h");
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async (selectedRange: "1h" | "6h" | "24h") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trends?range=${selectedRange}&console=${selectedConsoleId}`);
      const json = await res.json();
      if (json.bandwidth) {
        const points: TrendPoint[] = json.bandwidth.map((b: { time: string; rx_bytes: number; tx_bytes: number }) => ({
          time: new Date(b.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          rx: b.rx_bytes / 1024 / 1024,
          tx: b.tx_bytes / 1024 / 1024,
        }));
        setData(points);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedConsoleId]);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      if (!cancelled) fetchTrends(range);
    };
    poll();
    const interval = setInterval(poll, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [range, fetchTrends]);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-5"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Bandwidth Trend</h2>
        <div className="flex gap-1 rounded-lg bg-[var(--background)] p-1">
          {(["1h", "6h", "24h"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                range === r
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="h-48">
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--muted)]">
            Loading trends...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--muted)]">
            No trend data yet (collecting...)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--success)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                stroke="var(--border)"
                minTickGap={50}
              />
              <YAxis
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                stroke="var(--border)"
                tickFormatter={(v) => `${v.toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--muted)" }}
                formatter={(value: ValueType | undefined) => {
                  const numericValue = Array.isArray(value) ? value[0] : value;
                  return [
                    `${Number(numericValue ?? 0).toFixed(2)} MB`,
                    "",
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="rx"
                stroke="var(--success)"
                strokeWidth={2}
                fill="url(#rxGradient)"
                name="Download"
              />
              <Area
                type="monotone"
                dataKey="tx"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#txGradient)"
                name="Upload"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
