# Kronos × Kronos — Devnet Integration Handoff

**Document version:** 1.0  
**Date:** 2026-06-11  
**Audience:** Engineer picking up Kronos devnet integration  
**Goal:** Wire the Kronos UI to a forked Kronos Anchor program on Solana devnet, with critical on-chain issues corrected. This is a **demo / prototype**, not a production perpetual DEX.

---

## 1. Executive summary

Kronos (`watch-liquid` repo) is a static HTML/CSS/JS frontend with **fake market data** and no blockchain integration. Kronos ([github.com/kronos28-pixel/kronos](https://github.com/kronos28-pixel/kronos)) is a complete Anchor perpetual-futures program with **no frontend, no tests, and no keeper in-repo**. The live Kronos UI lives separately at [kronos.xyz](https://kronos.xyz) (Next.js + keeper + backend).

**Recommended delivery:** devnet demo with Phantom wallet, 2–5 watch markets, deposit → open → close, fake oracle prices, Tier 1 Rust fixes, and basic integration tests.

**Estimated effort:**

| Scope | Full-time | Part-time (~15 hr/wk) |
|-------|-----------|----------------------|
| Demo + Tier 1 fixes + basic tests | 3–4 weeks | 7–11 weeks |
| + Tier 2 partial refactor + 5 markets + pool read-only | 5–7 weeks | 10–16 weeks |

---

## 2. Source repositories & references

| Asset | Location | Notes |
|-------|----------|-------|
| Kronos UI (this repo) | `watch-liquid` | Static demo; `script.js` line 100: `"Demo mode — wallet connect disabled"` |
| Kronos program | [kronos28-pixel/kronos](https://github.com/kronos28-pixel/kronos) | Rust only; 31 instructions; 1 commit; no tests |
| Live Kronos UI | [kronos.xyz](https://kronos.xyz) | Next.js; not in GitHub; use as behavioral reference only |
| Kronos mainnet program ID | `5C1cz4kCA8DcD2zjhBphuK86vAjdoCnichK1kdLHPMt6` | **Do not reuse** — generate new devnet ID for Kronos |
| Kronos devnet program ID (upstream) | `7DVf9oEMcKPV6VUUz5BpptbwqpgBfXunwxjTNNQmZvbJ` | Reference only |
| Contact (from `security_txt`) | kronos28@gmail.com | |

---

## 3. Current state

### Kronos (`watch-liquid`)

- Pages: `index.html` (trade), `pool.html`, `stats.html`, `leaderboard.html`, `docs.html`
- JS: `script.js`, `pool.js`, `stats.js`, `leaderboard.js`, `docs.js` — all use **hardcoded dummy data**
- Domain: `kronosliquid.xyz` (CNAME in repo)
- Docs describe mainnet, keeper API, email auth, WatchCharts feeds — **none of this is implemented in this repo**

### Kronos program

- Anchor 1.0.2, `solana-security-txt`
- Features: trading, LP pool, funding, liquidations, SL/TP, referrals, multi-market oracles, admin controls, migrations
- `Anchor.toml` references `tests/**/*.ts` but **no test files exist**
- `Cargo.toml` lists `litesvm` dev-deps (unused)

---

## 4. Scope

### In scope (v1 devnet demo)

- Fork/rebrand program as Kronos (new devnet program ID)
- **Tier 1 Rust fixes** (see §7)
- **Basic integration tests** (initialize → deposit → open → close → oracle update)
- Vite (or similar) bundler + `@coral-xyz/anchor` client
- Phantom / Solflare on devnet
- 2–5 watch markets (static config → PDA mapping)
- `deposit_collateral`, `open_position`, `close_position`, `withdraw_collateral`
- Read `MarginAccount` + oracle price from chain
- Simple Node script for fake oracle updates (`update_market_oracle`)
- Update `docs.html`: devnet addresses, corrected fee/liquidation numbers, “demo only” banner

### Out of scope (defer)

- Mainnet deployment
- Email/password session wallets + server-side key storage
- Referral system (`register_referral`, `remaining_accounts` in `open_position`)
- Real price feeds (WatchCharts, LBMA, TCGPlayer scraper)
- Full keeper (liquidations, hourly funding, SL/TP cranking)
- On-chain stats / leaderboard / indexer
- `realloc_protocol` / `migrate_referral` (fresh devnet deploy avoids migrations)
- Full deduplication across all 31 instructions
- External audit

---

## 5. Target architecture

```
┌─────────────────┐     Phantom (devnet)     ┌──────────────────────┐
│  Kronos UI      │ ────────────────────────▶│  Solana devnet       │
│  (Vite + HTML)  │   sign transactions      │  Kronos program      │
└────────┬────────┘                          └──────────┬───────────┘
         │ read oracle / margin                         │
         │                                              │
┌────────▼────────┐   update_market_oracle (admin)      │
│  Oracle script  │ ────────────────────────────────────┘
│  (Node, cron)   │   fake watch prices every 5 min
└─────────────────┘
```

**Suggested repo layout after integration:**

```
watch-liquid/
├── programs/kronos/          # forked Anchor program
├── tests/                    # TS integration tests
├── scripts/
│   ├── deploy-devnet.sh
│   ├── bootstrap-markets.ts
│   └── oracle-cron.ts
├── src/chain/                # IDL client, PDA helpers, instruction wrappers
├── index.html                # existing pages (import from src/)
├── vite.config.ts
└── HANDOFF.md                # this file
```

---

## 6. Implementation phases

### Phase 0 — Fork & harden program (3–6 days)

1. Copy `programs/kronos` → `programs/kronos`
2. Rebrand: crate name, `declare_id!`, `security_txt`, `Cargo.toml` description
3. Apply **Tier 1 fixes** (§7.1)
4. Apply selected **Tier 2 fixes** (§7.2)
5. Add integration tests (§9)
6. `anchor build` && deploy to devnet
7. Bootstrap: `initialize`, `initialize_pool`, `init_market_oracle` + `init_market_state` per demo market

### Phase 1 — Client layer (3–5 days)

1. Add Vite + TypeScript
2. Install `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/spl-token`
3. Commit generated IDL from **your** build (`target/idl/kronos.json`)
4. Implement `src/chain/`: config, PDAs, instruction wrappers, account decoders
5. Phantom connect + devnet RPC + `mint_devnet_usdc` for test USDC

### Phase 2 — UI wiring (4–7 days)

1. Replace dummy flows in `script.js` with chain calls
2. Wire deposit, open, close, position list
3. Map `MARKETS` in `script.js` to on-chain `market_id` strings + oracle PDAs
4. Add site-wide banner: **“Devnet demo — not real money”**
5. Update `docs.html` program ID, network, fee tables (match fixed code)

### Phase 3 — Oracle script (1–3 days)

1. Admin keypair funds + cron
2. Push synthetic prices via `update_market_oracle`
3. Optional: append to local JSON for chart history

### Phase 4 — QA (2–3 days)

Run **Devnet QA checklist** (§8). Fix UI/program mismatches. Document known limitations.

---

## 7. File-by-file Rust fix list

Base path after fork: `programs/kronos/src/`

Legend: **P0** = fix before deploy | **P1** = fix during integration | **P2** = defer post-demo

---

### 7.1 Tier 1 — Fix before devnet deploy (P0)

#### `constants.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| `LIQUIDATION_THRESHOLD_BPS = 500` unused | Constant defines 5%; never referenced in liquidation logic | Use this constant in `liquidate.rs` and any UI/docs liquidation math |
| `MAX_ORACLE_DEVIATION_BPS` | Verify value matches docs (50% = 5_000 bps) | Confirm against `update_oracle.rs` / `update_market_oracle.rs`; align docs |
| Leverage | Program allows 25x (`AboveMaxLeverage` in `error.rs`); Kronos docs say 10x | Add `MAX_LEVERAGE: u8 = 10` constant; use in `open_position.rs` for demo |

**Action:** Add `pub const MAX_LEVERAGE: u8 = 10;` and reference it in open/close validation and docs.

---

#### `instructions/liquidate.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Threshold mismatch | Comment + logic: `equity * 50 < notional` → **2%** margin ratio | Replace with constant-based check: liquidatable when `(equity * 10_000) < (notional * LIQUIDATION_THRESHOLD_BPS)` OR `equity <= 0` |
| Hardcoded comment | Says "2% liquidator" in distribution comment but uses `LIQUIDATOR_REWARD_BPS` (200 = 2%) — that part is OK | Update threshold comment to match 5% after fix |
| Distribution | 2% / 44% / 44% / 10% via constants | Verify constants sum to 10_000 bps; add `assert` or comment block |

**Suggested liquidation check:**

```rust
// margin_ratio = equity / notional; liquidate when margin_ratio < LIQUIDATION_THRESHOLD_BPS / 10_000
let is_liquidatable = equity <= 0
    || (equity as i128)
        .checked_mul(10_000)
        .ok_or(ErrorCode::MathOverflow)?
        < (position.notional as i128)
            .checked_mul(LIQUIDATION_THRESHOLD_BPS as i128)
            .ok_or(ErrorCode::MathOverflow)?;
```

---

#### `instructions/close_position.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Wrong funding comment | Line ~193: "Funding fee split: **30%** LP, 20% insurance" | Change to "70% LP, 20% insurance, 10% platform" to match `FUNDING_LP_BPS` / `FUNDING_INSURANCE_BPS` |
| Duplicated logic | Full fee split + LP acc_fee_per_share block copied from other files | P1: extract to shared helper (§7.2) |

---

#### `instructions/settle_funding.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Funding liquidation split | `LiquidateViaFunding` path: no liquidator reward; comment says "12% platform" | Align with `liquidate.rs` (2% liquidator, 44/44/10) **or** document intentional difference; for demo consistency, **reuse same split function** |
| Funding comment | May say 30% LP in places | Align all comments to 70/20/10 |
| Demo scope | Full funding crank not required for v1 | Can disable in UI; fix splits anyway if keeper added later |

---

#### `instructions/check_and_pause.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Threshold edge | `seconds_stale > protocol.auto_pause_threshold` (strict `>`) | Decide: pause at `>=` threshold; update code + docs consistently |
| Repeated pause | No guard if already paused | Early return OK if `protocol.is_paused` (optional emit skip) |
| Global pause | Any market stale pauses entire protocol | **Document** in Kronos docs; P2 to add per-market pause if needed |
| Unused `caller` | Signer never read | Rename to `_caller` |

---

#### `instructions/open_position.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Max leverage | `require!(leverage <= 25, ...)` | Change to `MAX_LEVERAGE` (10 for Kronos demo) |
| Per-market cap | Hardcoded `350_000_000` ($350) inline | Move to `constants.rs` as `MARKET_COLLATERAL_CAP` |
| Referral complexity | `remaining_accounts` CPI + manual deserialize | **Do not wire in demo**; no code change required if referrals unused |

---

#### `instructions/update_oracle.rs` & `instructions/update_market_oracle.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| Deviation check | Uses `MAX_ORACLE_DEVIATION_BPS` | Verify 50% cap matches Kronos docs; add test for reject on spike |
| Auto-unpause | Unpauses if `!manual_pause` | Document behavior; ensure demo admin flow understands manual vs stale pause |

---

#### `state.rs`

| Issue | Current | Recommended fix |
|-------|---------|-----------------|
| `OracleAccount::SPACE` | Comment mentions "+32 padding"; verify size matches deployed accounts | Run `anchor test` account size check; fix SPACE if mismatch causes init failures |
| `ProtocolState::SPACE` vs `realloc_protocol` | `realloc_protocol.rs` hardcodes `new_len: 351` | Not needed for fresh devnet deploy; verify `ProtocolState::SPACE` matches struct if using `init` |

---

### 7.2 Tier 2 — Fix during integration (P1)

#### New file: `instructions/settlement.rs` (or `utils/fees.rs`)

Extract shared logic used by demo paths:

| Function | Used by |
|----------|---------|
| `compute_skew_rate(long_oi, short_oi, skew_factor) -> Result<u64>` | `close_position`, `settle_funding`, `open_position` (if needed) |
| `compute_funding_owed(notional, hourly_rate, hours) -> Result<u64>` | `close_position`, `settle_funding` |
| `split_trading_fee(fee, lp_fee_bps, insurance_bps) -> (u64, u64, u64)` | `open_position`, `close_position`, `execute_sl_tp` |
| `split_funding_fee(funding) -> (u64, u64, u64)` | `close_position`, `settle_funding` |
| `credit_lp_fees(pool, amount) -> Result<()>` | All fee-accruing paths |
| `is_on_majority_side(direction, long_oi, short_oi) -> bool` | Funding paths |

Register module in `instructions.rs`.

---

#### `instructions/execute_sl_tp.rs`

| Issue | Fix |
|-------|-----|
| Duplicates close/settlement logic | Call shared helpers from `settlement.rs` |
| Keeper reward 10 bps | OK; document in Kronos docs if SL/TP wired later |

---

#### `instructions/claim_fees.rs`

| Issue | Fix |
|-------|-----|
| Legacy + MasterChef dual path | OK for demo; add test for `acc_fee_per_share > 0` path |

---

#### `instructions/withdraw_fees.rs`

| Issue | Fix |
|-------|-----|
| Reservation math | **Add test**: admin cannot withdraw below `user_collateral + lp_unclaimed + referral_pending` |

---

#### `instructions/remove_margin.rs`

| Issue | Fix |
|-------|-----|
| Health check vs liquidation threshold | Ensure uses same `LIQUIDATION_THRESHOLD_BPS` after P0 fix |

---

#### `lib.rs`

| Change | Details |
|--------|---------|
| Rebrand `security_txt!` | `name: "Kronos"`, `project_url: "https://kronosliquid.xyz"`, update contacts |
| `declare_id!` | New devnet keypair pubkey |
| Doc comments | Match Kronos product (watches/metals, not Pokémon) |

---

#### `Cargo.toml` (program)

| Change | Details |
|--------|---------|
| `description` | Update from "CHARIZARD-PERP" to Kronos |
| `mainnet` feature | Do not enable for devnet demo builds |

---

#### `Anchor.toml`

| Change | Details |
|--------|---------|
| `[programs.devnet]` | New Kronos program ID |
| `[provider] cluster` | Set to `devnet` for demo work |
| Add `[programs.localnet]` | Same ID for local validator tests |

---

### 7.3 Tier 3 — Defer post-demo (P2)

| File | Issue | Notes |
|------|-------|-------|
| `realloc_protocol.rs` | Unsafe pointer `realloc`, magic `351` bytes | Skip unless upgrading live mainnet state |
| `migrate_referral.rs` | Manual close/recreate account | Skip; no referrals in demo |
| `instructions/open_position.rs` | Referral `remaining_accounts` block (~150 lines) | Harden only if referrals enabled |
| All instruction files | Full dedup refactor | 1–2 weeks; do incrementally via `settlement.rs` |

---

## 8. Devnet QA checklist

Run after Phase 0–4. Record tx signatures and pass/fail in a test log.

### 8.1 Program bootstrap

- [ ] Program deploys to devnet with new program ID (not Kronos mainnet ID)
- [ ] `initialize` succeeds; `ProtocolState`, default oracle, fee vault, insurance fund created
- [ ] `initialize_pool` succeeds
- [ ] `init_market_oracle` + `init_market_state` succeed for each demo market (2–5)
- [ ] `update_market_oracle` sets non-zero price; `last_updated` advances
- [ ] `mint_devnet_usdc` mints test USDC to tester wallet

### 8.2 Trading happy path

- [ ] Phantom connects on devnet
- [ ] `deposit_collateral` increases margin account balance on-chain
- [ ] `open_position` (Long, 2x, min collateral) succeeds; position appears in `MarginAccount`
- [ ] Oracle price read in UI matches on-chain `OracleAccount.price`
- [ ] `close_position` settles; position slot cleared; collateral updated
- [ ] `withdraw_collateral` returns USDC to user ATA

### 8.3 Fee & accounting correctness

- [ ] Open fee = 2% (200 bps) deducted from collateral
- [ ] Close fee = 2% deducted from settlement
- [ ] Trading fee split on open/close: **50% LP / 25% insurance / 25% platform** (per `DEFAULT_LP_FEE_BPS` + `DEFAULT_INSURANCE_FUND_BPS`)
- [ ] Funding fee split (if tested via `settle_funding`): **70% LP / 20% insurance / 10% platform**
- [ ] `withdraw_fees` **rejects** amount that would dip into user collateral reserve
- [ ] `total_user_collateral` increments on deposit and decrements appropriately on close/liquidate

### 8.4 Risk & oracle guards

- [ ] `open_position` fails when `protocol.is_paused`
- [ ] `open_position` fails when oracle stale (`PriceStale`) — set `last_updated` old enough
- [ ] `check_and_pause` pauses protocol when stale beyond `auto_pause_threshold` (verify `>` vs `>=` matches docs)
- [ ] `update_market_oracle` rejects >50% price jump (when `old_price > 0`)
- [ ] `open_position` rejects leverage > `MAX_LEVERAGE` (10 after fix)
- [ ] `market_state.oracle == oracle.key()` enforced (wrong oracle account fails)

### 8.5 Liquidation (if tested in demo)

- [ ] Position liquidatable at documented threshold (**5%** after P0 fix)
- [ ] Liquidation distribution: **2% liquidator / 44% LP / 44% insurance / 10% platform**
- [ ] Global + per-market OI decremented after liquidation
- [ ] Funding-triggered liquidation in `settle_funding` uses **same** split as normal liquidation (after P0 fix)

### 8.6 UI & docs alignment

- [ ] Site banner shows "Devnet demo"
- [ ] `docs.html` lists correct devnet program ID and PDAs
- [ ] Docs fee tables match on-chain constants
- [ ] Docs liquidation threshold matches code (5%)
- [ ] Docs funding split says 70/20/10 (not 30/20)
- [ ] No "Live on Solana Mainnet" claims unless actually on mainnet
- [ ] Connect wallet works; no `"Demo mode — wallet connect disabled"` toast on trade actions

### 8.7 Automated tests (CI / local)

- [ ] Test: initialize + bootstrap one market
- [ ] Test: deposit → open → close round trip
- [ ] Test: stale oracle blocks open
- [ ] Test: withdraw_fees reservation guard
- [ ] Test: liquidation threshold boundary (just above / just below 5%)
- [ ] Test: oracle deviation reject
- [ ] All tests pass on `anchor test` or `yarn test` against local validator

---

## 9. Integration tests to add

Create `tests/kronos.devnet.ts` (or local validator equivalent):

```typescript
// Minimum test cases
describe("kronos devnet", () => {
  it("initializes protocol");
  it("bootstraps one market");
  it("deposits collateral");
  it("opens and closes a long position");
  it("rejects open when paused");
  it("rejects open when oracle stale");
  it("rejects admin fee withdraw below reserves");
  it("liquidates at 5% margin ratio"); // after P0 fix
});
```

Use `litesvm` (already in `Cargo.toml` dev-deps) or Anchor's TS test harness with `bankrun` / local validator.

---

## 10. UI integration checklist

### Files to modify

| File | Changes |
|------|---------|
| `package.json` | Add Vite, Anchor, web3.js deps; `dev` / `build` scripts |
| `vite.config.ts` | New; multi-page or single entry importing chain module |
| `src/chain/config.ts` | Devnet RPC, program ID, USDC mint |
| `src/chain/pdas.ts` | PDA derivations: protocol, margin, market, oracle |
| `src/chain/instructions.ts` | deposit, open, close, withdraw wrappers |
| `src/chain/accounts.ts` | decode MarginAccount, OracleAccount, ProtocolState |
| `script.js` | Replace `DUMMY_POSITIONS`, fake prices; call chain module |
| `pool.js` | P1: wire `lp_deposit` / read pool state; or keep demo label |
| `stats.js`, `leaderboard.js` | Keep fake data with "demo" label OR hide until indexer exists |
| `docs.html` | Devnet addresses, corrected economics, remove unimplemented claims |
| `index.html` | Devnet banner; wallet connect handler |

### Market config example

Map UI market → on-chain `market_id` (must match seed used in `init_market_state`):

```javascript
{
  id: "rolex-sub",
  name: "ROLEX-SUB-PERP",
  marketId: "ROLEX-SUB",        // passed to init_market_oracle/state
  live: true,
}
```

**Critical:** `market_id` seed length must match `market_state.market_id_trimmed()` logic (Kronos commit fixes zero-padded trimming).

---

## 11. Devnet bootstrap procedure

```bash
# 1. Generate program keypair
solana-keygen new -o target/deploy/kronos-keypair.json

# 2. Build & deploy
anchor build
anchor deploy --provider.cluster devnet

# 3. Initialize protocol (admin wallet)
anchor run initialize   # or ts script calling initialize

# 4. Initialize LP pool
# 5. For each market:
#    init_market_oracle(market_id, seed_price)
#    init_market_state(market_id, max_long_oi, max_short_oi)
#    update_market_oracle(market_id, seed_price)

# 6. Fund testers
#    mint_devnet_usdc (per user)
```

Record all addresses in `docs.html` and `src/chain/config.ts`.

---

## 12. Oracle script (minimal)

`scripts/oracle-cron.ts`:

- Load admin keypair from env (`ORACLE_ADMIN_KEY`)
- Every 5 minutes: for each market in config, call `update_market_oracle` with synthetic price (random walk ±0.5% from last)
- Log tx signatures
- **Do not** scrape WatchCharts for v1

---

## 13. Open decisions (resolve before Phase 0)

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Max leverage | 10 (docs) vs 25 (code) | **10** for Kronos demo |
| Liquidation threshold | 2% (current code) vs 5% (constant/docs) | **5%** — fix code to match constant |
| Pause at threshold | `>` vs `>=` auto_pause_threshold | **`>=`** (pause at exactly 1 hour stale) |
| Funding liquidation split | Same as normal vs different | **Same** as `liquidate.rs` |
| Wallet model | Phantom vs session wallet | **Phantom** for v1 |
| Markets count | 2 vs 5 | **3** (e.g. ROLEX-SUB, GOLD, WL500) |

---

## 14. Known risks & limitations

1. **Upstream Kronos quality** — single commit, no tests, ~72% likely AI-assisted; treat as untrusted until your fixes + QA pass.
2. **Duplicated settlement logic** — bugs may exist in paths you don't test (SL/TP, funding liquidation).
3. **Static site → bundler** — required migration; plan for build/deploy pipeline change (GitHub Pages may need `vite build` output).
4. **No keeper in v1** — funding won't accrue, liquidations won't fire, SL/TP won't execute unless you run cranks manually.
5. **Docs oversell product** — Kronos docs describe features not in repo; trim before public demo.

---

## 15. Definition of done

- [ ] Tier 1 Rust fixes merged in `programs/kronos`
- [ ] ≥6 automated tests passing locally
- [ ] Program deployed to devnet; addresses documented
- [ ] UI: deposit, open, close work with Phantom on devnet
- [ ] Oracle script updating ≥1 market
- [ ] Devnet QA checklist (§8) ≥90% pass
- [ ] `docs.html` accurate for devnet demo scope
- [ ] HANDOFF.md updated with final program ID + PDA addresses

---

## 16. Handoff contacts & next steps

1. Assign engineer with Solana/Anchor experience
2. Resolve open decisions (§13)
3. Execute Phase 0 file fixes (§7.1) before any UI work
4. Deploy + bootstrap devnet
5. Parallel: Vite setup + chain client while QA runs on program

**After v1 ships:** consider Tier 2 dedup (§7.2), optional keeper, pool page, then reassess mainnet.

---

*Generated from code review of [kronos28-pixel/kronos](https://github.com/kronos28-pixel/kronos) and Kronos `watch-liquid` static demo. Revisit this document when program ID, market list, or scope changes.*
