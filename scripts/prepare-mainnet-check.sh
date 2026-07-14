#!/usr/bin/env bash
# prepare-mainnet-check.sh — Phase C preflight (read-only). Does NOT deploy or spend SOL.
#
# Verifies local toolchain + repo wiring before a real mainnet deploy.
# Usage: ./scripts/prepare-mainnet-check.sh

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

ok=0
fail=0
warn=0

pass() { echo "  PASS  $*"; ok=$((ok + 1)); }
fail_() { echo "  FAIL  $*"; fail=$((fail + 1)); }
warn_() { echo "  WARN  $*"; warn=$((warn + 1)); }

echo "Kronos mainnet preflight (read-only)"
echo "===================================="

command -v solana >/dev/null && pass "solana $(solana --version 2>/dev/null | head -1)" || fail_ "solana CLI missing"
command -v anchor >/dev/null && pass "anchor $(anchor --version 2>/dev/null | head -1)" || fail_ "anchor missing"
command -v node >/dev/null && pass "node $(node --version)" || fail_ "node missing"
command -v yarn >/dev/null && pass "yarn $(yarn --version 2>/dev/null)" || warn_ "yarn missing (Anchor.toml uses yarn)"

if [[ -f "$HOME/.config/solana/id.json" ]]; then
  ADDR="$(solana address -k "$HOME/.config/solana/id.json" 2>/dev/null || true)"
  pass "wallet present ($ADDR)"
else
  fail_ "no ~/.config/solana/id.json"
fi

if [[ -f target/deploy/kronos-keypair.json ]]; then
  warn_ "target/deploy/kronos-keypair.json exists — for mainnet you MUST generate a NEW keypair (devnet ID is --final)"
else
  pass "no kronos-keypair.json in target/deploy (will create fresh for mainnet)"
fi

PID="$(rg -n 'declare_id!' programs/kronos/src/lib.rs 2>/dev/null | head -1 || true)"
echo "  INFO  $PID"
if echo "$PID" | grep -q 'HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP'; then
  warn_ "declare_id is still the DEVNET program — C1 must replace it before mainnet build"
else
  pass "declare_id is not the known devnet ID"
fi

if [[ -f app/src/lib/markets.bootstrap.json ]]; then
  N="$(python3 -c "import json;print(len(json.load(open('app/src/lib/markets.bootstrap.json'))['markets']))" 2>/dev/null || echo '?')"
  pass "markets.bootstrap.json present ($N markets) — regenerate after mainnet bootstrap"
else
  fail_ "markets.bootstrap.json missing"
fi

if [[ -f scripts/bootstrap-watch-markets.ts ]]; then
  pass "bootstrap-watch-markets.ts present"
else
  fail_ "bootstrap script missing"
fi

if [[ -f docs/TIER2-STATUS.md ]]; then
  pass "Tier 2 status doc present (review deferred items before C0)"
else
  warn_ "docs/TIER2-STATUS.md missing"
fi

echo ""
echo "Summary: $ok pass, $warn warn, $fail fail"
echo ""
echo "Next (manual, spends real SOL):"
echo "  C1  solana-keygen new -o target/deploy/kronos-keypair.json --force && anchor keys sync"
echo "  C3  fund wallet on mainnet-beta"
echo "  C4  anchor build && solana program deploy … --url mainnet-beta"
echo "  See HANDOFF.md §7 Phase C for the full ordered list."

[[ "$fail" -eq 0 ]]
