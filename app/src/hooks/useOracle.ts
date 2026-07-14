"use client";

import { useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { getReadonlyProgram } from "@/lib/program";
import { ORACLE_ACCOUNT } from "@/lib/addresses";
import { MARKETS } from "@/lib/markets";

export type OracleReading = {
  price: number;
  timestamp: number;
};

export type OracleHealth = "fresh" | "degraded" | "stale";

export type OracleData = {
  price: number; // raw u64 (divide by 1_000_000 for USD)
  lastUpdated: number; // unix timestamp
  stalenessThreshold: number;
  readings: OracleReading[];
  isLoading: boolean;
  isStale: boolean;
  health: OracleHealth;
  secondsSinceUpdate: number;
  error: string | null;
};

const PRICE_API = process.env.NEXT_PUBLIC_PRICE_API || "/api/keeper";

type CachedOracle = {
  price: number;
  lastUpdated: number;
  stalenessThreshold: number;
  error: string | null;
  fetchedAt: number;
};

const oracleCache = new Map<string, CachedOracle>();
const oracleSubscribers = new Map<string, Set<() => void>>();
/** Last known good price — prevents ticker flashing to empty between polls. */
const lastGoodPrice = new Map<string, number>();

const historyCache = new Map<string, OracleReading[]>();
const historySubscribers = new Map<string, Set<() => void>>();
const historyIntervals = new Map<string, ReturnType<typeof setInterval>>();

function notifySubscribers(key: string) {
  oracleSubscribers.get(key)?.forEach((cb) => cb());
}

function notifyAllSubscribers() {
  oracleSubscribers.forEach((subs) => subs.forEach((cb) => cb()));
}

function notifyHistorySubs(key: string) {
  historySubscribers.get(key)?.forEach((cb) => cb());
}

/** Merge server rows into existing history without wiping newer live ticks. */
function mergeHistory(marketId: string, incoming: OracleReading[]) {
  if (!incoming.length) return;
  const existing = historyCache.get(marketId) ?? [];
  const byTs = new Map<number, number>();
  for (const r of existing) byTs.set(r.timestamp, r.price);
  for (const r of incoming) {
    if (r.price > 0 && r.timestamp > 0) byTs.set(r.timestamp, r.price);
  }
  const merged = Array.from(byTs.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, price]) => ({ timestamp, price }));
  const maxPts = 5000;
  historyCache.set(
    marketId,
    merged.length > maxPts ? merged.slice(merged.length - maxPts) : merged
  );
}

function appendLiveTick(marketId: string, priceRaw: number, ts: number) {
  if (!(priceRaw > 0) || !(ts > 0)) return;
  const hist = historyCache.get(marketId) ?? [];
  const last = hist[hist.length - 1];
  if (!last || last.timestamp < ts) {
    hist.push({ price: priceRaw, timestamp: ts });
  } else if (last.timestamp === ts) {
    hist[hist.length - 1] = { price: priceRaw, timestamp: ts };
  } else if (priceRaw !== last.price) {
    hist.push({ price: priceRaw, timestamp: Math.max(ts, last.timestamp + 1) });
  } else {
    return;
  }
  const maxPts = 5000;
  if (hist.length > maxPts) hist.splice(0, hist.length - maxPts);
  historyCache.set(marketId, hist);
  notifyHistorySubs(marketId);
}

let bulkPollInterval: ReturnType<typeof setInterval> | null = null;
let bulkPollStarted = false;

async function fetchAllPrices() {
  try {
    const res = await fetch(`${PRICE_API}/prices/all`);
    if (!res.ok) return;
    const data: Record<string, { price: number; ewma: number; lastUpdateTime: number }> =
      await res.json();

    for (const [marketId, info] of Object.entries(data)) {
      const market = MARKETS.find((m) => m.priceApiMarket === marketId);
      if (!market) continue;
      if (!(info.price > 0)) continue;
      const key = market.oracleAddress;

      oracleCache.set(key, {
        price: info.price,
        lastUpdated: info.lastUpdateTime,
        stalenessThreshold: 1800,
        error: null,
        fetchedAt: Date.now(),
      });
      lastGoodPrice.set(key, info.price);

      const ts =
        info.lastUpdateTime > 0 ? info.lastUpdateTime : Math.floor(Date.now() / 1000);
      appendLiveTick(marketId, info.price, ts);
    }
    notifyAllSubscribers();
  } catch {
    // keep existing cache — never clear prices on error
  }
}

function startBulkPolling() {
  if (bulkPollStarted) return;
  bulkPollStarted = true;
  fetchAllPrices();
  bulkPollInterval = setInterval(fetchAllPrices, 5_000);
}

const rpcFetchInFlight = new Set<string>();

async function fetchOracleOnChain(key: string, connection: Connection) {
  if (rpcFetchInFlight.has(key)) return;
  rpcFetchInFlight.add(key);
  try {
    const pubkey = new PublicKey(key);
    const program = getReadonlyProgram(connection);
    const oracle = await (program.account as any).oracleAccount.fetch(pubkey);
    const price = oracle.price.toNumber();
    oracleCache.set(key, {
      price,
      lastUpdated: oracle.lastUpdated.toNumber(),
      stalenessThreshold: oracle.stalenessThreshold.toNumber(),
      error: null,
      fetchedAt: Date.now(),
    });
    if (price > 0) lastGoodPrice.set(key, price);
    notifySubscribers(key);
  } catch (e: any) {
    const prev = oracleCache.get(key);
    if (prev && prev.price > 0) {
      oracleCache.set(key, {
        ...prev,
        error: e?.message ?? "Fetch failed",
        fetchedAt: Date.now(),
      });
    }
  } finally {
    rpcFetchInFlight.delete(key);
  }
}

