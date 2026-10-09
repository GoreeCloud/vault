# Secure password generation — standalone component

## Scope and integration status

The `tools/password_generator.py` module is an independently testable password-generation utility, **not yet integrated into the Vault application UI or credential storage**. It does not access networks, clipboard, vault data, filesystem, or telemetry.

## Behavior

- Uses Python's `secrets.choice` and `secrets.randbelow` (OS cryptographic random source).
- Defaults to 24 characters, including lowercase, uppercase, digits, and symbols.
- Accepts lengths from 12 to 256 inclusive and guarantees at least one character from each enabled class.
- Supports optional omission of visually ambiguous alphanumerics (`O0Il1`) and explicit disallowed characters using `exclude_characters`.
- Fails closed if an exclusion would remove every character in any enabled class.
- Rejects invalid lengths, character-class option types, and exclusion types.
- Uses cryptographic Fisher–Yates shuffling to avoid fixed character-class positions.

Example:

```python
from tools.password_generator import generate_password

password = generate_password(
    length=32,
    exclude_ambiguous=True,
    exclude_characters='"\\',
)
# Pass the value only to an authorized secret-handling interface.
```

## Threat boundaries

- Output is a Python `str` that cannot reliably be zeroized; higher-assurance secret lifecycle management needs an application-level design.
- The module does not write, log, transmit, or persist passwords; callers must also avoid telemetry, exception leaks, insecure clipboard handling, and plaintext persistence.
- Requirements to include each selected class can reduce the number of possible passwords relative to free sampling from a combined alphabet. Do not equate nominal length with a proven entropy measurement.
- Application integration, secure display, copy-with-clear behavior, accessibility, threat modeling, platform-specific key storage, and runtime QA remain pending.

## Validation

Run from the repository root:

```sh
python -m unittest discover -s tests -p 'test_password_generator.py' -v
```

The pull request also contains a GitHub Actions workflow for the above tests, but CI success must be verified for the exact candidate commit. These tests are functional regression coverage, not an independent cryptographic audit. This component does not establish Stable or production-ready status.
