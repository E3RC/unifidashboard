# Ubuquity Dashboard — Setup Guide

## 1. UniFi Site Manager API Key

The app uses the **Site Manager API** at `api.ui.com` with an API key (cloud, no local network access needed).

### Create the API key:

1. Go to [unifi.ui.com](https://unifi.ui.com) and log in
2. Click your **profile icon** → **Account Settings**
3. Navigate to **API Keys**
4. Click **Create API Key**, name it `ubuquity-dashboard`
5. **Copy the API key** — shown once only

### Find console IDs:

1. At [unifi.ui.com](https://unifi.ui.com), click your console
2. The URL contains `consoles/{console_id}/network/...`
3. Copy the `console_id` for each console you want to monitor

## 2. Configure .env.local

```bash
cp .env.local.example .env.local
```

Fill in:

```bash
UNIFI_API_KEY=your_api_key_here
UNIFI_CONSOLE_ID=console_id_for_sopernet
UNIFI_CONSOLE_ID_2=console_id_for_databunker1
UNIFI_SITE=default
UNIFI_SITE_2=default
DEFAULT_CONSOLE_ID=sopernet
DASHBOARD_ADMIN_PASSWORD=your_admin_password
```

## 3. Install & Run

```bash
npm install
npm run dev          # development at http://localhost:3000
```

For production:

```bash
npm run build
npm start            # production on :3000
```

## 4. Deployment

### Target (AlmaLinux / RHEL-based)

```bash
npm install -g pm2
npm run build
pm2 start node_modules/.bin/next --name ubuquity -- start
pm2 save
pm2 startup          # systemd auto-start on boot
```

Open firewall if needed:

```bash
firewall-cmd --add-port=3000/tcp --permanent
firewall-cmd --reload
```

### Caddy Reverse Proxy

```caddy
status.databunker1.com {
    reverse_proxy 100.70.106.60:3000
}
```

## Notes

- The Site Manager API is stateless (just `X-API-KEY` header, no login/logout).
- No WebSocket — all live data is polled (5s clients, 15s events, 30s guests, 60s bandwidth/devices).
- Trends persist to JSON lines files in `data/` — zero cloud cost, no server needed.
- The dashboard live view is open (display only). Admin actions require password.
- Rate limit: ~10,000 req/min on the cloud API (app uses ~60 req/min).
- Requires Node.js 18+ (tested on 20.x LTS).
