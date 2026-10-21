"""Ensure unaudited CLI network-facing receive/serve entry points remain closed."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CliRestrictedEntryPoints(unittest.TestCase):
    def test_dev_receive_serve_disabled_before_program_registration(self):
        source = (ROOT / "apps/cli/src/bw.ts").read_text()
        self.assertIn('arg === "receive" || arg === "serve"', source)
        self.assertIn("receive and serve are disabled", source)
        self.assertLess(source.index("receive and serve are disabled"),
                        source.index("await registerOssPrograms(serviceContainer)"))

    def test_ci_exercises_compiled_cli(self):
        workflow = (ROOT / ".github/workflows/oss-client-builds.yml").read_text()
        self.assertIn("check_cli_disabled_receive_serve.sh", workflow)


if __name__ == "__main__":
    unittest.main()
