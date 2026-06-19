"use strict";

/**
 * watch-keeper.js — minimal price keeper for the Kronos luxury-watch markets.
 *
 * The original keeper.js scrapes TCGPlayer for Pokémon card prices and is bound
 * to the old card markets + hardcoded mainnet vault addresses. Luxury watches
 * have no free public price feed, so this keeper drives the 24 watch oracles
 * with a bounded random walk seeded from each oracle's CURRENT on-chain price.
 *
 * For a real deployment, replace `nextPrice()` with a fetch from a genuine
 * watch price source (e.g. Chrono24 / WatchCharts) — the on-chain push logic
 * stays identical.
 *
 * Reads the bootstrap manifest at app/src/lib/markets.bootstrap.json for the
 * program ID, protocol state, and per-market oracle addresses.
 *
 * Run:
 *   RPC_URL=http://localhost:8899 \
 *   ANCHOR_WALLET=$HOME/.config/solana/id.json \
 *   node keeper/watch-keeper.js
 *
 * Env:
 *   RPC_URL              default http://localhost:8899
 *   ANCHOR_WALLET        default ~/.config/solana/id.json (must be protocol admin)
 *   UPDATE_INTERVAL_MS   default 6500  (must be > on-chain MIN_ORACLE_UPDATE_INTERVAL = 5s)
 *   PRICE_VOLATILITY     default 0.006 (0.6% max step; on-chain cap is 20%/update)
 *   MANIFEST_PATH        default ../app/src/lib/markets.bootstrap.json
 */
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} = require("@solana/web3.js");

const RPC_URL = process.env.RPC_URL || "http://localhost:8899";
const INTERVAL_MS = Math.max(parseInt(process.env.UPDATE_INTERVAL_MS || "6500", 10), 5500);
const VOLATILITY = parseFloat(process.env.PRICE_VOLATILITY || "0.006");
const KEY_PATH =
  process.env.ANCHOR_WALLET || path.join(process.env.HOME, ".config/solana/id.json");
const MANIFEST_PATH =
  process.env.MANIFEST_PATH || path.join(__dirname, "../app/src/lib/markets.bootstrap.json");
const CHUNK = 8; // markets per transaction (keeps tx under size limit)

const UPDATE_DISC = createHash("sha256").update("global:update_market_oracle").digest().slice(0, 8);

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
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

function nextPrice(prev, seed) {
  // Bounded random walk: ±VOLATILITY per step, soft-pulled toward the seed so
  // prices wander but don't drift to zero or infinity over a long run.
  const step = (Math.random() * 2 - 1) * VOLATILITY;
  const pull = (seed - prev) / seed * 0.05; // 5% mean-reversion toward seed
  let next = prev * (1 + step + pull);
  if (next < seed * 0.5) next = seed * 0.5;
  if (next > seed * 1.5) next = seed * 1.5;
  return next;
}

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
  log(`  RPC:        ${RPC_URL}`);
  log(`  Program:    ${programId.toBase58()}`);
  log(`  Admin:      ${admin.publicKey.toBase58()}`);
  log(`  Markets:    ${markets.length}`);
  log(`  Interval:   ${INTERVAL_MS}ms   Volatility: ±${(VOLATILITY * 100).toFixed(2)}%/tick`);

  // Seed prices from current on-chain oracle values.
  const oracleInfos = await connection.getMultipleAccountsInfo(markets.map((m) => m.oracle));
  const state = {};
  oracleInfos.forEach((info, i) => {
    const m = markets[i];
    if (!info) {
      log(`  WARN  ${m.marketId}: oracle not found on-chain — skipping`);
      state[m.marketId] = null;
      return;
    }
    const raw = Number(info.data.readBigUInt64LE(8)) / 1e6;
    state[m.marketId] = { price: raw, seed: raw };
  });

  const active = markets.filter((m) => state[m.marketId]);
  log(`  Seeded ${active.length} markets from chain. Pushing updates…`);

  let tick = 0;
  async function runTick() {
    tick++;
    let pushed = 0;
    for (let i = 0; i < active.length; i += CHUNK) {
      const group = active.slice(i, i + CHUNK);
      const tx = new Transaction();
      for (const m of group) {
        const s = state[m.marketId];
        s.price = nextPrice(s.price, s.seed);
        tx.add(buildIx(programId, admin.publicKey, protocolState, m.oracle, m.marketId, scale(s.price)));
      }
      try {
        const { blockhash } = await connection.getLatestBlockhash("confirmed");
        tx.recentBlockhash = blockhash;
        tx.feePayer = admin.publicKey;
        tx.sign(admin);
        await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        });
        pushed += group.length;
      } catch (err) {
        log(`  ERROR chunk ${i / CHUNK}: ${String(err.message || err).slice(0, 140)}`);
      }
    }
    const sample = active
      .slice(0, 4)
      .map((m) => `${m.marketId.replace("-PERP", "")}=$${state[m.marketId].price.toFixed(0)}`)
      .join("  ");
    log(`tick ${tick}: pushed ${pushed}/${active.length}  ${sample}`);
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
