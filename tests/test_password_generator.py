"""Regression checks for GoreeCloud Vault's standalone password generator."""

import string
import unittest

from tools.password_generator import SYMBOLS, generate_password, generate_numeric_pin


class PasswordGeneratorTests(unittest.TestCase):
    def test_defaults_include_all_classes(self):
        for _ in range(100):
            value = generate_password()
            self.assertEqual(len(value), 24)
            for alphabet in (string.ascii_lowercase, string.ascii_uppercase, string.digits, SYMBOLS):
                self.assertTrue(any(ch in alphabet for ch in value))

    def test_custom_length_and_classes(self):
        for length in (28, 48, 256):
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
        for value in (0, 11, 12, 15, 257, True, 13.5, "24"):
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

    def test_numeric_pin_defaults_and_lengths(self):
        for length in (6, 8, 16, 32):
            for _ in range(20):
                pin = generate_numeric_pin(length)
                self.assertEqual(len(pin), length)
                self.assertTrue(pin.isascii() and pin.isdecimal())

    def test_numeric_pin_invalid_inputs(self):
        for value in (0, 5, 33, True, False, 8.0, "8", None):
            with self.subTest(value=value), self.assertRaises(ValueError):
                generate_numeric_pin(value)

    def test_numeric_pin_is_not_constant(self):
        self.assertGreater(len({generate_numeric_pin() for _ in range(40)}), 1)

    def test_nonconstant_output(self):
        self.assertGreater(len({generate_password() for _ in range(50)}), 1)

    def test_conservative_password_strength_denies_weak_configurations(self):
        for length, kwargs in (
            (16, {}),
            (20, {}),
            (24, {"uppercase": False, "digits": False, "symbols": False}),
            (24, {"lowercase": False, "uppercase": False, "symbols": False}),
        ):
            with self.subTest(length=length, kwargs=kwargs), self.assertRaises(ValueError):
                generate_password(length, **kwargs)

    def test_conservative_strength_accepts_sufficient_single_class(self):
        for _ in range(40):
            result = generate_password(28, uppercase=False, digits=False, symbols=False)
            self.assertEqual(len(result), 28)
            self.assertTrue(all(ch in string.ascii_lowercase for ch in result))

    def test_exclusions_bounded_and_nonbuiltin_string_subclass_denied(self):
        class StringChild(str):
            pass
        for exclusion in ("z" * 257,):
            with self.assertRaises(ValueError):
                generate_password(exclude_characters=exclusion)
        with self.assertRaises(TypeError):
            generate_password(exclude_characters=StringChild("O"))

    def test_builtin_int_required_for_lengths(self):
        class IntChild(int):
            pass
        with self.assertRaises(ValueError):
            generate_password(IntChild(28))
        with self.assertRaises(ValueError):
            generate_numeric_pin(IntChild(8))

    def test_pin_is_not_a_master_password_strength_equivalent(self):
        # Even the shortest supported PIN has far less than 128 bits;
        # its use requires separate rate limiting and an approved policy.
        self.assertEqual(len(generate_numeric_pin(6)), 6)


if __name__ == "__main__":
    unittest.main()
