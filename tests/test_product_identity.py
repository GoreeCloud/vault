"""No-dependency smoke tests for development-only GoreeCloud Vault shell identity."""
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ProductIdentityTests(unittest.TestCase):
    def test_localized_extension_name(self):
        locales = sorted((ROOT/"apps/browser/src/_locales").glob("*/messages.json"))
        self.assertGreaterEqual(len(locales), 1)
        for path in locales:
            with self.subTest(locale=path.parent.name):
                data = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(data["appName"]["message"], "GoreeCloud Vault")
                self.assertEqual(data["extName"]["message"], "GoreeCloud Vault")
                self.assertEqual(data["extNameBeta"]["message"], "GoreeCloud Vault Beta")
                self.assertLess(len(data["extName"]["message"]), 40)
                self.assertNotIn("bitwarden", data["extDesc"]["message"].lower())

    def test_browser_manifests(self):
        for name in ("manifest.json", "manifest.v3.json"):
            data=json.loads((ROOT/"apps/browser/src"/name).read_text())
            with self.subTest(name=name):
                self.assertEqual(data["short_name"], "GoreeCloud Vault")
                self.assertEqual(data["author"], "GoreeCloud")
                self.assertEqual(data["homepage_url"], "https://github.com/GoreeCloud/vault")
                self.assertNotIn("Bitwarden", json.dumps({k:v for k,v in data.items() if k in ("short_name","author","homepage_url")}))

    def test_web_shell_identity(self):
        manifest=json.loads((ROOT/"apps/web/src/manifest.json").read_text())
        html=(ROOT/"apps/web/src/index.html").read_text(encoding="utf-8-sig")
        self.assertEqual(manifest["name"], "GoreeCloud Vault")
        self.assertIn("<title page-title>GoreeCloud Vault</title>", html)

    def test_desktop_identity_and_disabled_upstream_update(self):
        desktop=json.loads((ROOT/"apps/desktop/electron-builder.json").read_text())
        self.assertEqual(desktop["productName"], "GoreeCloud Vault")
        self.assertEqual(desktop["appId"], "com.goreecloud.vault")
        self.assertEqual(desktop["publish"]["url"], "https://updates.goreecloud.invalid/vault")


if __name__ == "__main__":
    unittest.main()
