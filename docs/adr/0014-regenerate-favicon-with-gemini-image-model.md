# 0014. Regenerate the favicon source with Gemini image generation

- Status: Accepted
- Date: 2026-10-24
- Related: [ADR-0009](0009-adopt-quail-blue-palette-and-simplified-favicon.md)

## Context

ADR-0009 establishes Quail's blue palette and recognizable simplified quail mark. The user requests a redesigned favicon generated with Google Nano Banana 2, whose stable Gemini API model ID is gemini-3.1-flash-image. The brand blue remains #4392F1; this decision changes how the favicon source image is created, not the palette decision.

## Decision

- Use the stable gemini-3.1-flash-image model (Nano Banana 2) to generate the favicon source image. The selected concept is assets/nanobanana2/concept-01.jpg, an original JPEG.
- Preserve the Quail blue tile (#4392F1) and redesign the mark as a clearly recognizable quail silhouette that remains legible at favicon sizes.
- Use GEMINI_API_KEY from the user-authorized local .env when generation is performed. Never read, print, commit, or copy the key into image metadata, prompts, or logs.
- Preserve the original AI-generated JPEG unchanged and keep a separate normalized PNG for repacking. Record the model ID, applied prompt, and source hash in secret-free provenance metadata.
- Keep AI generation separate from deterministic repacking. Generate public favicon variants from the separate normalized PNG using the deterministic local pipeline.
- Keep ADR-0009 Accepted: its palette decision remains valid. This ADR records only the favicon source-generation method and mark redesign.

## Consequences

- AI generation is not deterministic; preserving the selected source JPEG and its separate normalized PNG makes later repacking reproducible.
- The model and exact prompt can be traced without storing credentials or other secret values.
- Repacking remains a local deterministic step and does not call the image-generation API.
- The selected source concept has been normalized and packaged. Final dimensions and hashes are recorded above. Visual review of the 16px, 32px, and 96px assets was completed.

## Alternatives considered

- Keep the previous locally drawn quail as the source: not selected because the user requested a clearer redesigned mark generated with Nano Banana 2.
- Replace the Quail blue palette: not selected; ADR-0009 remains in force and #4392F1 is retained.

## Packaging completion

The selected source has now been normalized and packaged:

- Source JPEG SHA-256: `e03415de300381985cb5eabae7ab69df604887796e345dd87688b31aacc0d8db`
- Normalized PNG: `concept-01-normalized.png`, SHA-256 `22ab8d7a5fa33b4e26f907cad16469fa50bd6e2f5c8bd06dd91393fc14158134`, 1024×1024
- Metadata records width and height as 1024 and preserves the source hash.

Generated public assets:

- `public/favicon.svg`: 512×512 wrapper embedding the 512×512 PNG as base64
- `public/favicon-96x96.png`: 96×96
- `public/apple-touch-icon.png`: 180×180
- `public/web-app-manifest-192x192.png`: 192×192
- `public/web-app-manifest-512x512.png`: 512×512
- `public/favicon.ico`: 16×16, 32×32, and 48×48
- `public/site.webmanifest`: manifest with `#4392f1` theme and background colors

Packaging commands:

```sh
python3 -m venv /tmp/quail-favicon-venv
/tmp/quail-favicon-venv/bin/python -m pip install -r .agents/skills/favicon-generation/scripts/requirements.txt
/tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/prepare_quail_favicon_source.py
/tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/generate_quail_favicons.py
```

Verification:

- Small browser icons (16, 32, 48, and 96) and the SVG wrapper use a central 80% crop scaled by 1.25x for optical legibility. Apple touch and maskable icons keep the full source safe area and are not optically enlarged.
- Regenerating twice produces identical output.
- The normalized source is 1024×1024.
- The source SHA-256 matches the original JPEG.
- The normalized PNG SHA-256 matches metadata.
- Mock-only Gemini tests pass without calling the live API.
- Visual review of the 16px, 32px, and 96px assets was completed. The temporary preview image is not committed to the repository.