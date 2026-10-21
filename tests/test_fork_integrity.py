"""Regression checks for bounded source-import guard."""

import importlib.util
from pathlib import Path
import tempfile
import unittest

SRC = Path(__file__).resolve().parents[1] / "scripts" / "check_fork_integrity.py"
spec = importlib.util.spec_from_file_location("fork_integrity", SRC)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)


class ForkBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for relative in guard.REQUIRED:
            file = self.root / relative
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(
                "bitwarden/clients e2969bf1b80f0942c582b158dc7b97a9110651bc",
                encoding="utf-8",
            )

    def tearDown(self):
        self.temp.cleanup()

    def test_clean_oss_snapshot(self):
        self.assertEqual(guard.check(self.root), [])

    def test_commercial_directory_fails_closed(self):
        (self.root / "bitwarden_license").mkdir()
        self.assertTrue(guard.check(self.root))

    def test_missing_license_fails_closed(self):
        (self.root / "LICENSE_GPL.txt").unlink()
        self.assertTrue(guard.check(self.root))

    def test_missing_provenance_sha_fails_closed(self):
        (self.root / "docs" / "UPSTREAM.md").write_text("bitwarden/clients", encoding="utf-8")
        self.assertTrue(guard.check(self.root))


if __name__ == "__main__":
    unittest.main()
