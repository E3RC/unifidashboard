import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/live-store";
import { getConsole, consoles } from "@/lib/consoles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const consoleId = request.nextUrl.searchParams.get("console") || process.env.DEFAULT_CONSOLE_ID || "databunker1";
  const cfg = getConsole(consoleId) || consoles[0];
  const store = getStore(cfg);
  store.start();
  return NextResponse.json(store.getState());
}
