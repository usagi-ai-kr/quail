---
name: color-palette
description: "Apply the Quail color palette (#4392F1, #ECE8EF, #E3EBFF, #E7F0FF, #DC493A) as semantic CSS tokens, check WCAG contrast, and generate favicon assets on a blue tile. Use when designing or reviewing UI colors, Tailwind tokens, Korean typography, spacing, or favicon branding."
---

# Color Palette

Apply Quail's five-color palette as semantic CSS tokens with documented contrast behavior. Prefer the generated token file over ad hoc hex values.

## Colors

| Token | Value | Role |
|---|---|---|
| `--color-brand` | `#4392F1` | Primary actions, links, focus, brand tile |
| `--color-surface` | `#ECE8EF` | Page/app surface and neutral panels |
| `--color-surface-brand` | `#E3EBFF` | Subtle brand-tinted surface |
| `--color-surface-brand-soft` | `#E7F0FF` | Very light brand-tinted surface |
| `--color-error` | `#DC493A` | Error, destructive, and validation states |

## Contrast rule

- `#4392F1` on `#FFFFFF` is about `3.17:1`, so it fails WCAG AA for normal text. Do not use white text on the blue brand color for normal-size text.
- Use `--color-on-brand: #0B1120` for normal text on brand backgrounds. The same dark foreground is used on `--color-error`, whose white contrast is also below `4.5:1`.
- White may be used only for large text/icons or on dark backgrounds, and only after checking the ratio.
- Surfaces use the dark foreground by default.

## Spacing and shape

Keep layouts simple and whitespace-led:

- Use the generated `--space-*` tokens instead of arbitrary margins.
- Prefer one primary action per view and generous vertical rhythm.
- Use `--radius-md` or `--radius-lg`; avoid mixing many radii.
- Do not add decorative gradients or extra accent colors outside the five-color palette.

## UI and Korean copy conventions

- Tailwind utilities must map to the generated semantic palette; do not maintain a second editable set of color values.
- Quail UI uses local Pretendard and word-break: keep-all for Korean prose, with overflow-wrap: break-word for long unspaced content. system-ui is permitted only for password masking glyph legibility.
- Use the central uiCopy keys in src/ui/content/ko.ts and keep element names and Korean terms aligned with docs/ui-glossary.md. Do not duplicate copy keys or literals or add an i18n dependency for the current Korean UI.
- Apply the same palette and Korean text rules to future data screens: desktop side navigation and tables, mobile navigation and record cards. These are future layout rules, not claims that those screens exist.

## Generate tokens

```sh
python3 .agents/skills/color-palette/scripts/palette.py generate --output .agents/skills/color-palette/assets/palette.css
python3 .agents/skills/color-palette/scripts/palette.py check --input .agents/skills/color-palette/assets/palette.css
python3 .agents/skills/color-palette/scripts/palette.py contrast "#FFFFFF" "#4392F1"
```

The committed CSS artifact is `.agents/skills/color-palette/assets/palette.css`. A UI worker may copy or import it into `src` after review; this skill does not edit application source.

## Tests

```sh
cd .agents/skills/color-palette/scripts && python3 -m unittest test_palette.py
```
