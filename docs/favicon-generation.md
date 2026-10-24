# Favicon generation

Quail's favicon package is generated from a selected AI-generated source image.

## Source

- Original source: `.agents/skills/favicon-generation/assets/nanobanana2/concept-01.jpg`
- Normalized source: `.agents/skills/favicon-generation/assets/nanobanana2/concept-01-normalized.png`
- Metadata: `.agents/skills/favicon-generation/assets/nanobanana2/concept-01.metadata.json`

## Setup

```sh
python3 -m venv /tmp/quail-favicon-venv
/tmp/quail-favicon-venv/bin/python -m pip install -r .agents/skills/favicon-generation/scripts/requirements.txt
```

## Real Gemini generation (only when explicitly requested)

```sh
node .agents/skills/favicon-generation/scripts/generate_nanobanana_concepts.mjs --count=1 --output-dir=/tmp/quail-favicon-source
```

The default destination refuses to overwrite an existing concept. Use `--output-dir` for a new source folder. This command requires `GEMINI_API_KEY` in a workspace `.env` file and must not print or commit the key.

## Commands

Normalize the selected source:

```sh
/tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/prepare_quail_favicon_source.py
```

Package public assets:

```sh
/tmp/quail-favicon-venv/bin/python .agents/skills/favicon-generation/scripts/generate_quail_favicons.py
```

Run mock-only Gemini tests:

```sh
node --test .agents/skills/favicon-generation/tests/gemini-generation.test.mjs
```

## Generated assets

- `public/favicon.svg`: 512×512 wrapper embedding the 512×512 PNG as base64
- `public/favicon-96x96.png`: 96×96
- `public/apple-touch-icon.png`: 180×180
- `public/web-app-manifest-192x192.png`: 192×192
- `public/web-app-manifest-512x512.png`: 512×512
- `public/favicon.ico`: 16×16, 32×32, and 48×48
- `public/site.webmanifest`: manifest with `#4392f1` theme and background colors

## Optical scaling

Small browser icons (16, 32, 48, and 96) and the SVG wrapper use a central 80% crop scaled by 1.25x. Apple touch and maskable icons (180, 192, and 512) keep the full source safe area and are not optically enlarged. The normalized source and original JPEG remain unchanged.

## Verification

- Regenerate twice and compare output hashes.
- Confirm the normalized source has 1024×1024 dimensions.
- Confirm JPEG source SHA-256 is `e03415de300381985cb5eabae7ab69df604887796e345dd87688b31aacc0d8db`.
- Confirm normalized PNG SHA-256 is `22ab8d7a5fa33b4e26f907cad16469fa50bd6e2f5c8bd06dd91393fc14158134`.
- Do not commit temporary preview images such as `/tmp/quail-favicon-preview.png`.

## Security

- Do not call the Gemini API during normal packaging.
- Do not write API keys, prompts containing secrets, or raw API responses to repository files.
- Keep `.env` ignored. Response captures belong in temporary paths only.