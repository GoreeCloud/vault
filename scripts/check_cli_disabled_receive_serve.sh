#!/usr/bin/env bash
set -euo pipefail
bundle="${1:-dist/apps/cli/oss-dev/bw.js}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/home" "$tmp/xdg"
export HOME="$tmp/home" XDG_CONFIG_HOME="$tmp/xdg" NODE_ENV=test
node "$bundle" config server http://localhost:8089 > "$tmp/config" 2>&1
if node "$bundle" receive 'https://example.invalid/#/send/test/key' > "$tmp/receive" 2>&1; then exit 1; fi
grep -q 'receive and serve are disabled' "$tmp/receive"
if node "$bundle" serve > "$tmp/serve" 2>&1; then exit 1; fi
grep -q 'receive and serve are disabled' "$tmp/serve"
echo "PASS: CLI receives no external links or serve requests during Development"
