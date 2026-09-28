#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "README.md",
    "PROJECT-SPECIFICATIONS.md",
    "PROJECT-RECORD.md",
    "IMPLEMENTED-FEATURES.md",
    "PLANNED-FEATURES.md",
    "CHANGELOGS.md",
    "NOTES.md",
    "ARCHITECTURE.md",
    "SECURITY.md",
    "PRIVACY.md",
    "PLATFORM-INTEGRATIONS.md",
    "THREAT-MODEL.md",
    "CRYPTOGRAPHY.md",
    "goreecloud.platform.yaml",
    ".editorconfig",
    "go.mod",
    "cmd/goreecloud-vault/main.go",
    "internal/app/server.go",
    "internal/app/server_test.go",
    "internal/config/config.go",
    "internal/config/config_test.go",
    ".github/workflows/ci.yml",
    ".github/workflows/vulnerability.yml",
)

FORBIDDEN_FILES = (
    "FEATURE-ROADMAP.md",
)

REQUIRED_TEXT = {
    "README.md": (
        "Lifecycle: Active Development — pre-Stable.",
        "does **not** yet implement credential storage",
    ),
    "IMPLEMENTED-FEATURES.md": (
        "No numbered GoreeCloud Vault product capability",
        "Verified Development foundation",
    ),
    "SECURITY.md": (
        "GitHub issue #4",
        "protected secret persistence remains blocked",
        "supporting evidence only and does not substitute for human security review",
    ),
    "THREAT-MODEL.md": (
        "pending explicit human security review",
        "VLT-005 remains blocked",
    ),
    "CRYPTOGRAPHY.md": (
        "pending explicit human security review",
        "does not authorize protected secret persistence",
    ),
    "ARCHITECTURE.md": (
        "pending explicit human security review",
        "does not authorize secret persistence",
    ),
    "goreecloud.platform.yaml": (
        'schema_version: "0.4"',
        "lifecycle: development",
        "status: nonconformant",
        "GitHub issue #4",
    ),
}

def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)


def main() -> int:
    errors = 0

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.is_file():
            fail(f"required repository file is missing: {rel}")
            errors += 1

    for rel in FORBIDDEN_FILES:
        if (ROOT / rel).exists():
            fail(f"retired/forbidden repository file exists: {rel}")
            errors += 1

    for rel, snippets in REQUIRED_TEXT.items():
        path = ROOT / rel
        if not path.is_file():
            continue
        content = path.read_text(encoding="utf-8")
        for snippet in snippets:
            if snippet not in content:
                fail(f"{rel} is missing required governance text: {snippet!r}")
                errors += 1

    if errors:
        print(f"Repository governance validation failed with {errors} error(s).", file=sys.stderr)
        return 1

    print("Repository governance validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
