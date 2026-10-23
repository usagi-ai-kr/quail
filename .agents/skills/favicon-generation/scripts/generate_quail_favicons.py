#!/usr/bin/env python3
"""Generate Quail's RealFaviconGenerator-aligned assets without third-party packages."""

from __future__ import annotations

import argparse
import json
import math
import struct
import zlib
from pathlib import Path

CANVAS = 512
AA = 4
TILE = (67, 146, 241, 255)
WHITE = (255, 255, 255, 255)

# Simplified quail silhouette: rounded body, head, beak, and tail only.
# Feet and wing details are intentionally removed for 16px legibility.
TAIL = [(150, 255), (210, 235), (185, 205), (255, 235), (245, 315), (210, 345), (175, 330), (195, 295)]
BODY = (275, 312, 138, 102)
HEAD = (345, 198, 78, 80)
BEAK = [(405, 178), (492, 205), (405, 232)]
EYE = (365, 182, 11)


def svg_source() -> str:
    points = lambda values: " ".join(f"{x},{y}" for x, y in values)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}" role="img" aria-labelledby="title">
  <title id="title">Quail</title>
  <rect width="{CANVAS}" height="{CANVAS}" rx="126" fill="#4392f1" />
  <polygon points="{points(TAIL)}" fill="#ffffff" />
  <ellipse cx="{BODY[0]}" cy="{BODY[1]}" rx="{BODY[2]}" ry="{BODY[3]}" fill="#ffffff" />
  <ellipse cx="{HEAD[0]}" cy="{HEAD[1]}" rx="{HEAD[2]}" ry="{HEAD[3]}" fill="#ffffff" />
  <polygon points="{points(BEAK)}" fill="#ffffff" />
  <circle cx="{EYE[0]}" cy="{EYE[1]}" r="{EYE[2]}" fill="#4392f1" />
