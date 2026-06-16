# Kronos — Build & Deploy Handoff

**Document version:** 2.0
**Date:** 2026-06-16
**Status:** Program builds, deploys, and initializes on a **local validator**. Not on devnet/mainnet.

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
   - `app/` — Next.js frontend (the protocol's own UI; **still contains Pokémon card market data** — see §6)
   - `scripts/`, `tests/`, `migrations/`

The two halves are **not yet wired together**. The static site uses hardcoded dummy data.

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

**Initialized so far:** `initialize` (protocol + oracle + vaults) and `update_oracle` (price).
**NOT yet run:** `initialize_pool`, per-market `init_market_oracle` / `init_market_state`.

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

# 5. Bootstrap (runs migrations/deploy.ts: initialize + set oracle price)
anchor migrate --provider.cluster localnet
```

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
- Build emits 2 harmless warnings (ambiguous glob re-export in `instructions.rs`; unused
  `post_fee_collateral` in `open_position.rs`).

---

## 6. Rebrand status — what's done vs. remaining

**Done (brand level):**
- All `pokeliquid` / `PokeLiquid` / `poke` → `kronos` / `Kronos` (246 files), files/dirs renamed
  (`programs/kronos`, `tests/kronos.ts`, `app/src/lib/kronos.idl.json`).
- Config values → real: `kronos.xyz` → `kronosliquid.xyz`, contact `security@kronosliquid.xyz`,
  GitHub source `github.com/amorigit/kronosliquid`.
- User-facing copy: `Pokémon`/`Pokemon` → `Watch`, `pokeball` → `Mystery Box`, awkward phrases
  cleaned (`Luxury Watches`, `Watch Perps`, etc.). Example tickers (`CHARIZARD-PERP`) → `ROLEX-SUB-PERP`.

**NOT converted (needs real watch data/assets — cannot be auto-generated):**
- `app/src/data/*-cards.json` — thousands of real Pokémon card entries (names, sets, prices).
- Per-set landing pages (`app/src/app/sv151`, `pl500`, `ah-index`, etc.) and their card tables.
- Card images in `app/public/`.
- On-chain market identifiers / seeds still reflect the original card markets.

So the protocol's **wording** is watch-themed, but its **market catalog is still Pokémon cards**.

---

## 7. Remaining work (suggested order)

1. **Finish bootstrap** — run `initialize_pool` and create demo markets:
   - `scripts/init-pool.ts`, `scripts/init-market.ts` / `scripts/init-market-states.js`
   - Map markets to the watch catalog already defined in the static site's `script.js`
     (`ROLEX-SUB-PERP`, `GOLD-PERP`, `PATEK-NAUTILUS-PERP`, …).
2. **Replace market data** — swap `app/src/data/*-cards.json` + market config for real luxury-watch
   markets; remove/repurpose the Pokémon set pages.
3. **Wire a UI to chain** — either point `app/` (Next.js) at `localhost:8899` + program ID + IDL,
   or add a small chain client to the static site. IDL is at `target/idl/kronos.json`.
4. **Apply Tier 1 Rust fixes** from [`HANDOFF-original-review.md`](./HANDOFF-original-review.md) §7.1
   (leverage cap, liquidation threshold 2%→5%, funding split comments) before any real deploy.
5. **Devnet/mainnet deploy** — see §8.

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

1. **Upstream code is unaudited** — treat as untrusted until Tier 1 fixes + tests pass
   (see original review doc §14). Only the stack-overflow blocker has been fixed so far.
2. **Local state is ephemeral** — the deploy/init above disappears on validator reset/reboot.
3. **Market data is still Pokémon** — not production-ready as a watch product (§6).
4. **No keeper running** — funding won't accrue, liquidations won't fire unless cranked.
5. **Program ID `HEZg…ziP`** is from a keypair stored at `target/deploy/kronos-keypair.json`
   (gitignored). Back it up if you intend to reuse this program address.
