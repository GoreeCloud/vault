#!/usr/bin/env bash
# GitHub-hosted Ubuntu 24.04 CI only: normalize Ubuntu mirrors to HTTPS and
# restore official, Signed-By Ubuntu sources if runner images omit them.
# Do not disable apt signature validation, CA checks, or repository expiry.
set -euo pipefail

source_file=/etc/apt/sources.list.d/ubuntu.sources
if (( $# > 0 )); then source_file="$1"; fi
if [[ -L "$source_file" ]] || [[ -e "$source_file" && ! -f "$source_file" ]]; then
  echo "Ubuntu sources path is not a regular file" >&2
  exit 1
fi
if [[ -f "$source_file" ]]; then
  sed -i -E \
    -e 's@mirror\+file:///etc/apt/apt-mirrors[.]txt@https://archive.ubuntu.com/ubuntu@g' \
    -e 's@http://[a-z0-9.-]*ec2[.]archive[.]ubuntu[.]com/ubuntu@https://archive.ubuntu.com/ubuntu@g' \
    -e 's@http://archive[.]ubuntu[.]com/ubuntu@https://archive.ubuntu.com/ubuntu@g' \
    -e 's@http://security[.]ubuntu[.]com/ubuntu@https://security.ubuntu.com/ubuntu@g' \
    "$source_file"
fi

# On some hosted runners this file does not exist, so a rewrite alone is a
# silent success with no Ubuntu packages available. Verify BOTH repositories.
archive_present=0
security_present=0
if [[ -f "$source_file" ]]; then
  grep -Eq '^URIs: .*https://archive[.]ubuntu[.]com/ubuntu([[:space:]]|$)' "$source_file" && archive_present=1
  grep -Eq '^URIs: .*https://security[.]ubuntu[.]com/ubuntu([[:space:]]|$)' "$source_file" && security_present=1
fi
if (( archive_present == 1 && security_present == 1 )); then exit 0; fi

# Make any fallback fail closed outside the exact OS suite supported by CI.
# VERSION_CODENAME is provided by the trusted runner OS, not repository data.
# shellcheck disable=SC1091
. /etc/os-release
if [[ "$VERSION_CODENAME" != "noble" ]] ||
   [[ ! -r /usr/share/keyrings/ubuntu-archive-keyring.gpg ]]; then
  echo "Cannot restore signed Ubuntu noble repositories safely" >&2
  exit 1
fi
mkdir -p "$(dirname "$source_file")"
if (( archive_present == 0 )); then
  cat >> "$source_file" <<'ARCHIVE'

Types: deb
URIs: https://archive.ubuntu.com/ubuntu
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
ARCHIVE
fi
if (( security_present == 0 )); then
  cat >> "$source_file" <<'SECURITY'

Types: deb
URIs: https://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
SECURITY
fi
