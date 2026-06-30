#!/usr/bin/env bash
# devnet-airdrop-cron.sh — periodic single-wallet devnet airdrop (cron-safe).
#
# Requests ONE airdrop for the primary deploy wallet when balance is below
# TARGET_SOL. Designed to respect faucet rate limits (run every 8h, not in bursts).
#
# Cron example (every 8 hours):
#   30 */8 * * * /Users/amori/Projects/watch-liquid/scripts/devnet-airdrop-cron.sh
#
# Env overrides:
#   TARGET_SOL=5   AMOUNT=1   RPC=https://api.devnet.solana.com
#   PRIMARY_KEY=~/.config/solana/id.json
#   LOG_FILE=~/Projects/watch-liquid/logs/devnet-airdrop.log

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${LOG_DIR:-$ROOT/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/devnet-airdrop.log}"
RPC="${RPC:-https://api.devnet.solana.com}"
TARGET_SOL="${TARGET_SOL:-5}"
AMOUNT="${AMOUNT:-1}"
PRIMARY_KEY="${PRIMARY_KEY:-$HOME/.config/solana/id.json}"

export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

if [[ ! -f "$PRIMARY_KEY" ]]; then
  log "ERROR: keypair missing at $PRIMARY_KEY"
  exit 1
fi

if ! command -v solana >/dev/null 2>&1; then
  log "ERROR: solana CLI not found in PATH"
  exit 1
fi

ADDR="$(solana address -k "$PRIMARY_KEY")"
BEFORE="$(solana balance -k "$PRIMARY_KEY" --url "$RPC" 2>/dev/null | awk '{print $1}')"
BEFORE="${BEFORE:-0}"

log "check wallet=$ADDR balance=${BEFORE} SOL target=${TARGET_SOL}"

if python3 - "$BEFORE" "$TARGET_SOL" <<'PY'
import sys
before, target = map(float, sys.argv[1:3])
raise SystemExit(0 if before >= target else 1)
PY
then
  log "skip: balance already >= ${TARGET_SOL} SOL"
  exit 0
fi

log "requesting airdrop ${AMOUNT} SOL → ${ADDR}"
if OUT="$(solana airdrop "$AMOUNT" "$ADDR" --url "$RPC" --keypair "$PRIMARY_KEY" 2>&1)"; then
  AFTER="$(solana balance -k "$PRIMARY_KEY" --url "$RPC" | awk '{print $1}')"
  log "ok: ${BEFORE} → ${AFTER} SOL"
else
  log "failed: ${OUT}"
fi
