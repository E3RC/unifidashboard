import { NextRequest, NextResponse } from "next/server";
import { ensureSchema } from "@/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await ensureSchema();

  const range = request.nextUrl.searchParams.get("range") || "1h";
  const hours = range === "24h" ? 24 : range === "6h" ? 6 : 1;
  const bucketMs = range === "24h" ? 3600000 : range === "6h" ? 900000 : 300000;
  const cutoff = Date.now() - hours * 3600000;

  try {
    const { all } = await import("@/db");

    const allBandwidth = await all<Record<string, unknown>>("FROM bandwidth_samples");
    const bandwidth = bucketData(allBandwidth, cutoff, bucketMs, (row) => ({
      rx_bytes: Number(row.rx_bytes) || 0,
      tx_bytes: Number(row.tx_bytes) || 0,
    }));

    const allCounts = await all<any>("FROM client_counts");
    const counts = bucketData(allCounts, cutoff, bucketMs, (row) => ({
      wifi_count: Math.round(Number(row.wifi_count) || 0),
      wired_count: Math.round(Number(row.wired_count) || 0),
      total: Math.round(Number(row.total) || 0),
    }));

    const allGuests = await all<any>("FROM guest_counts");
    const guests = bucketData(allGuests, cutoff, bucketMs, (row) => ({
      unique_guests: Math.round(Number(row.unique_guests) || 0),
    }));

    return NextResponse.json({ bandwidth, counts, guests });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

function bucketData<T extends Record<string, number>>(
  rows: any[],
  cutoff: number,
  bucketMs: number,
  extract: (row: any) => T,
): ({ time: string } & T)[] {
  const buckets: Map<number, { sum: T; count: number }> = new Map();

  for (const row of rows) {
    const t = new Date(row.time).getTime();
    if (t < cutoff) continue;
    const bucket = Math.floor(t / bucketMs) * bucketMs;
    const existing = buckets.get(bucket);
    const vals = extract(row);
    if (existing) {
      for (const k of Object.keys(vals)) {
        (existing.sum as any)[k] += (vals as any)[k];
      }
      existing.count++;
    } else {
      buckets.set(bucket, { sum: { ...vals }, count: 1 });
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucket, { sum, count }]) => {
      const avg = Object.fromEntries(
        Object.entries(sum).map(([k, v]) => [k, (v as number) / count]),
      );
      return { time: new Date(bucket).toISOString(), ...avg } as { time: string } & T;
    });
}
