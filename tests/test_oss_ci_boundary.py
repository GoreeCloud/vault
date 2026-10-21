"""Fail-closed static tests for the read-only OSS-client CI compilation workflow."""
from pathlib import Path
import re
import unittest

ROOT=Path(__file__).resolve().parents[1]
WORKFLOW=ROOT/".github/workflows/oss-client-builds.yml"


class OssClientCiSafetyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src=WORKFLOW.read_text(encoding="utf-8")

    def test_no_publish_or_artifact_upload(self):
        self.assertNotRegex(self.src, r"(?im)^\s*(?:run:.*)?(?:npm\s+publish|gh\s+release|docker\s+push|actions/upload-artifact|softprops/action-gh-release)")
        self.assertNotIn("secrets.", self.src)

    def test_exact_oss_build_targets(self):
        for command in (
            "npx nx build cli --configuration=oss-dev",
            "npx nx build web --configuration=oss-dev",
            "npx nx build browser --configuration=chrome-dev",
            "npx nx run desktop:build-main --configuration=oss-dev",
        ):
            with self.subTest(target=command):
                self.assertIn(command,self.src)
        self.assertNotIn("--configuration=commercial",self.src)
        self.assertNotIn("bitwarden_license/",self.src)

    def test_read_only_checkout_and_install(self):
        self.assertIn("contents: read",self.src)
        self.assertIn("persist-credentials: false",self.src)
        self.assertIn("npm ci --ignore-scripts --no-audit --no-fund",self.src)
        self.assertIn("timeout-minutes: 30",self.src)

    def test_pinned_actions(self):
        uses=re.findall(r"(?m)^\s*uses:\s*([^\s#]+)",self.src)
        self.assertEqual(len(uses),2)
        self.assertTrue(all(re.search(r"@[0-9a-f]{40}$",line) for line in uses))


if __name__=="__main__":
    unittest.main()
