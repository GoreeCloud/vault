#!/usr/bin/env python3
"""Static Android release signing and permissions regression.

No keystores, credentials, Android installations, or device data are used.
This source lint is not actual APK signature validation or a security audit.
"""
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / "apps/native/android"
NS = "{http://schemas.android.com/apk/res/android}"

def check_boundary(gradle: str, manifest: str, activity: str) -> None:
    markers = (
        "rootProject.file('key.properties')",
        "releaseKeyFields",
        "releaseKeyConfigured",
        "gradle.taskGraph.whenReady",
        "task.project.path == ':app'",
        "signingConfig = releaseKeyConfigured ? signingConfigs.release : null",
    )
    if not all(marker in gradle for marker in markers):
        raise AssertionError("Explicit external release signing guard is required")
    if re.search(r"\bsigningConfig\s*=\s*signingConfigs\.debug\b", gradle):
        raise AssertionError("Release may not use Android debug signing keys")
    if "new GradleException(" not in gradle or "'assembleRelease'" not in gradle:
        raise AssertionError("Missing fail-closed release signing gate")
    if "getProperty('keyAlias')" not in gradle or "getProperty('storePassword')" not in gradle:
        raise AssertionError("Required external signing parameters missing")
    root = ET.fromstring(manifest)
    app = root.find("application")
    if app is None or app.get(NS+"allowBackup") != "false":
        raise AssertionError("System backup must remain disabled")
    if app.get(NS+"fullBackupContent") != "false":
        raise AssertionError("Full backup must remain disabled")
    if any(child.tag.endswith("uses-permission") for child in root):
        raise AssertionError("Production main manifest requests unexpected permissions")
    if "WindowManager.LayoutParams.FLAG_SECURE" not in activity:
        raise AssertionError("Android activity FLAG_SECURE is missing")

class AndroidReleaseBoundaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.gradle = (ANDROID/"app/build.gradle").read_text()
        cls.manifest = (ANDROID/"app/src/main/AndroidManifest.xml").read_text()
        cls.activity = (
            ANDROID/"app/src/main/kotlin/com/goreecloud/goreecloud_vault/MainActivity.kt"
        ).read_text()

    def test_source_preserves_release_boundaries(self):
        check_boundary(self.gradle, self.manifest, self.activity)

    def test_debug_release_signing_is_rejected(self):
        altered = self.gradle.replace(
            "signingConfig = releaseKeyConfigured ? signingConfigs.release : null",
            "signingConfig = signingConfigs.debug"
        )
        with self.assertRaises(AssertionError):
            check_boundary(altered, self.manifest, self.activity)

    def test_removing_release_guard_is_rejected(self):
        altered = self.gradle.replace("gradle.taskGraph.whenReady", "gateRemoved")
        with self.assertRaises(AssertionError):
            check_boundary(altered, self.manifest, self.activity)

    def test_internet_permission_in_production_manifest_is_rejected(self):
        altered = self.manifest.replace(
            "<application",
            '<uses-permission android:name="android.permission.INTERNET"/>\n'
            "    <application",
        )
        with self.assertRaises(AssertionError):
            check_boundary(self.gradle, altered, self.activity)

    def test_missing_screenshot_protection_is_rejected(self):
        altered = self.activity.replace(
            "WindowManager.LayoutParams.FLAG_SECURE", "0"
        )
        with self.assertRaises(AssertionError):
            check_boundary(self.gradle, self.manifest, altered)

if __name__ == "__main__":
    unittest.main(verbosity=2)
