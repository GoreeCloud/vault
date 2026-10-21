#!/usr/bin/env bash
# Synthetic home, no user session, and no CLI updater HTTP calls permitted.
set -euo pipefail
bundle="${1:-dist/apps/cli/oss-dev/bw.js}"
test -f "$bundle"
temporary="$(mktemp -d)"
trap 'rm -rf "$temporary"' EXIT
mkdir -p "$temporary/home" "$temporary/xdg"
status=0
env HOME="$temporary/home" XDG_CONFIG_HOME="$temporary/xdg" NODE_ENV=test \
  node "$bundle" update > "$temporary/update.txt" 2>&1 || status=$?
# The update action is intentionally denied; accept an error exit or the
# inherited CLI command wrapper's structured error response, not a success.
grep -q 'GoreeCloud Vault CLI update checks are disabled' "$temporary/update.txt"
if grep -qE 'api.github.com/repos/bitwarden/clients/releases|npm install -g @bitwarden/cli|github.com/bitwarden/clients/releases' "$temporary/update.txt"; then
  echo "Unexpected upstream CLI update instructions." >&2
  exit 1
fi
echo "PASS: CLI update is explicitly disabled without upstream release instructions (exit $status)"
