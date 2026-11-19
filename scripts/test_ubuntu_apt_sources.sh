#!/usr/bin/env bash
# Local fixtures only; no system apt paths are changed.
set -euo pipefail
cd "$(dirname "$0")/.."
tempdir="$(mktemp -d)"
trap 'rm -rf "$tempdir"' EXIT
fixture="$tempdir/ubuntu.sources"
cat > "$fixture" <<'SOURCES'
Types: deb
URIs: mirror+file:///etc/apt/apt-mirrors.txt
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: http://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
SOURCES

validate() {
  local path="$1"
  grep -Fqx 'URIs: https://archive.ubuntu.com/ubuntu' "$path"
  grep -Fqx 'URIs: https://security.ubuntu.com/ubuntu' "$path"
  grep -Fqx 'Suites: noble noble-updates noble-backports' "$path"
  grep -Fqx 'Suites: noble-security' "$path"
  test "$(grep -Fc 'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg' "$path")" -eq 2
  if grep -Eq '(^URIs: http:|mirror\+file:|Trusted: yes|Allow-Insecure:|Check-Valid-Until: no)' "$path"; then
    echo "Insecure Ubuntu apt source fixture" >&2
    exit 1
  fi
}
bash scripts/prepare_ubuntu_apt_sources.sh "$fixture"
validate "$fixture"
cp "$fixture" "$tempdir/expected"
bash scripts/prepare_ubuntu_apt_sources.sh "$fixture"
cmp "$tempdir/expected" "$fixture"

# Regression: GitHub runner omitted the Ubuntu deb822 file entirely, and
# apt fetched only third-party packages. Reconstruct signed official sources.
missing="$tempdir/no-ubuntu.sources"
bash scripts/prepare_ubuntu_apt_sources.sh "$missing"
validate "$missing"
cp "$missing" "$tempdir/fallback"
bash scripts/prepare_ubuntu_apt_sources.sh "$missing"
cmp "$tempdir/fallback" "$missing"

# Another possible runner image has an unrelated deb822 file but no Ubuntu.
other="$tempdir/other.sources"
cat > "$other" <<'THIRD'
Types: deb
URIs: https://packages.example.invalid/stable
Suites: noble
Components: main
Signed-By: /usr/share/keyrings/example.gpg
THIRD
bash scripts/prepare_ubuntu_apt_sources.sh "$other"
grep -Fq 'URIs: https://packages.example.invalid/stable' "$other"
validate "$other"

# A redirected source path cannot be used to rewrite an unrelated file.
ln -s "$missing" "$tempdir/redirected.sources"
if bash scripts/prepare_ubuntu_apt_sources.sh "$tempdir/redirected.sources" >/dev/null 2>&1; then
  echo 'Symlinked sources path should have been rejected' >&2
  exit 1
fi
echo 'Ubuntu signed HTTPS mirror rewrite, fallback and idempotence PASS'
