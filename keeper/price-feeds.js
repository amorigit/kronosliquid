"use strict";

/**
 * price-feeds.js — resolve target USD prices for Kronos DEVnet oracles.
 *
 * Metals: Yahoo Finance chart API (GC=F / SI=F / PL=F).
 * Watches: auto mid from Bob's Watches product feed + The 1916 Company search
 *          (feeds.json only needs search queries + fallbackUsd — no hand price edits).
 * WL500: equal-weight mean of weighted watch targets × wl500.scale.
 *
 * On fetch failure: hold last good target → feeds-cache.json → fallbackUsd.
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

const FEEDS_PATH = path.join(__dirname, "feeds.json");
const CACHE_PATH = path.join(__dirname, "feeds-cache.json");

function feedRefreshMs() {
  return Math.max(parseInt(process.env.FEED_REFRESH_MS || String(3 * 60 * 1000), 10), 60_000);
}

const YAHOO_UA =
  process.env.YAHOO_USER_AGENT ||
  "Mozilla/5.0 (compatible; KronosKeeper/1.0; +https://kronosliquid.xyz)";

const BROWSER_UA =
  process.env.WATCH_FEED_UA ||
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** @type {ReturnType<typeof loadConfig>|null} */
let config = null;
/** @type {Map<string, { target: number, source: string, updatedAt: number, age_s?: number }>} */
const targets = new Map();
/** @type {Record<string, { target: number, source: string, updatedAt: number }>} */
let diskCache = {};
let lastRefreshAt = 0;
let lastError = null;
let refreshTimer = null;

