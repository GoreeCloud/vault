#!/usr/bin/env bash
# Development-only CLI smoke check: disposable profile, no real credentials.
set -euo pipefail
bundle="${1:-dist/apps/cli/oss-dev/bw.js}"
test -f "$bundle"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/home" "$tmp/xdg"
export HOME="$tmp/home" XDG_CONFIG_HOME="$tmp/xdg" NODE_ENV=test
node "$bundle" config server http://localhost:8089 > "$tmp/config" 2>&1
if timeout 12s node "$bundle" receive 'http://127.0.0.1:8089/#/send/test/key' > "$tmp/receive" 2>&1; then
  echo "Unreviewed receive command unexpectedly succeeded." >&2
  exit 1
fi
grep -q 'receive and serve are disabled' "$tmp/receive"
if timeout 12s node "$bundle" serve > "$tmp/serve" 2>&1; then
  echo "Unreviewed serve command unexpectedly succeeded." >&2
  exit 1
fi
grep -q 'receive and serve are disabled' "$tmp/serve"
node "$bundle" --help > "$tmp/help" 2>&1
grep -q '^Usage: bw' "$tmp/help"
test -f "$tmp/xdg/GoreeCloud Vault CLI/data.json"
test ! -e "$tmp/xdg/Bitwarden CLI"
echo "PASS: receive and serve fail closed in Development; help remains available"
