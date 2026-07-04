import { mkdirSync, existsSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

const dbDir = process.env.DUCKDB_PATH
  ? join(process.env.DUCKDB_PATH, "..")
  : join(process.cwd(), "data");

mkdirSync(dbDir, { recursive: true });

type Row = Record<string, unknown>;

const tables: Record<string, { file: string; schema: string[] }> = {
  bandwidth_samples: {
    file: "bandwidth_samples.jsonl",
    schema: ["time", "rx_bytes", "tx_bytes", "wan_rx_bytes", "wan_tx_bytes", "wlan_bytes"],
  },
  client_counts: {
    file: "client_counts.jsonl",
    schema: ["time", "wifi_count", "wired_count", "total"],
  },
  guest_counts: {
    file: "guest_counts.jsonl",
    schema: ["time", "unique_guests"],
  },
  events: {
    file: "events.jsonl",
    schema: ["time", "key", "msg", "severity", "is_broken", "raw"],
  },
  action_log: {
    file: "action_log.jsonl",
    schema: ["time", "action", "target", "actor", "result"],
  },
};

function filePath(table: string): string {
  const t = tables[table];
  if (!t) throw new Error(`Unknown table: ${table}`);
  return join(dbDir, t.file);
}

export async function run(sql: string, ...params: any[]): Promise<void> {
  const match = sql.match(/INSERT INTO (\w+)\s*(?:\(([^)]+)\))?/i);
  if (!match) return;

  const table = match[1];
  const t = tables[table];
  if (!t) throw new Error(`Unknown table: ${table}`);

  const cols = match[2]
    ? match[2].split(",").map((c) => c.trim())
    : t.schema;

  const row: Row = {};
  for (let i = 0; i < cols.length && i < params.length; i++) {
    row[cols[i]] = params[i] instanceof Date ? params[i].toISOString() : params[i];
  }

  appendFileSync(filePath(table), JSON.stringify(row) + "\n");
}

export async function all<T = any>(sql: string): Promise<T[]> {
  const match = sql.match(/FROM (\w+)/i);
  if (!match) return [];

  const table = match[1];
  const fp = filePath(table);
  if (!existsSync(fp)) return [];

  const lines = readFileSync(fp, "utf-8").trim().split("\n").filter(Boolean);
  const rows = lines.map((line) => JSON.parse(line) as T);

  const whereMatch = sql.match(/WHERE (.+?)(?:GROUP BY|ORDER BY|$)/i);
  if (whereMatch) {
    const cond = whereMatch[1];
    return (rows as any[]).filter((r) => {
      if (cond.includes("> now()")) {
        const col = cond.split(">")[0].trim();
        const m = cond.match(/interval '(\d+) (\w+)'/);
        const cutoff = Date.now() - parseInterval(m);
        return new Date(r[col]).getTime() > cutoff;
      }
      return true;
    }) as T[];
  }

  return rows;
}

function parseInterval(m: RegExpMatchArray | null | undefined): number {
  if (!m) return 3600000;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const ms: Record<string, number> = {
    hours: 3600000,
    hour: 3600000,
    minutes: 60000,
    minute: 60000,
  };
  return n * (ms[unit] || 3600000);
}

export async function initSchema(): Promise<void> {
  for (const table of Object.keys(tables)) {
    const fp = filePath(table);
    if (!existsSync(fp)) {
      appendFileSync(fp, "");
    }
  }
}

let initialized = false;

export async function ensureSchema(): Promise<void> {
  if (initialized) return;
  await initSchema();
  initialized = true;
}
