# Kronos — Build & Deploy Handoff

**Document version:** 3.0
**Date:** 2026-06-16
**Status:** Program builds, deploys, and is **fully bootstrapped** on a **local validator**
(pool + 24 luxury-watch markets). Static site reads **live on-chain prices**. Not on devnet/mainnet.

> This supersedes the original code-review plan, which is preserved at
> [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) (still useful for its
> Tier 1/2 Rust fix list and devnet QA checklist).

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

## 2. Current on-chain state (LOCAL VALIDATOR ONLY)

Everything below lives on a local `solana-test-validator`. **This state is ephemeral** — it is
wiped on `--reset` or machine reboot. Nothing is on devnet or mainnet.

| Item | Value |
|------|-------|
| **Program ID** | `HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP` |
| **Admin / upgrade authority** | `7H5bvtD9w7Kr9AueZawQkDSBg5KyBxwh2xPojRgAx2xX` (`~/.config/solana/id.json`) |
| **ProtocolState PDA** | `HzpzGHZRTDFrQ7GbEAx1SrCzUq7ykWvF4baBH7z69tcg` |
| **Oracle PDA** | `F4kK3Rim3a2ikcqxAasBCr9xtnwVbbP9tDHqFUggUQdw` (seeded at $25.00) |
| **USDC Mint PDA** | `3zsAG5W1sqNb9KdAGEceptZTuHGCWGSLCK8nUv4iPQn9` |
| **FeeVault PDA** | `F4wfXD5yNULQy7tdMwVtNag4XZSQBHSdSACxn7TrmCmr` |
| **InsuranceFund PDA** | `5gS3Q9us8yptZ8cbQoQexqAc1ToC2skchRJMefCRZvfn` |
| **Validator ledger** | `/tmp/kronos-test-ledger` |
| **RPC** | `http://localhost:8899` |

| **LiquidityPool PDA** | `FZ2vSRqk7bq2YWbSwAcAFDDudQxCs6etDNG448kx16DJ` |

**Bootstrapped:** `initialize` (protocol + oracle + vaults), `update_oracle`, `initialize_pool`,
and **24 watch markets** — each with `init_market_oracle` (seeded price) + `init_market_state`
(100k USDC max OI/side). Market PDAs + oracle addresses are written to
`app/src/lib/markets.bootstrap.json` (the source of truth consumed by the UI generators).

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

## 6. Rebrand status — what's done vs. remaining

**Done (brand level):**
- All `pokeliquid` / `PokeLiquid` / `poke` → `kronos` / `Kronos` (246 files), files/dirs renamed
  (`programs/kronos`, `tests/kronos.ts`, `app/src/lib/kronos.idl.json`).
- Config values → real: `kronos.xyz` → `kronosliquid.xyz`, contact `security@kronosliquid.xyz`,
  GitHub source `github.com/amorigit/kronosliquid`.
- User-facing copy: `Pokémon`/`Pokemon` → `Watch`, `pokeball` → `Mystery Box`, awkward phrases
  cleaned (`Luxury Watches`, `Watch Perps`, etc.). Example tickers (`CHARIZARD-PERP`) → `ROLEX-SUB-PERP`.

**Done (market catalog level):**
- On-chain markets are now **luxury watches** (§2) — IDs like `ROLEX-SUB-PERP`, `RM-11-PERP`.
- `app/src/lib/markets.ts` is **auto-generated** (`scripts/gen-app-markets.js`) from the on-chain
  manifest: 24 watch markets, real oracle PDAs, the new program ID, watch imagery/subtitles.
- App chain config (`app/src/lib/addresses.ts` defaults + `app/.env.local.example`) points at the
  local deployment; IDL refreshed to the current build.

**NOT converted (needs real watch data/assets — cannot be auto-generated):**
- `app/src/data/*-cards.json` — thousands of real Pokémon card entries (constituents of the old
  index markets). The watch markets above don't depend on these, but the per-set *pages* still do.
- Per-set landing pages (`app/src/app/sv151`, `pl500`, `ah-index`, etc.) and their card tables.
- Card images in `app/public/`.

So the **brand, on-chain markets, and market config are watch-themed**; the leftover Pokémon
content is limited to the app's per-set constituent pages/datasets.

---

## 7. Remaining work (suggested order)

The four big items from v2.0 (finish bootstrap, swap market config, wire a UI to chain, Tier 1
Rust fixes) are **DONE** (§2, §5, §6). What's left:

1. **Per-set content cleanup** — the only remaining Pokémon material is the app's index-constituent
   datasets (`app/src/data/*-cards.json`) and the per-set pages under `app/src/app/*`. Either delete
   the set pages or repopulate the index markets (e.g. `WL500-PERP`) with real watch constituents.
2. **Write trades to chain** — the static `chain.js` client is **read-only** (prices). To trade, use
   the Next.js `app/` (already wired to program ID + IDL + RPC) with a wallet, or add signing to the
   static site. A keeper (`keeper/`) must run to push price updates / crank funding & liquidations.
3. **Tier 2 review items** — see [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) for the
   remaining (non-Tier-1) hardening suggestions and the full QA checklist before any real deploy.
4. **Devnet/mainnet deploy** — see §8.

---

## 8. Deploying beyond local

The program is **~1.0 MB**, so deploying costs **~14.2 SOL** in rent (≈7 SOL if deployed
non-upgradeable with `--final`).

- **Devnet:** the CLI faucet is rate-limited and won't supply this much. Use
  [faucet.solana.com](https://faucet.solana.com) (GitHub login, ~10 SOL/day) across a couple of days,
  or third-party devnet faucets, then `anchor deploy --provider.cluster devnet`.
  Devnet wallet address: `7H5bvtD9w7Kr9AueZawQkDSBg5KyBxwh2xPojRgAx2xX`.
- **Before deploying:** generate a NEW program keypair if you don't want to reuse the local one,
  then `anchor keys sync`. Update `[provider] cluster` in `Anchor.toml`.

---

## 9. Git history

```
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
   doc §14). The stack-overflow blocker and the Tier 1 economic fixes (§5) are done; Tier 2 remains.
2. **Local state is ephemeral** — the deploy/bootstrap above disappears on validator reset/reboot.
   Re-run steps 2–7 in §4 to recreate it (PDA addresses are deterministic, so they'll match).
3. **Leftover Pokémon content** — limited to the app's per-set constituent pages/datasets (§6).
4. **No keeper running** — funding won't accrue, liquidations won't fire unless cranked, and the
   static site's live prices stay at their seed values until something pushes oracle updates.
5. **Program ID `HEZg…ziP`** is from a keypair stored at `target/deploy/kronos-keypair.json`
   (gitignored). Back it up if you intend to reuse this program address.
