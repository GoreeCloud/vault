#!/usr/bin/env bash
# Development-only CLI startup check. No credentials, network login, or existing home.
set -euo pipefail
bundle="${1:-dist/apps/cli/oss-dev/bw.js}"
test -f "$bundle"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary/home" "$temporary/xdg"
# Deliberately present an upstream override; GoreeCloud Vault must ignore it.
env -u GOREECLOUD_VAULT_CLI_DATA_DIR \
  HOME="$temporary/home" XDG_CONFIG_HOME="$temporary/xdg" \
  BITWARDENCLI_APPDATA_DIR="$temporary/bitwarden-existing" \
  NODE_ENV=test node "$bundle" --help > "$temporary/help.txt" 2>&1
grep -q '^Usage: bw ' "$temporary/help.txt"
test -f "$temporary/xdg/GoreeCloud Vault CLI/data.json"
test ! -e "$temporary/bitwarden-existing"
test ! -e "$temporary/xdg/Bitwarden CLI"
test ! -e "$temporary/home/.config/Bitwarden CLI"
# An explicit GoreeCloud override must be isolated from the default profile.
env HOME="$temporary/home" XDG_CONFIG_HOME="$temporary/xdg" \
  GOREECLOUD_VAULT_CLI_DATA_DIR="$temporary/goreecloud-override" \
  BITWARDENCLI_APPDATA_DIR="$temporary/bitwarden-existing" \
  NODE_ENV=test node "$bundle" --help > "$temporary/override.txt" 2>&1
test -f "$temporary/goreecloud-override/data.json"
test ! -e "$temporary/bitwarden-existing"
# Reject relative profile overrides instead of silently using the working directory.
if env HOME="$temporary/home" XDG_CONFIG_HOME="$temporary/xdg" \
  GOREECLOUD_VAULT_CLI_DATA_DIR="relative-vault-data" NODE_ENV=test \
  node "$bundle" --help > "$temporary/rejected.txt" 2>&1; then
  echo "Relative GoreeCloud Vault CLI profile override was incorrectly accepted." >&2
  exit 1
fi
grep -q 'GOREECLOUD_VAULT_CLI_DATA_DIR must be an absolute path' "$temporary/rejected.txt"
test ! -e relative-vault-data
echo "PASS: isolated GoreeCloud Vault CLI data paths, upstream override ignored, relative path rejected"
