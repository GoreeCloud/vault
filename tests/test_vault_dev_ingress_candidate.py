"""Source-integrity guard: candidate ingress must never reach a vault backend."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "ops/vault-dev/ingress.Caddyfile"


class VaultDevIngressCandidateTests(unittest.TestCase):
    def setUp(self):
        self.config = PATH.read_text()
        self.effective = "\n".join(
            line.split("#", 1)[0] for line in self.config.splitlines()
        )

    def test_only_development_host_is_configured(self):
        self.assertRegex(self.effective, r"(?m)^vault-dev\.goreecloud\.com\s*\{")
        self.assertNotRegex(self.effective, r"(?m)^\s*vault\.goreecloud\.com\s*\{")
        self.assertNotIn("vaultwarden", self.effective.lower())

    def test_no_upstream_or_mutating_handlers(self):
        for forbidden in ("reverse_proxy", "forward_auth", "php_fastcgi", "file_server",
                          "redir ", "respond 200", "respond 204", "handle_path"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, self.effective.lower())

    def test_private_overlay_and_public_denial_are_explicit(self):
        self.assertIn("remote_ip 100.64.0.0/10", self.effective)
        self.assertIn("handle @private_overlay {", self.effective)
        self.assertRegex(self.effective, r"respond\s+\"[^\"]+\"\s+503")
        self.assertRegex(self.effective, r"handle\s*\{\s*respond\s+\"Forbidden\"\s+403")
        self.assertEqual(self.effective.count("{"), self.effective.count("}"))

    def test_dns01_credentials_are_environment_only(self):
        self.assertIn("dns porkbun", self.effective)
        self.assertIn("api_key {$PORKBUN_API_KEY}", self.effective)
        self.assertIn("api_secret_key {$PORKBUN_API_SECRET_KEY}", self.effective)
        self.assertNotRegex(self.effective, r"(?im)^\s*api_(?:key|secret_key)\s+(?!\{\$)\S+")

    def test_security_headers_and_readiness_documented(self):
        for expected in ("Strict-Transport-Security", "X-Content-Type-Options",
                         "X-Robots-Tag", "Cache-Control"):
            self.assertIn(expected, self.effective)
        docs = (ROOT / "docs/VAULT-DEV-ENDPOINT.md").read_text()
        self.assertIn("ops/vault-dev/ingress.Caddyfile", docs)
        ci = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_vault_dev_ingress_candidate.py", ci)


if __name__ == "__main__":
    unittest.main()
