"use strict";

/**
 * price-feeds.js — resolve target USD prices for Kronos DEVnet oracles.
 *
 * Metals: Yahoo Finance chart API (GC=F / SI=F / PL=F).
 * Watches + diamond: static mids from feeds.json.
 * WL500: equal-weight mean of weighted static watch refs × wl500.scale.
 *
 * On Yahoo failure: hold last good metal target (never invent a random walk).
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

const FEEDS_PATH = path.join(__dirname, "feeds.json");

function feedRefreshMs() {
  return Math.max(parseInt(process.env.FEED_REFRESH_MS || String(3 * 60 * 1000), 10), 60_000);
}

const YAHOO_UA =
  process.env.YAHOO_USER_AGENT ||
  "Mozilla/5.0 (compatible; KronosKeeper/1.0; +https://kronosliquid.xyz)";

/** @type {ReturnType<typeof loadConfig>|null} */
let config = null;
/** @type {Map<string, { target: number, source: string, updatedAt: number, age_s?: number }>} */
const targets = new Map();
let lastRefreshAt = 0;
let lastError = null;
let refreshTimer = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [feeds] ${msg}`);
}

function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(FEEDS_PATH, "utf8"));
  const byId = new Map();
  for (const m of raw.markets || []) {
    byId.set(m.marketId, m);
  }
  return { raw, byId, wl500: raw.wl500 || { scale: 1 } };
}

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": YAHOO_UA,
          Accept: "application/json",
        },
        timeout: 15000,
      },
      (res) => {
        let body = "";
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

/**
 * Yahoo chart meta.regularMarketPrice for a futures/spot symbol.
 */
async function fetchYahooPrice(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&range=1d`;
  const data = await httpsGetJson(url);
  const meta = data?.chart?.result?.[0]?.meta;
  const price =
    meta?.regularMarketPrice ??
    meta?.previousClose ??
    meta?.chartPreviousClose;
  if (typeof price !== "number" || !(price > 0)) {
    throw new Error(`no price for ${symbol}`);
  }
  return price;
}

function setTarget(marketId, target, source) {
  const now = Math.floor(Date.now() / 1000);
  targets.set(marketId, { target, source, updatedAt: now });
}

function applyStaticAndWl500() {
  if (!config) return;
  const now = Math.floor(Date.now() / 1000);
  let weightSum = 0;
  let priceSum = 0;

  for (const m of config.raw.markets) {
    if (m.kind === "static" && typeof m.priceUsd === "number" && m.priceUsd > 0) {
      setTarget(m.marketId, m.priceUsd, "static");
      const w = Number(m.weight) || 0;
      if (w > 0) {
        weightSum += w;
        priceSum += m.priceUsd * w;
      }
    }
  }

  const wlEntry = config.byId.get("WL500-PERP");
  if (wlEntry && weightSum > 0) {
    const scale = Number(config.wl500.scale) || 1;
    const avg = priceSum / weightSum;
    setTarget("WL500-PERP", avg * scale, "wl500");
  }

  // Touch ages
  for (const [, t] of targets) {
    t.age_s = now - t.updatedAt;
  }
}

async function refreshYahoo() {
  if (!config) return;
  const yahooMarkets = config.raw.markets.filter((m) => m.kind === "yahoo");
  for (const m of yahooMarkets) {
    try {
      const price = await fetchYahooPrice(m.symbol);
      setTarget(m.marketId, price, `yahoo:${m.symbol}`);
      log(`${m.marketId} ← $${price.toFixed(2)} (${m.symbol})`);
    } catch (err) {
      lastError = String(err.message || err);
      const prev = targets.get(m.marketId);
      if (prev) {
        log(`WARN ${m.marketId}: Yahoo failed (${lastError}) — holding $${prev.target.toFixed(2)}`);
      } else if (typeof m.fallbackUsd === "number") {
        setTarget(m.marketId, m.fallbackUsd, "fallback");
        log(`WARN ${m.marketId}: Yahoo failed — using fallback $${m.fallbackUsd}`);
      } else {
        log(`WARN ${m.marketId}: Yahoo failed (${lastError}) — no target yet`);
      }
    }
  }
}

async function refresh() {
  try {
    config = loadConfig();
  } catch (e) {
    lastError = String(e.message || e);
    log(`ERROR loading feeds.json: ${lastError}`);
    return;
  }
  applyStaticAndWl500();
  await refreshYahoo();
  // Recompute WL500 after metals (WL500 only uses watches; still refresh statics from disk)
  applyStaticAndWl500();
  lastRefreshAt = Math.floor(Date.now() / 1000);
  lastError = null;
}

/**
 * @returns {Map<string, { target: number, source: string, updatedAt: number, age_s: number }>}
 */
function getTargets() {
  const now = Math.floor(Date.now() / 1000);
  const out = new Map();
  for (const [id, t] of targets) {
    out.set(id, { ...t, age_s: now - t.updatedAt });
  }
  return out;
}

function getTarget(marketId) {
  const t = targets.get(marketId);
  if (!t) return null;
  return { ...t, age_s: Math.floor(Date.now() / 1000) - t.updatedAt };
}

function getStatus() {
  const now = Math.floor(Date.now() / 1000);
  return {
    price_mode: "live",
    feed_refresh_ms: feedRefreshMs(),
    last_refresh: lastRefreshAt,
    feed_age_s: lastRefreshAt ? now - lastRefreshAt : -1,
    last_error: lastError,
    targets: Object.fromEntries(
      [...getTargets()].map(([id, t]) => [
        id,
        { target: +t.target.toFixed(4), source: t.source, age_s: t.age_s },
      ])
    ),
  };
}

/**
 * Start periodic refresh. Awaits first refresh before returning.
 */
async function start() {
  await refresh();
  if (refreshTimer) clearInterval(refreshTimer);
  const ms = feedRefreshMs();
  refreshTimer = setInterval(() => {
    refresh().catch((e) => log(`refresh error: ${e.message || e}`));
  }, ms);
  log(`started refresh every ${ms}ms`);
}

function stop() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = null;
}

module.exports = {
  start,
  stop,
  refresh,
  getTargets,
  getTarget,
  getStatus,
  feedRefreshMs,
};