</svg>
'''


class Raster:
    def __init__(self, size: int, background: str, mark_scale: float = 1.0):
        self.size = size
        self.high_size = size * AA
        self.data = bytearray(self.high_size * self.high_size * 4)
        self.mark_scale = self.high_size / CANVAS * mark_scale
        self.offset = (self.high_size - CANVAS * self.mark_scale) / 2
        if background == "square":
            self.fill(TILE)
        elif background == "tile":
            self.rounded_rect(0, 0, self.high_size, self.high_size, self.high_size * 126 / CANVAS, TILE)
        elif background != "transparent":
            raise ValueError(f"unknown background: {background}")

    def fill(self, color: tuple[int, int, int, int]) -> None:
        self.data[:] = bytes(color) * (self.high_size * self.high_size)

    def span(self, y: int, left: int, right: int, color: tuple[int, int, int, int]) -> None:
        left = max(0, left)
        right = min(self.high_size, right)
        if y < 0 or y >= self.high_size or left >= right:
            return
        start = (y * self.high_size + left) * 4
        self.data[start : start + (right - left) * 4] = bytes(color) * (right - left)

    def tx(self, x: float) -> float:
        return self.offset + x * self.mark_scale

    def polygon(self, points: list[tuple[int, int]], color: tuple[int, int, int, int]) -> None:
        pts = [(self.tx(x), self.offset + y * self.mark_scale) for x, y in points]
        low = max(0, math.floor(min(y for _, y in pts)))
        high = min(self.high_size, math.ceil(max(y for _, y in pts)))
        for py in range(low, high):
            scan_y = py + 0.5
            intersections = []
            for index, (x1, y1) in enumerate(pts):
                x2, y2 = pts[(index + 1) % len(pts)]
                if (y1 <= scan_y < y2) or (y2 <= scan_y < y1):
                    intersections.append(x1 + (scan_y - y1) * (x2 - x1) / (y2 - y1))
            intersections.sort()
            for index in range(0, len(intersections) - 1, 2):
                left = math.ceil(intersections[index] - 0.5)
                right = math.ceil(intersections[index + 1] - 0.5)
                self.span(py, left, right, color)

    def ellipse(self, cx: float, cy: float, rx: float, ry: float, color: tuple[int, int, int, int]) -> None:
        cx, cy = self.tx(cx), self.offset + cy * self.mark_scale
        rx, ry = rx * self.mark_scale, ry * self.mark_scale
        low = max(0, math.floor(cy - ry))
        high = min(self.high_size, math.ceil(cy + ry))
        for py in range(low, high):
            normalized_y = (py + 0.5 - cy) / ry
            if abs(normalized_y) <= 1:
                half_width = rx * math.sqrt(1 - normalized_y * normalized_y)
                left = math.ceil(cx - half_width - 0.5)
                right = math.ceil(cx + half_width - 0.5)
                self.span(py, left, right, color)

    def rounded_rect(self, x: float, y: float, width: float, height: float, radius: float, color: tuple[int, int, int, int]) -> None:
        for py in range(max(0, math.floor(y)), min(self.high_size, math.ceil(y + height))):
            cy = py + 0.5
            if cy < y + radius:
                dy = y + radius - cy
                inset = radius - math.sqrt(max(0.0, radius * radius - dy * dy))
            elif cy > y + height - radius:
                dy = cy - (y + height - radius)
                inset = radius - math.sqrt(max(0.0, radius * radius - dy * dy))
            else:
                inset = 0
            left = math.ceil(x + inset - 0.5)
            right = math.ceil(x + width - inset - 0.5)
            self.span(py, left, right, color)

    def draw_mark(self) -> None:
        self.polygon(TAIL, WHITE)
        self.ellipse(*BODY, WHITE)
        self.ellipse(*HEAD, WHITE)
        self.polygon(BEAK, WHITE)
        self.ellipse(EYE[0], EYE[1], EYE[2], EYE[2], TILE)

    def png(self) -> bytes:
        self.draw_mark()
        output = bytearray(self.size * self.size * 4)
        block = AA * AA
        for oy in range(self.size):
            for ox in range(self.size):
                alpha_sum = red_sum = green_sum = blue_sum = 0
                for sy in range(AA):
                    start = (((oy * AA + sy) * self.high_size) + ox * AA) * 4
                    for sx in range(AA):
                        index = start + sx * 4
                        alpha = self.data[index + 3]
                        alpha_sum += alpha
                        red_sum += self.data[index] * alpha
                        green_sum += self.data[index + 1] * alpha
                        blue_sum += self.data[index + 2] * alpha
                out = (oy * self.size + ox) * 4
                output[out] = round(red_sum / alpha_sum) if alpha_sum else 0
                output[out + 1] = round(green_sum / alpha_sum) if alpha_sum else 0
                output[out + 2] = round(blue_sum / alpha_sum) if alpha_sum else 0
                output[out + 3] = round(alpha_sum / block)
        return encode_png(self.size, self.size, bytes(output))


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def encode_png(width: int, height: int, rgba: bytes) -> bytes:
    rows = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header) + png_chunk(b"IDAT", zlib.compress(rows, 9)) + png_chunk(b"IEND", b"")


def ico(images: list[tuple[int, bytes]]) -> bytes:
    header = struct.pack("<HHH", 0, 1, len(images))
    entries = bytearray()
    payload = bytearray()
    offset = 6 + 16 * len(images)
    for size, data in images:
        dimension = 0 if size == 256 else size
        entries.extend(struct.pack("<BBBBHHII", dimension, dimension, 0, 0, 1, 32, len(data), offset))
        payload.extend(data)
        offset += len(data)
    return header + entries + payload


def render(size: int, *, background: str, mark_scale: float = 1.0) -> bytes:
    return Raster(size, background, mark_scale).png()


def generate(output_dir: Path) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []

    def write(name: str, data: bytes | str) -> None:
        path = output_dir / name
        path.write_bytes(data.encode("utf-8") if isinstance(data, str) else data)
        outputs.append(path)

    write("favicon.svg", svg_source())
    write("favicon-96x96.png", render(96, background="tile"))
    write("apple-touch-icon.png", render(180, background="square", mark_scale=0.86))
    write("web-app-manifest-192x192.png", render(192, background="square", mark_scale=0.78))
    write("web-app-manifest-512x512.png", render(512, background="square", mark_scale=0.78))
    write("favicon.ico", ico([(size, render(size, background="tile")) for size in (16, 32, 48)]))

    manifest = {
        "name": "Quail",
        "short_name": "Quail",
        "icons": [
            {"src": "/web-app-manifest-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "/web-app-manifest-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
        "background_color": "#4392f1",
        "theme_color": "#4392f1",
    }
    write("site.webmanifest", json.dumps(manifest, indent=2) + "\n")
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, default=Path("public"), help="asset directory (default: public)")
    args = parser.parse_args()
    for path in generate(args.output_dir):
        print(path)


if __name__ == "__main__":
    main()
