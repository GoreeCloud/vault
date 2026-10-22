"""Ground the native dev-server compatibility inventory in actual imported TS clients."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "services/vault-dev-server/contracts/imported-client-surface.json"
API = ROOT / "libs/common/src/services/api.service.ts"
PRELOGIN = ROOT / "libs/common/src/auth/password-prelogin/password-prelogin-api.service.ts"

class ImportedClientContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.contract = json.loads(CONTRACT.read_text())
        cls.api = API.read_text()
        cls.prelogin = PRELOGIN.read_text()

    def test_no_compatibility_claim_or_implemented_route(self):
        self.assertEqual(self.contract["schema_version"],1)
        self.assertFalse(self.contract["implemented"])
        self.assertFalse(self.contract["credential_storage_supported"])
        self.assertGreaterEqual(len(self.contract["routes"]),9)
        self.assertTrue(all(not r["implemented"] for r in self.contract["routes"]))

    def test_every_source_is_exact_repository_source(self):
        for route in self.contract["routes"]:
            with self.subTest(path=route["path"],method=route["method"]):
                source=ROOT / route["source"]
                self.assertTrue(source.is_file(),source)
                self.assertIn(route["target"],("api","identity"))
                self.assertIn(route["method"],("GET","POST","PUT","DELETE"))
                self.assertRegex(route["path"],r"^/[A-Za-z?=/{}0-9-]+$")

    def test_prelogin_is_identity_routed(self):
        self.assertIn('"POST",',self.prelogin)
        self.assertIn('"/accounts/prelogin/password"',self.prelogin)
        self.assertIn("env.getIdentityUrl()",self.prelogin)

    def test_token_is_identity_routed(self):
        self.assertIn("postIdentityToken(",self.api)
        self.assertIn('env.getIdentityUrl() + "/connect/token"',self.api)
        self.assertRegex(self.api,re.compile(
            r'createRequest\(env\.getIdentityUrl\(\) \+ "/connect/token",\s*\{[\s\S]{0,260}method: "POST"',re.M))

    def test_sync_and_item_calls_are_source_backed(self):
        methods={
            "getCipher": ('"GET", "/ciphers/" + id',),
            "postCipher": ('"POST", "/ciphers", request',),
            "postCipherCreate": ('"POST", "/ciphers/create"',),
            "putCipher": ('"PUT", "/ciphers/" + id',),
            "deleteCipher": ('"DELETE", "/ciphers/" + id',),
            "getSync": ('"/sync?excludeDomains=true"', '"/sync"'),
        }
        for method,fragments in methods.items():
            with self.subTest(method=method):
                start=self.api.find(method+"(")
                self.assertGreaterEqual(start,0)
                block=self.api[start:start+650]
                for frag in fragments:
                    self.assertIn(frag,block)

    def test_native_server_has_no_compatible_credential_api(self):
        server=(ROOT/"services/vault-dev-server/main.go").read_text()
        self.assertIn("http.StatusServiceUnavailable",server)
        self.assertIn("CredentialsEnabled: false",server)
        self.assertIn("Ready:              false",server)
        self.assertNotIn("syntheticlab",server)

if __name__=="__main__":
    unittest.main()
