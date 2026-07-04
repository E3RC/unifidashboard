"use client";

import { useEffect, useState, useRef } from "react";
import type { DashboardState } from "@/lib/types";

const initialState: DashboardState = {
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

export function useLiveDashboard(consoleId: string = "sopernet") {
  const [state, setState] = useState<DashboardState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/stream?console=${consoleId}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as DashboardState;
          setState(data);
        } catch {
          // ignore malformed
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [consoleId]);

  return state;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatRate(bytesPerSec: number): string {
  if (bytesPerSec === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  return `${parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
