import { NextRequest } from "next/server";
import { getStore } from "@/lib/live-store";
import { getConsole, consoles, defaultConsoleId } from "@/lib/consoles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const consoleId = request.nextUrl.searchParams.get("console") || process.env.DEFAULT_CONSOLE_ID || defaultConsoleId;
  const cfg = getConsole(consoleId) || consoles[0];
  const store = getStore(cfg);
  store.start();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const sendState = () => {
        const data = `data: ${JSON.stringify(store.getState())}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      sendState();
      const unsub = store.subscribe(sendState);

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        unsub();
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
