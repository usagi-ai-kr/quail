---
name: favicon-generation
description: "Generate the Quail favicon package from a selected AI-generated source image and keep it reproducible. Use when changing the Quail favicon mark, regenerating public favicon assets, or reviewing favicon packaging."
---

# Favicon Generation

Generate Quail's favicon package from a selected 1024×1024 source image and keep the output deterministic.

## Current Quail visual direction

Use an original white quail silhouette on a saturated blue tile (`#4392F1`), with minimal interior detail. The mark must stay recognizable at 16x16: keep a compact round body, small head, short beak, and tiny crest, and remove sharp feet/wing details. Do not reproduce the Octocat or YouTube play-button marks. The eye is a blue negative-space cutout in the white head.

## Setup

Create and populate the packaging virtual environment:

```sh
python3 -m venv /tmp/quail-favicon-venv
/tmp/quail-favicon-venv/bin/python -m pip install -r .agents/skills/favicon-generation/scripts/requirements.txt
```

## Real Gemini generation (only when a new source is explicitly requested)

```sh
node .agents/skills/favicon-generation/scripts/generate_nanobanana_concepts.mjs --count=1 --output-dir=/tmp/quail-favicon-source
```

This calls the fixed Gemini endpoint with `gemini-3.1-flash-image`. It requires `GEMINI_API_KEY` in a workspace `.env` file. It never prints or commits the key. The default destination refuses to overwrite an existing concept, so use `--output-dir` for a new source folder.

## Workflow

1. Keep the selected AI-generated source at `.agents/skills/favicon-generation/assets/nanobanana2/concept-01.jpg`.
2. Normalize it deterministically:
   ```sh
   /tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/prepare_quail_favicon_source.py
   ```
   This writes `concept-01-normalized.png` and updates `concept-01.metadata.json` with the actual 1024×1024 dimensions and hashes.
3. Package the public assets:
   ```sh
   /tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/generate_quail_favicons.py
   ```
   This writes the SVG, PNG, ICO, and manifest assets to `public/`.
4. Verify determinism by running the generator twice and comparing output hashes.
5. Do not call the Gemini API again unless the user explicitly requests a new source image.
6. Do not put secrets, API keys, prompts with secrets, or raw API responses in repository files. Response captures stay outside the repository.

## Optical scaling

Small browser icons (16, 32, 48, and 96) and the SVG wrapper use a central 80% crop scaled by 1.25x. Apple touch and maskable icons keep the full source safe area.

## Generated package

- `public/favicon.svg`: 512×512 wrapper SVG embedding the 512×512 PNG as base64
- `public/favicon-96x96.png`: 96×96
- `public/apple-touch-icon.png`: 180×180
- `public/web-app-manifest-192x192.png`: 192×192
- `public/web-app-manifest-512x512.png`: 512×512
- `public/favicon.ico`: 16×16, 32×32, and 48×48
- `public/site.webmanifest`: manifest with `#4392f1` theme/background colors

## Tests

```sh
node --test .agents/skills/favicon-generation/tests/gemini-generation.test.mjs
```

The Gemini test is mock-only and does not call the live API. Packaging uses the venv Python with Pillow installed.

## Visual review

Visual review of the 16px, 32px, and 96px assets was completed. A temporary 16px/32px preview can be created at `/tmp/quail-favicon-preview.png` for review; this repository does not commit that preview.