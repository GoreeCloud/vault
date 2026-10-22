"""Prevent synthetic crypto laboratory from reaching runtime credential endpoints."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "services/vault-dev-server"

class SyntheticLabBoundaryTests(unittest.TestCase):
    def test_runtime_does_not_import_test_only_crypto_store(self):
        runtime = (SERVER / "main.go").read_text()
        self.assertNotIn("syntheticlab", runtime)
        self.assertNotIn("NewStore(", runtime)
        self.assertNotIn("Encrypt(", runtime)
        self.assertNotIn("Decrypt(", runtime)

    def test_laboratory_has_no_http_or_persistent_storage(self):
        body = (SERVER / "internal/syntheticlab/lab.go").read_text()
        self.assertIn("package syntheticlab", body)
        self.assertNotIn('"net/http"', body)
        self.assertNotIn('"os"', body)
        self.assertNotIn('"database/sql"', body)
        self.assertIn("MaxItemsPerScope", body)
        self.assertIn("ErrConflict", body)
        self.assertIn("associatedData", body)

    def test_ci_has_race_test_and_native_build_only(self):
        ci = (ROOT / ".github/workflows/vault-dev-server.yml").read_text()
        self.assertIn("go test -race ./...", ci)
        self.assertIn("go build -trimpath", ci)
        guard = (ROOT / ".github/workflows/fork-integrity.yml").read_text()
        self.assertIn("test_vault_synthetic_lab_boundary.py", guard)

    def test_explicitly_not_a_credential_store(self):
        readme = (SERVER / "internal/syntheticlab/README.md").read_text()
        self.assertIn("never", readme.lower())
        self.assertIn("synthetic", readme.lower())
        self.assertIn("not", readme.lower())

if __name__ == "__main__":
    unittest.main()
