#!/usr/bin/env bash
# setup-devnet-airdrop.sh — create multiple devnet wallets and request CLI airdrops.
#
# Devnet faucets rate-limit per wallet and per IP. Using several wallets and
# spacing requests helps accumulate SOL for deploy/bootstrap costs.
#
# Usage:
#   ./scripts/setup-devnet-airdrop.sh              # 6 wallets, 1 SOL each
#   COUNT=8 AMOUNT=2 ./scripts/setup-devnet-airdrop.sh
#   CONSOLIDATE=1 ./scripts/setup-devnet-airdrop.sh   # sweep all to primary wallet
#   LIST_ONLY=1 ./scripts/setup-devnet-airdrop.sh     # print addresses for web faucet
#
# Wallets are stored under keys/devnet/ (gitignored). Primary wallet stays at
# ~/.config/solana/id.json.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_DIR="${KEY_DIR:-$ROOT/keys/devnet}"
RPC="${RPC:-https://api.devnet.solana.com}"
COUNT="${COUNT:-6}"
AMOUNT="${AMOUNT:-1}"
DELAY_SEC="${DELAY_SEC:-8}"
CONSOLIDATE="${CONSOLIDATE:-0}"
LIST_ONLY="${LIST_ONLY:-0}"
PRIMARY_KEY="${PRIMARY_KEY:-$HOME/.config/solana/id.json}"

mkdir -p "$KEY_DIR"

if [[ ! -f "$PRIMARY_KEY" ]]; then
  echo "Primary keypair missing at $PRIMARY_KEY"
  echo "Run: solana-keygen new -o $PRIMARY_KEY"
  exit 1
fi

PRIMARY_ADDR="$(solana address -k "$PRIMARY_KEY")"

# Ensure secondary wallets exist before list-only mode.
for i in $(seq -w 1 "$COUNT"); do
  KEY_PATH="$KEY_DIR/wallet-${i}.json"
  if [[ ! -f "$KEY_PATH" ]]; then
    solana-keygen new --no-bip39-passphrase -o "$KEY_PATH" --force >/dev/null
    echo "Created $KEY_PATH"
  fi
done

ADDR_FILE="$KEY_DIR/addresses.txt"
{
  echo "# Kronos devnet wallets — paste into https://faucet.solana.com"
  echo "# Primary (deploy/admin): $PRIMARY_ADDR"
  echo "$PRIMARY_ADDR"
  for i in $(seq -w 1 "$COUNT"); do
    solana address -k "$KEY_DIR/wallet-${i}.json"
  done
} > "$ADDR_FILE"

if [[ "$LIST_ONLY" == "1" ]]; then
  echo "Primary wallet: $PRIMARY_ADDR"
  echo "Saved public addresses to $ADDR_FILE"
  cat "$ADDR_FILE"
  exit 0
fi

echo "Primary wallet: $PRIMARY_ADDR"
echo "RPC:            $RPC"
echo "Wallets dir:    $KEY_DIR"
echo "Count:          $COUNT  |  Airdrop each: ${AMOUNT} SOL  |  Delay: ${DELAY_SEC}s"
echo ""

airdrop_to() {
  local label="$1"
  local key_path="$2"
  local addr="$3"

  local before
  before="$(solana balance -k "$key_path" --url "$RPC" 2>/dev/null | awk '{print $1}')"
  before="${before:-0}"

  echo -n "$label $addr (${before} SOL) → airdrop ${AMOUNT} SOL … " >&2

  if OUT="$(solana airdrop "$AMOUNT" "$addr" --url "$RPC" 2>&1)"; then
    local after gained
    after="$(solana balance -k "$key_path" --url "$RPC" | awk '{print $1}')"
    gained="$(awk "BEGIN {printf \"%.4f\", $after - $before}")"
    echo "ok → ${after} SOL (+${gained})" >&2
    echo "$gained"
  else
    echo "failed" >&2
    echo "  $OUT" >&2
    echo "0"
  fi
}

total_airdropped=0
success=0
failed=0

GAINED="$(airdrop_to "[primary]" "$PRIMARY_KEY" "$PRIMARY_ADDR")"
total_airdropped="$(awk "BEGIN {printf \"%.4f\", $total_airdropped + $GAINED}")"
if awk "BEGIN {exit !($GAINED > 0)}"; then success=$((success + 1)); else failed=$((failed + 1)); fi
sleep "$DELAY_SEC"

for i in $(seq -w 1 "$COUNT"); do
  KEY_PATH="$KEY_DIR/wallet-${i}.json"
  ADDR="$(solana address -k "$KEY_PATH")"

  GAINED="$(airdrop_to "[$i/$COUNT]" "$KEY_PATH" "$ADDR")"
  total_airdropped="$(awk "BEGIN {printf \"%.4f\", $total_airdropped + $GAINED}")"
  if awk "BEGIN {exit !($GAINED > 0)}"; then success=$((success + 1)); else failed=$((failed + 1)); fi

  if [[ "$i" != "$COUNT" ]]; then
    sleep "$DELAY_SEC"
  fi
done

echo ""
echo "── Balances ─────────────────────────────────────────────"
printf "%-44s %10s\n" "Address" "SOL"
printf "%-44s %10s\n" "$PRIMARY_ADDR (primary)" "$(solana balance -k "$PRIMARY_KEY" --url "$RPC" | awk '{print $1}')"

for i in $(seq -w 1 "$COUNT"); do
  KEY_PATH="$KEY_DIR/wallet-${i}.json"
  ADDR="$(solana address -k "$KEY_PATH")"
  BAL="$(solana balance -k "$KEY_PATH" --url "$RPC" | awk '{print $1}')"
  printf "%-44s %10s\n" "$ADDR" "$BAL"
done

if [[ "$CONSOLIDATE" == "1" ]]; then
  echo ""
  echo "── Consolidating to primary ─────────────────────────────"
  for i in $(seq -w 1 "$COUNT"); do
    KEY_PATH="$KEY_DIR/wallet-${i}.json"
    ADDR="$(solana address -k "$KEY_PATH")"
    BAL="$(solana balance -k "$KEY_PATH" --url "$RPC" | awk '{print $1}')"
    # Leave ~0.001 SOL for rent/fees on the source account.
    SEND="$(awk "BEGIN {v=$BAL - 0.001; if (v < 0) v = 0; printf \"%.4f\", v}")"
    if awk "BEGIN {exit !($SEND > 0.01)}"; then
      echo "Transfer ${SEND} SOL from $ADDR → $PRIMARY_ADDR"
      solana transfer "$PRIMARY_ADDR" "$SEND" --from "$KEY_PATH" --url "$RPC" --allow-unfunded-recipient || true
    fi
  done
  echo "Primary balance: $(solana balance -k "$PRIMARY_KEY" --url "$RPC")"
fi

echo ""
echo "Done. Success: $success  Failed: $failed  Net airdropped: ~${total_airdropped} SOL"
if [[ "$failed" -gt 0 ]]; then
  echo "Some airdrops failed (rate limit). Re-run later or use https://faucet.solana.com"
fi
