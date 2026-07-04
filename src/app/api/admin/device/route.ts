import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/admin-auth";
import { toggleDevice, restartDevice } from "@/lib/unifi";
import { getConsole, consoles } from "@/lib/consoles";
import { run, ensureSchema } from "@/db";

export const runtime = "nodejs";

async function checkAuth(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  let token: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    const cookie = request.headers.get("cookie");
    if (cookie) {
      const match = cookie.match(/ubuquity_session=([^;]+)/);
      if (match) token = match[1];
    }
  }
  return validateSession(token);
}

export async function POST(request: NextRequest) {
  if (!(await checkAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const body = await request.json();
  const consoleId = body.console || process.env.DEFAULT_CONSOLE_ID || "databunker1";
  const cfg = getConsole(consoleId) || consoles[0];
  const { action, deviceId, mac, disable, rebootType } = body;

  try {
    if (action === "toggle") {
      await toggleDevice(cfg, deviceId, disable);
      await run(
        `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
        disable ? "disable_device" : "enable_device", `${cfg.id}:${deviceId}`, "admin", "success",
      );
      return NextResponse.json({ success: true, message: `Device ${disable ? "disabled" : "enabled"}` });
    }

    if (action === "restart") {
      await restartDevice(cfg, mac, rebootType || "soft");
      await run(
        `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
        "restart_device", `${cfg.id}:${mac}`, "admin", "success",
      );
      return NextResponse.json({ success: true, message: `Device restart initiated (${rebootType || "soft"})` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    await run(
      `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
      action || "unknown", `${cfg.id}:${deviceId || mac}`, "admin", `error: ${(err as Error).message}`,
    );
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
