"use strict";

/**
 * Indexes Kronos program trade events from devnet transaction logs.
 * Persists to keeper/trades.json + keeper/indexer-cursor.json.
 */
const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const { PublicKey } = require("@solana/web3.js");

const TRADES_PATH = path.join(__dirname, "trades.json");
const CURSOR_PATH = path.join(__dirname, "indexer-cursor.json");
const POLL_MS = parseInt(process.env.INDEXER_POLL_MS || "30000", 10);
const BACKFILL_SIGS = parseInt(process.env.INDEXER_BACKFILL_SIGS || "300", 10);

const EVENT_DISC = {
  PositionOpened: disc("event:PositionOpened"),
  PositionClosed: disc("event:PositionClosed"),
  PositionLiquidated: disc("event:PositionLiquidated"),
};

function disc(name) {
  return createHash("sha256").update(name).digest().slice(0, 8);
}

function rawUsdc(n) {
  return Number(n) / 1e6;
}

function rawPrice(n) {
  return Number(n) / 1e6;
}

class Reader {
  constructor(buf) {
    this.buf = buf;
    this.off = 8; // skip event discriminator
  }
  u8() {
    return this.buf.readUInt8(this.off++);
  }
  u64() {
    const v = this.buf.readBigUInt64LE(this.off);
    this.off += 8;
    return v;
  }
  i64() {
    const v = this.buf.readBigInt64LE(this.off);
    this.off += 8;
    return v;
  }
  pubkey() {
    const pk = new PublicKey(this.buf.subarray(this.off, this.off + 32));
    this.off += 32;
    return pk;
  }
}

const CLOSE_REASON = ["manual", "stop_loss", "take_profit", "liquidation"];

/** @type {Array<object>} */
let trades = [];
let nextId = 1;
/** @type {string | null} */
let cursor = null;
/** @type {Map<string, string>} oracle base58 -> marketId */
let oracleToMarket = new Map();
/** @type {import('@solana/web3.js').Connection | null} */
let connection = null;
/** @type {PublicKey | null} */
let programId = null;
let pollTimer = null;

function loadStore() {
  try {
    const raw = JSON.parse(fs.readFileSync(TRADES_PATH, "utf8"));
    trades = Array.isArray(raw.trades) ? raw.trades : [];
    nextId = raw.nextId || trades.length + 1;
  } catch {
    trades = [];
    nextId = 1;
  }
  try {
    const c = JSON.parse(fs.readFileSync(CURSOR_PATH, "utf8"));
    cursor = c.signature || null;
  } catch {
    cursor = null;
  }
}

function persistStore() {
  try {
    fs.writeFileSync(TRADES_PATH, JSON.stringify({ nextId, trades }, null, 0));
    if (cursor) fs.writeFileSync(CURSOR_PATH, JSON.stringify({ signature: cursor }));
  } catch (e) {
    console.error(`[trade-indexer] persist failed: ${e.message}`);
  }
}

function pushTrade(row) {
  trades.push({ id: nextId++, ...row });
  // Cap at 10k rows (ring)
  if (trades.length > 10_000) trades.splice(0, trades.length - 10_000);
}

function marketForOracle(oraclePk) {
  return oracleToMarket.get(oraclePk.toBase58()) || null;
}

function parseEventBuffer(buf) {
  if (buf.length < 8) return null;
  const head = buf.subarray(0, 8);
  const r = new Reader(buf);

  if (head.equals(EVENT_DISC.PositionOpened)) {
    const user = r.pubkey();
    const oracle = r.pubkey();
    const direction = r.u8() === 0 ? "long" : "short";
    const collateral = r.u64();
    const notional = r.u64();
    const leverage = r.u8();
    const entryPrice = r.u64();
    const feePaid = r.u64();
    const timestamp = r.i64();
    return {
      kind: "open",
      user,
      oracle,
      direction,
      collateral,
      notional,
      leverage,
      entryPrice,
      feePaid,
      timestamp,
    };
  }

  if (head.equals(EVENT_DISC.PositionClosed)) {
    const user = r.pubkey();
    const oracle = r.pubkey();
    const direction = r.u8() === 0 ? "long" : "short";
    const entryPrice = r.u64();
    const exitPrice = r.u64();
    const pnl = r.i64();
    const fundingPaid = r.u64();
    const feePaid = r.u64();
    const settlement = r.u64();
    const reason = CLOSE_REASON[r.u8()] || "manual";
    const timestamp = r.i64();
    return {
      kind: "close",
      user,
      oracle,
      direction,
      entryPrice,
      exitPrice,
      pnl,
      fundingPaid,
      feePaid,
      settlement,
      reason,
      timestamp,
    };
  }

  if (head.equals(EVENT_DISC.PositionLiquidated)) {
    const user = r.pubkey();
    const oracle = r.pubkey();
    r.pubkey(); // liquidator
    const entryPrice = r.u64();
    const exitPrice = r.u64();
    const collateralLost = r.u64();
    const timestamp = r.i64();
    return {
      kind: "liquidate",
      user,
      oracle,
      entryPrice,
      exitPrice,
      collateralLost,
      timestamp,
    };
  }

  return null;
}

