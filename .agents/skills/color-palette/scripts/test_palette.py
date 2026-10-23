#!/usr/bin/env python3
"""Tests for the deterministic palette generator."""

from __future__ import annotations

import io
import tempfile
import unittest
from pathlib import Path

import palette


class PaletteTests(unittest.TestCase):
    def test_blue_white_contrast_is_below_normal_text_threshold(self) -> None:
        self.assertLess(palette.contrast_ratio("#FFFFFF", "#4392F1"), 4.5)

    def test_dark_foreground_passes_on_brand_and_error(self) -> None:
        self.assertGreaterEqual(palette.contrast_ratio("#0B1120", "#4392F1"), 4.5)
        self.assertGreaterEqual(palette.contrast_ratio("#0B1120", "#DC493A"), 4.5)

    def test_generated_css_passes_checks(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "palette.css"
            palette.generate(output)
            errors = palette.check(output.read_text(encoding="utf-8"))
            self.assertEqual(errors, [])

    def test_check_rejects_wrong_token(self) -> None:
        css = palette.css_tokens().replace("#4392F1", "#000000", 1)
        errors = palette.check(css)
        self.assertTrue(errors)

    def test_all_five_palette_colors_are_present(self) -> None:
        css = palette.css_tokens()
        for value in palette.PALETTE.values():
            self.assertIn(value, css)


if __name__ == "__main__":
    unittest.main()