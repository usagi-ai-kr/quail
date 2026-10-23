# 0006. Generate Quail favicon assets locally

- Status: Superseded by [0009](./0009-adopt-quail-blue-palette-and-simplified-favicon.md)
- Date: 2026-10-24

## Context

Quail is served as a static SolidJS site through Cloudflare Workers. A site icon needs different files for browser tabs, Apple home screen shortcuts, and Android Chrome. RealFaviconGenerator's current guidance recommends an SVG and a 96×96 PNG, an opaque 180×180 Apple Touch icon, and 192×192 and 512×512 icons in a web app manifest. It also describes a root `favicon.ico` as a useful fallback for tabs showing documents such as PDFs.

The repository requires every skill to include a deterministic script. The user requested RealFaviconGenerator as the reference and asked for a Quail icon with visual cues from GitHub and YouTube.

## Decision

Keep the Quail favicon source and generated package in the repository. Use an original white quail silhouette on a red tile, carrying over only the bold silhouette and high-contrast color cues. Do not reuse either company's logo.

Generate the SVG, 96×96 PNG, opaque 180×180 Apple Touch icon, 192×192 and 512×512 manifest icons, and multi-size root `favicon.ico` with `.agents/skills/favicon-generation/scripts/generate_quail_favicons.py`. The script uses only the Python standard library. Link these assets from `index.html` and `public/site.webmanifest`. Use RealFaviconGenerator's published guidance as the compatibility reference and its preview when available.

## Consequences

- Favicon files can be regenerated consistently without a network connection or third-party Python packages.
- Browser, Apple, Android, and legacy document-tab use cases have dedicated assets.
- The generator's drawing primitives are specific to Quail and must be updated when its mark changes.
- RealFaviconGenerator's recommendations can change, so the asset matrix should be reviewed when updating this workflow.

## Alternatives considered

- Generate and download the complete package manually from RealFaviconGenerator each time: this follows the reference site directly, but adds a manual, network-dependent step and does not provide a deterministic repository script.
- Keep only an SVG favicon: this is smaller, but omits the platform-specific touch and manifest assets covered by the requested generator workflow.
