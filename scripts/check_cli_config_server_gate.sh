#!/usr/bin/env bash
# Development-only CLI configuration test. No live user account, login or network target.
set -euo pipefail
bundle="${1:-dist/apps/cli/oss-dev/bw.js}"
test -f "$bundle"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/home" "$tmp/xdg"
export HOME="$tmp/home" XDG_CONFIG_HOME="$tmp/xdg" NODE_ENV=test
unset GOREECLOUD_VAULT_SESSION GOREECLOUD_VAULT_CLIENT_ID GOREECLOUD_VAULT_CLIENT_SECRET
if node "$bundle" sync > "$tmp/sync" 2>&1; then
  echo "Unconfigured CLI sync was incorrectly permitted" >&2; exit 1
fi
grep -q 'Inherited Bitwarden cloud regions are disabled' "$tmp/sync"
node "$bundle" config server > "$tmp/inspect" 2>&1
grep -q 'No GoreeCloud Vault development server configured' "$tmp/inspect"
if node "$bundle" config server https://api.bitwarden.com > "$tmp/vendor" 2>&1; then
  echo "Inherited provider endpoint was accepted" >&2; exit 1
fi
grep -q 'Inherited upstream service endpoints are disabled' "$tmp/vendor"
if node "$bundle" config server http://vault.example.test > "$tmp/insecure" 2>&1; then
  echo "Insecure remote endpoint was accepted" >&2; exit 1
fi
grep -q 'Remote Vault services require HTTPS' "$tmp/insecure"
test -f "$tmp/xdg/GoreeCloud Vault CLI/data.json"
test ! -e "$tmp/xdg/Bitwarden CLI"
echo "PASS: CLI startup and config reject inherited/unconfigured service destinations"
