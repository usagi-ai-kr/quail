#!/usr/bin/env python3
"""Normalize the selected generated image to a deterministic two-color PNG source."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

BLUE = (67, 146, 241)
WHITE = (255, 255, 255)
BLUE_TO_WHITE = tuple(white - blue for blue, white in zip(BLUE, WHITE))
PROJECTION_LENGTH_SQUARED = sum(channel * channel for channel in BLUE_TO_WHITE)
DEFAULT_IMAGE = Path(__file__).resolve().parents[1] / "assets" / "nanobanana2" / "concept-01.jpg"
DEFAULT_PNG = DEFAULT_IMAGE.with_name("concept-01-normalized.png")
DEFAULT_METADATA = DEFAULT_IMAGE.with_name("concept-01.metadata.json")


def normalized_rgb_bytes(source_pixels) -> bytes:
    pixels = bytearray()
    for pixel in source_pixels:
        projection = sum((channel - blue) * delta for channel, blue, delta in zip(pixel, BLUE, BLUE_TO_WHITE))
        amount = max(0.0, min(1.0, projection / PROJECTION_LENGTH_SQUARED))
        if amount <= 0.06:
            pixels.extend(BLUE)
        elif amount >= 0.94:
            pixels.extend(WHITE)
        else:
            pixels.extend(round(blue + amount * delta) for blue, delta in zip(BLUE, BLUE_TO_WHITE))
    return bytes(pixels)


def prepare_source(source_path: Path, output_path: Path, metadata_path: Path | None = None) -> dict[str, object]:
    try:
        from PIL import Image, ImageOps
    except ImportError as error:
        raise RuntimeError("PNG normalization requires Pillow; install scripts/requirements.txt") from error

    with Image.open(source_path) as opened:
        if opened.format not in {"PNG", "JPEG", "WEBP"}:
            raise ValueError("source must be a PNG, JPEG, or WebP image")
        source = ImageOps.exif_transpose(opened)
        if source.width != 1024 or source.height != 1024:
            raise ValueError("selected source must be a 1024×1024 image")
        source.load()
        rgb = source.convert("RGB")
        width, height = rgb.size
        pixel_bytes = normalized_rgb_bytes(rgb.get_flattened_data())

    normalized = Image.frombytes("RGB", (width, height), pixel_bytes)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    normalized.save(output_path, format="PNG", optimize=False, compress_level=9)
    output_bytes = output_path.read_bytes()
    result: dict[str, object] = {
        "sourcePath": source_path.name,
        "sourceWidth": width,
        "sourceHeight": height,
        "normalizedPng": output_path.name,
        "normalizedPngSha256": hashlib.sha256(output_bytes).hexdigest(),
        "normalizedWidth": width,
        "normalizedHeight": height,
    }

    if metadata_path is not None and metadata_path.exists():
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        metadata["width"] = width
        metadata["height"] = height
        metadata["normalizedSource"] = result
        metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-image", type=Path, default=DEFAULT_IMAGE)
    parser.add_argument("--output-png", type=Path, default=DEFAULT_PNG)
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA)
    args = parser.parse_args()
    result = prepare_source(args.source_image, args.output_png, args.metadata)
    print(f"Normalized source: {args.output_png}")
    print(f"Dimensions: {result['normalizedWidth']}×{result['normalizedHeight']}")
    print(f"SHA-256: {result['normalizedPngSha256']}")


if __name__ == "__main__":
    main()
