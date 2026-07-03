"use strict";

/**
 * watch-keeper.js — price keeper + local history API for the Kronos watch markets.
 *
 * Prices: bounded random walk per market, seeded from each oracle's CURRENT
 * on-chain price (synthetic demo data — no external price source).
 * WL500 ramps down to WL500_TARGET (default $5,000) at ≤15% per update, then
 * random-walks around it. Every update is clamped to ±15% of the last pushed
 * price so the on-chain deviation guard (~20%) can never reject it.
 *
 * HTTP API (default port 3001) serves the endpoints the Next.js app expects
 * (`/prices/all`, `/prices`, `/candles`, `/health`, `/stats`, `/trades`,
 * `/leaderboard`). History is kept in memory (one point / 30 s, 48 h) and
 * persisted to keeper/history.json every 5 min. Trade events are indexed from
 * on-chain logs into keeper/trades.json (see trade-indexer.js).
 * `/api/keeper/*` → `http://localhost:3001/*`.
 *
 * Config comes from keeper/.env (KEY=VALUE lines, gitignored):
 *   RPC_URL              default https://api.devnet.solana.com
 *   ANCHOR_WALLET        default ~/.config/solana/id.json (must be protocol admin)
 *   UPDATE_INTERVAL_MS   default 6500 (must be > on-chain MIN_ORACLE_UPDATE_INTERVAL = 5 s)
 *   PRICE_VOLATILITY     default 0.006 (±0.6% per tick)
 *   WL500_TARGET         default 5000 (USD; ramp target for the WL500 index)
 *   API_PORT             default 3001
 *   MANIFEST_PATH        default ../app/src/lib/markets.bootstrap.json
 *
 * Run:  node keeper/watch-keeper.js        (or via keeper/pm2.config.js)
 */
const fs = require("fs");
const path = require("path");
const http = require("http");
const { createHash } = require("crypto");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} = require("@solana/web3.js");
const tradeIndexer = require("./trade-indexer");

// ── Env (keeper/.env, no dotenv dependency) ──────────────────────────────────

(function loadEnvFile() {
  const p = path.join(__dirname, ".env");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
})();

const RPC_URL = process.env.RPC_URL || "https://api.devnet.solana.com";
const INTERVAL_MS = Math.max(parseInt(process.env.UPDATE_INTERVAL_MS || "6500", 10), 5500);
const VOLATILITY = parseFloat(process.env.PRICE_VOLATILITY || "0.006");
const WL500_TARGET = parseFloat(process.env.WL500_TARGET || "5000");
const API_PORT = parseInt(process.env.API_PORT || "3001", 10);
const KEY_PATH =
  process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
const MANIFEST_PATH =
  process.env.MANIFEST_PATH || path.join(__dirname, "../app/src/lib/markets.bootstrap.json");
const HISTORY_PATH = path.join(__dirname, "history.json");

const FETCH_CHUNK = 8;          // oracle accounts per read call
const TX_CHUNK = 8;             // markets per push transaction
const MAX_STEP = 0.15;          // hard clamp per update (< on-chain ~20% deviation cap)
const RECORD_INTERVAL_S = 30;   // history granularity
const HISTORY_MAX_POINTS = (48 * 3600) / RECORD_INTERVAL_S; // 48 h
const PERSIST_INTERVAL_MS = 5 * 60 * 1000;

const UPDATE_DISC = createHash("sha256").update("global:update_market_oracle").digest().slice(0, 8);

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, label, maxAttempts = 5) {
  let delay = 1000;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err.message || err);
      const is429 = msg.includes("429") || msg.includes("Too Many") || msg.includes("rate limit");
      if (is429 && attempt < maxAttempts) {
        log(`  WARN  ${label}: 429 rate-limited, retry ${attempt}/${maxAttempts - 1} in ${delay}ms`);
        await sleep(delay);
        delay = Math.min(delay * 2, 16000);
      } else {
        throw err;
      }
    }
  }
}

function loadKeypair(p) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
}

function u64le(value) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function scale(usd) {
  return BigInt(Math.round(usd * 1_000_000));
}

