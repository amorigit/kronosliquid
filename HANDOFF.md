# Kronos — Build & Deploy Handoff

**Document version:** 4.0
**Date:** 2026-07-01
**Status:** Program is **fully bootstrapped on devnet** (pool + 24 luxury-watch markets).
Static site and Next.js app are both wired to devnet. All Pokémon branding removed from code.

> This supersedes v3.0 (local-validator only). The original code-review plan is preserved at
> [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) (Tier 1/2 Rust fix list + QA checklist).

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
   - `app/` — Next.js frontend (the protocol's own UI; market **config** is now the watch catalog
     pointed at chain, but per-card datasets/set pages are still Pokémon — see §6)
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
> top-ups. ~7 SOL used for non-upgradeable deploy. Airdrop cron still runs (`TARGET_SOL=10`).

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

## 6. Rebrand status — COMPLETE

All Pokémon branding has been removed. Summary of what was done:

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

**Remaining Pokémon references (none in user-facing code):**
- `scripts/pl500-*.js`, `scripts/scrape-sv151.js`, `scripts/keeper-*.js` — legacy scraper scripts.
  These are unused by the live app; delete or archive when convenient.

---

## 7. Remaining work (suggested order)

Items from previous versions are done. What's left:

1. **Start the keeper** — without a running keeper, oracle prices stay at their seed values, funding
   won't accrue, and liquidations won't fire. Run `keeper/watch-keeper.js` (or `keeper/keeper.js`)
   pointed at devnet. It needs price sources for all 24 markets.
2. **WL500 constituents** — the `WL500-PERP` index market exists on-chain but has no constituent
   list. Either define the basket (e.g. 500 watches weighted by market cap) or repurpose it as a
   curated top-10 index. The `/wl500` route could document the methodology.
3. **Tier 2 review items** — see [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) for
   remaining hardening suggestions and the full QA checklist.
4. **Legacy scraper scripts** — `scripts/pl500-*.js`, `scripts/scrape-sv151.js`, etc. are unused.
   Delete or archive them.
5. **Mainnet** — when ready, generate a new program keypair, `anchor keys sync`, update
   `Anchor.toml` cluster, fund with real SOL, and redeploy.

---

## 8. Devnet deploy — DONE (2026-06-30)

The program was deployed to devnet non-upgradeably (`--final`) using `--use-quic` to bypass RPC
write-transaction rate limits. Key facts:

- **Cost:** ~7.09 SOL (non-upgradeable). Program size: ~1.0 MB.
- **Transport:** `solana program deploy --use-quic` sends transactions directly to validator TPUs,
  bypassing the public RPC's rate-limit bottleneck.
- **Funding:** CLI faucet is IP-rate-limited (~2 SOL/request). Used
  [faucet.solana.com](https://faucet.solana.com) (GitHub login, ~10 SOL/day) + secondary wallets.
- **Airdrop cron:** `scripts/devnet-airdrop-cron.sh` runs hourly, targeting 10 SOL (`TARGET_SOL=10`).
- **Deploy-ready ping:** `scripts/devnet-deploy-ready-ping.sh` fires a macOS notification when
  balance ≥ 8 SOL.

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
(v4.0 changes — not yet committed)  Remove Pokémon branding from app UI; devnet wiring.
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
3. **No keeper running** — oracle prices are frozen at seed values. Funding won't accrue,
   liquidations won't fire. Start `keeper/watch-keeper.js` to push live prices.
4. **Program is non-upgradeable** (`--final` on devnet). Any bug fix requires a new deploy with a
   new program ID, plus updating all env vars / addresses.ts defaults.
5. **Legacy scraper scripts** in `scripts/` still reference Pokémon markets — not user-facing but
   should be cleaned up to avoid confusion.
