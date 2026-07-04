# Ubuquity Dashboard

Live network monitoring for Ubiquiti UniFi via the Site Manager API. Built with Next.js 16, polls two UniFi consoles (SoperNet + Databunker1), persists trends to JSON files, and streams live data via SSE.

## Features

- **Live bandwidth** — download/upload/WiFi traffic gauges + dual WAN port display (Databunker1 UDM Pro)
- **Connected clients** — wifi/wired counts, live table with per-client rates, signal, uptime, switch port cross-reference
- **Unique guests** — 24h unique guest count
- **BunkerBox Connections** — PoE port viewer with client matching via `swMac`/`swPort` and `connectedMac`
- **Events & logs** — live feed with broken/error detection
- **Admin controls** (password-gated) — enable/disable devices, restart, port toggle, PoE power-cycle
- **Bandwidth trend chart** — 1h/6h/24h historical view

## Architecture

```
UniFi Site Manager API (api.ui.com, X-API-KEY auth)
    │  polling (5s clients, 15s events, 30s guests, 60s bandwidth/devices)
    ▼
Next.js server (live-store — per-console polling + SSE fanout)
    │  SSE (Server-Sent Events)
    ├──► Browser: live dashboard (no auth — display only)
    ├──► Browser: BunkerBox PoE viewer
    ├──► Browser: admin panel (password-gated)
    │
    ▼
JSON lines files (data/*.jsonl — trends, events, action audit)
```

| Data source | Method | Interval | Purpose |
|-------------|--------|----------|---------|
| `stat/sta` (active clients) | poll | 5s | live wifi/wired counts, per-client bandwidth |
| `stat/report/5minutes.site` | poll | 60s | bandwidth snapshot |
| `stat/health` | poll | 60s | fallback bandwidth |
| `stat/guest` | poll | 30s | unique guest count |
| `stat/event` | poll | 15s | events/logs, scanned for "broken" |
| `stat/device` | poll | 60s | device list + WAN port rates |

## Tech Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **UniFi Site Manager API** (`api.ui.com`) — cloud-connected, `X-API-KEY` auth, stateless
- **JSON lines files** — zero-dependency persistence in `data/*.jsonl`
- **Recharts** — bandwidth trend charts
- **SSE** — server-to-browser live data stream (one API connection, many viewers)
- **PM2** — production process management

## Consoles

| Console | Console ID | Site |
|---------|-----------|------|
| SoperNet | `e48e4ad7-d522-4018-9987-9113c633ca94` | `default` |
| Databunker1 | `0e05067f-c5d8-438e-ab78-991d22ed1ba2` | `default` |

Default console is `sopernet` (root `/`).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    — SoperNet dashboard (root /)
│   ├── databunker1/
│   │   ├── page.tsx                — Databunker1 dashboard
│   │   └── bunkerbox/page.tsx     — PoE port viewer
│   ├── admin/page.tsx             — admin controls (password-gated)
│   ├── globals.css                — dark dashboard theme
│   └── api/
│       ├── stream/route.ts        — SSE live data endpoint
│       ├── state/route.ts         — current state snapshot
│       ├── trends/route.ts        — historical data from JSON files
│       └── admin/                 — login, status, device, port routes
├── lib/
│   ├── unifi.ts                   — per-console API client
│   ├── live-store.ts              — polling loop + SSE fanout + persistence
│   ├── consoles.ts                — console config from env
│   ├── admin-auth.ts              — session token management
│   ├── types.ts                   — shared types + broken-event key list
│   └── use-dashboard.ts           — React SSE hook + formatters
├── components/
│   ├── BandwidthGauges.tsx        — download/upload/WiFi + dual WAN
│   ├── StatCards.tsx              — wifi/wired/guest count cards
│   ├── BandwidthChart.tsx         — Recharts area chart
│   ├── ClientTable.tsx            — filterable live client table
│   ├── EventsFeed.tsx             — live event log with broken-alert
│   ├── DashboardView.tsx          — main dashboard layout
│   ├── BunkerBoxView.tsx          — PoE port table with auto-scroll
│   └── ConnectionStatus.tsx       — connection indicator + error
└── db/
    └── index.ts                   — JSON lines file persistence
```

## Persistence

Trends and events are stored as JSON lines files (one JSON object per line) in `data/`:

| File | Contents | Write interval |
|------|----------|---------------|
| `bandwidth_samples.jsonl` | rx/tx rates (bps) | 10 min |
| `client_counts.jsonl` | wifi/wired/total counts | 10 min |
| `guest_counts.jsonl` | unique guest count | 10 min |
| `events.jsonl` | UniFi events + alerts | on new event |
| `action_log.jsonl` | admin action audit trail | on admin action |

## Setup

See [SETUP.md](./SETUP.md).

## Deployment

Currently deployed on **databunker1** (`100.70.106.60`, AlmaLinux 8) behind **Caddy** at `status.databunker1.com`. The Caddy reverse proxy runs on `vps152379-ypc` (`100.70.226.91`) and provides auto-TLS.

```bash
npm run build
pm2 start node_modules/.bin/next --name ubuquity -- start   # port 3000
pm2 save
pm2 startup                                                # enable on boot
```

### Env Variables

| Variable | Description |
|----------|-------------|
| `UNIFI_API_KEY` | Site Manager API key |
| `UNIFI_CONSOLE_ID` | SoperNet console ID |
| `UNIFI_CONSOLE_ID_2` | Databunker1 console ID |
| `UNIFI_SITE` | Site name (default `default`) |
| `UNIFI_SITE_2` | Site for second console |
| `DEFAULT_CONSOLE_ID` | `sopernet` or `databunker1` |
| `DASHBOARD_ADMIN_PASSWORD` | Password for admin panel |
| `DUCKDB_PATH` | (legacy) Replaced by JSON files in `data/` |

## API Reference

### Live data (SSE)
- `GET /api/stream?console=sopernet|databunker1` — SSE stream of `DashboardState`

### State snapshot
- `GET /api/state?console=sopernet|databunker1` — current state JSON

### Trends (historical)
- `GET /api/trends?range=1h|6h|24h` — bandwidth, client counts, guest counts

### Admin (session auth required)
- `POST /api/admin/login` — `{ password }` → `{ token }` + cookie
- `GET /api/admin/status` — session validation
- `POST /api/admin/device` — toggle/restart device
- `POST /api/admin/port` — toggle/PoE power-cycle port

## Notes

- Dashboard live view is open (no auth). Admin actions require password.
- "Broken" event detection uses curated UniFi event keys — see `src/lib/types.ts`.
- Built for the **dev preview** of Next.js 16 — Turbopack is used for development. The `postinstall` script patches DuckDB (legacy) for Turbopack compatibility.
- WAN port rates are computed from delta-based byte tracking in `live-store.ts`.
- BunkerBox PoE viewer cross-references `swMac`/`swPort` from wired clients with device port tables.
