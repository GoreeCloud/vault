"""Ensure inherited Bitwarden process flags do not change GoreeCloud Vault behavior."""
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
FLAGS = ("SERVE", "NOINTERACTION", "CLEANEXIT", "RAW", "RESPONSE", "QUIET", "PRETTY")

class CliAmbientFlagTests(unittest.TestCase):
    def test_all_runtime_sources_ignore_inherited_flags(self):
        for source in (ROOT / "apps/cli/src").rglob("*.ts"):
            if source.name.endswith(".spec.ts"):
                continue
            body = source.read_text()
            for flag in FLAGS:
                with self.subTest(path=str(source), flag=flag):
                    self.assertNotIn("process.env.BW_" + flag, body)
    def test_command_flags_use_explicit_fork_namespace(self):
        body = (ROOT / "apps/cli/src/program.ts").read_text()
        for flag in FLAGS:
            if flag == "SERVE":
                continue  # Internal-only mode is controlled by ServeCommand, not Program.
            with self.subTest(flag=flag):
                self.assertIn("process.env.GOREECLOUD_VAULT_" + flag, body)
    def test_clean_exit_requires_explicit_true(self):
        body = (ROOT / "apps/cli/src/base-program.ts").read_text()
        self.assertIn('process.env.GOREECLOUD_VAULT_CLEANEXIT === "true" ? 0 : 1', body)
    def test_ci_runs_synthetic_flag_cases(self):
        integrity = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_cli_ambient_flags.py", integrity)
        ci = (ROOT / ".github/workflows/oss-client-builds.yml").read_text()
        self.assertIn("base-program.spec.ts", ci)

if __name__ == "__main__":
    unittest.main()
