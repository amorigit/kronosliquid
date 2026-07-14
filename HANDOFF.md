# Kronos — Build & Deploy Handoff

**Document version:** 4.6
**Date:** 2026-07-14
**Status:** **Full DEVnet product** (test SOL only — not mainnet). Program `HEZg…ziP` live with
24 markets. Public Next.js app + price keeper + **crank keeper** (funding/liq/SL-TP) on Mac mini
via Cloudflare tunnels. Users mint test USDC in-app. Mainnet keypair `6pYT…` kept in
`keys/mainnet/` for later; live stack stays on DEVnet.

> This supersedes v3.0 (local-validator only). The original code-review plan is preserved at
> [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) (Tier 1/2 Rust fix list + QA checklist).

---

## 0. KNOWN ISSUES (as of 2026-07-14 v4.4, ordered by severity)

All P0/P1 items from v4.1 are **RESOLVED** — details in §0.1 below. What remains:

### P2 — Helius API key is still in public git history

Commit `67d0ea6` hardcoded the Helius devnet key in `keeper/watch-keeper.js`. The code no
longer contains it (env-only via `keeper/.env`, gitignored), but the key remains visible in
the public repo's history. **User decision 2026-07-02: keep the key** (free-tier devnet, low
stakes). Rotate at helius.dev if it ever gets abused.

### P2 — Trade indexer limitations (from v4.3)

`keeper/trade-indexer.js` indexes `PositionOpened` / `PositionClosed` / `PositionLiquidated`
events from program logs. `/trades`, `/stats`, and `/leaderboard` return real data when devnet
trades exist. Limitations: no `position_index` in events (always 0); liquidated direction
unknown; backfill capped at `INDEXER_BACKFILL_SIGS` (default 300); `/spins` still stubbed.

### P2 — CLI faucet cannot top up toward TARGET_SOL=100