function extractProgramDataLogs(logMessages, progId) {
  const pid = progId.toBase58();
  const out = [];
  let depth = 0;
  for (const line of logMessages) {
    if (line.includes(`Program ${pid} invoke`)) depth++;
    if (depth > 0 && line.startsWith("Program data: ")) {
      try {
        out.push(Buffer.from(line.slice("Program data: ".length).trim(), "base64"));
      } catch {
        /* skip malformed */
      }
    }
    if (line.includes(`Program ${pid} success`) || line.includes(`Program ${pid} failed`)) {
      depth = Math.max(0, depth - 1);
    }
  }
  return out;
}

function eventToTrade(ev, signature) {
  const market = marketForOracle(ev.oracle);
  const ts = Number(ev.timestamp);

  if (ev.kind === "open") {
    return {
      timestamp: ts,
      user_pubkey: ev.user.toBase58(),
      position_index: 0,
      action: "open",
      direction: ev.direction,
      collateral: rawUsdc(ev.collateral),
      leverage: ev.leverage,
      notional: rawUsdc(ev.notional),
      entry_price: rawPrice(ev.entryPrice),
      exit_price: null,
      pnl: null,
      funding_paid: null,
      fee_paid: rawUsdc(ev.feePaid),
      tx_signature: signature,
      close_reason: null,
      market,
    };
  }

  if (ev.kind === "close") {
    let action = "close";
    if (ev.reason === "stop_loss") action = "sl";
    else if (ev.reason === "take_profit") action = "tp";
    else if (ev.reason === "liquidation") action = "liquidate";
    return {
      timestamp: ts,
      user_pubkey: ev.user.toBase58(),
      position_index: 0,
      action,
      direction: ev.direction,
      collateral: rawUsdc(ev.settlement),
      leverage: 0,
      notional: 0,
      entry_price: rawPrice(ev.entryPrice),
      exit_price: rawPrice(ev.exitPrice),
      pnl: rawUsdc(ev.pnl),
      funding_paid: rawUsdc(ev.fundingPaid),
      fee_paid: rawUsdc(ev.feePaid),
      tx_signature: signature,
      close_reason: ev.reason,
      market,
    };
  }

  if (ev.kind === "liquidate") {
    return {
      timestamp: ts,
      user_pubkey: ev.user.toBase58(),
      position_index: 0,
      action: "liquidate",
      direction: "long",
      collateral: rawUsdc(ev.collateralLost),
      leverage: 0,
      notional: 0,
      entry_price: rawPrice(ev.entryPrice),
      exit_price: rawPrice(ev.exitPrice),
      pnl: -rawUsdc(ev.collateralLost),
      funding_paid: null,
      fee_paid: 0,
      tx_signature: signature,
      close_reason: "liquidation",
      market,
    };
  }

  return null;
}

async function processSignature(signature) {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta?.logMessages) return 0;
  const blobs = extractProgramDataLogs(tx.meta.logMessages, programId);
  let added = 0;
  for (const buf of blobs) {
    const ev = parseEventBuffer(buf);
    if (!ev) continue;
    const row = eventToTrade(ev, signature);
    if (!row) continue;
    // Dedupe: same sig + action + user + timestamp
    const dup = trades.some(
      (t) =>
        t.tx_signature === row.tx_signature &&
        t.action === row.action &&
        t.user_pubkey === row.user_pubkey &&
        t.timestamp === row.timestamp
    );
    if (dup) continue;
    pushTrade(row);
    added++;
  }
  return added;
}

