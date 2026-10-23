#!/usr/bin/env python3
"""Check supported relative imports across ui/app/domain/infra."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"}
TEST_NAMES = re.compile(r"\.(?:test|spec)\.[^.]+$", re.IGNORECASE)
# The checker deliberately supports relative specifiers only. Type-only and
# re-export imports use the same "from" form and are checked with value imports.
IMPORT_PATTERNS = (
    re.compile(r"\bfrom\s*(?P<q>['\"])(?P<path>\.[^'\"]+)(?P=q)"),
    re.compile(r"\bimport\s*(?P<q>['\"])(?P<path>\.[^'\"]+)(?P=q)"),
    re.compile(r"\bimport\s*\(\s*(?P<q>['\"])(?P<path>\.[^'\"]+)(?P=q)\s*\)"),
    re.compile(r"\brequire\s*\(\s*(?P<q>['\"])(?P<path>\.[^'\"]+)(?P=q)\s*\)"),
)


@dataclass(frozen=True)
class Violation:
    path: str
    line: int
    specifier: str
    reason: str


def is_test_file(path: Path) -> bool:
    return (
        any(part.lower() in {"test", "tests", "__tests__"} for part in path.parts[:-1])
        or bool(TEST_NAMES.search(path.name))
    )


def relative_imports(source: str) -> list[tuple[str, int]]:
    # Comment removal is intentionally lexical-lightweight. Import specifiers
    # are quoted relative paths; template-generated imports and path aliases
    # are outside the supported scope.
    def preserve_newlines(match: re.Match[str]) -> str:
        newline = chr(10)
        return "".join(char if char == newline else " " for char in match.group(0))
    clean = re.sub(r"/\*.*?\*/|//[^\n]*", preserve_newlines, source, flags=re.DOTALL)
    found: set[tuple[str, int]] = set()
    for pattern in IMPORT_PATTERNS:
        for match in pattern.finditer(clean):
            specifier = match.group("path")
            line = clean.count("\n", 0, match.start()) + 1
            found.add((specifier, line))
    return sorted(found, key=lambda item: (item[1], item[0]))


def layer_for(path: Path) -> str:
    parts = path.parts
    if not parts or parts[0] not in {"ui", "app", "domain", "infra"}:
        return "unlayered"
    if parts[0] == "infra" and len(parts) > 1 and parts[1] in {"server", "client"}:
        return f"infra/{parts[1]}"
    return parts[0]


def source_kind(path: Path) -> str:
    if len(path.parts) == 1 and path.name in {"main.ts", "main.tsx", "main.js", "main.jsx"}:
        return "composition-client"
    if len(path.parts) == 1 and path.name in {"worker.ts", "worker.js", "server.ts", "server.js", "index.ts"}:
        return "composition-server"
    return layer_for(path)


def ui_composition(path: Path) -> bool:
    return path.parts[0] == "ui" and (
        "composition" in path.parts[1:-1] or path.stem in {"composition", "entry"}
    )


def app_client_port(path: Path) -> bool:
    parts = path.parts
    named_auth_client = parts in {
        ("app", "auth-client"), ("app", "auth-client.ts")
    }
    return named_auth_client or bool(
        parts and parts[0] == "app" and "ports" in parts[1:4]
    )


def allowed(source: str, target: str, source_path: Path, target_path: Path) -> bool:
    if source == target and source in {
        "ui", "app", "domain", "infra", "infra/client", "infra/server"
    }:
        return True
    if source == "composition-client":
        return target in {"ui", "app", "infra/client"}
    if source == "composition-server":
        return target in {"app", "domain", "infra/server"}
    if source == "ui":
        return target == "app" or (
            target == "infra/client" and ui_composition(source_path)
        )
    if source == "app":
        return target == "domain"
    if source == "domain":
        return False
    if source == "infra/server":
        return target in {"app", "domain", "infra/server"}
    if source == "infra/client":
        return target == "infra/client" or (
            target == "app" and app_client_port(target_path)
        )
    if source == "infra":
        return target in {"app", "domain", "infra"}
    return False


def check_project(root: Path) -> tuple[int, list[Violation]]:
    src = root.resolve() / "src"
    if not src.is_dir():
        raise ValueError(f"source directory not found: {src}")
    files = sorted(
        path for path in src.rglob("*")
        if path.is_file() and path.suffix.lower() in EXTENSIONS
        and not is_test_file(path.relative_to(src))
    )
    layered = [path for path in files if path.relative_to(src).parts[0] in {"ui", "app", "domain", "infra"}]
    if not layered:
        raise ValueError("no production source found under src/ui, src/app, src/domain, or src/infra")

    issues: list[Violation] = []
    for source_file in files:
        relative = source_file.relative_to(src)
        for specifier, line in relative_imports(source_file.read_text(encoding="utf-8")):
            target_abs = (source_file.parent / specifier).resolve(strict=False)
            if target_abs.suffix and target_abs.suffix.lower() not in EXTENSIONS:
                continue
            try:
                target_relative = target_abs.relative_to(src.resolve())
            except ValueError:
                continue
            source = source_kind(relative)
            target = layer_for(target_relative)
            if not allowed(source, target, relative, target_relative):
                issues.append(Violation(
                    relative.as_posix(), line, specifier,
                    f"{source} may not import {target}",
                ))
    return len(files), sorted(issues, key=lambda issue: (issue.path, issue.line, issue.specifier))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check supported relative imports across ui/app/domain/infra.")
    parser.add_argument("--root", type=Path, default=Path.cwd(), help="repository root")
    args = parser.parse_args(argv)
    try:
        checked, issues = check_project(args.root)
    except (OSError, ValueError) as exc:
        print(f"layer import check failed: {exc}", file=sys.stderr)
        return 2
    if issues:
        for issue in issues:
            print(f"{issue.path}:{issue.line}: {issue.reason}: {issue.specifier}", file=sys.stderr)
        return 1
    print(f"checked {checked} production source files; no forbidden relative layer imports")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
