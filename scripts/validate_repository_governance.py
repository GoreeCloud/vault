#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "README.md",
    "SPECIFICATIONS.md",
    "PROJECT-SPECIFICATIONS.md",
    "PROJECT-RECORD.md",
    "FEATURES.md",
    "IMPLEMENTED-FEATURES.md",
    "PLANNED-FEATURES.md",
    "BENEFITS.md",
    "COMPETITIVE-OBJECTIVES.md",
    "BRANDING.md",
    "USER-MANUAL.md",
    "CHANGELOGS.md",
    "NOTES.md",
    "ARCHITECTURE.md",
    "SECURITY.md",
    "PRIVACY.md",
    "PLATFORM-INTEGRATIONS.md",
    "THREAT-MODEL.md",
    "CRYPTOGRAPHY.md",
    "goreecloud.platform.yaml",
    ".gitignore",
    ".editorconfig",
    "go.mod",
    "cmd/goreecloud-vault/main.go",
    "internal/app/server.go",
    "internal/app/server_test.go",
    "internal/config/config.go",
    "internal/config/config_test.go",
    ".github/workflows/ci.yml",
    ".github/workflows/vulnerability.yml",
    ".github/workflows/repository-governance.yml",
)

FORBIDDEN_FILES = ("FEATURE-ROADMAP.md",)

REQUIRED_TEXT = {
    "README.md": (
        "Lifecycle: Active Development — pre-Stable.",
        "does **not** yet implement credential storage",
    ),
    "SPECIFICATIONS.md": (
        "PROJECT-SPECIFICATIONS.md",
        "must not become a parallel or conflicting authority",
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
        "id: goreecloud-vault",
        "lifecycle: development",
        "status: nonconformant",
        "GitHub issue #4",
    ),
}

PLATFORM_SYSTEMS = (
    "GoreeCloud Manager",
    "Privacy Shield",
    "Wardveil Security",
    "Everkeep",
    "Glaze UI",
    "GoreeCloud Mesh",
    "GoreeCloud Identity",
    "GoreeCloud Policy",
    "GoreeCloud Observability",
)

GITIGNORE_REQUIRED = (
    ".env",
    ".env.*",
    "secrets/",
    "*.key",
    "*.pem",
)

def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)

def main() -> int:
    errors = 0

    for rel in REQUIRED_FILES:
        path = ROOT / rel
        if not path.is_file() or path.is_symlink():
            fail(f"required repository file is missing, non-regular, or symlinked: {rel}")
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

    integrations = ROOT / "PLATFORM-INTEGRATIONS.md"
    if integrations.is_file():
        content = integrations.read_text(encoding="utf-8")
        for system in PLATFORM_SYSTEMS:
            if system not in content:
                fail(f"PLATFORM-INTEGRATIONS.md is missing Integral Platform System: {system}")
                errors += 1

    gitignore = ROOT / ".gitignore"
    if gitignore.is_file():
        ignored = {line.strip() for line in gitignore.read_text(encoding="utf-8").splitlines()}
        for pattern in GITIGNORE_REQUIRED:
            if pattern not in ignored:
                fail(f".gitignore is missing sensitive-file pattern: {pattern}")
                errors += 1

    if errors:
        print(f"Repository governance validation failed with {errors} error(s).", file=sys.stderr)
        return 1

    print("Repository governance validation passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
