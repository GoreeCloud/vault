"""Review checkpoint for inherited legacy cryptography imports.

This is source inventory only. It does not establish exploitability,
unreachability, cryptographic correctness, or release approval.
"""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
REVIEWED_IMPORTERS = {
    "libs/importer/src/importers/keeper/access/services/crypto.ts",
    "libs/legacy-crypto/src/dangerous/dangerous_duckduckgo_crypto.ts",
    "libs/legacy-crypto/src/dangerous/dangerous_lastpass_crypto.ts",
    "libs/legacy-crypto/src/services/web-crypto-function.service.ts",
}
EXTENSIONS = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"}
PACKAGE_LITERAL = re.compile(r"""(?:from\s*|import\s*\(|require\s*\()\s*['"]node-forge['"]""")
SIGNATURE_INVOCATION = re.compile(r"\b([A-Za-z_$][\w.$]*)\s*\.\s*(verify|verifySignature|verifyCertificateChain|sign)\s*\(")


def import_sites():
    result = {}
    for base in (ROOT / "apps", ROOT / "libs"):
        for file in base.rglob("*"):
            if file.suffix not in EXTENSIONS or not file.is_file():
                continue
            text = file.read_text(encoding="utf-8", errors="replace")
            if PACKAGE_LITERAL.search(text):
                result[file.relative_to(ROOT).as_posix()] = text
    return result


class LegacyDependencyReviewTests(unittest.TestCase):
    def test_import_inventory_has_no_unreviewed_additions(self):
        self.assertEqual(set(import_sites()), REVIEWED_IMPORTERS)

    def test_known_call_sites_do_not_invoke_signature_verification(self):
        for path, source in import_sites().items():
            with self.subTest(file=path):
                invocations = SIGNATURE_INVOCATION.findall(source)
                unreviewed = [call for call in invocations if call != ("this.subtle", "sign")]
                self.assertEqual(
                    unreviewed, [],
                    "Review new signature operations and underlying advisory before merging",
                )

    def test_unresolved_vulnerability_is_not_silently_upgraded_or_waived(self):
        root = json.loads((ROOT / "package.json").read_text())
        cli = json.loads((ROOT / "apps/cli/package.json").read_text())
        lock = json.loads((ROOT / "package-lock.json").read_text())
        self.assertEqual(root["dependencies"]["node-forge"], "1.4.0")
        self.assertEqual(cli["dependencies"]["node-forge"], "1.4.0")
        self.assertEqual(lock["packages"]["node_modules/node-forge"]["version"], "1.4.0")
        gates = (ROOT / "docs/RELEASE-GATES.md").read_text()
        self.assertIn("node-forge@1.4.0", gates)
        self.assertIn("remaining **high**", gates)


if __name__ == "__main__":
    unittest.main()
