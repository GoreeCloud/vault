"""Source controls complement the isolated real CLI process smoke test."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CliIsolationBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (
            ROOT / "apps/cli/src/service-container/service-container.ts"
        ).read_text()
        cls.debug = (ROOT / "apps/cli/scripts/debug-start.js").read_text()
        cls.workflow = (ROOT / ".github/workflows/oss-client-builds.yml").read_text()
        cls.smoke = (ROOT / "scripts/check_cli_profile_isolation.sh").read_text()

    def test_no_automatic_bitwarden_profile(self):
        self.assertIn('const profileName = "GoreeCloud Vault CLI";', self.source)
        self.assertIn('process.env.GOREECLOUD_VAULT_CLI_DATA_DIR', self.source)
        for disallowed in (
            'path.join(path.dirname(process.execPath), "bw-data")',
            "process.env.BITWARDENCLI_APPDATA_DIR)",
            '"Library/Application Support/Bitwarden CLI"',
            '".config/Bitwarden CLI"',
            '"Bitwarden CLI");',
        ):
            with self.subTest(disallowed=disallowed):
                self.assertNotIn(disallowed, self.source)
        self.assertIn("path.isAbsolute(p)", self.source)

    def test_debug_runner_uses_fork_only_override(self):
        self.assertIn("GOREECLOUD_VAULT_CLI_DATA_DIR:", self.debug)
        self.assertIn("delete environment.BITWARDENCLI_APPDATA_DIR;", self.debug)
        self.assertNotIn("BITWARDENCLI_APPDATA_DIR: path.join(", self.debug)

    def test_inherited_upstream_npm_package_is_unpublishable(self):
        import json
        package = json.loads((ROOT / "apps/cli/package.json").read_text())
        self.assertTrue(package["private"])
        self.assertNotIn("npm publish", package["scripts"]["publish:npm"])
        self.assertIn("blocked until release approval", package["scripts"]["publish:npm"])

    def test_oss_ci_checks_real_process_profile_isolation(self):
        self.assertIn("bash scripts/check_cli_profile_isolation.sh", self.workflow)
        self.assertIn("BITWARDENCLI_APPDATA_DIR=", self.smoke)
        self.assertIn('test ! -e "$temporary/bitwarden-existing"', self.smoke)
        self.assertIn('test -f "$temporary/xdg/GoreeCloud Vault CLI/data.json"', self.smoke)


if __name__ == "__main__":
    unittest.main()
