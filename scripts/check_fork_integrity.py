#!/usr/bin/env python3
"""Bounded import guard; not a license audit, SBOM, or security certification."""

from pathlib import Path
import re
import sys

REQUIRED = ("LICENSE.txt", "LICENSE_GPL.txt", "LICENSE_BITWARDEN.txt", "docs/UPSTREAM.md")

def check(root: Path) -> list[str]:
    errors = []
    if (root / "bitwarden_license").exists() or (root / "bitwarden_license").is_symlink():
        errors.append("commercial bitwarden_license/ source must not be imported")
    for relative in REQUIRED:
        if not (root / relative).is_file() or not (root / relative).stat().st_size:
            errors.append(f"missing required source/license record: {relative}")
    provenance = root / "docs" / "UPSTREAM.md"
    if provenance.is_file():
        record = provenance.read_text(encoding="utf-8")
        if not re.search(r"\b[0-9a-f]{40}\b", record):
            errors.append("upstream provenance does not contain a full commit SHA")
        if "bitwarden/clients" not in record:
            errors.append("upstream repository not identified")
    return errors

if __name__ == "__main__":
    repo = Path(__file__).resolve().parents[1]
    issues = check(repo)
    for issue in issues:
        print("FAIL:", issue, file=sys.stderr)
    if issues:
        sys.exit(1)
    print("PASS: bounded GPL-source import boundary and provenance checks")
