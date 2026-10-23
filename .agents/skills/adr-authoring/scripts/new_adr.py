#!/usr/bin/env python3
"""Create a numbered Markdown ADR scaffold without overwriting files."""

from __future__ import annotations

import argparse
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path


NUMBERED_ADR = re.compile(r"^(\d+)-.+\.md$")


def slugify(title: str) -> str:
    normalized = unicodedata.normalize("NFKC", title).strip().lower()
    slug_parts: list[str] = []
    for char in normalized:
        if char.isalnum():
            slug_parts.append(char)
        elif slug_parts and slug_parts[-1] != "-":
            slug_parts.append("-")
    return "".join(slug_parts).strip("-")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a numbered ADR Markdown scaffold."
    )
    parser.add_argument("title", help="short title for the architectural decision")
    parser.add_argument(
        "--directory",
        type=Path,
        default=Path("docs/adr"),
        help="ADR directory (default: docs/adr)",
    )
    parser.add_argument(
        "--status",
        default="Proposed",
        help="initial ADR status (default: Proposed)",
    )
    parser.add_argument(
        "--date",
        default=date.today().isoformat(),
        help="record date in YYYY-MM-DD format (default: today)",
    )
    args = parser.parse_args()

    args.title = args.title.strip()
    if not args.title or "\n" in args.title or "\r" in args.title:
        parser.error("title must be a non-empty single line")

    args.status = args.status.strip()
    if not args.status or "\n" in args.status or "\r" in args.status:
        parser.error("status must be a non-empty single line")

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.date):
        parser.error("--date must use YYYY-MM-DD format")

    try:
        date.fromisoformat(args.date)
    except ValueError:
        parser.error("--date must be a valid YYYY-MM-DD date")

    if not slugify(args.title):
        parser.error("title must contain at least one letter or number")

    return args


def next_number(directory: Path) -> int:
    numbers = []
    for path in directory.glob("*.md"):
        match = NUMBERED_ADR.match(path.name)
        if match:
            numbers.append(int(match.group(1)))
    return max(numbers, default=0) + 1


def main() -> int:
    args = parse_args()
    slug = slugify(args.title)
    path: Path | None = None

    try:
        args.directory.mkdir(parents=True, exist_ok=True)
        number = next_number(args.directory)
        path = args.directory / f"{number:04d}-{slug}.md"
        while path.exists():
            number += 1
            path = args.directory / f"{number:04d}-{slug}.md"

        content = (
            f"# {number:04d}. {args.title}\n\n"
            f"- Status: {args.status}\n"
            f"- Date: {args.date}\n\n"
            "## Context\n\n"
            "## Decision\n\n"
            "## Consequences\n\n"
            "## Alternatives considered\n"
        )
        with path.open("x", encoding="utf-8", newline="\n") as adr_file:
            adr_file.write(content)
    except FileExistsError:
        destination = path if path is not None else args.directory
        print(f"Error: destination already exists: {destination}", file=sys.stderr)
        return 1
    except OSError as exc:
        print(f"Error: could not create ADR in {args.directory}: {exc}", file=sys.stderr)
        return 1

    print(f"Created {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