function log(msg) {
  console.log(`[${new Date().toISOString()}] [feeds] ${msg}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(FEEDS_PATH, "utf8"));
  const byId = new Map();
  for (const m of raw.markets || []) {
    byId.set(m.marketId, m);
  }
  return { raw, byId, wl500: raw.wl500 || { scale: 1 } };
}

function loadDiskCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      diskCache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8")) || {};
    }
  } catch (e) {
    log(`WARN could not read feeds-cache.json: ${e.message || e}`);
    diskCache = {};
  }
}

function saveDiskCache() {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(diskCache, null, 2) + "\n");
  } catch (e) {
    log(`WARN could not write feeds-cache.json: ${e.message || e}`);
  }
}

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": YAHOO_UA,
          Accept: "application/json,text/html,*/*",
          ...headers,
        },
        timeout: 20000,
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
          resolve({ status: res.statusCode || 200, body, headers: res.headers });
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

async function httpsGetJson(url, headers = {}) {
  const { body } = await httpsGet(url, headers);
  return JSON.parse(body);
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

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Drop absurd outliers vs optional anchor (fallback). */
function filterPrices(prices, anchor) {
  const clean = prices.filter((p) => typeof p === "number" && p > 0 && Number.isFinite(p));
  if (!(anchor > 0)) return clean;
  return clean.filter((p) => p >= anchor * 0.35 && p <= anchor * 3.5);
}

/**
 * Bob's Watches AJAX product feed — ask prices for in-stock listings.
 */
async function fetchBobsPrices(query) {
  const params = new URLSearchParams({
    action: "getProducts",
    ProductFeedId: "1",
    excludeSkus: "Certificate",
    query: String(query),
    limit: "45",
  });
  const url = `https://www.bobswatches.com/ajax/frontend/productFeed?${params}`;
  const data = await httpsGetJson(url, {
    "User-Agent": BROWSER_UA,
    Accept: "*/*",
    Referer: "https://www.bobswatches.com/",
    "X-Requested-With": "XMLHttpRequest",
  });
  const html = data?.fields?.html || "";
  const prices = [...html.matchAll(/itemprop="price"[^>]*content="([0-9.]+)"/g)].map((m) =>
    Number(m[1])
  );
  return prices.filter((p) => p > 0);
}

/**
 * The 1916 Company (WatchBox) search — schema.org / embedded product prices.
 */
async function fetch1916Prices(query) {
  const url = `https://www.the1916company.com/search/watches/?q=${encodeURIComponent(query)}`;
  const { body: html } = await httpsGet(url, {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml",
  });
  const prices = [...html.matchAll(/"price"\s*:\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  // Dedupe identical embeds
  return [...new Set(prices.filter((p) => p > 0))];
}

/**
 * Resolve a watch mid: try Bob's then 1916 across configured queries.
 */
async function resolveWatchMid(market) {
  const queries = Array.isArray(market.queries)
    ? market.queries.filter(Boolean)
    : market.query
      ? [market.query]
      : [];
  const anchor =
    typeof market.fallbackUsd === "number"
      ? market.fallbackUsd
      : typeof market.priceUsd === "number"
        ? market.priceUsd
        : 0;

  function accept(hit) {
    if (!hit || !(hit.price > 0)) return null;
    // Single thin sample far from fallback is usually a wrong model match
    if (anchor > 0 && hit.n < 2) {
      const ratio = hit.price / anchor;
      if (ratio < 0.55 || ratio > 1.8) return null;
    }
    return hit;
  }

  for (const q of queries) {
    try {
      const bobs = filterPrices(await fetchBobsPrices(q), anchor);
      await sleep(250);
      if (bobs.length) {
        const hit = accept({ price: median(bobs), source: `bobs:${q}`, n: bobs.length });
        if (hit) return hit;
      }
    } catch (err) {
      lastError = String(err.message || err);
      log(`WARN bobs ${market.marketId} q=${q}: ${lastError}`);
      await sleep(250);
    }
  }

  for (const q of queries) {
    try {
      const wbox = filterPrices(await fetch1916Prices(q), anchor);
      await sleep(250);
      if (wbox.length) {
        const hit = accept({ price: median(wbox), source: `1916:${q}`, n: wbox.length });
        if (hit) return hit;
      }
    } catch (err) {
      lastError = String(err.message || err);
      log(`WARN 1916 ${market.marketId} q=${q}: ${lastError}`);
      await sleep(250);
    }
  }

  return null;
}

function setTarget(marketId, target, source) {
  const now = Math.floor(Date.now() / 1000);
  targets.set(marketId, { target, source, updatedAt: now });
}

function applyFallback(market, reason) {
  const cached = diskCache[market.marketId];
  if (cached && cached.target > 0) {
    setTarget(market.marketId, cached.target, `cache:${cached.source || "prev"}`);
    log(
      `HOLD ${market.marketId} ← $${cached.target.toFixed(2)} (cache; ${reason})`
    );
    return;
  }
  const fb =
    typeof market.fallbackUsd === "number"
      ? market.fallbackUsd
      : typeof market.priceUsd === "number"
        ? market.priceUsd
        : 0;
  if (fb > 0) {
    setTarget(market.marketId, fb, "fallback");
    log(`FALLBACK ${market.marketId} ← $${fb.toFixed(2)} (${reason})`);
  } else {
    log(`WARN ${market.marketId}: no live/cache/fallback (${reason})`);
  }
}

function recomputeWl500() {
  if (!config) return;
  let weightSum = 0;
  let priceSum = 0;
  for (const m of config.raw.markets) {
    const kind = m.kind;
    if (kind !== "watch" && kind !== "static") continue;
    const w = Number(m.weight) || 0;
    if (!(w > 0)) continue;
    const t = targets.get(m.marketId);
    if (!t || !(t.target > 0)) continue;
    weightSum += w;
    priceSum += t.target * w;
  }
  if (weightSum > 0) {
    const scale = Number(config.wl500.scale) || 1;
    setTarget("WL500-PERP", (priceSum / weightSum) * scale, "wl500");
  }
}

async function refreshYahoo() {
  if (!config) return;
  const yahooMarkets = config.raw.markets.filter((m) => m.kind === "yahoo");
  for (const m of yahooMarkets) {
    try {
      const price = await fetchYahooPrice(m.symbol);
      setTarget(m.marketId, price, `yahoo:${m.symbol}`);
      diskCache[m.marketId] = {
        target: price,
        source: `yahoo:${m.symbol}`,
        updatedAt: Math.floor(Date.now() / 1000),
      };
      log(`${m.marketId} ← $${price.toFixed(2)} (${m.symbol})`);
    } catch (err) {
      lastError = String(err.message || err);
      const prev = targets.get(m.marketId);
      if (prev) {
        log(`WARN ${m.marketId}: Yahoo failed (${lastError}) — holding $${prev.target.toFixed(2)}`);
      } else {
        applyFallback(m, `yahoo failed: ${lastError}`);
      }
    }
  }
}

async function refreshWatches() {
  if (!config) return;
  const watchMarkets = config.raw.markets.filter(
    (m) => m.kind === "watch" || (m.kind === "static" && Array.isArray(m.queries))
  );

  for (const m of watchMarkets) {
    try {
      const hit = await resolveWatchMid(m);
      if (hit && hit.price > 0) {
        setTarget(m.marketId, hit.price, hit.source);
        diskCache[m.marketId] = {
          target: hit.price,
          source: hit.source,
          updatedAt: Math.floor(Date.now() / 1000),
        };
        log(`${m.marketId} ← $${hit.price.toFixed(2)} (${hit.source}, n=${hit.n})`);
      } else {
        applyFallback(m, "no listings with ask prices");
      }
    } catch (err) {
      lastError = String(err.message || err);
      applyFallback(m, lastError);
    }
  }
}

function applyStaticOnly() {
  if (!config) return;
  for (const m of config.raw.markets) {
    if (m.kind !== "static") continue;
    // skip entries that are auto-watch (have queries)
    if (Array.isArray(m.queries) && m.queries.length) continue;
    if (typeof m.priceUsd === "number" && m.priceUsd > 0) {
      setTarget(m.marketId, m.priceUsd, "static");
    } else if (typeof m.fallbackUsd === "number" && m.fallbackUsd > 0) {
      setTarget(m.marketId, m.fallbackUsd, "static");
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

  applyStaticOnly();
  await refreshYahoo();
  await refreshWatches();
  recomputeWl500();
  saveDiskCache();

  const now = Math.floor(Date.now() / 1000);
  for (const [, t] of targets) {
    t.age_s = now - t.updatedAt;
  }
  lastRefreshAt = now;
  if (!lastError) lastError = null;
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
    watch_sources: ["bobs", "1916"],
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
  loadDiskCache();
  // Seed from cache immediately so keeper can ramp before first HTTP round-trip finishes
  for (const [id, c] of Object.entries(diskCache)) {
    if (c && c.target > 0) {
      setTarget(id, c.target, `cache:${c.source || "prev"}`);
    }
  }
  await refresh();
  if (refreshTimer) clearInterval(refreshTimer);
  const ms = feedRefreshMs();
  refreshTimer = setInterval(() => {
    refresh().catch((e) => log(`refresh error: ${e.message || e}`));
  }, ms);
  log(`started refresh every ${ms}ms (Yahoo metals + auto watch mids)`);
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
