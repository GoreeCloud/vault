#!/usr/bin/env bash
# Work around transient HTTP 520 responses from Ubuntu's HTTP security mirror
# on GitHub-hosted Ubuntu runners. This edits URI transport only.
# Suites, Components, Signed-By, and apt signature checks are unchanged.
set -euo pipefail

source_file=/etc/apt/sources.list.d/ubuntu.sources
if (( $# > 0 )); then
  source_file="$1"
fi
if [[ ! -f "$source_file" ]]; then
  printf 'Ubuntu deb822 sources file absent; leaving apt setup unchanged.\n'
  exit 0
fi

sed -i -E \
  -e 's@mirror\+file:///etc/apt/apt-mirrors[.]txt@https://archive.ubuntu.com/ubuntu@g' \
  -e 's@http://[a-z0-9.-]*ec2[.]archive[.]ubuntu[.]com/ubuntu@https://archive.ubuntu.com/ubuntu@g' \
  -e 's@http://archive[.]ubuntu[.]com/ubuntu@https://archive.ubuntu.com/ubuntu@g' \
  -e 's@http://security[.]ubuntu[.]com/ubuntu@https://security.ubuntu.com/ubuntu@g' \
  "$source_file"
