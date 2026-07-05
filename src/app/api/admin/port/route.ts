import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { togglePort, powerCyclePort } from "@/lib/unifi";
import { getConsole, consoles } from "@/lib/consoles";
import { run, ensureSchema } from "@/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const body = await request.json();
  const consoleId = body.console || process.env.DEFAULT_CONSOLE_ID || "databunker1";
  const cfg = getConsole(consoleId) || consoles[0];
  const { action, deviceId, mac, portIdx, portconfId, disable, existingOverrides } = body;

  try {
    if (action === "toggle") {
      await togglePort(cfg, deviceId, portIdx, portconfId, disable, existingOverrides);
      await run(
        `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
        disable ? "disable_port" : "enable_port", `${cfg.id}:${deviceId}:port_${portIdx}`, "admin", "success",
      );
      return NextResponse.json({ success: true, message: `Port ${portIdx} ${disable ? "disabled" : "enabled"}` });
    }

    if (action === "power_cycle") {
      await powerCyclePort(cfg, mac, portIdx);
      await run(
        `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
        "power_cycle_port", `${cfg.id}:${mac}:port_${portIdx}`, "admin", "success",
      );
      return NextResponse.json({ success: true, message: `PoE power-cycle sent to port ${portIdx}` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    await run(
      `INSERT INTO action_log (action, target, actor, result) VALUES (?, ?, ?, ?)`,
      action || "unknown", `${cfg.id}:${deviceId || mac}:port_${portIdx}`, "admin", `error: ${(err as Error).message}`,
    );
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
