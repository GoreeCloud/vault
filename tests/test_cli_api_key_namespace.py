"""Guard the GoreeCloud Fork's API key login environment namespace."""
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]


class CliApiKeyNamespaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.runtime=(ROOT/'apps/cli/src/auth/commands/login.command.ts').read_text()
        cls.tests=(ROOT/'apps/cli/src/auth/commands/login.command.spec.ts').read_text()

    def test_api_login_only_reads_fork_credentials(self):
        self.assertIn('process.env.GOREECLOUD_VAULT_CLIENT_ID',self.runtime)
        self.assertIn('process.env.GOREECLOUD_VAULT_CLIENT_SECRET',self.runtime)
        self.assertNotIn('process.env.BW_CLIENTID',self.runtime)
        self.assertNotIn('process.env.BW_CLIENTSECRET',self.runtime)

    def test_mocked_login_rejects_upstream_credentials(self):
        self.assertIn('ignores inherited upstream API key variables',self.tests)
        self.assertIn('uses the GoreeCloud API key when upstream variables are also present',self.tests)
        self.assertIn('"client_id is required."',self.tests)

    def test_workflow_executes_api_login_tests(self):
        build=(ROOT/'.github/workflows/oss-client-builds.yml').read_text()
        integrity=(ROOT/'.github/workflows/fork-integrity.yml').read_text()
        self.assertIn('apps/cli/src/auth/commands/login.command.spec.ts',build)
        self.assertIn('test_cli_api_key_namespace.py',integrity)


if __name__=='__main__':
    unittest.main()
