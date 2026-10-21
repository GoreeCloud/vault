"""Prevent inherited Bitwarden download/update instructions from escaping a fork."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]


class CliUpdateBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src=(ROOT/"apps/cli/src/commands/update.command.ts").read_text()

    def test_no_upstream_release_feed_or_install(self):
        self.assertNotIn("api.github.com/repos/bitwarden/",self.src)
        self.assertNotIn("github.com/bitwarden/clients/releases",self.src)
        self.assertNotIn("npm install -g @bitwarden/cli",self.src)
        self.assertNotIn("nativeFetch(",self.src)

    def test_fail_closed_and_preserve_existing_program_integration(self):
        self.assertIn("export class UpdateCommand", self.src)
        self.assertIn("async run(): Promise<Response>",self.src)
        self.assertIn("return Response.error(",self.src)
        self.assertIn("GoreeCloud Vault CLI update checks are disabled",self.src)
        self.assertIn("_platformUtilsService: PlatformUtilsService",self.src)
        self.assertIn("_apiService: ApiService",self.src)

    def test_real_cli_is_checked_in_oss_ci(self):
        workflow = (ROOT / ".github/workflows/oss-client-builds.yml").read_text()
        self.assertIn("bash scripts/check_cli_update_disabled.sh", workflow)


if __name__=="__main__":
    unittest.main()
