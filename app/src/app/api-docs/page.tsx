"use client";

import { useState } from "react";

// ─── Shared styles ──────────────────────────────────────────────────────────

const FONT = "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace";
const BASE_URL = "https://kronosliquid.xyz/api/v1";

// ─── Components ─────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        fontSize: 10,
        color: copied ? "#00ff41" : "#666",
        background: "none",
        border: "1px solid #333",
        padding: "2px 8px",
        cursor: "pointer",
        fontFamily: FONT,
        flexShrink: 0,
      }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

function Code({ children }: { children: string }) {
  return (
    <div style={{ position: "relative", background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 16px", marginTop: 8, marginBottom: 16 }}>
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <CopyBtn text={children.trim()} />
      </div>
      <pre style={{ fontSize: 11, color: "#ccc", fontFamily: FONT, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
        {children.trim()}
      </pre>
    </div>
  );
}

function Badge({ method = "GET" }: { method?: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#000",
        background: "#00ff41",
        padding: "2px 8px",
        letterSpacing: "0.05em",
        marginRight: 8,
        flexShrink: 0,
      }}
    >
      {method}
    </span>
  );
}

function ParamTable({ rows }: { rows: [string, string, string, string][] }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 8, marginBottom: 16 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: FONT }}>
        <thead>
          <tr>
            {["Param", "Type", "Default", "Description"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  borderBottom: "1px solid #333",
                  color: "#666",
                  fontWeight: 600,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([param, type, def, desc], i) => (
            <tr key={i}>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #1a1a1a", color: "#00ff41", whiteSpace: "nowrap" }}>
                {param}
              </td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #1a1a1a", color: "#888" }}>
                {type}
              </td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #1a1a1a", color: "#888" }}>
                {def}
              </td>
              <td style={{ padding: "6px 10px", borderBottom: "1px solid #1a1a1a", color: "#ccc" }}>
                {desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Endpoint({
  method,
  path,
  description,
  params,
  curlExample,
  responseExample,
}: {
  method?: string;
  path: string;
  description: string;
  params?: [string, string, string, string][];
  curlExample: string;
  responseExample: string;
}) {
  return (
    <div
      style={{
        background: "#111",
        border: "1px solid #1a1a1a",
        padding: "20px 24px",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        <Badge method={method} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: FONT }}>
          {path}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, marginBottom: 12, marginTop: 0 }}>
        {description}
      </p>

      {params && params.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            QUERY PARAMETERS
          </div>
          <ParamTable rows={params} />
        </>
      )}

      <div style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        EXAMPLE
      </div>
      <Code>{curlExample}</Code>

      <div style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
        RESPONSE
      </div>
      <Code>{responseExample}</Code>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ApiDocsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        fontFamily: FONT,
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "#00ff41", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            DEVELOPER
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: 0 }}>
            Public API
          </h1>
          <p style={{ fontSize: 13, color: "#888", marginTop: 8, lineHeight: 1.6 }}>
            Free, unauthenticated REST API for market data, prices, trades, and protocol stats.
            No API key required. CORS enabled for browser access.
          </p>
        </div>

        {/* Base URL */}
        <div
          style={{
            background: "#111",
            border: "1px solid #1a1a1a",
            padding: "16px 20px",
            marginBottom: 32,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 10, color: "#666", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            BASE URL
          </span>
          <span style={{ fontSize: 14, color: "#00ff41", fontFamily: FONT }}>
            {BASE_URL}
          </span>
          <CopyBtn text={BASE_URL} />
        </div>

        {/* Quick info */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 40,
          }}
        >
          {[
            ["Auth", "None required"],
            ["Rate Limit", "60 requests/min"],
            ["Format", "JSON"],
            ["CORS", "Enabled (all origins)"],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                background: "#111",
                border: "1px solid #1a1a1a",
                padding: "12px 16px",
              }}
            >
              <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 13, color: "#ccc" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Markets info */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 12 }}>Markets</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: FONT }}>
              <thead>
                <tr>
                  {["Market ID", "Name", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderBottom: "1px solid #333",
                        color: "#666",
                        fontWeight: 600,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["WL500-PERP", "WL500 Watch Index", "Live"],
                  ["GOLD-PERP", "Gold XAU/USD", "Live"],
                  ["ROLEX-SUB-PERP", "Rolex Submariner 126610LN", "Live"],
                  ["PATEK-NAUTILUS-PERP", "Patek Philippe Nautilus 5711/1A", "Live"],
                  ["ROLEX-DAYTONA-PERP", "Rolex Daytona 116500LN", "Live"],
                ].map(([id, name, status]) => (
                  <tr key={id}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#00ff41" }}>{id}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#ccc" }}>{name}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#00ff41" }}>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
            All 24 markets are listed in <code style={{ color: "#888" }}>markets.bootstrap.json</code>. Use the
            Market ID in API query parameters (e.g. <code style={{ color: "#888" }}>?market=ROLEX-SUB-PERP</code>).
          </p>
        </div>

        {/* Endpoints */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Endpoints</h2>

        <Endpoint
          path="/ping"
          description="Health check. Returns server status and timestamp."
          curlExample={`curl ${BASE_URL}/ping`}
          responseExample={`{
  "ok": true,
  "timestamp": "2026-06-06T12:00:00.000Z"
}`}
        />

        <Endpoint
          path="/prices"
          description="Historical oracle price data recorded by the keeper (one point every 30 seconds, 48h retention)."
          params={[
            ["market", "string", "\u2014", "Market ID (e.g. ROLEX-SUB-PERP, GOLD-PERP, WL500-PERP)"],
            ["limit", "number", "\u2014", "Number of most recent data points"],
            ["from", "number", "\u2014", "Unix timestamp range start"],
            ["to", "number", "\u2014", "Unix timestamp range end"],
          ]}
          curlExample={`curl "${BASE_URL}/prices?market=ROLEX-SUB-PERP&limit=10"`}
          responseExample={`[
  {
    "timestamp": 1751500800,
    "ewma": 14405.20,
    "price": 14405.20
  },
  ...
]`}
        />

        <Endpoint
          path="/candles"
          description="OHLC candlestick data aggregated from 30-second oracle price records. Useful for charting."
          params={[
            ["market", "string", "\u2014", "Market ID (e.g. ROLEX-SUB-PERP, GOLD-PERP)"],
            ["resolution", "string", "1h", "Candle resolution: 1m, 5m, 15m, 1h, 4h, 1d"],
          ]}
          curlExample={`curl "${BASE_URL}/candles?market=ROLEX-SUB-PERP&resolution=1h"`}
          responseExample={`[
  {
    "timestamp": 1751500800,
    "open": 14401.30,
    "high": 14427.10,
    "low": 14384.80,
    "close": 14416.50
  },
  ...
]`}
        />

        <Endpoint
          path="/trades/recent"
          description="Most recent trades across all users. Includes opens, closes, and liquidations."
          params={[
            ["limit", "number", "50", "Number of trades (max 200)"],
          ]}
          curlExample={`curl "${BASE_URL}/trades/recent?limit=20"`}
          responseExample={`{
  "trades": [
    {
      "id": 42,
      "timestamp": 1749225600,
      "user_pubkey": "7aGv...WMbW",
      "position_index": 0,
      "action": "close",
      "direction": "long",
      "collateral": 10.0,
      "leverage": 5,
      "notional": 50.0,
      "entry_price": 14401.50,
      "exit_price": 14465.20,
      "pnl": 1.15,
      "fee": 1.0,
      "market_id": "ROLEX-SUB-PERP",
      "tx_signature": "4rKm...9xLp"
    },
    ...
  ]
}`}
        />

        <Endpoint
          path="/trades"
          description="Trade history for a specific wallet address."
          params={[
            ["user", "string", "required", "Solana wallet public key (base58)"],
            ["limit", "number", "20", "Number of trades (max 100)"],
          ]}
          curlExample={`curl "${BASE_URL}/trades?user=7aGvH7XXWLAg9XVeyNwCiT6FqiJxeKHQterCSXi5xTrf&limit=10"`}
          responseExample={`{
  "trades": [...],
  "total": 25
}`}
        />

        <Endpoint
          path="/stats"
          description="Protocol-wide statistics for the last 24 hours and 7 days."
          curlExample={`curl ${BASE_URL}/stats`}
          responseExample={`{
  "total_volume_24h": 15230.50,
  "total_volume_7d": 89420.00,
  "total_trades_24h": 42,
  "total_liquidations_24h": 3,
  "total_fees_24h": 608.12,
  "unique_traders_24h": 18
}`}
        />

        <Endpoint
          path="/events/recent"
          description="Recent protocol events (liquidations, large trades, funding settlements)."
          params={[
            ["limit", "number", "10", "Number of events (max 50)"],
          ]}
          curlExample={`curl "${BASE_URL}/events/recent?limit=5"`}
          responseExample={`[
  {
    "id": 1,
    "timestamp": 1749225600,
    "event_type": "liquidation",
    "data": "...",
    "tx_signature": "3pKm...7xLp"
  },
  ...
]`}
        />

        <Endpoint
          path="/health"
          description="Comprehensive system health. Includes oracle freshness, liquidation stats, funding stats, Solana RPC health, keeper uptime, and per-market data."
          curlExample={`curl ${BASE_URL}/health`}
          responseExample={`{
  "status": "ok",
  "oracle": {
    "price": 161620000,
    "last_updated": 1749225600,
    "age_seconds": 42,
    "health": "fresh",
    ...
  },
  "markets": { ... },
  "liquidation": { ... },
  "funding": { ... },
  "solana": { ... },
  "keeper": {
    "uptime_minutes": 4320,
    "total_updates": 1296,
    "total_errors": 2,
    "errors_24h": 0
  }
}`}
        />

        {/* Code examples */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 48, marginBottom: 20 }}>Code Examples</h2>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600, marginBottom: 8 }}>JavaScript / TypeScript</div>
          <Code>{"const BASE = \"https://kronosliquid.xyz/api/v1\";\n\n// Get current Rolex Submariner price\nconst prices = await fetch(BASE + \"/prices?market=ROLEX-SUB-PERP&limit=1\").then(r => r.json());\nconst latest = prices[0];\nconsole.log(\"ROLEX-SUB: $\" + latest.ewma.toFixed(2));\n\n// Get hourly candles for the Daytona\nconst candles = await fetch(BASE + \"/candles?market=ROLEX-DAYTONA-PERP&resolution=1h\").then(r => r.json());\nconsole.log(candles.length + \" candles, latest close: $\" + candles.at(-1).close);\n\n// Get protocol stats\nconst stats = await fetch(BASE + \"/stats\").then(r => r.json());\nconsole.log(\"24h volume: $\" + stats.total_volume_24h + \", traders: \" + stats.unique_traders_24h);"}</Code>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: "#ccc", fontWeight: 600, marginBottom: 8 }}>Python</div>
          <Code>{"import requests\n\nBASE = \"https://kronosliquid.xyz/api/v1\"\n\n# Get latest prices for a few markets\nfor market in [\"WL500-PERP\", \"GOLD-PERP\", \"ROLEX-SUB-PERP\", \"ROLEX-DAYTONA-PERP\"]:\n    data = requests.get(f\"{BASE}/prices?market={market}&limit=1\").json()\n    if data:\n        print(f\"{market}: ${data[0]['ewma']:.2f}\")\n\n# Get recent trades\ntrades = requests.get(f\"{BASE}/trades/recent?limit=50\").json()\nfor t in trades[\"trades\"]:\n    print(f\"{t['action']} {t['direction']} {t['market_id']}\")"}</Code>
        </div>

        {/* On-chain section */}
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 48, marginBottom: 12 }}>On-Chain Program</h2>
        <p style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 16 }}>
          For direct on-chain interaction (opening positions, depositing collateral, etc.), use the Anchor IDL
          with the Solana program.
        </p>
        <div
          style={{
            background: "#111",
            border: "1px solid #1a1a1a",
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 10, color: "#666", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            PROGRAM ID
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#00ff41", fontFamily: FONT, wordBreak: "break-all" }}>
              HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP
            </span>
            <CopyBtn text="HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP" />
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          See the <a href="/docs#protocol" style={{ color: "#00ff41", textDecoration: "none" }}>protocol docs</a> for
          full instruction reference, deployed addresses, and PDA derivation details.
        </p>

        {/* Footer spacer for mobile bottom tab bar */}
        <div style={{ height: 80 }} />
      </div>
    </div>
  );
}
