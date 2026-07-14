"use client";

import { useState, useEffect, useRef } from "react";

// ─── Sections ───────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "markets", label: "Markets" },
  { id: "getting-started", label: "Getting Started" },
  { id: "trading", label: "Trading" },
  { id: "fees", label: "Fees & Costs" },
  { id: "risk", label: "Risk Management" },
  { id: "oracle", label: "Oracle" },
  { id: "lp", label: "Liquidity Pool" },
  { id: "referral", label: "Referral" },
  { id: "protocol", label: "Protocol" },
  { id: "api", label: "API Reference" },
  { id: "faq", label: "FAQ" },
];

// ─── Copy button ────────────────────────────────────────────────────────────

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
        fontFamily: "'JetBrains Mono', monospace",
        marginLeft: 8,
        flexShrink: 0,
      }}
    >
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}

// ─── Address row ────────────────────────────────────────────────────────────

function Addr({ label, address, desc }: { label: string; address: string; desc?: string }) {
  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <a
          href={`https://explorer.solana.com/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace", textDecoration: "none", wordBreak: "break-all" }}
        >
          {address}
        </a>
        <CopyBtn text={address} />
      </div>
      {desc && <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>{desc}</div>}
    </div>
  );
}

// ─── Code block ─────────────────────────────────────────────────────────────

function Code({ children }: { children: string }) {
  return (
    <div style={{ position: "relative", background: "#0d0d0d", border: "1px solid #1a1a1a", padding: "12px 16px", marginTop: 8, marginBottom: 12 }}>
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <CopyBtn text={children.trim()} />
      </div>
      <pre style={{ fontSize: 11, color: "#ccc", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 }}>
        {children.trim()}
      </pre>
    </div>
  );
}

// ─── Table ──────────────────────────────────────────────────────────────────

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginTop: 8, marginBottom: 16 }}>
      <table style={{ minWidth: 400, width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #333", color: "#666", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid #1a1a1a", color: "#ccc", whiteSpace: j === 0 ? "nowrap" : undefined }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section heading ────────────────────────────────────────────────────────

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginTop: 48, marginBottom: 16, paddingTop: 16, borderTop: "1px solid #1a1a1a", scrollMarginTop: 80 }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: "#ccc", marginTop: 24, marginBottom: 8 }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 13, color: "#999", lineHeight: 1.7, marginBottom: 12 }}>{children}</p>;
}

// ─── FAQ item ───────────────────────────────────────────────────────────────

function FAQ({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #1a1a1a" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "none",
          border: "none",
          padding: "14px 0",
          cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: "#ccc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{q}</span>
        <span style={{ color: "#666", fontSize: 16, flexShrink: 0, marginLeft: 12 }}>{open ? "\u2212" : "+"}</span>
      </button>
      {open && <div style={{ paddingBottom: 14, fontSize: 12, color: "#888", lineHeight: 1.7 }}>{children}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DOCS PAGE
// ═════════════════════════════════════════════════════════════════════════════

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        fontFamily: "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
      }}
    >
      <div className="flex flex-col lg:flex-row" style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* ── Desktop Sidebar ──────────────────────────────────── */}
        <nav
          className="hidden lg:block"
          style={{
            width: 200,
            flexShrink: 0,
            position: "sticky",
            top: 72,
            height: "calc(100vh - 72px)",
            overflowY: "auto",
            padding: "32px 0 32px 16px",
            borderRight: "1px solid #1a1a1a",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: "#666", letterSpacing: "0.1em", marginBottom: 16, textTransform: "uppercase" }}>
            Documentation
          </div>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                display: "block",
                fontSize: 12,
                padding: "6px 12px",
                color: activeSection === s.id ? "#00ff41" : "#666",
                borderLeft: activeSection === s.id ? "2px solid #00ff41" : "2px solid transparent",
                textDecoration: "none",
                transition: "color 0.15s",
                marginBottom: 2,
              }}
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── Mobile nav selector ──────────────────────────────── */}
        <div
          className="lg:hidden"
          style={{
            position: "sticky",
            top: 56,
            zIndex: 20,
            background: "#0a0a0a",
            borderBottom: "1px solid #1a1a1a",
            padding: "8px 16px",
          }}
        >
          <select
            value={activeSection}
            onChange={(e) => {
              const el = document.getElementById(e.target.value);
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            style={{
              width: "100%",
              background: "#111",
              color: "#ccc",
              border: "1px solid #333",
              padding: "8px 12px",
              fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              outline: "none",
            }}
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Content ──────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 px-4 md:px-8 pt-8 pb-20">
          <div style={{ maxWidth: 760, margin: "0 auto" }}>

            {/* ════════════ OVERVIEW ════════════ */}
            <H2 id="overview">Overview</H2>
            <P>
              Kronos is an on-chain perpetual futures DEX for luxury watches. Built on Solana using
              the Anchor framework, it offers 24 markets letting traders go long or short on iconic
              watch references, precious metals, and the WL500 watch index with up to 10x leverage.
              Prices are pushed on-chain by the Kronos keeper.
            </P>
            <P>Live on Solana Devnet with test USDC — no real money is involved.</P>

            {/* ════════════ MARKETS ════════════ */}
            <H2 id="markets">Current Markets</H2>
            <Table
              headers={["Market", "Asset", "Category", "Live"]}
              rows={[
                ["WL500-PERP", "WL500 Index \u00b7 Top 500 Luxury Watches", "Index", "Yes"],
                ["GOLD-PERP", "Gold \u00b7 XAU/USD Troy Oz", "Commodity", "Yes"],
                ["SILVER-PERP", "Silver \u00b7 XAG/USD Troy Oz", "Commodity", "Yes"],
                ["PLATINUM-PERP", "Platinum \u00b7 XPT/USD Troy Oz", "Commodity", "Yes"],
                ["DIAMOND-PERP", "Diamond \u00b7 1ct Round Brilliant", "Commodity", "Yes"],
                ["ROLEX-SUB-PERP", "Rolex Submariner 126610LN", "Watch", "Yes"],
                ["PATEK-NAUTILUS-PERP", "Patek Philippe Nautilus 5711/1A", "Watch", "Yes"],
                ["AP-ROYAL-OAK-PERP", "AP Royal Oak 15500ST", "Watch", "Yes"],
                ["OMEGA-SPEEDY-PERP", "Omega Speedmaster Professional", "Watch", "Yes"],
                ["CARTIER-SANTOS-PERP", "Cartier Santos WSSA0018", "Watch", "Yes"],
                ["RM-11-PERP", "Richard Mille RM 11-03", "Watch", "Yes"],
                ["VC-OVERSEAS-PERP", "Vacheron Constantin Overseas", "Watch", "Yes"],
                ["IWC-PILOT-PERP", "IWC Big Pilot IW501001", "Watch", "Yes"],
                ["TAG-CARRERA-PERP", "TAG Heuer Carrera", "Watch", "Yes"],
                ["ROLEX-DAYTONA-PERP", "Rolex Daytona 116500LN", "Watch", "Yes"],
                ["PP-ANNUAL-PERP", "Patek Philippe Annual Calendar", "Watch", "Yes"],
                ["AP-OFFSHORE-PERP", "AP Royal Oak Offshore", "Watch", "Yes"],
                ["OMEGA-SEAMASTER-PERP", "Omega Seamaster Diver 300M", "Watch", "Yes"],
                ["CARTIER-TANK-PERP", "Cartier Tank Must", "Watch", "Yes"],
                ["HUBLOT-BB-PERP", "Hublot Big Bang", "Watch", "Yes"],
                ["JLC-REVERSO-PERP", "Jaeger-LeCoultre Reverso", "Watch", "Yes"],
                ["PANERAI-LUM-PERP", "Panerai Luminor Marina", "Watch", "Yes"],
                ["BREITLING-NAV-PERP", "Breitling Navitimer", "Watch", "Yes"],
                ["ROLEX-GMT-PERP", "Rolex GMT-Master II 126710BLNR", "Watch", "Yes"],
              ]}
            />

            <H3>Network</H3>
            <P>Solana Devnet. All addresses are devnet PDAs derived from the program.</P>

            {/* ════════════ GETTING STARTED ════════════ */}
            <H2 id="getting-started">Getting Started</H2>
            <H3>1. Visit the app</H3>
            <P>Go to <a href="https://kronosliquid.xyz" style={{ color: "#00ff41" }}>kronosliquid.xyz</a>.</P>

            <H3>2. Create an account</H3>
            <P>
              Click &ldquo;Start Trading&rdquo; on the landing page. You can create an account with email and password,
              or continue as a guest with no account.
            </P>

            <H3>3. Session Wallet</H3>
            <P>
              No browser wallet extension (Phantom, Solflare) is required. Kronos automatically generates a
              Solana keypair stored in your browser&rsquo;s localStorage. This &ldquo;session wallet&rdquo; signs
              all transactions locally. If you create an account, your encrypted private key is stored server-side
              for email recovery (AES-256-GCM encryption).
            </P>

            <H3>4. Deposit Collateral</H3>
            <P>
              Click &ldquo;DEPOSIT/WITHDRAW&rdquo; and deposit USDC into your margin account. Your margin account
              is a PDA derived from your wallet address with the seed <code>margin</code>.
            </P>

            <H3>5. Open a Position</H3>
            <P>
              Select a market, choose Long or Short, set your collateral amount and leverage (1-10x),
              optionally set Stop Loss and Take Profit prices, then click to open your position.
            </P>

            <H3>6. Password Reset</H3>
            <P>
              If you forget your password, click &ldquo;Forgot password?&rdquo; on the login screen. Enter your email
              and you&rsquo;ll receive a reset link via email. The link expires in 1 hour and is single-use.
            </P>

            {/* ════════════ TRADING ════════════ */}
            <H2 id="trading">Trading</H2>

            <H3>Opening a Position</H3>
            <P>The <code>open_position</code> instruction accepts:</P>
            <Table
              headers={["Parameter", "Type", "Description"]}
              rows={[
                ["direction", "Long | Short", "Trade direction"],
                ["collateral", "u64", "USDC collateral amount (6 decimals, e.g. 10_000_000 = $10)"],
                ["leverage", "u8", "Leverage multiplier (1\u201325)"],
                ["sl_price", "Option<u64>", "Optional stop-loss price (6 decimal scale)"],
                ["tp_price", "Option<u64>", "Optional take-profit price (6 decimal scale)"],
              ]}
            />
            <P>
              Notional value = collateral \u00D7 leverage. A 2% fee (200 bps) is deducted from collateral on open.
              The position is stored in your MarginAccount which supports up to 5 simultaneous positions.
            </P>

            <H3>Order Types</H3>
            <P>
              Currently only <strong>Market orders</strong> are supported on-chain. The frontend also shows
              Limit and Stop order UI, but these are executed as market orders when the price condition is met
              by the keeper.
            </P>

            <H3>Closing a Position</H3>
            <P>
              Call <code>close_position</code> with the position slot index (0\u20134). PnL is calculated as:
            </P>
            <Code>{`Long PnL  = notional * (exit_price - entry_price) / entry_price
Short PnL = notional * (entry_price - exit_price) / entry_price`}</Code>
            <P>
              A 2% close fee is deducted. Profit is capped at the profit cap (500%, or 50,000 bps).
              The settlement amount (collateral + PnL - fees) is transferred from/to the fee vault.
              There is no collateral cap per position — size is only bounded by the per-market OI limit.
            </P>

            <H3>FIFO Payout Queue</H3>
            <P>
              If a winning trade exceeds the LP vault&apos;s available balance, the trader still closes their position.
              They receive whatever USDC the LP vault can cover immediately, and the remaining amount is logged on-chain
              as a shortfall. A permissionless <code>process_payouts</code> instruction processes the queue in FIFO order
              as fees and liquidations replenish the LP vault. Traders always get paid — the only variable is timing.
            </P>

            <H3>Stop Loss / Take Profit</H3>
            <P>
              Set SL/TP on any open position via <code>set_sl_tp</code>. The keeper monitors prices and
              calls <code>execute_sl_tp</code> permissionlessly when conditions are met. The executor
              receives a <strong>0.1% reward</strong> (10 bps of position collateral) for executing the order.
            </P>

            <H3>Multiple Positions</H3>
            <P>
              Each MarginAccount supports up to <strong>5 simultaneous positions</strong> across any market.
              Positions are stored in a fixed-size array. MarginAccount size = 546 bytes.
            </P>

            {/* ════════════ FEES ════════════ */}
            <H2 id="fees">Fees &amp; Costs</H2>

            <Table
              headers={["Fee", "Rate", "Notes"]}
              rows={[
                ["Open Fee", "2% (200 bps)", "Deducted from collateral when opening"],
                ["Close Fee", "2% (200 bps)", "Deducted from settlement when closing"],
                ["Profit Cap", "500% (50,000 bps)", "Max profit per position"],
                ["Min Position Size", "$1.00 (1,000,000 raw)", "Minimum collateral"],
              ]}
            />

            <H3>Trading Fee Distribution</H3>
            <P>Trading fees collected on open and close are distributed:</P>
            <Table
              headers={["Destination", "Share", "Description"]}
              rows={[
                ["LP Pool", "50% (5,000 bps)", "Distributed to liquidity providers"],
                ["Insurance Fund", "25% (2,500 bps)", "Bad debt coverage"],
                ["Platform", "25%", "Protocol revenue (stays in fee vault)"],
              ]}
            />

            <H3>Funding Rate</H3>
            <P>
              Funding is calculated per-second and settled by the keeper via <code>settle_funding</code> (permissionless crank). Funding accrues continuously based on elapsed seconds, not in discrete hourly increments.
              Only the <strong>majority side</strong> pays funding — the minority side pays nothing.
              The funding rate has two components:
            </P>
            <Code>{`Base Rate:  30 / 100,000 per hour = 0.03%/hr = 0.72%/day
Skew Rate: skew_factor * (long_OI - short_OI) / (long_OI + short_OI)
           where skew_factor = 1,000 / 100,000 = 1%

Majority side pays: base_rate + skew_rate (per hour)
Minority side pays: 0 (benefits from being on the less crowded side)`}</Code>

            <H3>Funding Fee Distribution</H3>
            <P>Funding fees collected from the majority side are distributed:</P>
            <Table
              headers={["Destination", "Share", "Description"]}
              rows={[
                ["LP Pool", "70% (7,000 bps)", "Distributed to liquidity providers"],
                ["Insurance Fund", "20% (2,000 bps)", "Bad debt coverage"],
                ["Platform", "10%", "Protocol revenue (stays in fee vault)"],
              ]}
            />

            {/* ════════════ RISK ════════════ */}
            <H2 id="risk">Risk Management</H2>

            <H3>Liquidation</H3>
            <P>
              A position is liquidatable when its margin ratio falls below <strong>5% (500 bps)</strong>.
            </P>
            <Code>{`Margin Ratio = (collateral + unrealized_PnL) / notional

Liquidation Price (Long):
  entry_price * (1 - (collateral - notional * 0.05) / notional)

Liquidation Price (Short):
  entry_price * (1 + (collateral - notional * 0.05) / notional)`}</Code>
            <P>
              Liquidation is <strong>permissionless</strong> — anyone can call <code>liquidate</code>.
              The keeper checks every 10 seconds and liquidates undercollateralized positions.
            </P>

            <H3>Liquidation Distribution</H3>
            <Table
              headers={["Recipient", "Share", "Description"]}
              rows={[
                ["Liquidator", "2% (200 bps)", "Reward for calling liquidate"],
                ["LP Pool", "44% (4,400 bps)", "Distributed to liquidity providers"],
                ["Insurance Fund", "44% (4,400 bps)", "Bad debt reserve"],
                ["Platform", "10%", "Protocol revenue (stays in fee vault)"],
              ]}
            />

            <H3>Add / Remove Margin</H3>
            <P>
              Use <code>add_margin</code> to move free collateral into a position (lowering liquidation price).
              Use <code>remove_margin</code> to withdraw margin back to free collateral (health-checked — cannot
              reduce margin ratio below the liquidation threshold).
            </P>

            {/* ════════════ ORACLE ════════════ */}
            <H2 id="oracle">Oracle</H2>

            <H3>Price Source</H3>
            <P>
              Prices are pushed by the Kronos keeper (<code>keeper/watch-keeper.js</code>). On devnet
              the feed is <strong>live</strong>: metals (gold, silver, platinum) from Yahoo Finance
              spot/futures; luxury watches and diamond from curated USD reference mids in
              <code>keeper/feeds.json</code> (Chrono24 / WatchCharts-style). WL500 is the scaled
              equal-weight basket of those watch refs. Each on-chain update ramps at most ±15% toward
              the target so the protocol&rsquo;s ~20% deviation guard never freezes the oracle.
            </P>
            <P>
              Each market has its own oracle PDA. See the Protocol section below for key addresses.
              All oracle PDAs are derived from seeds <code>[&quot;oracle&quot;, market_id]</code>.
            </P>

            <H3>Update Frequency</H3>
            <P>
              The keeper pushes updates roughly every <strong>6.5 seconds</strong> per market (the
              on-chain minimum interval is 5 seconds). Each market has its own on-chain oracle account
              (PDA seeded with <code>[&quot;oracle&quot;, market_id]</code>).
            </P>

            <H3>Deviation Guard</H3>
            <P>
              The program rejects any single oracle update that moves the price more than ~20% from
              the previous value; the keeper additionally clamps its own updates to &plusmn;15% per push.
              Large intentional re-pricings converge over several updates instead of jumping at once.
            </P>

            <H3>Staleness Protection</H3>
            <P>
              On-chain, the oracle has a <strong>staleness threshold of 30 minutes</strong> (1,800 seconds).
              Anyone can call <code>check_and_pause</code> (permissionless) to automatically
              pause the protocol if the oracle is stale beyond the <strong>auto-pause threshold of 1 hour</strong>.
            </P>

            <H3>Secondary Authority</H3>
            <P>
              The oracle accepts updates from either the admin wallet or a secondary authority keypair.
              The keeper automatically fails over to the secondary keypair after 3 consecutive primary failures,
              and sends Telegram alerts when failover occurs.
            </P>

            {/* ════════════ LP ════════════ */}
            <H2 id="lp">Liquidity Pool</H2>

            <H3>How It Works</H3>
            <P>
              Liquidity providers deposit USDC into the pool via <code>lp_deposit</code> and receive LP shares.
              Shares represent proportional ownership of the pool. The share price = total_usdc / total_shares.
            </P>

            <H3>Earning Fees</H3>
            <P>
              LPs earn fees from three sources:
            </P>
            <Table
              headers={["Source", "LP Share", "Description"]}
              rows={[
                ["Trading Fees", "50%", "From position open and close fees"],
                ["Funding Fees", "70%", "From majority-side funding payments"],
                ["Liquidations", "44%", "From liquidated position collateral"],
              ]}
            />
            <P>
              All LP fees accumulate in the fee vault and are claimable proportionally via <code>claim_fees</code> at any time.
            </P>

            <H3>Withdrawing</H3>
            <P>
              Call <code>lp_withdraw</code> with the number of shares to burn. USDC is returned proportionally.
              There is no lockup period — withdraw anytime.
            </P>

            {/* ════════════ REFERRAL ════════════ */}
            <H2 id="referral">Referral Program</H2>
            <P>
              Kronos has an on-chain referral system. Register a unique username, share your referral link,
              and earn a percentage of trading fees from users who sign up through your link.
            </P>
            <H3>How It Works</H3>
            <P>
              1. Go to the Referral page and register a username (stored on-chain as a ReferralAccount PDA).
            </P>
            <P>
              2. Share your link: kronosliquid.xyz/ref/your-username
            </P>
            <P>
              3. When someone signs up through your link, their trades attribute fees to your referral account.
            </P>
            <P>
              4. Claim accumulated referral fees anytime from the Referral page.
            </P>

            {/* ════════════ PROTOCOL ════════════ */}
            <H2 id="protocol">Protocol</H2>

            <H3>Program Details</H3>
            <Table
              headers={["Property", "Value"]}
              rows={[
                ["Program ID", "HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP"],
                ["Network", "Solana Devnet"],
                ["Framework", "Anchor 1.0.2"],
                ["Frontend", "kronosliquid.xyz"],
              ]}
            />

            <H3>Deployed Addresses</H3>
            <Addr label="Program" address="HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP" desc="Kronos program (devnet, non-upgradeable)" />
            <Addr label="ProtocolState" address="HzpzGHZRTDFrQ7GbEAx1SrCzUq7ykWvF4baBH7z69tcg" desc="Global protocol configuration PDA" />
            <Addr label="Oracle (WL500)" address="GF1JfkbgH9EcZXC55DZgxZgEkBBsjk1K9YasTeXsUFaB" desc="WL500-PERP price feed" />
            <Addr label="Oracle (Rolex Sub)" address="GR6QD45YKdgbQxVjzpigN22NsQqDd2TPxjsqoCiw9feJ" desc="ROLEX-SUB-PERP price feed" />
            <Addr label="Fee Vault" address="F4wfXD5yNULQy7tdMwVtNag4XZSQBHSdSACxn7TrmCmr" desc="Protocol revenue vault" />
            <Addr label="Insurance Fund" address="5gS3Q9us8yptZ8cbQoQexqAc1ToC2skchRJMefCRZvfn" desc="Bad debt coverage fund" />
            <Addr label="Liquidity Pool" address="FZ2vSRqk7bq2YWbSwAcAFDDudQxCs6etDNG448kx16DJ" desc="LP pool state" />
            <Addr label="USDC Mint" address="3zsAG5W1sqNb9KdAGEceptZTuHGCWGSLCK8nUv4iPQn9" desc="Test USDC mint (devnet PDA)" />
            <P>
              Per-market oracle addresses for all 24 markets live in{" "}
              <code>app/src/lib/markets.bootstrap.json</code>.
            </P>

            <H3>All Instructions</H3>
            <Table
              headers={["Instruction", "Auth", "Description"]}
              rows={[
                ["initialize", "Admin", "One-time protocol setup, creates all PDAs"],
                ["initialize_pool", "Admin", "One-time LP pool setup"],
                ["deposit_collateral", "User", "Deposit USDC into margin account"],
                ["withdraw_collateral", "User", "Withdraw free collateral"],
                ["close_margin_account", "User", "Close margin account, return rent"],
                ["realloc_margin", "User", "Resize margin account (migration helper)"],
                ["open_position", "User", "Open a leveraged perpetual position"],
                ["close_position", "User", "Close a position, settle PnL"],
                ["add_margin", "User", "Add collateral to an open position"],
                ["remove_margin", "User", "Remove margin (health-checked)"],
                ["set_sl_tp", "User", "Set stop-loss / take-profit prices"],
                ["execute_sl_tp", "Permissionless", "Execute triggered SL/TP orders"],
                ["liquidate", "Permissionless", "Liquidate undercollateralized position"],
                ["settle_funding", "Permissionless", "Settle accrued funding on all positions (seconds-based)"],
                ["check_and_pause", "Permissionless", "Pause protocol if oracle stale > 1hr"],
                ["lp_deposit", "User", "Deposit USDC into LP pool for shares"],
                ["lp_withdraw", "User", "Burn shares to withdraw USDC"],
                ["claim_fees", "User", "Claim accumulated LP fee share"],
                ["update_oracle", "Admin/Secondary", "Push price to default oracle"],
                ["init_market_oracle", "Admin", "Create a market-specific oracle PDA"],
                ["init_market_state", "Admin", "Create per-market OI tracking state"],
                ["update_market_oracle", "Admin/Secondary", "Push price to market oracle"],
                ["update_params", "Admin", "Update protocol parameters"],
                ["withdraw_fees", "Admin", "Withdraw from fee vault"],
                ["withdraw_insurance", "Admin", "Withdraw from insurance fund"],
                ["register_referral", "User", "Register a referral username (on-chain)"],
                ["claim_referral", "User", "Claim accumulated referral fees"],
              ]}
            />

            {/* ════════════ API ════════════ */}
            <H2 id="api">API Reference</H2>
            <P>
              The keeper exposes an HTTP API on port 3001. On the frontend, endpoints are proxied
              via Next.js rewrites at <code>/api/keeper/*</code>.
            </P>

            <H3>GET /ping</H3>
            <P>Health check. Returns <code>{`{"ok":true,"timestamp":...}`}</code></P>

            <H3>GET /health</H3>
            <P>Comprehensive system health including oracle status, liquidation stats, funding stats, Solana RPC health, and per-market oracle data.</P>

            <H3>GET /prices</H3>
            <P>Historical price data for charting.</P>
            <Table
              headers={["Param", "Type", "Default", "Description"]}
              rows={[
                ["market", "string", "\u2014", "Market ID (e.g. ROLEX-SUB-PERP, GOLD-PERP, WL500-PERP)"],
                ["limit", "number", "\u2014", "Number of rows returned (most recent)"],
                ["from", "number", "\u2014", "Unix timestamp range start"],
                ["to", "number", "\u2014", "Unix timestamp range end"],
              ]}
            />
            <Code>{`Response: [
  { "timestamp": 1717401600, "ewma": 14405.2, "price": 14405.2 },
  ...
]`}</Code>

            <H3>GET /candles</H3>
            <P>OHLC candle data aggregated from 30-second price records. Used for charting.</P>
            <Table
              headers={["Param", "Type", "Default", "Description"]}
              rows={[
                ["market", "string", "\u2014", "Market ID (e.g. ROLEX-SUB-PERP, GOLD-PERP)"],
                ["resolution", "string", "1h", "Candle resolution: 1m, 5m, 15m, 1h, 4h, 1d"],
              ]}
            />
            <Code>{`Response: [
  { "timestamp": 1717401600, "open": 14401.5, "high": 14420.0, "low": 14390.8, "close": 14411.9 },
  ...
]`}</Code>

            <H3>GET /trades/recent</H3>
            <P>Recent trades across all users.</P>
            <Table
              headers={["Param", "Type", "Default", "Description"]}
              rows={[
                ["limit", "number", "50", "Number of trades (max 200)"],
              ]}
            />
            <Code>{`Response: {
  "trades": [
    { "id": 1, "timestamp": ..., "user_pubkey": "...", "direction": "long", "notional": 100, "entry_price": 156.19, ... },
    ...
  ]
}`}</Code>

            <H3>GET /trades</H3>
            <P>Trades for a specific user. Requires <code>user</code> parameter.</P>

            <H3>GET /stats</H3>
            <P>Protocol statistics (24h/7d volume, trades, liquidations, fees, unique traders).</P>

            {/* ════════════ FAQ ════════════ */}
            <H2 id="faq">FAQ</H2>

            <FAQ q="Do I need a crypto wallet extension?">
              No. Kronos generates a session wallet automatically in your browser. No Phantom,
              Solflare, or any extension required. Your keypair is stored in localStorage and optionally
              backed up via email for recovery.
            </FAQ>

            <FAQ q="Is this real money?">
              No. Kronos runs on Solana Devnet with test USDC. Nothing you deposit or trade has
              real-world value.
            </FAQ>

            <FAQ q="What happens if I close my browser?">
              Your session wallet keypair persists in localStorage. When you return, your wallet reconnects
              automatically. If you created an account with email/password, you can recover your wallet on
              any device by logging in.
            </FAQ>

            <FAQ q="How do I reset my password?">
              Click &ldquo;Forgot password?&rdquo; on the login screen, enter your email, and check your
              inbox for a reset link. The link expires in 1 hour.
            </FAQ>

            <FAQ q="Can I get liquidated?">
              Yes. If your margin ratio drops below 5%, your position can be liquidated by anyone (the keeper
              checks every 10 seconds). You lose your remaining collateral. Set a stop-loss to protect yourself.
            </FAQ>

            <FAQ q="How is the price determined?">
              On devnet, metals track Yahoo spot/futures and watches track curated reference mids in
              keeper/feeds.json. The keeper pushes updates every ~6.5 seconds, ramping toward each
              market&rsquo;s target at ≤15% per tick. Edit feeds.json (and restart the keeper) to refresh
              watch mids; metals refresh automatically every few minutes.
            </FAQ>

            <FAQ q="What is the profit cap?">
              Maximum profit per position is 500% (50,000 bps) of your collateral. For example, with $10
              collateral, max profit is $50.
            </FAQ>

            <FAQ q="Can I provide liquidity?">
              Yes. Go to the Pool page to deposit USDC. You receive LP shares and earn fees from trading (50%),
              funding (70%), and liquidations (44%) proportional to your share. No lockup period.
              <br /><br />
              <strong>Risk disclosure:</strong> LPs are the counterparty to all trades. If traders collectively profit,
              LP deposits decrease. The pool has a utilization cap that prevents withdrawals from dropping below the
              total user collateral, but directional risk remains. LP returns depend on trading fees exceeding
              trader profits over time.
            </FAQ>


          </div>
        </main>
      </div>
    </div>
  );
}
