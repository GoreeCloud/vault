#!/usr/bin/env python3
"""Validate GoreeCloud Vault Server identity, governance, and production-readiness contracts."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = {
    "README.md",
    "VAULT.md",
    "BRANDING.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "FEATURE-ROADMAP.md",
    "USER-MANUAL.md",
    "goreecloud.platform.yaml",
    "docs/SERVER-IDENTITY.md",
    "docs/server-identity.json",
    "docs/GLAZE-UI.md",
    "docs/OPEN-READINESS-BLOCKERS.md",
    "docs/PRODUCTION-DEPLOYMENT.md",
    "docs/PRODUCTION-READINESS.md",
    "docs/RC-EVIDENCE.md",
    "docs/REPOSITORY-STRUCTURE.md",
    "docs/ROADMAP.md",
    "docs/SECURITY-MODEL.md",
    "docs/STABLE-EVIDENCE.md",
    "docs/UPSTREAM.md",
    "docs/WEB-CLIENT-CONTRACT.md",
    "scripts/validate-glaze-ui.py",
    "scripts/validate-production-deployment.sh",
    "scripts/validate-stable-evidence.py",
}

FORBIDDEN_INHERITED_REPOSITORY_UX = {
    ".github/FUNDING.yml": "upstream maintainer funding links must not be presented as GoreeCloud Vault Server funding",
    ".github/security-contact.gif": "the inherited upstream security-contact asset must not override GoreeCloud reporting",
    ".github/ISSUE_TEMPLATE/bug_report.yml": "the inherited Vaultwarden bug template is incompatible with GoreeCloud Vault Server issue policy",
    ".github/ISSUE_TEMPLATE/config.yml": "the inherited Vaultwarden support-routing links are not GoreeCloud support paths",
}

PLATFORM_SYSTEMS = (
    "GoreeCloud Manager",
    "Privacy Shield",
    "Wardveil Security",
    "Everkeep",
    "Glaze UI",
    "GoreeCloud Mesh",
    "GoreeCloud Identity",
)

CANONICAL_REPOSITORY = "GoreeCloud/goreecloud-vault"
RETIRED_REPOSITORY = "GoreeCloud/goreecloud-vault-server"


class ReadinessError(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ReadinessError(message)


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def validate_files() -> None:
    missing = sorted(path for path in REQUIRED_FILES if not (ROOT / path).is_file())
    require(not missing, f"missing required GoreeCloud Vault Server repository files: {', '.join(missing)}")
    require(not (ROOT / "GOREVAULT.md").exists(), "retired active product document GOREVAULT.md must not exist")
    for path, reason in sorted(FORBIDDEN_INHERITED_REPOSITORY_UX.items()):
        require(not (ROOT / path).exists(), f"forbidden inherited repository UX exists at {path}: {reason}")


def validate_readme() -> None:
    text = read("README.md")
    require(text.startswith("# GoreeCloud Vault Server\n"), "README.md must begin with the GoreeCloud Vault Server identity")
    require(not text.startswith("# GoreeVault Server\n"), "README.md must not use the retired GoreeVault Server heading")
    require("Vaultwarden Logo" not in text, "README.md must not present the upstream Vaultwarden logo as GoreeCloud identity")
    require("vaultwarden/server:latest" not in text, "README.md must not recommend mutable upstream latest images")
    require("goreevault-server:latest" not in text, "README.md must not recommend the legacy mutable GoreeVault latest image")
    require("goreecloud-vault-server:latest" not in text, "README.md must not recommend a mutable GoreeCloud Vault Server latest image")
    require("docs/SERVER-IDENTITY.md" in text, "README.md must link the canonical server identity contract")
    require("docs/REPOSITORY-STRUCTURE.md" in text, "README.md must link the repository structure contract")
    require("VAULT.md" in text, "README.md must link the current product-family record")
    require(CANONICAL_REPOSITORY in text, "README.md must identify the canonical GoreeCloud Vault product-family repository")
    require("product-family source-control boundary" in text, "README.md must document the shared repository component boundary")
    require("GoreeVault is retired" in text, "README.md must record retirement of the former product name")
    require("GoreeCloud Vault Web" in text and "GoreeCloud Vault CLI" in text, "README.md must use current Vault family names")
    require("multi-user" in text.lower(), "README.md must document GoreeCloud Vault Server multi-user readiness")
    require("Glaze UI" in text, "README.md must document Glaze UI")
    require("not approved" in text.lower(), "README.md must state the current non-Stable production boundary")
    for system in PLATFORM_SYSTEMS:
        require(system in text, f"README.md must evaluate current platform system: {system}")


def validate_server_identity() -> None:
    human = read("docs/SERVER-IDENTITY.md")
    require("# GoreeCloud Vault Server Identity\n" in human, "human-readable server identity heading is missing")
    require("former server name **GoreeVault Server**" in human, "server identity must record the retired server name")
    require("former product name **GoreeVault** is retired" in human, "server identity must record retirement of the former product name")
    require("GoreeCloud Vault Web" in human and "GoreeCloud Vault CLI" in human, "server identity must use current family names")
    require(CANONICAL_REPOSITORY in human, "server identity must identify the canonical product-family repository")
    require("previous repository slug `GoreeCloud/goreecloud-vault-server` is retired" in human, "server identity must classify the prior repository slug as historical")

    try:
        data = json.loads(read("docs/server-identity.json"))
    except json.JSONDecodeError as exc:
        raise ReadinessError(f"server identity manifest is invalid JSON: {exc}") from exc

    expected = {
        "schema_version": 2,
        "canonical_name": "GoreeCloud Vault Server",
        "product_family_name": "GoreeCloud Vault",
        "short_name": "Vault Server",
        "repository": CANONICAL_REPOSITORY,
        "canonical_service_url": "https://vault.goreecloud.com",
        "former_server_name": "GoreeVault Server",
        "retired_product_name": "GoreeVault",
        "development_model": "forked-to-native-transitional",
        "upstream_project": "Vaultwarden",
        "upstream_repository": "dani-garcia/vaultwarden",
        "design_language": "Glaze UI",
        "security_framework": "Wardveil Security",
        "privacy_framework": "Privacy Shield",
        "continuity_framework": "Everkeep",
        "license": "AGPL-3.0-only",
        "lifecycle": "development",
        "stable_approved": False,
    }
    for key, value in expected.items():
        require(data.get(key) == value, f"server identity manifest has unexpected {key!r}: {data.get(key)!r}")
    require(set(data) == set(expected), "server identity manifest contains unsupported fields")


def validate_codeowners() -> None:
    text = read(".github/CODEOWNERS")
    required = {
        "/README.md @GoreeCloud",
        "/VAULT.md @GoreeCloud",
        "/goreecloud.platform.yaml @GoreeCloud",
        "/docs/** @GoreeCloud",
        "/src/** @GoreeCloud",
        "/tests/** @GoreeCloud",
        "/scripts/** @GoreeCloud",
        "/deploy/** @GoreeCloud",
    }
    missing = sorted(line for line in required if line not in text)
    require(not missing, f"CODEOWNERS is missing GoreeCloud review ownership: {', '.join(missing)}")
    require("/GOREVAULT.md @GoreeCloud" not in text, "CODEOWNERS must not treat the retired product document as current")


def validate_security_reporting() -> None:
    text = read("SECURITY.md")
    require("security@goreecloud.com" in text, "SECURITY.md must provide the private GoreeCloud security contact")
    require("https://www.goreecloud.com/security.html" in text, "SECURITY.md must reference the canonical public GoreeCloud security policy")
    require("ordinary GitHub Issues disabled" in text, "SECURITY.md must document that ordinary GitHub Issues are not a reporting fallback")
    require("public issue is **not** the security-reporting fallback" in text, "SECURITY.md must reject public issue disclosure as the fallback path")
    require("private vulnerability reporting" in text.lower(), "SECURITY.md must prefer GitHub private vulnerability reporting when available")


def validate_goreecloud_gates() -> None:
    vault = read("VAULT.md")
    readiness = read("docs/PRODUCTION-READINESS.md")
    glaze = read("docs/GLAZE-UI.md")
    stable = read("docs/STABLE-EVIDENCE.md")
    blockers = read("docs/OPEN-READINESS-BLOCKERS.md")

    require("GoreeCloud Vault" in vault, "VAULT.md must preserve the current product identity")
    require("GoreeVault** is retired" in vault, "VAULT.md must record retirement of the former product identity")
    for token, label in (("multi-user", "multi-user"), ("security", "security"), ("Glaze UI", "Glaze UI")):
        require(token.lower() in readiness.lower(), f"docs/PRODUCTION-READINESS.md must document the mandatory {label} gate")
    require("temporary development divergence" in glaze, "docs/GLAZE-UI.md must classify the upstream browser vault as temporary development divergence")
    require("No production Glaze UI exception is approved" in glaze, "docs/GLAZE-UI.md must not silently approve an upstream styling exception")
    require("Stable is therefore blocked" in readiness, "docs/PRODUCTION-READINESS.md must explicitly block Stable while required acceptance is incomplete")
    require("Schema version 2" in stable, "docs/STABLE-EVIDENCE.md must use the multi-user/Glaze-aware Stable evidence schema")
    for blocker in (
        "GitHub repository governance",
        "Real supported-client matrix",
        "Real WebAuthn/passkey path",
        "Target-environment production rehearsal",
        "Product-wide Glaze UI ownership",
        "Exact-RC Stable evidence",
        "Integral Platform System acceptance",
    ):
        require(blocker in blockers, f"open readiness tracker is missing blocker: {blocker}")
    require("Status:** Stable blocked" in blockers, "open readiness tracker must preserve the Stable-blocked state")


def validate_canonical_product_records() -> None:
    records = {
        "CONTRIBUTING.md": read("CONTRIBUTING.md"),
        "USER-MANUAL.md": read("USER-MANUAL.md"),
        "docs/ROADMAP.md": read("docs/ROADMAP.md"),
        "docs/OPEN-READINESS-BLOCKERS.md": read("docs/OPEN-READINESS-BLOCKERS.md"),
        "docs/RC-EVIDENCE.md": read("docs/RC-EVIDENCE.md"),
        "docs/REPOSITORY-STRUCTURE.md": read("docs/REPOSITORY-STRUCTURE.md"),
        "docs/PRODUCTION-READINESS.md": read("docs/PRODUCTION-READINESS.md"),
        "docs/SECURITY-MODEL.md": read("docs/SECURITY-MODEL.md"),
        "docs/STABLE-EVIDENCE.md": read("docs/STABLE-EVIDENCE.md"),
        "docs/UPSTREAM.md": read("docs/UPSTREAM.md"),
    }

    required = {
        "CONTRIBUTING.md": (
            "GoreeVault is retired",
            "GoreeCloud Vault Web",
            "goreecloud.platform.yaml",
            "fail-closed",
        ),
        "USER-MANUAL.md": (
            "GoreeVault is retired",
            "GoreeCloud Vault Web Argon2id work",
            "goreecloud.platform.yaml",
            "overall conformance as nonconformant",
        ),
        "docs/ROADMAP.md": (
            "GoreeVault is retired",
            "GoreeCloud Vault Web foundation",
            "GoreeCloud Vault Browser foundation",
            "GoreeCloud Vault Desktop foundation",
            "GoreeCloud Vault Mobile foundation",
            CANONICAL_REPOSITORY,
            "web-client/",
        ),
        "docs/OPEN-READINESS-BLOCKERS.md": (
            "GoreeVault is retired",
            "GoreeCloud Vault Web completion",
            CANONICAL_REPOSITORY,
            "compatibility-sensitive `GoreeVault`/`goreevault` identifiers",
            "Blocker 7 — Integral Platform System acceptance",
            "overall service conformance as nonconformant",
        ),
        "docs/RC-EVIDENCE.md": (
            "GoreeVault is retired",
            "GoreeCloud Vault Web",
            "Transactional email presentation uses the documented GoreeCloud Vault family identity",
            "legacy automation identifiers",
            "compatibility-era evidence filename",
            "## Integral Platform System acceptance",
            "All applicable Integral Platform Systems independently accepted for this candidate: NO",
            "schema-version-2 `goreevault-stable-evidence.json` has no dedicated fields",
        ),
        "docs/REPOSITORY-STRUCTURE.md": (
            "GoreeVault is retired",
            "### `VAULT.md`",
            "### `goreecloud.platform.yaml`",
            "### `web-client/`",
            CANONICAL_REPOSITORY,
            "Future client component directories",
        ),
        "docs/PRODUCTION-READINESS.md": (
            "GoreeVault is retired",
            "## Integral Platform System acceptance",
            "goreecloud.platform.yaml",
            "schema version 2 does not accept ad hoc platform-system fields",
        ),
        "docs/SECURITY-MODEL.md": (
            "GoreeVault is retired",
            "Do not claim Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Manager, or Glaze UI acceptance",
        ),
        "docs/STABLE-EVIDENCE.md": (
            "GoreeVault is retired",
            "### Integral Platform System boundary",
            "schema-version-2 JSON does **not** contain dedicated evidence objects",
            "Do not add ad hoc fields to the Stable JSON",
            "overall GoreeCloud Platform Contract conformance",
        ),
        "docs/UPSTREAM.md": (
            "GoreeVault is retired",
            "point-in-time historical snapshot",
        ),
    }
    for path, tokens in required.items():
        missing = [token for token in tokens if token not in records[path]]
        require(not missing, f"{path} is missing canonical GoreeCloud Vault policy controls: {', '.join(missing)}")

    for path in ("USER-MANUAL.md", "docs/PRODUCTION-READINESS.md", "docs/RC-EVIDENCE.md"):
        for system in PLATFORM_SYSTEMS:
            require(system in records[path], f"{path} is missing Integral Platform System: {system}")

    forbidden_phrases = (
        "`GoreeVault` remains the broader client-family",
        "GoreeVault remains a broader client-family",
        "GoreeVault remains the broader client-family",
        "Do not rename the GoreeVault client family",
        "until GoreeVault owns the primary browser vault",
        "future GoreeVault Web boundary",
        "future GoreeVault Web",
        "approved current path is GoreeVault Web",
        "documented GoreeVault-family identity",
        "## v0.3.0 — GoreeVault Web foundation",
        "## v0.4.0 — GoreeVault Browser foundation",
        "## v0.5.0 — GoreeVault Desktop foundation",
        "## v0.6.0 — GoreeVault Mobile foundation",
        "GoreeCloud/goreevault-web",
        "GoreeCloud/goreecloud-vault-web",
        "### `GOREVAULT.md`",
    )
    for path, text in records.items():
        stale = [phrase for phrase in forbidden_phrases if phrase in text]
        require(not stale, f"{path} contains retired current-product wording: {', '.join(stale)}")


def validate_stable_template() -> None:
    text = read("docs/stable-evidence.example.json")
    required_tokens = {
        '"schema_version": 2',
        '"multi_user"',
        '"glaze_ui"',
        '"product_wide_conformance": true',
        '"primary_browser_vault_goreecloud_owned": true',
        '"private_vault_isolation": true',
    }
    missing = sorted(token for token in required_tokens if token not in text)
    require(not missing, f"Stable evidence template is missing required readiness fields: {', '.join(missing)}")


def validate_mutable_production_examples() -> None:
    paths = ["README.md", "docs/PRODUCTION-DEPLOYMENT.md", "deploy/compose.production.yaml", "deploy/.env.production.example"]
    mutable_image = re.compile(r"(?:image\s*:\s*|docker\s+(?:pull|run)\s+)[^\s]+:latest\b", re.IGNORECASE)
    for path in paths:
        text = read(path)
        match = mutable_image.search(text)
        require(match is None, f"{path} contains a mutable :latest production image example: {match.group(0) if match else ''}")


def validate_platform_contract() -> None:
    text = read("goreecloud.platform.yaml")
    for token in (
        "schema_version: '0.2'", "id: goreecloud-vault-server", "product_name: GoreeCloud Vault Server",
        "product_family: GoreeCloud Vault", "lifecycle: development", "manager:", "privacy_shield:",
        "wardveil_security:", "everkeep:", "glaze_ui:", "mesh:", "identity:",
        "glaze_ui_required: '1.3.0'", "status: nonconformant",
    ):
        require(token in text, f"platform contract is missing required token: {token}")
    require(text.count("result: applicable-blocked") >= 7, "all seven current platform systems must remain explicitly blocked until accepted")
    require("No Stable or production-approved release evidence is declared" in text, "platform contract must preserve the release boundary")


def main() -> int:
    try:
        validate_files()
        validate_readme()
        validate_server_identity()
        validate_codeowners()
        validate_security_reporting()
        validate_goreecloud_gates()
        validate_canonical_product_records()
        validate_stable_template()
        validate_mutable_production_examples()
        validate_platform_contract()
    except (OSError, UnicodeError, ReadinessError) as exc:
        print(f"Repository readiness validation failed: {exc}", file=sys.stderr)
        return 1
    print("GoreeCloud Vault Server repository readiness validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
