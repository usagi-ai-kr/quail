# 0009. Adopt Quail blue palette and simplified favicon

- Status: Accepted
- Date: 2026-10-24
- Supersedes: [0006. Generate Quail favicon assets locally](./0006-generate-quail-favicon-assets-locally.md)

## Context

The user requested a palette from `https://coolors.co/4392f1-ece8ef-e3ebff-e7f0ff-dc493a`, applied as a reusable design skill, with a blue favicon tile (`#4392F1`) and a smoother, simpler quail mark. The previous favicon decision used a red tile and a more detailed silhouette.

The palette contains one saturated blue, one neutral lavender surface, two light blue surfaces, and one red. White text on the blue is about `3.17:1`, below WCAG AA for normal text, and white on the red is also below `4.5:1`.

## Decision

Adopt the five-color palette as Quail's design source of truth:

- `#4392F1` brand blue
- `#ECE8EF` neutral surface
- `#E3EBFF` brand-tinted surface
- `#E7F0FF` light brand-tinted surface
- `#DC493A` error red

Represent these colors as semantic CSS tokens in `.agents/skills/color-palette/assets/palette.css`, generated and checked by `.agents/skills/color-palette/scripts/palette.py`. Use dark foreground text (`#0B1120`) on saturated brand and error backgrounds because white fails normal-text contrast. Keep layouts simple and whitespace-led, using the generated spacing tokens and a small radius set.

Change the favicon tile from red to `#4392F1` and simplify the quail to a white rounded body, head, beak, and tail. Remove sharp feet and wing details and use a blue circular eye cutout so the mark remains identifiable at 16px. Regenerate all SVG, PNG, ICO, and manifest assets deterministically with `.agents/skills/favicon-generation/scripts/generate_quail_favicons.py`.

## Consequences

- UI work has one palette and one generated token artifact to consume.
- Contrast failures are documented instead of hidden: normal text on blue or red must use the dark foreground.
- The favicon is calmer and consistent with the blue brand, but loses the previous red visual cue.
- `docs/adr/0006-generate-quail-favicon-assets-locally.md` is superseded for the tile color and silhouette detail; its deterministic generation workflow remains valid.

## Alternatives considered

- Keep the red favicon tile: preserves the earlier visual cue, but conflicts with the requested blue palette and brand direction.
- Use white text on blue by darkening the blue: improves contrast, but changes the requested `#4392F1` brand color.
- Keep feet and wing details: adds character, but reduces legibility at 16px.