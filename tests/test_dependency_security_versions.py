"""Regression checks for known vulnerable direct dependencies and resolved npm lockfile."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
MIN_ANGULAR_PATCH = "21.2.25"


def read_json(path):
    return json.loads((ROOT / path).read_text())


class DependencySecurityVersions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = read_json("package.json")
        cls.cli = read_json("apps/cli/package.json")
        cls.lock = read_json("package-lock.json")["packages"]

    def test_patched_angular_package_family_is_aligned(self):
        names = ("animations", "common", "compiler", "compiler-cli", "core", "forms", "platform-browser", "platform-browser-dynamic", "router")
        for item in names:
            name = "@angular/" + item
            with self.subTest(package=name):
                direct = self.manifest["dependencies"].get(name) or self.manifest["devDependencies"].get(name)
                self.assertEqual(direct, MIN_ANGULAR_PATCH)
                self.assertEqual(self.lock["node_modules/" + name]["version"], MIN_ANGULAR_PATCH)

    def test_multer_patched_in_root_and_cli_lockfile(self):
        self.assertEqual(self.manifest["dependencies"]["multer"], "2.4.0")
        self.assertEqual(self.cli["dependencies"]["multer"], "2.4.0")
        self.assertEqual(self.lock["node_modules/multer"]["version"], "2.4.0")
        self.assertEqual(self.lock["apps/cli"]["dependencies"]["multer"], "2.4.0")
        nested = self.lock.get("apps/cli/node_modules/multer")
        if nested is not None:
            self.assertEqual(nested["version"], "2.4.0")

    def test_webpack_peer_boundary_aligned_with_schema_utils(self):
        self.assertEqual(self.manifest["devDependencies"]["webpack"], "5.112.0")
        self.assertEqual(self.lock["node_modules/webpack"]["version"], "5.112.0")


if __name__ == "__main__":
    unittest.main()
