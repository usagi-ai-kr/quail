# Quail UI design system

## UI foundation

Use Tailwind CSS for layout and visual styles, and Kobalte for accessible interactive behavior. Keep imports from external UI component packages inside src/ui/**; app, domain, and infra must not import Kobalte components or presentation code.

| Package | Resolved version | Responsibility |
|---|---:|---|
| solid-js | 1.9.17 | UI runtime |
| @kobalte/core | 0.13.14 | Accessible interactive primitives |
| tailwindcss | 4.3.3 | Utility CSS |
| @tailwindcss/vite | 4.3.3 | Vite integration |
| @solidjs/testing-library | 0.8.10 | Solid UI tests |
| jsdom | 30.1.3 | UI test DOM |

These are the selected lockfile versions. Tailwind owns CSS layout and styling; Kobalte owns control behavior, keyboard interaction, and accessibility semantics. Do not use Kobalte as a second styling system or import it from non-UI layers.

See [ADR-0012](adr/0012-solid-ui-foundation-with-tailwind-and-kobalte.md) and [ADR-0013](adr/0013-adopt-pretendard-for-ui-font.md).

## Palette and Tailwind tokens

The generated [palette asset](../.agents/skills/color-palette/assets/palette.css) is the canonical source for Quail palette, spacing, radius, and contrast tokens. The current app copies palette values into --palette-color-* variables in src/style.css and maps them through @theme inline. There is no automatic synchronization or direct import from the generated asset. When palette values change, update the generated asset and app copy together and review both changes. Do not describe the app copy as automatically generated.

Preserve the documented contrast rules: use dark on-brand/on-error foreground tokens for normal-size text on saturated backgrounds; do not choose foreground colors by appearance alone. Keep focus outlines visible and use the semantic focus token.

## Typography and Korean text

Pretendard v1.3.9 is the local default font for Korean and Latin UI text. Keep its OFL notice with the local font asset. Use word-break: keep-all for Korean prose and overflow-wrap: break-word for long unspaced content, code, and URLs so they do not force horizontal overflow.

Password inputs remain semantic type=password fields with autocomplete=current-password. Preserve browser autofill, readable foreground and caret colors, and a visible focus ring. system-ui is an allowed font exception only for password masking glyphs if Pretendard's mask glyph is less legible; do not reveal password text to improve readability.

## Shared component rules

- Button has primary and secondary variants. Use primary for the main action and secondary for a supporting action. Keep native semantics; default to type=button and set type=submit explicitly for form submission.
- Buttons and fields remain keyboard reachable in document order. Do not autofocus the password field on page load. Use a clear :focus-visible outline with offset; do not remove focus styling.
- A disabled control uses the native disabled state while its action is pending. Keep labels readable, block duplicate submissions, and provide a status message; opacity alone is not the state indication.
- Associate field errors with the field, set aria-invalid, and do not rely on red color alone. Async login/session feedback uses a polite status region and centralized copy keys.
- Allow password-manager autofill. Keep input and caret colors legible after browser autofill. Use system-ui for the masked glyph only when needed, as described above.

The canonical Korean terms and copy keys live in [the UI glossary](ui-glossary.md) and src/ui/content/ko.ts. Reuse those keys; do not duplicate UI strings in components or add an i18n dependency for the current single-language copy table.

## Responsive screens

The current UI is the login and authenticated-content flow. An asset dashboard, Select, Dialog, MoneyField, and DataTable are not implemented. For future data-heavy screens, use desktop side navigation with semantic tables; on mobile, provide compact navigation and card-based records instead of squeezing a wide table into the viewport.

## Verification status

- pnpm test — 24 Worker regression cases and 9 UI cases passed.
- pnpm typecheck — passed.
- pnpm build — passed.
- pnpm install --frozen-lockfile — passed.
- python3 .agents/skills/layered-auth-development/scripts/check_layer_imports.py --root . — passed for 13 production source files.
- pnpm dev — the public route returned HTTP 200.
- The Pretendard v1.3.9 local asset, OFL notice, and Worker font allowlist are in place. Real-browser visual verification has not been performed; font rendering, keyboard interaction, and responsive layout remain visually unverified. Do not infer browser validation from jsdom tests or an HTTP 200 response.
