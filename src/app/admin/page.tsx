"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import type { UniFiDevice } from "@/lib/types";
import { formatRate, formatUptime } from "@/lib/use-dashboard";

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[var(--muted)]">Loading admin...</div>}>
      <AdminContent />
    </Suspense>
  );
}

function AdminContent() {
  const searchParams = useSearchParams();
  const consoleId = searchParams.get("console") || "databunker1";
  const { isSignedIn } = useAuth();
  const [devices, setDevices] = useState<UniFiDevice[]>([]);
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showInvite, setShowInvite] = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch(`/api/state?console=${consoleId}`);
      const data = await res.json();
      setDevices(data.devices || []);
    } catch {
      // ignore
    }
  }, [consoleId]);

  useEffect(() => {
    if (!isSignedIn) return;
    const poll = () => fetchDevices();
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isSignedIn, fetchDevices]);

  const doAction = async (endpoint: string, body: Record<string, unknown>) => {
    setBusy(true);
    setActionMsg("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, console: consoleId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMsg(data.message || "Action successful");
        setTimeout(() => fetchDevices(), 2000);
      } else {
        setActionMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setActionMsg(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setActionMsg(""), 5000);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail) return;
    setInviteMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg(`Invitation sent to ${inviteEmail}`);
        setInviteEmail("");
        fetchInvitations();
      } else {
        setInviteMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setInviteMsg(`Error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
      setTimeout(() => setInviteMsg(""), 5000);
    }
  };

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invite?status=pending");
      const data = await res.json();
      if (res.ok) setInvitations(data.invitations || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchInvitations();
  }, [isSignedIn, fetchInvitations]);

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          className="rounded-xl border border-[var(--border)] p-8 w-full max-w-sm text-center"
          style={{ background: "var(--card)" }}
        >
          <h1 className="text-xl font-bold mb-1">Admin</h1>
          <p className="text-sm text-[var(--muted)] mb-6">Sign in with your Google account to manage devices and ports</p>
          <Link
            href="/sign-in"
            className="inline-block w-full py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
          <Link href={`/${consoleId}`} className="block text-center text-sm text-[var(--muted)] mt-4 hover:text-[var(--foreground)]">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Admin Controls <span className="text-[var(--muted)] text-lg">— {consoleId}</span></h1>
        <div className="flex items-center gap-4">
          {actionMsg && (
            <span className="text-sm text-[var(--accent)] animate-pulse">{actionMsg}</span>
          )}
          <Link href={`/${consoleId}`} className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden mb-6"
        style={{ background: "var(--card)" }}
      >
        <button
          onClick={() => setShowInvite(!showInvite)}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--card-hover)] transition-colors"
        >
          <span className="font-medium">Invite User</span>
          <span className="text-sm text-[var(--muted)]">{showInvite ? "▲" : "▼"}</span>
        </button>
        {showInvite && (
          <div className="border-t border-[var(--border)] p-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteUser()}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={inviteUser}
                disabled={busy || !inviteEmail}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {busy ? "..." : "Invite"}
              </button>
            </div>
            {inviteMsg && <p className="text-sm text-[var(--accent)]">{inviteMsg}</p>}
            {invitations.length > 0 && (
              <div>
                <p className="text-sm text-[var(--muted)] mb-2">Pending invitations:</p>
                <div className="space-y-1">
                  {invitations.map((inv: any) => (
                    <div key={inv.id} className="text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--background)]">
                      <span>{inv.email_address}</span>
                      <span className="text-[var(--warning)] text-xs">({inv.status})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {devices.length === 0 ? (
          <div className="text-center text-[var(--muted)] py-12">No devices found or still loading...</div>
        ) : (
          devices.map((device) => (
            <DeviceCard key={device.mac} device={device} onAction={doAction} busy={busy} />
          ))
        )}
      </div>
    </div>
  );
}

function DeviceCard({
  device,
  onAction,
  busy,
}: {
  device: UniFiDevice;
  onAction: (endpoint: string, body: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const typeIcon: Record<string, string> = {
    uap: "📶",
    usw: "🔌",
    ugw: "🌐",
    udmp: "🖥️",
    unknown: "📦",
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: "var(--card)" }}
    >
      <div className="flex items-center justify-between p-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeIcon[device.type] || "📦"}</span>
          <div>
            <div className="font-medium">
              {device.name || device.model || "Unnamed Device"}
            </div>
            <div className="text-xs text-[var(--muted)] font-mono">
              {device.ip || "no IP"} · {device.model || device.type} · v{device.version || "?"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{
              background: device.disabled ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
              color: device.disabled ? "var(--error)" : "var(--success)",
            }}
          >
            {device.disabled ? "DISABLED" : "ACTIVE"}
          </span>

          <button
            onClick={() => onAction("/api/admin/device", { action: "toggle", deviceId: device.deviceId, disable: !device.disabled })}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] hover:bg-[var(--card-hover)] disabled:opacity-50 transition-colors"
          >
            {device.disabled ? "Enable" : "Disable"}
          </button>

          {confirmRestart ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  onAction("/api/admin/device", { action: "restart", mac: device.mac, rebootType: "soft" });
                  setConfirmRestart(false);
                }}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg text-sm bg-[var(--warning)] text-black font-medium"
              >
                Confirm Restart
              </button>
              <button
                onClick={() => setConfirmRestart(false)}
                className="px-2 py-1.5 rounded-lg text-sm text-[var(--muted)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRestart(true)}
              disabled={busy || device.disabled}
              className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] hover:bg-[var(--card-hover)] disabled:opacity-50 transition-colors"
            >
              Restart
            </button>
          )}

          {device.portTable.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] hover:bg-[var(--card-hover)] transition-colors"
            >
              {expanded ? "Hide Ports" : `Ports (${device.portTable.length})`}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-2 text-xs text-[var(--muted)] flex gap-4">
        <span>Uptime: {formatUptime(device.uptime)}</span>
        <span>RX: {formatRate(device.rxBytes)}</span>
        <span>TX: {formatRate(device.txBytes)}</span>
      </div>

      {expanded && device.portTable.length > 0 && (
        <div className="border-t border-[var(--border)] p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)]">
                <th className="px-2 py-1 font-medium">Port</th>
                <th className="px-2 py-1 font-medium">Name</th>
                <th className="px-2 py-1 font-medium">Status</th>
                <th className="px-2 py-1 font-medium">Speed</th>
                <th className="px-2 py-1 font-medium">PoE</th>
                <th className="px-2 py-1 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {device.portTable.map((port) => (
                <tr key={port.portIdx} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2 font-mono">{port.portIdx}</td>
                  <td className="px-2 py-2">{port.name || `Port ${port.portIdx}`}</td>
                  <td className="px-2 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: port.up ? "rgba(34,197,94,0.2)" : "rgba(100,116,139,0.2)",
                        color: port.up ? "var(--success)" : "var(--muted)",
                      }}
                    >
                      {port.up ? "UP" : "DOWN"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {port.speed ? `${port.speed}Mbps${port.fullDuplex ? " FDX" : ""}` : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {port.portPoe ? (
                      <span style={{ color: port.poeOn ? "var(--success)" : "var(--muted)" }}>
                        {port.poeOn ? "ON" : "OFF"} ({port.poeMode || "auto"})
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          onAction("/api/admin/port", {
                            action: "toggle",
                            deviceId: device.deviceId,
                            portIdx: port.portIdx,
                            portconfId: port.portconfId,
                            disable: true,
                            existingOverrides: [],
                          })
                        }
                        disabled={busy}
                        className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Disable
                      </button>
                      <button
                        onClick={() =>
                          onAction("/api/admin/port", {
                            action: "toggle",
                            deviceId: device.deviceId,
                            portIdx: port.portIdx,
                            portconfId: port.portconfId,
                            disable: false,
                            existingOverrides: [],
                          })
                        }
                        disabled={busy}
                        className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        Enable
                      </button>
                      {port.portPoe && (
                        <button
                          onClick={() =>
                            onAction("/api/admin/port", {
                              action: "power_cycle",
                              mac: device.mac,
                              portIdx: port.portIdx,
                            })
                          }
                          disabled={busy}
                          className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                        >
                          Power Cycle
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
