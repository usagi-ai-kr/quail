# 0013. Adopt Pretendard as the local UI font

- Status: Accepted
- Date: 2026-10-24
- Supersedes: [ADR-0004](0004-nixgon-font-로컬-임베딩.md)

## Context

ADR-0004 selected locally embedded Nixgon fonts. The user has since selected Pretendard as the Korean and Latin UI font, replacing the Nixgon default-font plan. The official Pretendard v1.3.9 variable WOFF2 asset and its OFL notice are stored locally; the font asset is about 2.0 MB.

## Decision

Use the official Pretendard v1.3.9 variable font as Quail's local UI font. Keep its OFL notice with the asset and serve the font from the Worker asset allowlist. Use word-break: keep-all for Korean prose and overflow-wrap: break-word for long unspaced content. A password input may use system-ui only for masked glyphs when that improves legibility; the rest of the UI uses Pretendard.

## Consequences

- Korean and Latin UI text use one consistent local font without a runtime font CDN request.
- The font asset adds about 2.0 MB plus its license notice to the repository and deployed assets.
- Existing Nixgon files and the historical reasoning in ADR-0004 are not the selected font plan for new UI work. ADR-0004 remains as a record of the earlier decision.
- The Pretendard v1.3.9 asset and Worker font allowlist are in place. Actual browser font rendering remains a separate, unverified check.

## Alternatives considered

- Continue using Nixgon: not selected because the user explicitly replaced that font decision with Pretendard.
- Use only platform fonts: not selected because the user selected a consistent local Pretendard face.
