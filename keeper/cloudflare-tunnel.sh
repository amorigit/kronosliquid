#!/usr/bin/env bash
# cloudflare-tunnel.sh — expose local keeper API (port 3001) via a Cloudflare quick tunnel.
# Writes the public URL to public-api-url.txt for Vercel / docs.
# Note: quick-tunnel hostnames change on every restart until a named Cloudflare tunnel is configured.

set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
URL_FILE="${ROOT}/public-api-url.txt"
PORT="${API_PORT:-3001}"
CLOUDFLARED="${CLOUDFLARED:-cloudflared}"

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v "$CLOUDFLARED" >/dev/null 2>&1; then
  echo "ERROR: cloudflared not found" >&2
  exit 1
fi

echo "Starting quick tunnel → http://127.0.0.1:${PORT}"
rm -f "$URL_FILE"

# cloudflared prints the URL on stderr; tee it and capture the trycloudflare host.
exec "$CLOUDFLARED" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate 2> >(
  while IFS= read -r line; do
    echo "$line"
    if [[ "$line" =~ https://[a-z0-9-]+\.trycloudflare\.com ]]; then
      url="$(echo "$line" | grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' | head -1)"
      if [[ -n "$url" ]]; then
        echo "$url" > "$URL_FILE"
        echo "PUBLIC_API_URL=$url" >&2
      fi
    fi
  done
)
