# Secure password generation — standalone component

## Scope and integration status

The `tools/password_generator.py` module is an independently testable password-generation utility, **not yet integrated into the Vault application UI or credential storage**. It does not access networks, clipboard, vault data, filesystem, or telemetry.

## Behavior

- Uses Python's `secrets.choice` and `secrets.randbelow` (OS cryptographic random source).
- Defaults to 24 characters, including lowercase, uppercase, digits, and symbols.
- Accepts lengths from 12 to 256 inclusive and enforces a character from each enabled class.
- Supports optional omission of visually ambiguous alphanumerics.
- Rejects invalid lengths and character-class option types. Never logs or persists output.
- Uses cryptographic Fisher–Yates shuffling to avoid fixed character-class positions.

## Validation

From the repository root: `python -m unittest discover -s tests -v`.

These checks are functional regression coverage, not a cryptographic audit. Application integration, secure display, copy-with-clear behavior, accessibility, threat modeling, platform-specific key storage, and runtime QA remain pending. No Stable, production-ready, or application feature claim is made on the basis of this module alone.
