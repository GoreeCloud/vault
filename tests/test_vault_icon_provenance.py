"""Byte-level source verification and PNG structural checks; no optional dependencies."""
import hashlib
import importlib.util
from pathlib import Path
import re
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]
P = ROOT/"scripts/render_vault_icons.py"
spec = importlib.util.spec_from_file_location("render_vault_icons", P)
icons = importlib.util.module_from_spec(spec)
spec.loader.exec_module(icons)
SOURCE_SHA = "c34edae0c57a6bac002fb0f940de7ae26cf1450e"


class VaultIconProvenanceTests(unittest.TestCase):
    def test_approved_canonical_vector_is_unchanged(self):
        data = icons.SVG.read_bytes()
        git_blob = hashlib.sha1(b"blob " + str(len(data)).encode() + b"\x00" + data).hexdigest()
        self.assertEqual(git_blob, SOURCE_SHA)
        self.assertIn(b"GoreeCloud Vault", data)
        self.assertIn(b'viewBox="0 0 64 64"', data)

    def test_generated_png_files_are_correctly_sized(self):
        for path, size in icons.FILES.items():
            with self.subTest(path=path):
                data = (ROOT/path).read_bytes()
                self.assertGreater(len(data), 80)
                self.assertTrue(data.startswith(b"\x89PNG\r\n\x1a\n"))
                self.assertEqual(data[12:16], b"IHDR")
                w, h = struct.unpack(">II", data[16:24])
                self.assertEqual((w,h),(size,size))
                self.assertIn(data[25],(2,6))  # RGB or RGBA

    def test_manifests_reference_migrated_normal_icons(self):
        for path in ("apps/browser/src/manifest.json", "apps/browser/src/manifest.v3.json"):
            import json
            manifest = json.loads((ROOT/path).read_text())
            for name in manifest["icons"].values():
                self.assertIn("apps/browser/src/"+name, icons.FILES)


if __name__ == "__main__":
    unittest.main()
