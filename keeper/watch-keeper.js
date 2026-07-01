"use strict";

/**
 * watch-keeper.js — price keeper for the Kronos luxury-watch markets.
 *
 * Commodity markets (GOLD, SILVER, PLATINUM) pull live spot prices from
 * Yahoo Finance every 5 minutes — no API key required.
 * All other markets (watches, DIAMOND) run a bounded random walk anchored
 * to each oracle's current on-chain seed price.
 *
 * Run:
 *   node keeper/watch-keeper.js
 *
 * Env:
 *   RPC_URL              default: Helius devnet
 *   ANCHOR_WALLET        default: ~/.config/solana/id.json
 *   UPDATE_INTERVAL_MS   default: 6500 (must be > on-chain MIN_ORACLE_UPDATE_INTERVAL = 5s)
 *   PRICE_VOLATILITY     default: 0.006 (0.6% max random-walk step)
 *   COMMODITY_FETCH_TICKS default: 46 (~5 min at 6.5 s/tick)
 *   MANIFEST_PATH        default: ../app/src/lib/markets.bootstrap.json
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { createHash } = require("crypto");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} = require("@solana/web3.js");

// ── Config ────────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.RPC_URL ||
  "https://devnet.helius-rpc.com/?api-key=47c1c3fc-edcc-4db2-87f6-56bab5ec97a7";
const INTERVAL_MS = Math.max(
  parseInt(process.env.UPDATE_INTERVAL_MS || "6500", 10),
  5500
);
const VOLATILITY = parseFloat(process.env.PRICE_VOLATILITY || "0.006");
const COMMODITY_FETCH_TICKS = parseInt(
  process.env.COMMODITY_FETCH_TICKS || "46",
  10
); // ~5 min
const FETCH_CHUNK = 8; // oracle accounts per getMultipleAccountsInfo call
const TX_CHUNK = 8;   // markets per transaction

const KEY_PATH =
  process.env.ANCHOR_WALLET ||
  path.join(process.env.HOME, ".config/solana/id.json");
const MANIFEST_PATH =
  process.env.MANIFEST_PATH ||
  path.join(__dirname, "../app/src/lib/markets.bootstrap.json");

// Yahoo Finance symbols for real spot prices (no API key needed)
const COMMODITY_SYMBOLS = {
  "GOLD-PERP":     "GC=F",   // Gold futures $/troy oz
  "SILVER-PERP":   "SI=F",   // Silver futures $/troy oz
  "PLATINUM-PERP": "PL=F",   // Platinum futures $/troy oz
};

const UPDATE_DISC = createHash("sha256")
  .update("global:update_market_oracle")
  .digest()
  .slice(0, 8);

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
      const is429 =
        msg.includes("429") ||
        msg.includes("Too Many") ||
        msg.includes("rate limit");
      if (is429 && attempt < maxAttempts) {
        log(
          `  WARN  ${label}: 429 rate-limited, retry ${attempt}/${maxAttempts - 1} in ${delay}ms`
        );
        await sleep(delay);
        delay = Math.min(delay * 2, 16000);
      } else {
        throw err;
      }
    }
  }
}

function loadKeypair(p) {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8")))
  );
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

/** ±VOLATILITY random walk, mean-reverting toward `seed`. */
function nextPrice(prev, seed) {
  const step = (Math.random() * 2 - 1) * VOLATILITY;
  const pull = ((seed - prev) / seed) * 0.05;
  let next = prev * (1 + step + pull);
  if (next < seed * 0.5) next = seed * 0.5;
  if (next > seed * 1.5) next = seed * 1.5;
  return next;
}

/** Fetch current spot price for a Yahoo Finance symbol (e.g. "GC=F"). */
function fetchYahooPrice(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            const price =
              json?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (!price || isNaN(price)) {
              reject(new Error(`No price in Yahoo response for ${symbol}`));
            } else {
              resolve(price);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error(`Timeout fetching ${symbol}`));
    });
  });
}

