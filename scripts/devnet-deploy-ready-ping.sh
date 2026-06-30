#!/usr/bin/env bash
# devnet-deploy-ready-ping.sh — notify once when wallet can afford devnet deploy.
#
# Cron example (hourly, after airdrop cron has had time to run):
#   15 * * * * /Users/amori/Projects/watch-liquid/scripts/devnet-deploy-ready-ping.sh
#
# Env overrides:
#   MIN_SOL=8   PROGRAM_ID=HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP
#   RPC=https://api.devnet.solana.com   PRIMARY_KEY=~/.config/solana/id.json

set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${LOG_DIR:-$ROOT/logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/devnet-deploy-ping.log}"
SENTINEL="${SENTINEL:-$LOG_DIR/.devnet-deploy-ready-pinged}"
RPC="${RPC:-https://api.devnet.solana.com}"
MIN_SOL="${MIN_SOL:-8}"
PROGRAM_ID="${PROGRAM_ID:-HEZgFANPKb5hCCDZYzz1gdnbsD7C52gAPx5GNU1ifziP}"
PRIMARY_KEY="${PRIMARY_KEY:-$HOME/.config/solana/id.json}"

export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"

mkdir -p "$LOG_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

if [[ -f "$SENTINEL" ]]; then
  exit 0
fi

if [[ ! -f "$PRIMARY_KEY" ]] || ! command -v solana >/dev/null 2>&1; then
  log "skip: missing keypair or solana CLI"
  exit 0
fi

if solana program show "$PROGRAM_ID" --url "$RPC" >/dev/null 2>&1; then
  log "skip: program already deployed on devnet"
  touch "$SENTINEL"
  exit 0
fi

ADDR="$(solana address -k "$PRIMARY_KEY")"
BALANCE="$(solana balance -k "$PRIMARY_KEY" --url "$RPC" 2>/dev/null | awk '{print $1}')"
BALANCE="${BALANCE:-0}"

if ! python3 - "$BALANCE" "$MIN_SOL" <<'PY'
import sys
bal, need = map(float, sys.argv[1:3])
raise SystemExit(0 if bal >= need else 1)
PY
then
  log "waiting: balance=${BALANCE} SOL need>=${MIN_SOL} wallet=$ADDR"
  exit 0
fi

TITLE="Kronos devnet ready"
BODY="Wallet ${ADDR:0:8}… has ${BALANCE} SOL (need ${MIN_SOL}). Run: anchor deploy --provider.cluster devnet -- --final"

log "READY: balance=${BALANCE} SOL — sending ping"

if command -v osascript >/dev/null 2>&1; then
  osascript -e "display notification \"${BODY}\" with title \"${TITLE}\" sound name \"Glass\"" \
    2>/dev/null || true
fi

if [[ -f "$ROOT/keeper/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/keeper/.env"
  set +a
fi

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  TEXT="🚀 <b>Kronos devnet deploy ready</b>%0A%0A${BODY// /%20}"
  curl -sf -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "parse_mode=HTML" \
    -d "text=${TITLE}%0A%0AWallet: ${ADDR}%0ABalance: ${BALANCE} SOL%0A%0ARun from watch-liquid:%0Aanchor deploy --provider.cluster devnet -- --final" \
    >/dev/null 2>&1 || log "warn: telegram send failed"
fi

touch "$SENTINEL"
log "ping sent (sentinel: $SENTINEL)"
