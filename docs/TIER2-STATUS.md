# Kronos — Tier 2 status (Phase A6)
Date: 2026-07-14
Source: HANDOFF-original-review.md §7.2

## Already satisfied on current tree

| Item | Status |
|------|--------|
| `security_txt!` Kronos branding + kronosliquid.xyz contacts | DONE (`programs/kronos/src/lib.rs`) |
| Cargo.toml description = Kronos luxury watch perps | DONE |
| Anchor.toml `[programs.devnet]` + `[programs.localnet]` + cluster=devnet | DONE |
| `remove_margin` uses `LIQUIDATION_THRESHOLD_BPS` | DONE |
| declare_id matches deployed HEZg…ziP | DONE |

## Deferred (still open before mainnet / Phase C)

| Item | Why deferred |
|------|----------------|
| Extract `settlement.rs` shared fee/funding helpers | Large refactor; demo paths work; do before mainnet audit |
| Dedup `execute_sl_tp` via shared helpers | Depends on settlement extract |
| Admin `withdraw_fees` reservation test | Needs dedicated test harness against bootstrapped accounts |
| `claim_fees` MasterChef path test | Same |
| Full program test suite / fuzz CI | Tier 2–3; tracked in original review |

## Verdict

Phase A6 = **checklist reviewed + branding/config Tier 2 items confirmed**. Code-heavy settlement dedup remains Phase C prerequisite, not a Phase A blocker.
