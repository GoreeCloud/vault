"""Static fail-closed checks for GoreeCloud's independent CLI session namespace."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "apps/cli/src"


class CliSessionBoundaryTests(unittest.TestCase):
    def test_no_legacy_session_reference_in_runtime_sources(self):
        for p in SRC.rglob('*.ts'):
            if p.name.endswith('.spec.ts'):
                continue
            source = p.read_text()
            with self.subTest(source=p.relative_to(ROOT)):
                self.assertNotIn("BW_SESSION", source)

    def test_all_runtime_session_paths_reference_goreecloud_key(self):
        required = [
            "auth/commands/login.command.ts",
            "auth/commands/lock.command.ts",
            "key-management/commands/unlock.command.ts",
            "platform/services/node-env-secure-storage.service.ts",
            "service-container/service-container.ts",
            "program.ts",
        ]
        for file in required:
            with self.subTest(file=file):
                self.assertIn("GOREECLOUD_VAULT_SESSION", (SRC/file).read_text())

    def test_shell_instructions_only_name_fork_session(self):
        for file in ["auth/commands/login.command.ts", "key-management/commands/unlock.command.ts"]:
            with self.subTest(file=file):
                data=(SRC/file).read_text()
                self.assertIn('export GOREECLOUD_VAULT_SESSION=', data)
                self.assertIn('$env:GOREECLOUD_VAULT_SESSION=', data)

    def test_clear_session_does_not_set_string_undefined(self):
        for file in ["auth/commands/lock.command.ts", "service-container/service-container.ts"]:
            with self.subTest(file=file):
                data=(SRC/file).read_text()
                self.assertIn("delete process.env.GOREECLOUD_VAULT_SESSION;", data)
                self.assertNotIn("process.env.GOREECLOUD_VAULT_SESSION = undefined;", data)

    def test_no_fixed_session_value_in_debug_configuration(self):
        debug=(ROOT/"apps/cli/.vscode/launch.json").read_text()
        self.assertNotIn('"BW_SESSION"', debug)
        self.assertIn('"GOREECLOUD_VAULT_SESSION": "${env:GOREECLOUD_VAULT_SESSION}"', debug)

    def test_jest_fixture_runs_in_client_ci(self):
        workflow=(ROOT/".github/workflows/oss-client-builds.yml").read_text()
        self.assertIn('node-env-secure-storage.service.spec.ts', workflow)
        self.assertIn('test_cli_session_boundary.py', (ROOT/".github/workflows/fork-integrity.yml").read_text())


if __name__=="__main__":
    unittest.main()
