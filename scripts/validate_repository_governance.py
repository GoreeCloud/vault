#!/usr/bin/env python3
"""Fail-closed baseline governance validation for GoreeCloud Vault."""

from __future__ import annotations

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_RECORDS = {
    "README.md": "# GoreeCloud Vault",
    "PROJECT-SPECIFICATIONS.md": "# GoreeCloud Vault — Project Specifications",
    "PROJECT-RECORD.md": "# GoreeCloud Vault — Project Record",
    "IMPLEMENTED-FEATURES.md": "# GoreeCloud Vault — Implemented Features",
    "PLANNED-FEATURES.md": "# GoreeCloud Vault — Planned Features",
    "CHANGELOGS.md": "# GoreeCloud Vault — Changelogs",
    "NOTES.md": "# GoreeCloud Vault — Notes",
    "ARCHITECTURE.md": "# GoreeCloud Vault — Architecture",
    "SECURITY.md": "# Security Policy",
    "PRIVACY.md": "# GoreeCloud Vault — Privacy Architecture",
    "PLATFORM-INTEGRATIONS.md": "# GoreeCloud Vault — Integral Platform System Evaluation",
    "THREAT-MODEL.md": "# GoreeCloud Vault — Threat Model",
    "CRYPTOGRAPHY.md": "# GoreeCloud Vault — Cryptographic Architecture",
}

RETIRED_RECORDS = (
    "FEATURE-ROADMAP.md",
)

GITIGNORE_REQUIRED = (
    ".env",
    ".env.*",
    "secrets/",
    "*.key",
    "*.pem",
)


def read_required(relative: str, errors: list[str]) -> str | None:
    path = ROOT / relative
    if not path.is_file() or path.is_symlink():
        errors.append(f"missing, non-regular, or symlinked required root file: {relative}")
        return None
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        errors.append(
            f"required root file is not readable UTF-8: {relative}: {exc.__class__.__name__}"
        )
        return None


def require_text(
    relative: str,
    text: str | None,
    marker: str,
    errors: list[str],
    description: str,
) -> None:
    if text is not None and marker not in text:
        errors.append(f"{relative} is missing {description}: {marker!r}")


def main() -> int:
    errors: list[str] = []
    content: dict[str, str] = {}

    for relative, heading in REQUIRED_RECORDS.items():
        text = read_required(relative, errors)
        if text is None:
            continue
        content[relative] = text
        lines = text.splitlines()
        if not lines or lines[0] != heading:
            errors.append(
                f"unexpected governance identity heading in {relative}; expected {heading!r}"
            )
        if len(text.strip()) < len(heading) + 80:
            errors.append(f"governance record is unexpectedly skeletal: {relative}")

    for relative in RETIRED_RECORDS:
        path = ROOT / relative
        if path.exists() or path.is_symlink():
            errors.append(f"retired repository control must not exist: {relative}")

    implemented = content.get("IMPLEMENTED-FEATURES.md")
    require_text(
        "IMPLEMENTED-FEATURES.md",
        implemented,
        "No numbered GoreeCloud Vault product capability",
        errors,
        "the explicit planned-versus-implemented boundary",
    )

    planned = content.get("PLANNED-FEATURES.md")
    if planned is not None:
        items = re.findall(r"^- \[ \] \*\*(\d+)\.", planned, flags=re.MULTILINE)
        if len(items) != 54:
            errors.append(
                f"PLANNED-FEATURES.md must contain exactly 54 numbered planned capability entries; found {len(items)}"
            )
        elif items != [str(i) for i in range(1, 55)]:
            errors.append(
                "PLANNED-FEATURES.md numbered capability entries must be contiguous from 1 through 54"
            )

    threat = content.get("THREAT-MODEL.md")
    require_text(
        "THREAT-MODEL.md",
        threat,
        "pending explicit human security review",
        errors,
        "the human-review-pending status",
    )
    require_text(
        "THREAT-MODEL.md",
        threat,
        "VLT-005 remains blocked",
        errors,
        "the protected-storage block",
    )

    crypto = content.get("CRYPTOGRAPHY.md")
    require_text(
        "CRYPTOGRAPHY.md",
        crypto,
        "pending explicit human security review",
        errors,
        "the human-review-pending status",
    )
    require_text(
        "CRYPTOGRAPHY.md",
        crypto,
        "does not authorize protected secret persistence",
        errors,
        "the no-secret-persistence gate",
    )

    security = content.get("SECURITY.md")
    require_text(
        "SECURITY.md",
        security,
        "GitHub issue #4",
        errors,
        "the current human security-review issue",
    )
    require_text(
        "SECURITY.md",
        security,
        "protected secret persistence remains blocked",
        errors,
        "the protected-secret persistence block",
    )

    platform = content.get("PLATFORM-INTEGRATIONS.md")
    if platform is not None:
        systems = (
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
        for system in systems:
            if system not in platform:
                errors.append(
                    f"PLATFORM-INTEGRATIONS.md is missing Integral Platform System: {system}"
                )

    gitignore = read_required(".gitignore", errors)
    if gitignore is not None:
        lines = {line.strip() for line in gitignore.splitlines()}
        for pattern in GITIGNORE_REQUIRED:
            if pattern not in lines:
                errors.append(f".gitignore is missing required sensitive-file pattern: {pattern}")

    if errors:
        print("GoreeCloud Vault baseline repository-governance validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print(
        "GoreeCloud Vault baseline repository-governance validation passed: "
        "required project/security records are present and non-skeletal, "
        "54 planned capability entries remain intact, the feature lifecycle boundary is explicit, "
        "the human cryptographic-review gate remains fail-closed, all nine Integral Platform Systems "
        "remain represented, retired FEATURE-ROADMAP.md is absent, and sensitive local files remain ignored."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