function startHistoryPolling(marketParam: string) {
  if (historyIntervals.has(marketParam)) return;

  const fetchOnce = async () => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const dayAgo = now - 86400;
      const res = await fetch(
        `${PRICE_API}/prices?market=${marketParam}&from=${dayAgo}&to=${now}`
      );
      if (!res.ok) return;
      const rows: { ewma: number; timestamp: number }[] = await res.json();
      if (!Array.isArray(rows) || rows.length === 0) return; // never wipe live history
      mergeHistory(
        marketParam,
        rows.map((r) => ({
          price: Math.round(Number(r.ewma) * 1_000_000),
          timestamp: Number(r.timestamp),
        }))
      );
    } catch {
      // keep existing
    }
    notifyHistorySubs(marketParam);
  };

  fetchOnce();
  historyIntervals.set(marketParam, setInterval(fetchOnce, 30_000));
}

function stopHistoryPollingIfUnused(key: string) {
  const subs = historySubscribers.get(key);
  if (!subs || subs.size === 0) {
    const interval = historyIntervals.get(key);
    if (interval) clearInterval(interval);
    historyIntervals.delete(key);
  }
}

/**
 * % change vs start of local calendar day (falls back to nearest reading).
 */
export function dayChangePercent(currentRaw: number, readings: OracleReading[]): number {
  const current = currentRaw / 1_000_000;
  if (!(current > 0) || !readings.length) return 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const dayStart = Math.floor(start.getTime() / 1000);

  let openRaw = 0;
  for (let i = readings.length - 1; i >= 0; i--) {
    if (readings[i].timestamp <= dayStart) {
      openRaw = readings[i].price;
      break;
    }
  }
  if (!(openRaw > 0)) {
    let best = readings[0];
    let bestDist = Math.abs(best.timestamp - dayStart);
    for (const r of readings) {
      const d = Math.abs(r.timestamp - dayStart);
      if (d < bestDist) {
        best = r;
        bestDist = d;
      }
    }
    openRaw = best.price;
  }

  const open = openRaw / 1_000_000;
  if (!(open > 0)) return 0;
  return ((current - open) / open) * 100;
}

export function useOracle(
  oracleAddress?: string,
  priceApiMarket?: string
): OracleData {
  const { connection } = useConnection();
  const key = oracleAddress || ORACLE_ACCOUNT.toBase58();
  const marketParam = priceApiMarket || "WL500-PERP";

  const [, setTick] = useState(0);
  const rerender = () => setTick((t) => t + 1);

  useEffect(() => {
    startBulkPolling();
  }, []);

  useEffect(() => {
    if (!oracleSubscribers.has(key)) oracleSubscribers.set(key, new Set());
    oracleSubscribers.get(key)!.add(rerender);
    return () => {
      oracleSubscribers.get(key)?.delete(rerender);
    };
  }, [key]);

  useEffect(() => {
    if (!historySubscribers.has(marketParam)) historySubscribers.set(marketParam, new Set());
    historySubscribers.get(marketParam)!.add(rerender);
    startHistoryPolling(marketParam);
    return () => {
      historySubscribers.get(marketParam)?.delete(rerender);
      stopHistoryPollingIfUnused(marketParam);
    };
  }, [marketParam]);

  const cached = oracleCache.get(key);
  const fallback = lastGoodPrice.get(key) ?? 0;
  const price = cached?.price && cached.price > 0 ? cached.price : fallback;
  const lastUpdated = cached?.lastUpdated ?? 0;
  const stalenessThreshold = cached?.stalenessThreshold ?? 1800;
  const error = cached?.error ?? null;
  const isLoading = !(price > 0);
  const readings = historyCache.get(marketParam) ?? [];

  const secondsSinceUpdate =
    lastUpdated > 0 ? Math.floor(Date.now() / 1000 - lastUpdated) : -1;
  const isStale = secondsSinceUpdate > stalenessThreshold;

  let health: OracleHealth = "fresh";
  if (secondsSinceUpdate > 15 * 60) health = "stale";
  else if (secondsSinceUpdate > 5 * 60) health = "degraded";

  return {
    price,
    lastUpdated,
    stalenessThreshold,
    readings,
    isLoading,
    isStale,
    health,
    secondsSinceUpdate,
    error,
  };
}

/** Day % change for sorting / binder cards. */
export function getMarketChange(oracleAddress: string, priceApiMarket: string): number {
  const cached = oracleCache.get(oracleAddress);
  const fallback = lastGoodPrice.get(oracleAddress) ?? 0;
  const price = cached?.price && cached.price > 0 ? cached.price : fallback;
  const readings = historyCache.get(priceApiMarket) ?? [];
  return dayChangePercent(price, readings);
}

export function useOracleRefresh() {
  const { connection } = useConnection();
  return (oracleAddress: string) => fetchOracleOnChain(oracleAddress, connection);
}
