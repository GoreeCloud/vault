"""CLI request identity guard for GoreeCloud Vault development builds."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CliUserAgentIdentity(unittest.TestCase):
    def test_cli_http_identity_is_fork_specific(self):
        source = (ROOT / "apps/cli/src/service-container/service-container.ts").read_text()
        self.assertIn('"GoreeCloudVault_CLI/"', source)
        self.assertNotIn('"Bitwarden_CLI/"', source)

    def test_integrity_workflow_runs_identity_guard(self):
        workflow = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_cli_user_agent_identity.py", workflow)


if __name__ == "__main__":
    unittest.main()