/** Fetch all commodity spot prices and return a map of marketId → price. */
async function fetchCommodityPrices() {
  const results = {};
  for (const [marketId, symbol] of Object.entries(COMMODITY_SYMBOLS)) {
    try {
      const price = await fetchYahooPrice(symbol);
      results[marketId] = price;
    } catch (err) {
      log(`  WARN  commodity fetch failed for ${marketId} (${symbol}): ${err.message}`);
    }
    await sleep(300);
  }
  return results;
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
  log(`  Markets:    ${markets.length} (${Object.keys(COMMODITY_SYMBOLS).join(", ")} = live spot)`);
  log(`  Interval:   ${INTERVAL_MS}ms   Volatility: ±${(VOLATILITY * 100).toFixed(2)}%/tick`);

  // ── Seed on-chain prices ──────────────────────────────────────────────────

  const state = {};
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
      state[m.marketId] = { price: raw, seed: raw, live: false };
    });
    if (i + FETCH_CHUNK < markets.length) await sleep(300);
  }

  // ── Fetch initial real commodity prices ───────────────────────────────────

  log("  Fetching live commodity prices from Yahoo Finance…");
  const initialCommodities = await fetchCommodityPrices();
  for (const [marketId, price] of Object.entries(initialCommodities)) {
    if (state[marketId]) {
      log(`  ${marketId}: seeded from Yahoo at $${price.toFixed(2)} (was $${state[marketId].seed.toFixed(2)} on-chain)`);
      state[marketId].price = price;
      state[marketId].seed = price;
      state[marketId].live = true;
    }
  }

  const active = markets.filter((m) => state[m.marketId]);
  log(`  Seeded ${active.length} markets. Pushing updates…`);

  // ── Tick loop ─────────────────────────────────────────────────────────────

  let tick = 0;

  async function runTick() {
    tick++;

    // Refresh commodity prices every COMMODITY_FETCH_TICKS ticks
    if (tick % COMMODITY_FETCH_TICKS === 0) {
      const fresh = await fetchCommodityPrices();
      for (const [marketId, price] of Object.entries(fresh)) {
        if (state[marketId]) {
          state[marketId].seed = price;
          state[marketId].live = true;
        }
      }
      const fetched = Object.entries(fresh)
        .map(([id, p]) => `${id.replace("-PERP", "")}=$${p.toFixed(2)}`)
        .join("  ");
      log(`  [commodity refresh] ${fetched}`);
    }

    let pushed = 0;
    for (let i = 0; i < active.length; i += TX_CHUNK) {
      const group = active.slice(i, i + TX_CHUNK);
      const tx = new Transaction();
      for (const m of group) {
        const s = state[m.marketId];
        // Live commodity markets: tiny noise (0.05%) around real price
        // All others: full random walk
        const vol = s.live ? VOLATILITY * 0.08 : VOLATILITY;
        const step = (Math.random() * 2 - 1) * vol;
        const pull = s.live ? 0 : ((s.seed - s.price) / s.seed) * 0.05;
        let next = s.price * (1 + step + pull);
        if (!s.live) {
          if (next < s.seed * 0.5) next = s.seed * 0.5;
          if (next > s.seed * 1.5) next = s.seed * 1.5;
        }
        s.price = next;
        tx.add(
          buildIx(
            programId,
            admin.publicKey,
            protocolState,
            m.oracle,
            m.marketId,
            scale(s.price)
          )
        );
      }
      try {
        await withRetry(async () => {
          const { blockhash } = await connection.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.feePayer = admin.publicKey;
          tx.sign(admin);
          await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        }, `tx-chunk-${i / TX_CHUNK}`);
        pushed += group.length;
      } catch (err) {
        log(
          `  ERROR chunk ${i / TX_CHUNK}: ${String(err.message || err).slice(0, 140)}`
        );
      }
      if (i + TX_CHUNK < active.length) await sleep(200);
    }

    const sample = active
      .slice(0, 4)
      .map((m) => {
        const s = state[m.marketId];
        const tag = s.live ? "*" : "";
        return `${m.marketId.replace("-PERP", "")}=${tag}$${s.price.toFixed(2)}`;
      })
      .join("  ");
    log(`tick ${tick}: pushed ${pushed}/${active.length}  ${sample}  (* = live spot)`);
  }

  await runTick();
  setInterval(() => {
    runTick().catch((e) => log(`ERROR tick: ${String(e.message || e)}`));
  }, INTERVAL_MS);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