Airdrop cron runs every 3 hours (`30 */3 * * *`, target 100 SOL) but CLI airdrops have failed
continuously since ~2026-06-30 (rate limit + intermittent DNS/RPC). Wallet sits at
**~5.35 SOL** as of 2026-07-14. Use [faucet.solana.com](https://faucet.solana.com) for large
top-ups; cron will keep trying.

### P3 — WL500 methodology undefined

WL500 was re-seeded from ~$47,600 down to **$5,000** (ramped ≤15%/update; user decision
2026-07-02). There is still no constituent list or index formula — the level is arbitrary.

### P3 — Misc

- History retention is 48 h at 30 s granularity (in-memory + `keeper/history.json`); 1d candles
  only become meaningful after a couple of days of uptime.
- GitHub Pages has `https_enforced: false` (site also serves over plain HTTP).
- Next.js app auth APIs (signup/login) need Postgres + JWT env vars that don't exist locally —
  email auth fails; guest/wallet mode works. App is local-only by decision (2026-07-02).
- Devnet wallet balance ~5.35 SOL (keeper burn ≈ 0.02–0.05 SOL/day — fine for months).

### 0.1 Resolved in v4.2 (2026-07-02)

- **P0 oracle-deviation freeze** — keeper rewritten: no more Yahoo spot; all markets random-walk
  from their current on-chain price, every update clamped to ±15% (< the ~20% on-chain cap), and
  failed batches fall back to per-market transactions. All 24/24 markets push cleanly.
- **P1 old Pokémon server dependency** — `app/vercel.json` rewrites to `157.180.67.25:3001`
  removed (server is not ours; decision 2026-07-02). The app now proxies `/api/keeper/*` and
  `/api/v1/*` to the **local keeper API** (`localhost:3001`) via `app/next.config.js` rewrites.
- **P1 hardcoded Helius key** — stripped from code; RPC comes from `keeper/.env` only.
- **P2 Pokémon sweep** — docs, api-docs, terms, ref, TradeHistory, NotificationProvider,
  positions, useOracle, markets.ts all rewritten for watch markets; leftover card datasets and
  ~26 legacy Pokémon-era scripts deleted (incl. old `keeper/keeper.js`).
- **P2 keeper persistence** — runs under pm2 (`kronos-keeper`), auto-restart on crash,
  process list saved.
- **Latent PDA bug** — `open_position`/`close_position` derived `MarketState` PDAs from the short
  display id (e.g. `"WL500"`) instead of the on-chain market_id (`"WL500-PERP"`); trading on any
  non-default market would have failed. Fixed to use `priceApiMarket` everywhere.

---

## 1. What this repo is now

`watch-liquid` is a **monorepo** containing two things:

1. **Static marketing/demo site** (root `index.html`, `script.js`, `pool.html`, `stats.html`,
   `leaderboard.html`, `docs.html`, `styles.css`) — the live site deployed to
   **kronosliquid.xyz** via GitHub Pages (repo `github.com/amorigit/kronosliquid`).
2. **On-chain protocol stack** vendored from an upstream Anchor perpetual-futures program and
   fully rebranded to **Kronos**:
   - `programs/kronos/` — Anchor program (Rust)
   - `sdk/` — TypeScript client
   - `keeper/` — price keeper / oracle pusher
   - `app/` — Next.js frontend (watch catalog pointed at chain; Pokémon pages/datasets removed)
   - `scripts/`, `tests/`, `migrations/`

The static site is now wired to chain for **read-only live prices** via `chain.js` (polls the
validator's oracle PDAs every 10 s; falls back to demo prices if no RPC is reachable).

---

## 2. Current on-chain state (DEVNET)

Everything below is live on **Solana devnet** (`https://api.devnet.solana.com`).
Deployed 2026-06-30 using `--use-quic` from a buffer account.

| Item | Value |
|------|-------|
| **Program ID** | `HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP` |
| **Deploy mode** | Non-upgradeable (`--final`) |
| **Admin / upgrade authority** | `7H5bvtD9w7Kr9AueZawQkDSBg5KyBxwh2xPojRgAx2xX` (`~/.config/solana/id.json`) |
| **ProtocolState PDA** | `HzpzGHZRTDFrQ7GbEAx1SrCzUq7ykWvF4baBH7z69tcg` |
| **Oracle PDA** | `F4kK3Rim3a2ikcqxAasBCr9xtnwVbbP9tDHqFUggUQdw` |
| **USDC Mint PDA** | `3zsAG5W1sqNb9KdAGEceptZTuHGCWGSLCK8nUv4iPQn9` |
| **FeeVault PDA** | `F4wfXD5yNULQy7tdMwVtNag4XZSQBHSdSACxn7TrmCmr` |
| **InsuranceFund PDA** | `5gS3Q9us8yptZ8cbQoQexqAc1ToC2skchRJMefCRZvfn` |
| **LiquidityPool PDA** | `FZ2vSRqk7bq2YWbSwAcAFDDudQxCs6etDNG448kx16DJ` |
| **RPC** | `https://api.devnet.solana.com` |

**Bootstrapped:** `initialize` (protocol + oracle + vaults), `update_oracle`, `initialize_pool`,
and **24 watch markets** — each with `init_market_oracle` (seeded price) + `init_market_state`
(100k USDC max OI/side). Market PDAs + oracle addresses are written to
`app/src/lib/markets.bootstrap.json` (the source of truth consumed by the UI generators).

> **Note:** devnet state is permanent (not wiped on reset like local), but the network itself can
> be reset by Solana Labs. Back up `target/deploy/kronos-keypair.json` — it holds the private key
> for the program address.

> **Funded by:** devnet airdrop cron (`scripts/devnet-airdrop-cron.sh`) + manual `faucet.solana.com`
> top-ups. ~7 SOL used for non-upgradeable deploy. Airdrop cron still runs (`TARGET_SOL=100`).

Markets created (market_id → oracle): `WL500-PERP`, `GOLD-PERP`, `SILVER-PERP`, `PLATINUM-PERP`,
`DIAMOND-PERP`, `ROLEX-SUB-PERP`, `PATEK-NAUTILUS-PERP`, `AP-ROYAL-OAK-PERP`, `OMEGA-SPEEDY-PERP`,
`CARTIER-SANTOS-PERP`, `RM-11-PERP`, `VC-OVERSEAS-PERP`, `IWC-PILOT-PERP`, `TAG-CARRERA-PERP`,
`ROLEX-DAYTONA-PERP`, `PP-ANNUAL-PERP`, `AP-OFFSHORE-PERP`, `OMEGA-SEAMASTER-PERP`,
`CARTIER-TANK-PERP`, `HUBLOT-BB-PERP`, `JLC-REVERSO-PERP`, `PANERAI-LUM-PERP`, `BREITLING-NAV-PERP`,
`ROLEX-GMT-PERP` (full address map in `markets.bootstrap.json`).

---

## 3. Toolchain installed (this machine)

| Tool | Version | Notes |
|------|---------|-------|
| rustc | 1.89.0 | **pinned** by `rust-toolchain.toml`; Anchor's `avm` had to be installed from `~` where stable 1.96 is active |
| solana (Agave) | 4.0.1 | `~/.local/share/solana/install/active_release/bin` |
| anchor | 1.0.2 | via `avm`; matches `anchor-lang = "1.0.2"` |
| node | v26 | `/opt/homebrew/bin/node` |
| yarn | 1.22.22 | `Anchor.toml` sets `package_manager = "yarn"` |

JS deps are installed (`node_modules/` present, gitignored).

---

## 4. How to reproduce build → deploy → bootstrap

```bash
cd ~/Projects/watch-liquid

# 1. Build (produces target/deploy/kronos.so + target/idl/kronos.json)
anchor build

# 2. Start a local validator (separate terminal; keep running)
solana-test-validator --ledger /tmp/kronos-test-ledger --reset

# 3. Point CLI at it and fund the wallet (local SOL is free/unlimited)
solana config set --url localhost
solana airdrop 100

# 4. Deploy
anchor deploy --provider.cluster localnet

# 5. Bootstrap protocol (runs migrations/deploy.ts: initialize + set base oracle price)
anchor migrate --provider.cluster localnet

# 6. Bootstrap the liquidity pool + all 24 watch markets (idempotent)
ANCHOR_PROVIDER_URL=http://localhost:8899 \
ANCHOR_WALLET=$HOME/.config/solana/id.json \
yarn ts-node scripts/bootstrap-watch-markets.ts
# → writes app/src/lib/markets.bootstrap.json

# 7. Regenerate the app market catalog + refresh the IDL from the build
node scripts/gen-app-markets.js
cp target/idl/kronos.json app/src/lib/kronos.idl.json
```

To redeploy after a Rust change, the binary may now be larger than the on-chain slot — extend it
first: `solana program extend <PROGRAM_ID> 50000` then `anchor deploy --provider.cluster localnet`.

> **IMPORTANT (agent-only caveat):** inside the Cursor agent sandbox, `CARGO_TARGET_DIR` is
> redirected to a temp cache, so build artifacts land outside `./target`. The agent worked around
> this with `env -u CARGO_TARGET_DIR anchor build`. **In your own terminal this is NOT set**, so
> plain `anchor build` works and writes to `./target`.

---

## 5. Fixes applied to make it build

- **`programs/kronos/src/instructions/process_payouts.rs`** — the upstream `ProcessPayouts`
  accounts struct overflowed the BPF stack (frame 4416 B > 4096 B max). Fixed by `Box`-ing the
  `protocol_state`, `liquidity_pool`, `lp_vault`, and `user_token_account` fields (heap, not stack).
- **Program ID** — generated a fresh keypair (`target/deploy/kronos-keypair.json`) and synced it
  into `declare_id!` and `Anchor.toml` (replacing the original upstream mainnet/devnet IDs).
- Build emits 1 harmless warning (ambiguous glob re-export in `instructions.rs`).

### Tier 1 economic fixes (from the original review §7.1) — APPLIED

- **`constants.rs`** — added `MAX_LEVERAGE = 10` (docs promised 10x; code allowed 25x).
- **`open_position.rs`** — leverage cap now `<= MAX_LEVERAGE`; removed the dead/unused
  `post_fee_collateral` calc.
- **`liquidate.rs`** — liquidation threshold now uses `LIQUIDATION_THRESHOLD_BPS` (5%) via
  `equity*10_000 < notional*500` instead of the hardcoded 2% (`equity*50 < notional`).
- **`close_position.rs` / `settle_funding.rs`** — corrected funding-split comments to match the
  actual constants (70% LP / 20% insurance / 10% platform, not "30% LP").
- **`check_and_pause.rs`** — auto-pause now triggers at `>=` the staleness threshold (was `>`).

Program was rebuilt and **redeployed** to the local validator with these fixes (had to
`solana program extend` first, as the new binary is larger than the original slot).

---

## 6. Rebrand status — COMPLETE (v4.2)

All app pages, components, and scripts are Pokémon-free (verified by repo-wide sweep of
`app/src`, static site, and `scripts/`). Summary of what was done:

**Brand & config (done in v3.0):**
- All `pokeliquid` / `PokeLiquid` / `poke` → `kronos` / `Kronos` (246 files), files/dirs renamed.
- Config values → real: `kronosliquid.xyz`, `security@kronosliquid.xyz`, `github.com/amorigit/kronosliquid`.
- User-facing copy fully converted to luxury watch theme.

**Market catalog (done in v3.0):**
- 24 on-chain watch markets; `markets.ts` auto-generated from bootstrap manifest.

**App UI cleanup (done in v4.0 / 2026-07-01):**
- `LandingAuth.tsx` — Pokémon card fan replaced with Kronos logo; `PIKACHU_ORACLE` → Rolex Sub oracle;
  taglines updated.
- `BgMusic.tsx` — removed auto-play; music now only plays on explicit user click.
- `Header.tsx` — removed `/pl500`, `/rewards`, `/prize-pool` from nav.
- Deleted dead Pokémon-index routes: `sv151/`, `pl500/`, `ah-index/`, `pae-index/`, `pf-index/`,
  `dr-index/`, `pre-index/` (and their pages).
- Deleted Pokémon card datasets: `app/src/data/sv151-cards.json`, `pl500-cards.json`, `ah-cards.json`.
- `PnlExport.tsx` — replaced Pokémon `MARKET_LABELS` map with watch market IDs.
- `stats/page.tsx` — removed `tcgplayerId` / TCGPlayer source label; uses "Kronos Keeper" instead.

**Final sweep (done in v4.2 / 2026-07-02):**
- `docs/page.tsx` — watch market table, devnet addresses, keeper/oracle copy, devnet FAQ, 10x leverage.
- `api-docs/page.tsx` — watch market examples, new API response shapes, devnet program ID.
- `terms/page.tsx`, `ref/[username]/page.tsx` — luxury-watch copy.
- `TradeHistory.tsx` `MARKET_LABELS`, `NotificationProvider.tsx` alert copy,
  `positions/page.tsx` + `page.tsx` market-id fallbacks, `useOracle.ts` default market,
  `markets.ts` / `gen-app-markets.js` `tcgplayerId` field removed.
- Deleted: `app/src/data/{dr,pae,pf,pre}-cards.json`, old `keeper/keeper.js` (TCGPlayer/Playwright),
  and ~25 legacy scripts (`pl500-*`, `sv151*`, `init-etb-market`, `init-mainnet`, `e2e-test`,
  raffle tooling, old keeper patches). `keeper/README.md`, `package.json`, `.env.example` rewritten.

---

## 7. Path to a full Kronos deploy (ordered)

### Already done (devnet core)

- Program deployed + bootstrapped on **devnet** (24 markets, pool, vaults).
- Static site live at **kronosliquid.xyz** (GitHub Pages) with on-chain prices.
- Keeper v2 + history API + trade indexer under **pm2**.
- Pokémon sweep, PDA market-id fix, foreign-server detach.

### Phase A — local/devnet product surface — DONE (2026-07-14)

| # | Step | Status |
|---|------|--------|
| A1 | Keeper boot persistence (`com.kronos.pm2` LaunchAgent) | **DONE** |
| A2 | Push `main` to origin (`f69aac2` / earlier v4.3) | **DONE** |
| A3 | Fund wallet to 100 SOL | **BLOCKED** — CLI faucet rate-limited; use [faucet.solana.com](https://faucet.solana.com); balance ~5.35 SOL (enough for months of keeper) |
| A4 | Smoke-test Next.js + keeper API | **DONE** — `/`, `/wl500`, `/docs`, `/stats`, `/api/keeper/{ping,health,prices}` all 200 |
| A5 | WL500 methodology | **DONE** — `/wl500` page (19 watch constituents, equal weight, $5k level) |
| A6 | Tier 2 review pass | **DONE** — branding/config items confirmed; settlement refactor deferred to Phase C — see [`docs/TIER2-STATUS.md`](./docs/TIER2-STATUS.md) |

### Phase B — public app (devnet oracles) — DONE via Mac mini (no Vercel)

Vercel login was unavailable; hosting is **this Mac mini + Cloudflare quick tunnels**.

| # | Step | Status |
|---|------|--------|
| B1 | Public keeper/API | **DONE** — `kronos-keeper` + `kronos-api-tunnel` (pm2). URL in `keeper/public-api-url.txt` |
| B2 | Public Next.js app | **DONE** — `kronos-app` (`next start :3000`) + `kronos-app-tunnel`. **App URL:** see `app/public-app-url.txt` (current: `https://teaching-reducing-establish-thickness.trycloudflare.com`). Proxies `/api/keeper/*` → `127.0.0.1:3001` |
| B3 | Email auth (Postgres + JWT) | **DEFERRED** — guest / session-wallet / browser wallet work without DB. Signup/login APIs need Postgres env when you want email |
| B4 | Enforce HTTPS on kronosliquid.xyz Pages | **BLOCKED** — GitHub returns “certificate does not exist yet”; DNS A records point at Pages. Re-try `https_enforced` after GitHub provisions the cert, or wait/re-add custom domain in repo Settings → Pages |

**Ops notes (Phase B):**

```bash
pm2 status                          # kronos-keeper, kronos-api-tunnel, kronos-app, kronos-app-tunnel
cat app/public-app-url.txt          # current public trading UI
cat keeper/public-api-url.txt       # direct keeper API (optional)
# After code changes:
cd app && npm run build && pm2 restart kronos-app
pm2 save
```

**DEVnet full-feature (2026-07-14):** Mint test USDC in CollateralPanel; SwapModal redirects to mint; `kronos-crank` settles funding / tries liq+SL-TP; `/daily-volume` from trades indexer. App: `cat app/public-app-url.txt`.

**Mainnet** remains optional later (keypair `6pYTo53Br89ji26huJKRiTyaQCF8eeTpsSSZmsaMRPxy` in `keys/mainnet/`). Run `./scripts/prepare-mainnet-check.sh` before C1+.

**2026-07-14 follow-up:** mainnet preflight script added (`scripts/prepare-mainnet-check.sh` — 8 pass / 2 warn). Pages HTTPS still blocked (no cert yet). Public app still serving via Cloudflare tunnel.

Do these **in order**. Devnet program is `--final` and **cannot** be reused.

| # | Step | Detail |
|---|------|--------|
| **C0** | Go / no-go | Confirm legal/risk disclosure, insurance funding plan, and that Tier 2 settlement dedup (`docs/TIER2-STATUS.md` deferred items) is scheduled or accepted as residual risk |
| **C1** | New program keypair | `solana-keygen new -o target/deploy/kronos-keypair.json --force` → `anchor keys sync` → update `declare_id!`, `Anchor.toml` `[programs.mainnet]`, app env defaults |
| **C2** | Build & size check | `anchor build`; note `.so` size; plan `solana program extend` if upgrading later (prefer `--final` only after bake-in) |
| **C3** | Fund deploy wallet | Real SOL on mainnet (non-upgradeable ~same order as devnet ~7+ SOL plus buffer for bootstrap txs) |
| **C4** | Deploy | Prefer **upgradeable** first for bake-in, or `--final --use-quic` if you accept redeploy-on-bug. Cluster `mainnet-beta`, paid RPC recommended |
| **C5** | Collateral mint | Point protocol at **real USDC** (`EPjFWdd5…Dt1v`), not the devnet test mint |
| **C6** | Bootstrap | `initialize` → `initialize_pool` → `bootstrap-watch-markets.ts` with mainnet RPC/wallet; write new `markets.bootstrap.json`; `node scripts/gen-app-markets.js`; copy IDL |
| **C7** | Real oracle feeds | Replace random walk: Chrono24/WatchCharts (or paid API) for watches; Yahoo/other for metals; keep ±15% ramp + per-market isolation |
| **C8** | Keeper hosting | Move keeper off the Mac mini to a VPS; named Cloudflare tunnel or public HTTPS; pm2/systemd; alerts (Telegram already stubbed) |
| **C9** | App cutover | Point production app env at mainnet program/PDAs/RPC; stable domain (`app.kronosliquid.xyz`); turn on HTTPS everywhere |
| **C10** | Auth (optional) | Provision Postgres + `JWT_SECRET` + mailer if email accounts are required |
| **C11** | Safety nets | Insurance fund capitalization; admin runbooks; liquidation/funding keeper jobs verified on mainnet; rate limits / admin key hygiene |
| **C12** | Soft launch | Caps on max OI / deposit; small allowlist or low limits; monitor for 1–2 weeks before removing caps |

**Rough cost/time (indicative):** C1–C6 a focused day once funded; C7–C8 several days (data + hosting); C9–C12 product/ops.
---

## 8. Devnet deploy — DONE (2026-06-30)

The program was deployed to devnet non-upgradeably (`--final`) using `--use-quic` to bypass RPC
write-transaction rate limits. Key facts:

- **Cost:** ~7.09 SOL (non-upgradeable). Program size: ~1.0 MB.
- **Transport:** `solana program deploy --use-quic` sends transactions directly to validator TPUs,
  bypassing the public RPC's rate-limit bottleneck.
- **Funding:** CLI faucet is IP-rate-limited (~2 SOL/request). Used
  [faucet.solana.com](https://faucet.solana.com) (GitHub login, ~10 SOL/day) + secondary wallets.
- **Airdrop cron:** `scripts/devnet-airdrop-cron.sh` runs every 3 hours (`30 */3 * * *`), targeting 100 SOL (`TARGET_SOL=100`).
- **Deploy-ready ping:** `scripts/devnet-deploy-ready-ping.sh` fires a macOS notification when
  balance ≥ 8 SOL.

### Keeper v2 (as of 2026-07-02, running under pm2)

`keeper/watch-keeper.js` runs as pm2 app **`kronos-keeper`** on the Mac mini
(`pm2 status` / `pm2 logs kronos-keeper`; logs in `keeper/logs/`). Config in `keeper/.env`
(gitignored: Helius RPC URL, wallet path; see `keeper/.env.example`). Behavior:

- **All 24 markets** — bounded random walk seeded from each oracle's current on-chain price
  (±0.6%/tick, mean-reverting, clamped 0.5×–1.5× of seed). **Synthetic demo prices** — the
  Yahoo commodity feed was removed by decision (2026-07-02) after it triggered the deviation
  freeze.
- Every update is hard-clamped to **±15%** of the last pushed price (on-chain cap is ~20%),
  so `OraclePriceDeviation` can no longer occur.
- **WL500** ramped from ~$47.6k to **$5,000** (`WL500_TARGET`, ≤15%/update) and now walks there.
- Pushes 24 updates every 6.5 s in 3 transactions of 8; if a batch fails, each market retries
  in its own transaction (failure isolation). 429-retry with backoff; chunked startup reads.
- **HTTP API on port 3001**: `/prices/all`, `/prices`, `/candles` (1m–1d), `/health`, `/ping`,
  plus stubs for `/trades`, `/leaderboard`, `/stats`, `/spins`. History: 30 s granularity,
  48 h retention, persisted to `keeper/history.json` every 5 min.
- The Next.js app reaches it via `app/next.config.js` rewrites (`/api/keeper/*` and
  `/api/v1/*` → `http://localhost:3001`, overridable with `KEEPER_API_URL`).

**Boot persistence (DONE 2026-07-14):** user LaunchAgent
`~/Library/LaunchAgents/com.kronos.pm2.plist` runs `pm2 resurrect` at login (no sudo).
Process list is saved via `pm2 save` (`~/.pm2/dump.pm2`). Optional system-wide alternative
still works if you want it later:

```bash
sudo env PATH=$PATH:/Users/amori/.hermes/node/bin \
  /Users/amori/.local/lib/node_modules/pm2/bin/pm2 startup launchd -u amori --hp /Users/amori
```

On 2026-07-14 the pm2 daemon had an empty process list after a respawn; `kronos-keeper` was
restarted, saved, and the LaunchAgent loaded. API ping: `{"ok":true}` on port 3001.

The old Pokémon keeper (`keeper/keeper.js`) has been deleted from the repo. The foreign
instance at `157.180.67.25:3001` is not ours and the app no longer references it.

### Redeploy to mainnet

Since the program is `--final` on devnet (non-upgradeable), a mainnet deploy requires a **new
program keypair**:

```bash
solana-keygen new -o target/deploy/kronos-keypair.json --force
anchor keys sync           # updates declare_id! + Anchor.toml
# Update [provider] cluster = "mainnet" in Anchor.toml
anchor build
solana program deploy target/deploy/kronos.so --final --use-quic \
  --url mainnet-beta --keypair ~/.config/solana/id.json
```

Then re-run the bootstrap scripts with `ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com`.

---

## 9. Git history

```
(local, unpushed) 47255b7 Ship keeper v4.3: trade indexer, Pokémon sweep, and oracle fixes.
(uncommitted) v4.4 — pm2 LaunchAgent boot persistence + full-deploy roadmap
67d0ea6 Remove Pokemon branding, wire devnet keeper with live commodity prices  (pushed; live on Pages)
83677e3 Add keeper scripts, watch image tooling, and header updates.
610022b Ship local watch photos, live charts, and keeper tooling to the static site.
9308ccc Bootstrap watch markets on-chain, wire UI to chain, apply Tier 1 fixes
ec420b2 Add current build/deploy handoff; preserve original code review.
5129857 Build Kronos program: fix payout stack overflow, sync new program ID.
2ce84bb Fix Kronos domain/config values and convert Pokemon domain copy to luxury watches.
aefef44 Add Kronos on-chain protocol: Anchor program, SDK, keeper, and Next.js app.
dcf2c8a Rebrand to Kronos and configure kronosliquid.xyz for GitHub Pages.
13df6df Rebrand site to watchliquid.lol and add GitHub Pages CNAME.
d8de126 Add Watch Liquid static site.
```

The vendored protocol was copied **without** upstream git history (no `origin`, no fork link).

---

## 10. Known risks

1. **Upstream code is unaudited** — treat as untrusted until full tests pass (see original review
   doc §14). The stack-overflow blocker and Tier 1 economic fixes (§5) are done; Tier 2 remains.
2. **Devnet can be reset by Solana Labs** — rare, but if it happens all on-chain state is wiped.
   Addresses are deterministic so re-bootstrap will produce the same PDAs; the program keypair
   (`target/deploy/kronos-keypair.json`, gitignored) must be backed up to reuse the same program ID.
3. **Keeper depends on this Mac mini** — pm2 restarts it on crash, but boot persistence needs
   the one-time sudo `pm2 startup` command (§8.5), and the machine sleeping stops price pushes
   and the history API.
4. **Program is non-upgradeable** (`--final` on devnet). Any bug fix requires a new deploy with a
   new program ID, plus updating all env vars / addresses.ts defaults.
5. **Prices are synthetic** — the random walk is demo data; nothing on-chain reflects real watch
   or commodity markets.
