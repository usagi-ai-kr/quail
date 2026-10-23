#!/usr/bin/env python3
"""Create a minimal Agent Skill scaffold."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import quote


NAME_PATTERN = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")
RESOURCE_DIRS = ("scripts", "references", "assets")
BEGIN_MARKER = "<!-- BEGIN SKILL REFERENCES -->"
END_MARKER = "<!-- END SKILL REFERENCES -->"
ACRONYMS = {"adr": "ADR", "api": "API", "cli": "CLI", "ui": "UI"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a starter Agent Skill folder and SKILL.md."
    )
    parser.add_argument("name", help="lowercase skill name, for example: data-review")
    parser.add_argument(
        "--description",
        required=True,
        help="what the skill does and when an agent should use it",
    )
    parser.add_argument(
        "--skills-dir",
        type=Path,
        default=Path(".agents/skills"),
        help="parent directory for the new skill (default: .agents/skills)",
    )
    parser.add_argument(
        "--resources",
        nargs="+",
        choices=RESOURCE_DIRS,
        default=(),
        metavar="DIR",
        help="optional resource directories to create",
    )
    parser.add_argument(
        "--register-in-agents",
        action="store_true",
        help="add a link to the new SKILL.md in the managed AGENTS.md reference block",
    )
    parser.add_argument(
        "--agents-file",
        type=Path,
        default=Path("AGENTS.md"),
        help="AGENTS.md to update when --register-in-agents is used",
    )
    args = parser.parse_args()

    if len(args.name) > 64 or not NAME_PATTERN.fullmatch(args.name):
        parser.error(
            "name must be 1-64 lowercase letters or digits separated by single hyphens"
        )

    args.description = args.description.strip()
    if not args.description:
        parser.error("--description must not be empty")
    if len(args.description) > 1024:
        parser.error("--description must be at most 1024 characters")

    return args


def update_agents_references(
    content: str, name: str, skill_md: Path, agents_file: Path
) -> tuple[str, str, bool]:
    relative_path = os.path.relpath(skill_md.resolve(), agents_file.resolve().parent)
    link_path = quote(Path(relative_path).as_posix(), safe="/-._~")
    if f"]({link_path})" in content:
        return content, link_path, False

    begin_count = content.count(BEGIN_MARKER)
    end_count = content.count(END_MARKER)
    if begin_count != end_count or begin_count > 1:
        raise ValueError("AGENTS.md must contain one complete skill reference block")

    words = name.split("-")
    label = " ".join(ACRONYMS.get(word, word.title()) for word in words)
    reference = f"- [{label}]({link_path})"

    if begin_count == 0:
        prefix = content.rstrip()
        separator = "\n\n" if prefix else ""
        updated = f"{prefix}{separator}{BEGIN_MARKER}\n{reference}\n{END_MARKER}\n"
        return updated, link_path, True

    begin = content.index(BEGIN_MARKER)
    end = content.index(END_MARKER)
    if end < begin:
        raise ValueError("AGENTS.md skill reference markers are out of order")

    before_end = content[:end].rstrip("\r\n")
    after_end = content[end:]
    updated = f"{before_end}\n{reference}\n{after_end}"
    return updated, link_path, True


def main() -> int:
    args = parse_args()
    skill_dir = args.skills_dir / args.name
    if skill_dir.exists():
        print(f"Error: skill path already exists: {skill_dir}", file=sys.stderr)
        return 1

    agents_content = None
    agents_link = None
    agents_changed = False
    if args.register_in_agents:
        if not args.agents_file.is_file():
            print(f"Error: AGENTS.md not found: {args.agents_file}", file=sys.stderr)
            return 1
        try:
            original_agents_content = args.agents_file.read_text(encoding="utf-8")
            agents_content, agents_link, agents_changed = update_agents_references(
                original_agents_content,
                args.name,
                skill_dir / "SKILL.md",
                args.agents_file,
            )
        except (OSError, ValueError) as exc:
            print(f"Error: could not prepare AGENTS.md reference: {exc}", file=sys.stderr)
            return 1

    title = args.name.replace("-", " ").title()
    description = json.dumps(args.description, ensure_ascii=False)
    skill_md = (
        "---\n"
        f"name: {args.name}\n"
        f"description: {description}\n"
        "---\n\n"
        f"# {title}\n\n"
        "Describe the outcome this skill supports and the decisions it should guide.\n\n"
        "## Workflow\n\n"
        "Add only the task-specific steps, tools, and constraints needed.\n"
    )

    created_skill_dir = False
    try:
        skill_dir.mkdir(parents=True, exist_ok=False)
        created_skill_dir = True
        (skill_dir / "SKILL.md").write_text(skill_md, encoding="utf-8")
        for resource in dict.fromkeys(args.resources):
            (skill_dir / resource).mkdir()
        if agents_content is not None and agents_changed:
            args.agents_file.write_text(agents_content, encoding="utf-8")
    except OSError as exc:
        if created_skill_dir and skill_dir.exists():
            for path in skill_dir.iterdir():
                if path.is_dir():
                    path.rmdir()
                else:
                    path.unlink()
            skill_dir.rmdir()
        print(f"Error: could not create skill at {skill_dir}: {exc}", file=sys.stderr)
        return 1

    print(f"Created {skill_dir / 'SKILL.md'}")
    for resource in dict.fromkeys(args.resources):
        print(f"Created {skill_dir / resource}/")
    if agents_link is not None:
        print(f"Registered AGENTS.md reference: {agents_link}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