function buildIx(programId, authority, protocolState, oracle, marketId, priceRaw) {
  const idBytes = Buffer.from(marketId, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(idBytes.length, 0);
  const data = Buffer.concat([UPDATE_DISC, lenBuf, idBytes, u64le(priceRaw)]);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: protocolState, isSigner: false, isWritable: true },
      { pubkey: oracle, isSigner: false, isWritable: true },
    ],
    data,
  });
}

// ── History store ─────────────────────────────────────────────────────────────
// history[marketId] = [[unixSec, usdPrice], ...] (ascending, ring-capped)

const history = {};

function loadHistory() {
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
    Object.assign(history, raw);
    const n = Object.values(history).reduce((a, v) => a + v.length, 0);
    log(`  Loaded history: ${Object.keys(history).length} markets, ${n} points`);
  } catch {
    /* no history yet */
  }
}

function persistHistory() {
  try {
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history));
  } catch (e) {
    log(`  WARN  history persist failed: ${e.message}`);
  }
}

function recordPoint(marketId, usd) {
  const now = Math.floor(Date.now() / 1000);
  const arr = history[marketId] || (history[marketId] = []);
  const last = arr[arr.length - 1];
  if (last && now - last[0] < RECORD_INTERVAL_S) return;
  arr.push([now, +usd.toFixed(6)]);
  if (arr.length > HISTORY_MAX_POINTS) arr.splice(0, arr.length - HISTORY_MAX_POINTS);
}

// ── HTTP API ──────────────────────────────────────────────────────────────────

const RESOLUTIONS = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
const startedAt = Date.now();
let state = {};       // marketId -> { price, seed, target, lastPushed, lastOk }
let pushesLastHour = [];

function candlesFor(marketId, resolutionS) {
  const arr = history[marketId] || [];
  const buckets = new Map();
  for (const [ts, price] of arr) {
    const bucket = Math.floor(ts / resolutionS) * resolutionS;
    let c = buckets.get(bucket);
    if (!c) {
      c = { timestamp: bucket, open: price, high: price, low: price, close: price };
      buckets.set(bucket, c);
    } else {
      c.high = Math.max(c.high, price);
      c.low = Math.min(c.low, price);
      c.close = price;
    }
  }
  return [...buckets.values()].sort((a, b) => a.timestamp - b.timestamp);
}

function json(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

function startApi() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${API_PORT}`);
    const route = url.pathname.replace(/\/+$/, "") || "/";
    const q = url.searchParams;
    if (req.method === "OPTIONS") return json(res, 204, {});

    const now = Math.floor(Date.now() / 1000);

    if (route === "/prices/all") {
      const out = {};
      for (const [id, s] of Object.entries(state)) {
        if (!s) continue;
        out[id] = {
          price: Math.round(s.price * 1_000_000),
          ewma: +s.price.toFixed(6),
          lastUpdateTime: s.lastOk || now,
        };
      }
      return json(res, 200, out);
    }

    if (route === "/prices") {
      const market = q.get("market");
      const from = parseInt(q.get("from") || "0", 10);
      const to = parseInt(q.get("to") || String(now), 10);
      const limit = parseInt(q.get("limit") || "0", 10);
      if (!market || !state[market]) return json(res, 400, { error: `Unknown market: ${market}` });
      let rows = (history[market] || [])
        .filter(([ts]) => ts >= from && ts <= to)
        .map(([ts, p]) => ({ timestamp: ts, ewma: p, price: p }));
      if (limit > 0) rows = rows.slice(-limit);
      return json(res, 200, rows);
    }

    if (route === "/candles") {
      const market = q.get("market");
      const resolutionS = RESOLUTIONS[q.get("resolution") || "1h"] || 3600;
      if (!market || !state[market]) return json(res, 400, { error: `Unknown market: ${market}` });
      return json(res, 200, candlesFor(market, resolutionS));
    }

    if (route === "/health") {
      const anyMarket = Object.values(state).find(Boolean);
      const lastOk = Math.max(0, ...Object.values(state).map((s) => (s ? s.lastOk || 0 : 0)));
      pushesLastHour = pushesLastHour.filter((t) => t > now - 3600);
      return json(res, 200, {
        status: now - lastOk < 120 ? "healthy" : "stale",
        oracle: {
          ewma: anyMarket ? +anyMarket.price.toFixed(2) : 0,
          last_updated: lastOk,
          seconds_since_update: lastOk ? now - lastOk : -1,
          updates_1h: pushesLastHour.length,
        },
        keeper: {
          uptime_minutes: Math.floor((Date.now() - startedAt) / 60000),
        },
        liquidation: { checks_1h: 0 },
        funding: { settlements_24h: 0 },
        markets: Object.fromEntries(
          Object.entries(state)
            .filter(([, s]) => s)
            .map(([id, s]) => [
              id,
              {
                ewma: +s.price.toFixed(2),
                last_ok: s.lastOk || 0,
                seconds_since_update: s.lastOk ? now - s.lastOk : -1,
              },
            ])
        ),
      });
    }

    if (route === "/stats") {
      return json(res, 200, tradeIndexer.getStats());
    }

    if (route === "/ping") return json(res, 200, { ok: true, timestamp: now });

    if (route === "/trades") {
      const user = q.get("user") || undefined;
      const limit = parseInt(q.get("limit") || "50", 10);
      return json(res, 200, { trades: tradeIndexer.getTrades({ user, limit }) });
    }
    if (route === "/trades/recent") {
      const limit = parseInt(q.get("limit") || "50", 10);
      return json(res, 200, { trades: tradeIndexer.getRecentTrades(limit) });
    }
    if (route === "/leaderboard") {
      return json(res, 200, { traders: tradeIndexer.getLeaderboard() });
    }
    if (route === "/spins") return json(res, 200, { spins: [] });
    if (route === "/spin-eligible") return json(res, 200, { eligible: false });
    if (route === "/daily-volume") return json(res, 200, { volume: 0 });
    if (route === "/card-info") return json(res, 404, { error: "Not available" });

    return json(res, 404, { error: "Not found" });
  });

  server.listen(API_PORT, () => log(`  API:        http://localhost:${API_PORT}`));
  server.on("error", (e) => log(`  WARN  API server error: ${e.message}`));
}

