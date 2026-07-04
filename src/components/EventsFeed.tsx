"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardEvent } from "@/lib/types";
import { timeAgo } from "@/lib/use-dashboard";

interface Props {
  events: DashboardEvent[];
}

export function EventsFeed({ events }: Props) {
  const flashRef = useRef<HTMLDivElement>(null);
  const prevBrokenRef = useRef(0);
  const [flash, setFlash] = useState(false);

  const brokenCount = events.filter((e) => e.isBroken).length;

  useEffect(() => {
    if (brokenCount > prevBrokenRef.current) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 1000);
      return () => clearTimeout(timer);
    }
    prevBrokenRef.current = brokenCount;
  }, [brokenCount]);

  const sorted = [...events].sort((a, b) => b.time - a.time).slice(0, 50);

  return (
    <div
      ref={flashRef}
      className={`rounded-xl border border-[var(--border)] overflow-hidden ${flash ? "animate-flash-red" : ""}`}
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold">Events &amp; Logs</h2>
        {brokenCount > 0 && (
          <span className="px-3 py-1 rounded-lg text-sm bg-red-500/20 text-red-400 font-medium">
            {brokenCount} broken
          </span>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--muted)]">No recent events</div>
        ) : (
          sorted.map((event) => (
            <div
              key={event.id}
              className="px-4 py-2.5 border-b border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors flex items-start gap-3"
            >
              <div
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{
                  background:
                    event.severity === "error"
                      ? "var(--error)"
                      : event.severity === "warning"
                        ? "var(--warning)"
                        : "var(--muted)",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{event.msg}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--muted)]">{timeAgo(event.time)}</span>
                  {event.key && (
                    <span className="text-xs font-mono text-[var(--muted)] opacity-60">{event.key}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
