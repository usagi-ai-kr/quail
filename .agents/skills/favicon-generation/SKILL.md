---
name: favicon-generation
description: Create or update a website favicon package from a site's brand mark, connect it to the app entry point, and check platform assets. Use when a user requests a favicon, app icon, or favicon refresh.
---

# Favicon Generation

Create a recognizable favicon set for the current site, integrate its links, and keep the output reproducible.

## Workflow

1. Inspect the app entry document, public asset directory, brand name, and any supplied logo or style references. Keep the mark legible at 16×16 pixels.
2. Treat named brands as visual references. Carry over only the requested visual traits; make the site's mark original and do not copy another company's logo.
3. Check [RealFaviconGenerator](https://realfavicongenerator.net/) for its current platform guidance and preview the source mark there when browser access is available. The site provides platform previews and corresponding HTML markup. Do not claim to have generated or checked files online unless that actually happened.
4. For this repository, generate the Quail favicon package with:

   ```sh
   python3 .agents/skills/favicon-generation/scripts/generate_quail_favicons.py
   ```

   The script uses only the Python standard library and writes the SVG, PNG, ICO, and web app manifest assets to `public/`. Change its vector geometry and colors when the site's approved mark changes.
5. Add or update the HTML `<link>` elements in the app entry document. Keep paths aligned with the generated filenames and the web app manifest.
6. Keep the package aligned with RealFaviconGenerator's current recommendations: SVG and 96×96 PNG for browser/search use, one opaque 180×180 Apple Touch icon, and 192×192 and 512×512 manifest icons for Android. Include a root `favicon.ico` with 16, 32, and 48 pixel images when legacy document tabs such as PDFs need the conventional fallback.
7. Inspect the generated assets and HTML references. Use the project's favicon checker when available.

## Current Quail visual direction

The user requested the strong, simple silhouette associated with GitHub's favicon and YouTube's saturated red rounded tile. Use those as broad visual cues: an original white quail silhouette on a red tile, with minimal interior detail. Do not reproduce the Octocat or YouTube play-button marks.
