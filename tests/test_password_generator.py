"""Regression checks for GoreeCloud Vault's standalone password generator."""

import string
import unittest

from tools.password_generator import SYMBOLS, generate_password


class PasswordGeneratorTests(unittest.TestCase):
    def test_defaults_include_all_classes(self):
        for _ in range(100):
            value = generate_password()
            self.assertEqual(len(value), 24)
            for alphabet in (string.ascii_lowercase, string.ascii_uppercase, string.digits, SYMBOLS):
                self.assertTrue(any(ch in alphabet for ch in value))

    def test_custom_length_and_classes(self):
        for length in (12, 24, 256):
            value = generate_password(length, uppercase=False, digits=False, symbols=False)
            self.assertEqual(len(value), length)
            self.assertTrue(all(ch in string.ascii_lowercase for ch in value))

    def test_ambiguous_exclusion(self):
        for _ in range(50):
            self.assertFalse(set(generate_password(exclude_ambiguous=True)) & set("O0Il1"))

    def test_explicit_exclusions(self):
        for _ in range(50):
            value = generate_password(exclude_characters="aeiouAEIOU012")
            self.assertFalse(set(value) & set("aeiouAEIOU012"))
            self.assertTrue(any(ch in string.digits for ch in value))
            self.assertTrue(any(ch in string.ascii_lowercase for ch in value))
            self.assertTrue(any(ch in string.ascii_uppercase for ch in value))
            self.assertTrue(any(ch in SYMBOLS for ch in value))

    def test_exclusions_cannot_empty_enabled_class(self):
        with self.assertRaises(ValueError):
            generate_password(exclude_characters=string.digits)
        with self.assertRaises(ValueError):
            generate_password(lowercase=True, uppercase=False, digits=False, symbols=False,
                              exclude_characters=string.ascii_lowercase)

    def test_invalid_length(self):
        for value in (0, 11, 257, True, 13.5, "24"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                generate_password(value)

    def test_no_classes(self):
        with self.assertRaises(ValueError):
            generate_password(lowercase=False, uppercase=False, digits=False, symbols=False)

    def test_nonboolean_options(self):
        with self.assertRaises(TypeError):
            generate_password(symbols="false")

    def test_invalid_exclusion_type(self):
        for value in (None, True, 3, ["a"]):
            with self.subTest(value=value), self.assertRaises(TypeError):
                generate_password(exclude_characters=value)

    def test_nonconstant_output(self):
        self.assertGreater(len({generate_password() for _ in range(50)}), 1)


if __name__ == "__main__":
    unittest.main()