async function pollOnce() {
  if (!connection || !programId) return;
  const opts = { limit: 50 };
  if (cursor) opts.until = cursor;

  let sigs;
  try {
    sigs = await connection.getSignaturesForAddress(programId, opts);
  } catch (e) {
    console.error(`[trade-indexer] getSignatures failed: ${e.message}`);
    return;
  }

  if (!sigs.length) return;

  // First run: only backfill recent window
  if (!cursor && sigs.length > BACKFILL_SIGS) {
    sigs = sigs.slice(0, BACKFILL_SIGS);
  }

  const chronological = [...sigs].reverse();
  let added = 0;
  for (const { signature } of chronological) {
    if (signature === cursor) continue;
    try {
      added += await processSignature(signature);
    } catch (e) {
      console.error(`[trade-indexer] tx ${signature.slice(0, 8)}…: ${e.message}`);
    }
  }

  cursor = sigs[0].signature;
  if (added > 0) {
    persistStore();
    console.log(`[trade-indexer] +${added} trades (total ${trades.length})`);
  }
}

function withinWindow(ts, seconds) {
  return ts >= Math.floor(Date.now() / 1000) - seconds;
}

function computeStats() {
  const now = Math.floor(Date.now() / 1000);
  const d1 = now - 86400;
  const d7 = now - 7 * 86400;
  const opens24 = trades.filter((t) => t.action === "open" && t.timestamp >= d1);
  const opens7 = trades.filter((t) => t.action === "open" && t.timestamp >= d7);
  const liq24 = trades.filter((t) => t.action === "liquidate" && t.timestamp >= d1);
  const fees24 = trades.filter((t) => t.timestamp >= d1);

  const vol24 = opens24.reduce((s, t) => s + (t.notional || 0), 0);
  const vol7 = opens7.reduce((s, t) => s + (t.notional || 0), 0);
  const feeSum24 = fees24.reduce((s, t) => s + (t.fee_paid || 0), 0);
  const traders24 = new Set(opens24.map((t) => t.user_pubkey)).size;

  return {
    total_volume_24h: +vol24.toFixed(2),
    total_volume_7d: +vol7.toFixed(2),
    total_trades_24h: opens24.length,
    total_liquidations_24h: liq24.length,
    total_fees_24h: +feeSum24.toFixed(2),
    unique_traders_24h: traders24,
  };
}

function computeLeaderboard() {
  /** @type {Map<string, { user_pubkey: string, total_pnl: number, wins: number, trades: number, volume: number }>} */
  const byUser = new Map();

  for (const t of trades) {
    if (!byUser.has(t.user_pubkey)) {
      byUser.set(t.user_pubkey, {
        user_pubkey: t.user_pubkey,
        total_pnl: 0,
        wins: 0,
        trades: 0,
        volume: 0,
      });
    }
    const row = byUser.get(t.user_pubkey);
    if (t.action === "open") {
      row.trades += 1;
      row.volume += t.notional || 0;
    }
    if (t.pnl != null && (t.action === "close" || t.action === "sl" || t.action === "tp" || t.action === "liquidate")) {
      row.total_pnl += t.pnl;
      if (t.pnl > 0) row.wins += 1;
    }
  }

  return [...byUser.values()]
    .sort((a, b) => b.total_pnl - a.total_pnl)
    .slice(0, 100);
}

function getTrades({ user, limit = 50 } = {}) {
  let rows = trades;
  if (user) rows = rows.filter((t) => t.user_pubkey === user);
  rows = [...rows].sort((a, b) => b.timestamp - a.timestamp);
  if (limit > 0) rows = rows.slice(0, limit);
  return rows;
}

function start(opts) {
  connection = opts.connection;
  programId = opts.programId;
  oracleToMarket = opts.oracleToMarket;
  loadStore();
  console.log(
    `[trade-indexer] loaded ${trades.length} trades` +
      (cursor ? `, cursor=${cursor.slice(0, 8)}…` : ", no cursor (backfill)")
  );
  pollOnce().catch((e) => console.error(`[trade-indexer] initial poll: ${e.message}`));
  pollTimer = setInterval(() => {
    pollOnce().catch((e) => console.error(`[trade-indexer] poll: ${e.message}`));
  }, POLL_MS);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  persistStore();
}

module.exports = {
  start,
  stop,
  getTrades,
  getRecentTrades: (limit = 50) => getTrades({ limit }),
  getStats: computeStats,
  getLeaderboard: computeLeaderboard,
  persistStore,
};
