"""Source-level change guard for development CLI Node API destinations."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CliApiTransportBoundaryTests(unittest.TestCase):
    def test_node_api_enforces_origin_policy_and_refuses_redirects(self):
        source = (ROOT / "apps/cli/src/platform/services/node-api.service.ts").read_text()
        self.assertIn("validateCliApiDestination(request.url, environment)", source)
        self.assertIn('redirect: "manual"', source)
        self.assertIn("response.status >= 300 && response.status < 400", source)
        self.assertIn("this.nativeFetch(request)", source)

    def test_compiled_oss_ci_runs_synthetic_transport_cases(self):
        ci = (ROOT / ".github/workflows/oss-client-builds.yml").read_text()
        self.assertIn("cli-api-destination-policy.spec.ts", ci)
        self.assertIn("node-api.service.spec.ts", ci)

    def test_source_integrity_enforces_transport_boundary(self):
        ci = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_cli_api_transport_boundary.py", ci)


if __name__ == "__main__":
    unittest.main()
