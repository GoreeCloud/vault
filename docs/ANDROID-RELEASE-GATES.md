# GoreeCloud Vault Android signing and release gates

**Status:** Unreleased and not independently security audited. The existing
Android debug APK, including debug signing, is only for development and must
not be redistributed as a trusted password manager.

## Signing isolation

Flutter's default development scaffold assigned the Android debug signing key
to the release build type. GoreeCloud Vault removes that fallback. The Groovy
Gradle build now obtains release credentials **only** from a local
apps/native/android/key.properties file, explicitly ignored by Git, with:

    storeFile=/absolute/path/to/your/private/upload-keystore.jks
    storePassword=REPLACE_WITH_PRIVATE_STORE_PASSWORD
    keyPassword=REPLACE_WITH_PRIVATE_KEY_PASSWORD
    keyAlias=REPLACE_WITH_PRIVATE_ALIAS

These are documentation placeholders: do not use them as credentials, commit
keys, copy passwords into issue reports, or put real secret values into build
logs. Keep the keystore outside the repository and in independently recoverable
private storage. Treat the key as an app signing asset; losing it can break
self-managed update continuity.

If the key properties or referenced keystore are missing, release APK/AAB
packaging fails closed rather than silently using debug signing or producing
a falsely trustworthy artifact. Ordinary debug builds remain possible.

## Current automated verification

The Android CI job runs python3 scripts/test_android_release_security.py,
which checks that release Gradle tasks require external signing, main
manifest has no broad permissions or system backup, and FLAG_SECURE
remains in the Flutter Android activity. Negative tests attempt to introduce
debug signing, a permissive manifest, a disabled signing gate or removed
screen-capture protection and must fail. CI then builds a **debug APK only**.
No signing key is distributed to CI.

Static tests cannot prove how a real Android release is signed. Before
shipping, run an independently controlled signed release build with an
authorized keystore, use Android SDK apksigner verify --verbose --print-certs
and independently compare signing-certificate fingerprints with an approved
secure record. Verify package ID, manifest permissions, update continuity,
encrypted storage and backup restore on test devices before publication.
A signed APK is not a security audit.

Reference: official Flutter Android deployment and signing guidance:
https://docs.flutter.dev/deployment/android

## Outstanding acceptance

Do not install over or clear an existing vault on a real phone just to test
release signing. Use disposable device profiles and synthetic secrets; review
app-restore, Android credential-provider integration, signer permissions,
recovery and update rollback before any Stable announcement.
