"""CSPRNG-backed password generator. No network, telemetry, or persistence."""

from __future__ import annotations

import secrets
import string

LOWERCASE = string.ascii_lowercase
UPPERCASE = string.ascii_uppercase
DIGITS = string.digits
SYMBOLS = "!@#$%^&*()-_=+[]{}:,.?"


def generate_password(
    length: int = 24,
    *,
    lowercase: bool = True,
    uppercase: bool = True,
    digits: bool = True,
    symbols: bool = True,
    exclude_ambiguous: bool = False,
    exclude_characters: str = "",
) -> str:
    """Generate a password containing each enabled character class.

    Entropy comes from Python's OS-backed cryptographic secrets module.
    The returned Python string cannot be guaranteed to be cleared from memory.
    No master-password handling or vault encryption is performed here.
    """
    if isinstance(length, bool) or not isinstance(length, int) or not 12 <= length <= 256:
        raise ValueError("length must be an integer from 12 to 256")
    options = (lowercase, uppercase, digits, symbols, exclude_ambiguous)
    if any(not isinstance(option, bool) for option in options):
        raise TypeError("character class options must be booleans")
    if not isinstance(exclude_characters, str):
        raise TypeError("exclude_characters must be a string")

    groups = [alphabet for enabled, alphabet in (
        (lowercase, LOWERCASE), (uppercase, UPPERCASE),
        (digits, DIGITS), (symbols, SYMBOLS)
    ) if enabled]
    if not groups:
        raise ValueError("select at least one character class")

    excluded = set(exclude_characters)
    if exclude_ambiguous:
        excluded.update("O0Il1")
    groups = ["".join(ch for ch in group if ch not in excluded) for group in groups]
    if any(not group for group in groups):
        raise ValueError("exclusions removed every character from an enabled class")

    result = [secrets.choice(group) for group in groups]
    alphabet = "".join(groups)
    result.extend(secrets.choice(alphabet) for _ in range(length - len(result)))
    for index in range(len(result) - 1, 0, -1):
        target = secrets.randbelow(index + 1)
        result[index], result[target] = result[target], result[index]
    return "".join(result)


def generate_numeric_pin(length: int = 8) -> str:
    """Generate an unbiased numeric PIN without storage, logging, or network I/O.

    Intended for standalone generation only; does not implement authentication,
    PIN verification, rate limiting, or device unlock.
    """
    if isinstance(length, bool) or not isinstance(length, int) or not 6 <= length <= 32:
        raise ValueError("PIN length must be an integer from 6 to 32")
    return "".join(secrets.choice(DIGITS) for _ in range(length))
