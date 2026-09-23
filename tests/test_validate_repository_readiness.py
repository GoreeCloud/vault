#!/usr/bin/env python3
"""Unit tests for GoreeCloud Vault Server repository-readiness policy validation."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parents[1] / "scripts" / "validate-repository-readiness.py"
SPEC = importlib.util.spec_from_file_location("goreecloud_vault_server_repository_readiness", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load validator from {MODULE_PATH}")
VALIDATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(VALIDATOR)


class RepositoryReadinessTests(unittest.TestCase):
    def setUp(self) -> None:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name)
        self.original_root = VALIDATOR.ROOT
        VALIDATOR.ROOT = self.root
        self.addCleanup(setattr, VALIDATOR, "ROOT", self.original_root)

    def write(self, path: str, text: str) -> None:
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def platform_system_lines(self) -> str:
        return "\n".join(VALIDATOR.PLATFORM_SYSTEMS) + "\n"

    def write_canonical_product_records(self) -> None:
        systems = self.platform_system_lines()
        self.write(
            "CONTRIBUTING.md",
            "GoreeVault is retired. GoreeCloud Vault Web is current.\n"
            "Use goreecloud.platform.yaml and preserve its fail-closed state.\n",
        )
        self.write(
            "USER-MANUAL.md",
            "GoreeVault is retired.\n## GoreeCloud Vault Web Argon2id work\n"
            "Use goreecloud.platform.yaml; it records overall conformance as nonconformant.\n" + systems,
        )
        self.write(
            "docs/ROADMAP.md",
            "GoreeVault is retired.\n"
            "GoreeCloud/goreecloud-vault\nweb-client/\n"
            "## v0.3.0 — GoreeCloud Vault Web foundation\n"
            "## v0.4.0 — GoreeCloud Vault Browser foundation\n"
            "## v0.5.0 — GoreeCloud Vault Desktop foundation\n"
            "## v0.6.0 — GoreeCloud Vault Mobile foundation\n",
        )
        self.write(
            "docs/OPEN-READINESS-BLOCKERS.md",
            "GoreeVault is retired. Historical compatibility-sensitive `GoreeVault`/`goreevault` identifiers may remain.\n"
            "GoreeCloud/goreecloud-vault\n"
            "## Blocker 5 — Product-wide Glaze UI ownership and GoreeCloud Vault Web completion\n"
            "## Blocker 7 — Integral Platform System acceptance\n"
            "overall service conformance as nonconformant\n",
        )
        self.write(
            "docs/RC-EVIDENCE.md",
            "GoreeVault is retired.\n"
            "The future GoreeCloud Vault Web boundary remains blocked.\n"
            "Transactional email presentation uses the documented GoreeCloud Vault family identity.\n"
            "GoreeVault workflow labels are legacy automation identifiers.\n"
            "goreevault-stable-evidence.json is a compatibility-era evidence filename.\n"
            "## Integral Platform System acceptance\n"
            "All applicable Integral Platform Systems independently accepted for this candidate: NO\n"
            "schema-version-2 `goreevault-stable-evidence.json` has no dedicated fields\n" + systems,
        )
        self.write(
            "docs/REPOSITORY-STRUCTURE.md",
            "GoreeVault is retired.\nGoreeCloud/goreecloud-vault\n"
            "### `VAULT.md`\n### `goreecloud.platform.yaml`\n### `web-client/`\n"
            "### Future client component directories\n",
        )
        self.write(
            "docs/PRODUCTION-READINESS.md",
            "GoreeVault is retired.\n## Integral Platform System acceptance\n"
            "Use goreecloud.platform.yaml. schema version 2 does not accept ad hoc platform-system fields.\n" + systems,
        )
        self.write(
            "docs/SECURITY-MODEL.md",
            "GoreeVault is retired.\n"
            "Do not claim Wardveil Security, Privacy Shield, Everkeep, GoreeCloud Mesh, GoreeCloud Identity, GoreeCloud Manager, or Glaze UI acceptance without evidence.\n",
        )
        self.write(
            "docs/STABLE-EVIDENCE.md",
            "GoreeVault is retired.\n### Integral Platform System boundary\n"
            "The schema-version-2 JSON does **not** contain dedicated evidence objects for all systems.\n"
            "Do not add ad hoc fields to the Stable JSON.\n"
            "A passing file does not prove overall GoreeCloud Platform Contract conformance.\n",
        )
        self.write(
            "docs/UPSTREAM.md",
            "GoreeVault is retired. The audit is a point-in-time historical snapshot.\n",
        )

    def test_codeowners_requires_core_goreecloud_ownership(self) -> None:
        self.write(".github/CODEOWNERS", "/README.md @GoreeCloud\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "CODEOWNERS is missing"):
            VALIDATOR.validate_codeowners()

    def test_codeowners_accepts_required_protected_surfaces(self) -> None:
        required = [
            "/README.md @GoreeCloud",
            "/VAULT.md @GoreeCloud",
            "/goreecloud.platform.yaml @GoreeCloud",
            "/docs/** @GoreeCloud",
            "/src/** @GoreeCloud",
            "/tests/** @GoreeCloud",
            "/scripts/** @GoreeCloud",
            "/deploy/** @GoreeCloud",
        ]
        self.write(".github/CODEOWNERS", "\n".join(required) + "\n")
        VALIDATOR.validate_codeowners()

    def test_readme_rejects_upstream_identity(self) -> None:
        self.write("README.md", "# Vaultwarden\nVaultwarden Logo\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "GoreeCloud Vault Server identity"):
            VALIDATOR.validate_readme()

    def test_readme_rejects_retired_server_heading(self) -> None:
        self.write("README.md", "# GoreeVault Server\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "GoreeCloud Vault Server identity"):
            VALIDATOR.validate_readme()

    def identity_json(
        self,
        canonical_name: str = "GoreeCloud Vault Server",
        repository: str = "GoreeCloud/goreecloud-vault",
    ) -> str:
        return (
            "{\n"
            '  "schema_version": 2,\n'
            f'  "canonical_name": "{canonical_name}",\n'
            '  "product_family_name": "GoreeCloud Vault",\n'
            '  "short_name": "Vault Server",\n'
            f'  "repository": "{repository}",\n'
            '  "canonical_service_url": "https://vault.goreecloud.com",\n'
            '  "former_server_name": "GoreeVault Server",\n'
            '  "retired_product_name": "GoreeVault",\n'
            '  "development_model": "forked-to-native-transitional",\n'
            '  "upstream_project": "Vaultwarden",\n'
            '  "upstream_repository": "dani-garcia/vaultwarden",\n'
            '  "design_language": "Glaze UI",\n'
            '  "security_framework": "Wardveil Security",\n'
            '  "privacy_framework": "Privacy Shield",\n'
            '  "continuity_framework": "Everkeep",\n'
            '  "license": "AGPL-3.0-only",\n'
            '  "lifecycle": "development",\n'
            '  "stable_approved": false\n'
            "}\n"
        )

    def identity_human(self) -> str:
        return (
            "# GoreeCloud Vault Server Identity\n"
            "The former server name **GoreeVault Server** is retired.\n"
            "The former product name **GoreeVault** is retired.\n"
            "GoreeCloud Vault Web and GoreeCloud Vault CLI are current family names.\n"
            "GoreeCloud/goreecloud-vault is canonical.\n"
            "The previous repository slug `GoreeCloud/goreecloud-vault-server` is retired.\n"
        )

    def test_server_identity_manifest_requires_canonical_name(self) -> None:
        self.write("docs/SERVER-IDENTITY.md", self.identity_human())
        self.write("docs/server-identity.json", self.identity_json("GoreeVault Server"))
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "canonical_name"):
            VALIDATOR.validate_server_identity()

    def test_server_identity_manifest_requires_current_repository(self) -> None:
        self.write("docs/SERVER-IDENTITY.md", self.identity_human())
        self.write("docs/server-identity.json", self.identity_json(repository="GoreeCloud/goreecloud-vault-server"))
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "repository"):
            VALIDATOR.validate_server_identity()

    def test_server_identity_manifest_accepts_canonical_contract(self) -> None:
        self.write("docs/SERVER-IDENTITY.md", self.identity_human())
        self.write("docs/server-identity.json", self.identity_json())
        VALIDATOR.validate_server_identity()

    def test_security_reporting_requires_private_goreecloud_path(self) -> None:
        self.write("SECURITY.md", "Please open a public issue.\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "private GoreeCloud security contact"):
            VALIDATOR.validate_security_reporting()

    def test_mutable_latest_production_image_is_rejected(self) -> None:
        self.write("README.md", "docker run ghcr.io/goreecloud/goreecloud-vault-server:latest\n")
        self.write("docs/PRODUCTION-DEPLOYMENT.md", "immutable deployment only\n")
        self.write("deploy/compose.production.yaml", "services: {}\n")
        self.write("deploy/.env.production.example", "IMAGE=example@sha256:" + "a" * 64 + "\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "mutable :latest production image"):
            VALIDATOR.validate_mutable_production_examples()

    def test_immutable_production_examples_pass(self) -> None:
        digest = "sha256:" + "a" * 64
        self.write("README.md", f"docker pull ghcr.io/goreecloud/goreecloud-vault-server@{digest}\n")
        self.write("docs/PRODUCTION-DEPLOYMENT.md", f"docker run ghcr.io/goreecloud/goreecloud-vault-server@{digest}\n")
        self.write("deploy/compose.production.yaml", f"services:\n  app:\n    image: ghcr.io/goreecloud/goreecloud-vault-server@{digest}\n")
        self.write("deploy/.env.production.example", f"GOREECLOUD_VAULT_SERVER_IMAGE=ghcr.io/goreecloud/goreecloud-vault-server@{digest}\n")
        VALIDATOR.validate_mutable_production_examples()

    def test_open_blocker_tracker_must_preserve_all_stable_gates(self) -> None:
        self.write("VAULT.md", "GoreeCloud Vault\n**GoreeVault** is retired\n")
        self.write("docs/PRODUCTION-READINESS.md", "multi-user security Glaze UI\nStable is therefore blocked\n")
        self.write("docs/GLAZE-UI.md", "temporary development divergence\nNo production Glaze UI exception is approved\n")
        self.write("docs/STABLE-EVIDENCE.md", "Schema version 2\n")
        self.write("docs/OPEN-READINESS-BLOCKERS.md", "Status:** Stable blocked\nGitHub repository governance\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "open readiness tracker is missing blocker"):
            VALIDATOR.validate_goreecloud_gates()

    def test_open_blocker_tracker_requires_platform_acceptance(self) -> None:
        blockers = "\n".join(
            (
                "Status:** Stable blocked",
                "GitHub repository governance",
                "Real supported-client matrix",
                "Real WebAuthn/passkey path",
                "Target-environment production rehearsal",
                "Product-wide Glaze UI ownership",
                "Exact-RC Stable evidence",
            )
        )
        self.write("VAULT.md", "GoreeCloud Vault\n**GoreeVault** is retired\n")
        self.write("docs/PRODUCTION-READINESS.md", "multi-user security Glaze UI\nStable is therefore blocked\n")
        self.write("docs/GLAZE-UI.md", "temporary development divergence\nNo production Glaze UI exception is approved\n")
        self.write("docs/STABLE-EVIDENCE.md", "Schema version 2\n")
        self.write("docs/OPEN-READINESS-BLOCKERS.md", blockers + "\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "Integral Platform System acceptance"):
            VALIDATOR.validate_goreecloud_gates()

    def test_canonical_product_records_accept_legacy_identifiers_when_classified(self) -> None:
        self.write_canonical_product_records()
        VALIDATOR.validate_canonical_product_records()

    def test_canonical_product_records_reject_stale_current_client_family(self) -> None:
        self.write_canonical_product_records()
        self.write(
            "docs/OPEN-READINESS-BLOCKERS.md",
            "GoreeVault is retired. Historical compatibility-sensitive `GoreeVault`/`goreevault` identifiers may remain.\n"
            "`GoreeVault` remains the broader client-family.\n"
            "GoreeCloud/goreecloud-vault\n"
            "## Blocker 5 — Product-wide Glaze UI ownership and GoreeCloud Vault Web completion\n"
            "## Blocker 7 — Integral Platform System acceptance\n"
            "overall service conformance as nonconformant\n",
        )
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "retired current-product wording"):
            VALIDATOR.validate_canonical_product_records()

    def test_canonical_product_records_reject_separate_web_repository_requirement(self) -> None:
        self.write_canonical_product_records()
        self.write(
            "docs/ROADMAP.md",
            "GoreeVault is retired.\n"
            "GoreeCloud/goreecloud-vault\nweb-client/\n"
            "GoreeCloud/goreecloud-vault-web\n"
            "## v0.3.0 — GoreeCloud Vault Web foundation\n"
            "## v0.4.0 — GoreeCloud Vault Browser foundation\n"
            "## v0.5.0 — GoreeCloud Vault Desktop foundation\n"
            "## v0.6.0 — GoreeCloud Vault Mobile foundation\n",
        )
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "retired current-product wording"):
            VALIDATOR.validate_canonical_product_records()

    def test_canonical_product_records_require_platform_schema_boundary(self) -> None:
        self.write_canonical_product_records()
        self.write("docs/STABLE-EVIDENCE.md", "GoreeVault is retired.\n### Integral Platform System boundary\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "missing canonical GoreeCloud Vault policy controls"):
            VALIDATOR.validate_canonical_product_records()

    def test_stable_template_requires_multi_user_and_glaze_fields(self) -> None:
        self.write("docs/stable-evidence.example.json", '{"schema_version": 2, "multi_user": {}}\n')
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "Stable evidence template is missing"):
            VALIDATOR.validate_stable_template()

    def test_platform_contract_requires_all_current_systems(self) -> None:
        self.write("goreecloud.platform.yaml", "schema_version: '0.2'\ncomponent:\n  id: goreecloud-vault-server\n  product_name: GoreeCloud Vault Server\n  product_family: GoreeCloud Vault\nlifecycle: development\nconformance:\n  status: nonconformant\n")
        with self.assertRaisesRegex(VALIDATOR.ReadinessError, "platform contract is missing"):
            VALIDATOR.validate_platform_contract()


if __name__ == "__main__":
    unittest.main()
