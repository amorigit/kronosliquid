# Kronos Watch Keeper

Pushes prices to all 24 Kronos watch-market oracles on devnet and serves a
local HTTP API (port 3001) with price history, candles, and health data for
the Next.js app.

## How it works

- On startup the keeper reads the market manifest
  (`app/src/lib/markets.bootstrap.json`) and seeds its price state from each
  oracle's **current on-chain value**.
- Prices are **synthetic demo data**: a bounded random walk (±0.6%/tick,
  mean-reverting, clamped to ±15% per update so the on-chain ~20% deviation
  guard can never reject an update).
- `WL500-PERP` ramps toward `WL500_TARGET` (default $5,000) at ≤15% per
  update, then random-walks around it.
- Updates are batched 8 markets per transaction every ~6.5 s. If a batch
  fails, each market is retried in its own transaction so one bad update
  can't freeze its neighbors.
- Price history is recorded every 30 s (48 h retention), kept in memory, and
  persisted to `keeper/history.json` every 5 minutes.
- **Trade indexer** (`trade-indexer.js`) polls devnet program transactions every 30 s,
  parses anchor trade events from logs, persists to `keeper/trades.json`, and powers
  `/trades`, `/stats`, `/leaderboard`.

## HTTP API (port 3001)

| Endpoint | Description |
|----------|-------------|
| `GET /prices/all` | Latest price for every market (micro-USD raw + USD ewma) |
| `GET /prices?market=&from=&to=&limit=` | Historical points `{timestamp, ewma, price}` |
| `GET /candles?market=&resolution=` | OHLC candles (`1m 5m 15m 1h 4h 1d`) |
| `GET /health` | Keeper status + per-market freshness |
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
# PRICE_VOLATILITY=0.006
# WL500_TARGET=5000
# API_PORT=3001
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
