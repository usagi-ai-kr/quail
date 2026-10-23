#!/usr/bin/env python3
"""Format a Conventional Commit header without running Git commands."""

from __future__ import annotations

import argparse
import re


COMMIT_TYPES = (
    "feat",
    "fix",
    "docs",
    "style",
    "refactor",
    "perf",
    "test",
    "build",
    "ci",
    "chore",
    "revert",
)
SCOPE_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
MAX_HEADER_LENGTH = 72


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Format a Conventional Commit header."
    )
    parser.add_argument("type", choices=COMMIT_TYPES, help="commit type")
    parser.add_argument("subject", help="short imperative summary")
    parser.add_argument("--scope", help="optional lowercase scope, such as ui or api")
    parser.add_argument(
        "--breaking",
        action="store_true",
        help="mark this as a breaking change",
    )
    args = parser.parse_args()

    args.subject = args.subject.strip()
    if not args.subject or "\n" in args.subject or "\r" in args.subject:
        parser.error("subject must be a non-empty single line")
    if args.subject.endswith("."):
        parser.error("subject must not end with a period")
    if args.scope is not None and not SCOPE_PATTERN.fullmatch(args.scope):
        parser.error("scope must use lowercase letters, digits, and single hyphens")

    scope = f"({args.scope})" if args.scope else ""
    marker = "!" if args.breaking else ""
    args.header = f"{args.type}{scope}{marker}: {args.subject}"
    if len(args.header) > MAX_HEADER_LENGTH:
        parser.error(f"header must be at most {MAX_HEADER_LENGTH} characters")

    return args


def main() -> None:
    args = parse_args()
    print(args.header)


if __name__ == "__main__":
    main()
