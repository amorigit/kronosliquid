# Kronos Watch Keeper

Pushes prices to all 24 Kronos watch-market oracles on DEVnet and serves a
local HTTP API (port 3001) with price history, candles, and health data for
the Next.js app.

## How it works

- On startup the keeper reads the market manifest
  (`app/src/lib/markets.bootstrap.json`) and seeds from each oracle's **current
  on-chain value**.
- **Live targets** come from [`price-feeds.js`](./price-feeds.js) +
  [`feeds.json`](./feeds.json):
  - **GOLD / SILVER / PLATINUM** — Yahoo Finance (`GC=F`, `SI=F`, `PL=F`), refreshed
    every `FEED_REFRESH_MS` (default 3 min). On fetch failure, last good target is held.
  - **Watches + DIAMOND** — curated USD mids in `feeds.json` (edit + restart to refresh).
  - **WL500** — equal-weight mean of weighted watch refs × `wl500.scale` (~$5,000 index).
- Each tick **ramps** on-chain price toward the target at ≤15%/update (on-chain
  deviation cap is ~20%).
- Updates are batched 8 markets per transaction every ~6.5 s. If a batch fails,
  each market is retried alone.
- Price history is recorded every 30 s (48 h retention), persisted to
  `keeper/history.json` every 5 minutes.
- **Trade indexer** (`trade-indexer.js`) powers `/trades`, `/stats`, `/leaderboard`.
- **Crank** (`crank-keeper.js`, pm2 `kronos-crank`) settles funding / tries liq + SL-TP.
- Optional Telegram alerts when `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` are set.

## HTTP API (port 3001)

| Endpoint | Description |
|----------|-------------|
| `GET /prices/all` | Latest price for every market (micro-USD raw + USD ewma) |
| `GET /prices?market=&from=&to=&limit=` | Historical points `{timestamp, ewma, price}` |
| `GET /candles?market=&resolution=` | OHLC candles (`1m 5m 15m 1h 4h 1d`) |
| `GET /health` | Keeper status + `price_mode: "live"` + per-market target/feed age |
| `GET /stats` | 24h/7d volume, trades, liquidations, fees, unique traders |
| `GET /trades?user=&limit=` | User trade history (indexed from on-chain events) |
| `GET /trades/recent?limit=` | Recent trades across all users |
| `GET /leaderboard` | Top traders by PnL (`{ traders: [...] }`) |
| `GET /spins`, … | Stubs (rewards not implemented) |

The app reaches it through the Next.js rewrite `/api/keeper/* → localhost:3001/*`
(see `app/next.config.js`).

## Setup

```bash
cd keeper
npm install
```

Create `keeper/.env` (gitignored):

```
RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
ANCHOR_WALLET=/Users/you/.config/solana/id.json   # must be the protocol admin
# Optional:
# UPDATE_INTERVAL_MS=6500
# FEED_REFRESH_MS=180000
# API_PORT=3001
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
```

## Run

```bash
# Foreground
node watch-keeper.js

# Persistent with pm2
npm install -g pm2
pm2 start pm2.config.js
pm2 logs kronos-keeper
pm2 startup && pm2 save   # auto-start on boot
```

## Deployed addresses (devnet)

| Account | Address |
|---------|---------|
| Program | `HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP` |
| ProtocolState | `HzpzGHZRTDFrQ7GbEAx1SrCzUq7ykWvF4baBH7z69tcg` |

Per-market oracle addresses: `app/src/lib/markets.bootstrap.json`.