// ── Price engine ──────────────────────────────────────────────────────────────

/**
 * Next price for a market: random walk around `seed`, clamped to ±MAX_STEP of
 * the last pushed value. Markets with a ramp `target` move toward it at up to
 * MAX_STEP per update; once within one step, the target becomes the new seed.
 */
function nextPrice(s) {
  if (s.target && Math.abs(s.target - s.price) / s.price > MAX_STEP) {
    const dir = s.target > s.price ? 1 : -1;
    return s.price * (1 + dir * MAX_STEP * 0.99);
  }
  if (s.target) {
    // Arrived — lock the walk around the target from now on.
    s.seed = s.target;
    s.target = null;
    return s.seed;
  }
  const step = (Math.random() * 2 - 1) * VOLATILITY;
  const pull = ((s.seed - s.price) / s.seed) * 0.05;
  let next = s.price * (1 + step + pull);
  if (next < s.seed * 0.5) next = s.seed * 0.5;
  if (next > s.seed * 1.5) next = s.seed * 1.5;
  // Deviation-guard clamp (belt & suspenders; walk steps are far below this).
  const cap = s.price * MAX_STEP;
  if (Math.abs(next - s.price) > cap) next = s.price + Math.sign(next - s.price) * cap;
  return next;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const programId = new PublicKey(manifest.programId);
  const protocolState = new PublicKey(manifest.protocolState);
  const admin = loadKeypair(KEY_PATH);
  const connection = new Connection(RPC_URL, "confirmed");

  const markets = manifest.markets.map((m) => ({
    marketId: m.marketId,
    oracle: new PublicKey(m.oracle),
  }));

  log("Kronos watch keeper starting");
  log(`  RPC:        ${RPC_URL.replace(/api-key=[^&]+/, "api-key=***")}`);
  log(`  Program:    ${programId.toBase58()}`);
  log(`  Admin:      ${admin.publicKey.toBase58()}`);
  log(`  Markets:    ${markets.length} (random walk; WL500 ramping to $${WL500_TARGET})`);
  log(`  Interval:   ${INTERVAL_MS}ms   Volatility: ±${(VOLATILITY * 100).toFixed(2)}%/tick`);

  loadHistory();
  startApi();

  const oracleToMarket = new Map(
    manifest.markets.map((m) => [m.oracle, m.marketId])
  );
  tradeIndexer.start({ connection, programId, oracleToMarket });

  // Seed from current on-chain oracle values (chunked to avoid 429s).
  for (let i = 0; i < markets.length; i += FETCH_CHUNK) {
    const chunk = markets.slice(i, i + FETCH_CHUNK);
    const infos = await withRetry(
      () => connection.getMultipleAccountsInfo(chunk.map((m) => m.oracle)),
      `seed-chunk-${i / FETCH_CHUNK}`
    );
    infos.forEach((info, j) => {
      const m = chunk[j];
      if (!info) {
        log(`  WARN  ${m.marketId}: oracle not found on-chain — skipping`);
        state[m.marketId] = null;
        return;
      }
      const raw = Number(info.data.readBigUInt64LE(8)) / 1e6;
      state[m.marketId] = { price: raw, seed: raw, target: null, lastOk: 0 };
    });
    if (i + FETCH_CHUNK < markets.length) await sleep(300);
  }

  // WL500 ramp-down to a conventional index level.
  const wl = state["WL500-PERP"];
  if (wl && Math.abs(wl.price - WL500_TARGET) / WL500_TARGET > 0.01) {
    wl.target = WL500_TARGET;
    log(`  WL500: ramping $${wl.price.toFixed(0)} → $${WL500_TARGET} (≤${MAX_STEP * 100}%/update)`);
  }

  const active = markets.filter((m) => state[m.marketId]);
  log(`  Seeded ${active.length} markets from chain. Pushing updates…`);

  async function sendTx(ixs, label) {
    const tx = new Transaction();
    for (const ix of ixs) tx.add(ix);
    await withRetry(async () => {
      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      tx.feePayer = admin.publicKey;
      tx.sign(admin);
      await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
    }, label);
  }

  let tick = 0;

  async function runTick() {
    tick++;
    const now = Math.floor(Date.now() / 1000);
    let pushed = 0;

    for (let i = 0; i < active.length; i += TX_CHUNK) {
      const group = active.slice(i, i + TX_CHUNK);
      const entries = group.map((m) => {
        const s = state[m.marketId];
        const price = nextPrice(s);
        return { m, s, price, ix: buildIx(programId, admin.publicKey, protocolState, m.oracle, m.marketId, scale(price)) };
      });

      try {
        await sendTx(entries.map((e) => e.ix), `tx-chunk-${i / TX_CHUNK}`);
        for (const e of entries) {
          e.s.price = e.price;
          e.s.lastOk = now;
          recordPoint(e.m.marketId, e.price);
        }
        pushed += entries.length;
        pushesLastHour.push(now);
      } catch (err) {
        // Chunk failed — isolate: retry each market alone so one bad update
        // can't freeze its neighbors.
        log(`  WARN  chunk ${i / TX_CHUNK} failed (${String(err.message || err).slice(0, 90)}) — isolating`);
        for (const e of entries) {
          try {
            await sendTx([e.ix], `iso-${e.m.marketId}`);
            e.s.price = e.price;
            e.s.lastOk = now;
            recordPoint(e.m.marketId, e.price);
            pushed++;
          } catch (err2) {
            log(`  ERROR ${e.m.marketId}: ${String(err2.message || err2).slice(0, 110)}`);
          }
          await sleep(120);
        }
      }
      if (i + TX_CHUNK < active.length) await sleep(200);
    }

    if (tick % 10 === 1) {
      const sample = active
        .slice(0, 4)
        .map((m) => `${m.marketId.replace("-PERP", "")}=$${state[m.marketId].price.toFixed(2)}`)
        .join("  ");
      log(`tick ${tick}: pushed ${pushed}/${active.length}  ${sample}`);
    }
  }

  await runTick();
  setInterval(() => {
    runTick().catch((e) => log(`ERROR tick: ${String(e.message || e)}`));
  }, INTERVAL_MS);
  setInterval(persistHistory, PERSIST_INTERVAL_MS);
  process.on("SIGINT", () => { persistHistory(); tradeIndexer.stop(); process.exit(0); });
  process.on("SIGTERM", () => { persistHistory(); tradeIndexer.stop(); process.exit(0); });
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
