#!/usr/bin/env bash
# Repository-local deterministic fixture; never touches host apt sources.
set -euo pipefail
cd "$(dirname "$0")/.."
source_file="$(mktemp)"
snapshot="$(mktemp)"
trap 'rm -f "$source_file" "$snapshot"' EXIT

cat > "$source_file" <<'SOURCES'
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

bash scripts/prepare_ubuntu_apt_sources.sh "$source_file"

grep -Fqx 'URIs: https://archive.ubuntu.com/ubuntu' "$source_file"
grep -Fqx 'URIs: https://security.ubuntu.com/ubuntu' "$source_file"
grep -Fqx 'Suites: noble noble-updates noble-backports' "$source_file"
grep -Fqx 'Suites: noble-security' "$source_file"
test "$(grep -Fc 'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg' "$source_file")" -eq 2
if grep -Eq '(^URIs: http:|mirror\+file:|Trusted: yes|Allow-Insecure:|Check-Valid-Until: no)' "$source_file"; then
  echo 'Insecure apt source rewrite' >&2
  exit 1
fi
cp "$source_file" "$snapshot"
bash scripts/prepare_ubuntu_apt_sources.sh "$source_file"
cmp -s "$snapshot" "$source_file"
echo 'Ubuntu HTTPS apt-source fixture and idempotence PASS'
