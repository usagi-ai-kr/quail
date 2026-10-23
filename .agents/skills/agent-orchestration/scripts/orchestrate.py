#!/usr/bin/env python3
"""Build deterministic, offline plans for existing Herdr workers."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

PANE_ID = re.compile(r"^(?P<workspace>[^:\s]+):p[1-9][0-9]*$")
VALID_STATES = {"idle", "done", "working", "blocked", "unknown"}
READY_STATES = {"idle", "done"}


class PlanError(ValueError):
    """Raised for malformed snapshots or incomplete work specifications."""


def required_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise PlanError(f"{field} must be a non-empty string")
    return value.strip()


def absolute_cwd(value: Any, field: str) -> str:
    cwd = required_text(value, field)
    if not os.path.isabs(cwd):
        raise PlanError(f"{field} must be an absolute path")
    if os.path.normpath(cwd) != cwd:
        raise PlanError(f"{field} must be normalized")
    return cwd


def pane_workspace(pane_id: Any, field: str = "pane_id") -> str:
    value = required_text(pane_id, field)
    match = PANE_ID.fullmatch(value)
    if not match:
        raise PlanError(f"{field} must be workspace-qualified, for example w1:p2")
    return match.group("workspace")


def validate_snapshot(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise PlanError("snapshot root must be a JSON object")
    workspace_id = required_text(raw.get("workspace_id"), "workspace_id")
    session_id = required_text(raw.get("session_id"), "session_id")
    cwd = absolute_cwd(raw.get("cwd"), "cwd")
    self_pane_id = required_text(raw.get("self_pane_id"), "self_pane_id")
    if pane_workspace(self_pane_id, "self_pane_id") != workspace_id:
        raise PlanError("self_pane_id must belong to workspace_id")
    panes = raw.get("panes")
    if not isinstance(panes, list) or not panes:
        raise PlanError("panes must be a non-empty array")

    normalized: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    self_pane: dict[str, Any] | None = None
    for index, item in enumerate(panes):
        field = f"panes[{index}]"
        if not isinstance(item, dict):
            raise PlanError(f"{field} must be an object")
        pane_id = required_text(item.get("pane_id"), f"{field}.pane_id")
        item_workspace = required_text(item.get("workspace_id"), f"{field}.workspace_id")
        item_session = required_text(item.get("session_id"), f"{field}.session_id")
        item_cwd = absolute_cwd(item.get("cwd"), f"{field}.cwd")
        if pane_id in seen_ids:
            raise PlanError(f"duplicate pane_id: {pane_id}")
        seen_ids.add(pane_id)
        if pane_workspace(pane_id, f"{field}.pane_id") != item_workspace:
            raise PlanError(f"{field}.pane_id does not match workspace_id")
        if item_session != session_id:
            raise PlanError(f"{field}.session_id does not match snapshot session_id")

        if "agent" not in item:
            raise PlanError(f"{field}.agent is required (use null for an empty pane)")
        agent = item["agent"]
        if agent is not None:
            if not isinstance(agent, dict):
                raise PlanError(f"{field}.agent must be an object or null")
            state = required_text(agent.get("state"), f"{field}.agent.state")
            if state not in VALID_STATES:
                raise PlanError(f"{field}.agent.state must be one of {sorted(VALID_STATES)}")
            # Agent kind/name is deliberately not used as identity; pane_id is authoritative.
            agent = {"state": state}

        pane = {"pane_id": pane_id, "workspace_id": item_workspace, "session_id": item_session, "cwd": item_cwd, "agent": agent}
        normalized.append(pane)
        if pane_id == self_pane_id:
            self_pane = pane

    if self_pane is None:
        raise PlanError("self_pane_id must identify a pane in the snapshot")
    if self_pane["workspace_id"] != workspace_id or self_pane["cwd"] != cwd:
        raise PlanError("self pane workspace_id and cwd must match snapshot context")
    return {"workspace_id": workspace_id, "session_id": session_id, "cwd": cwd, "self_pane_id": self_pane_id, "panes": normalized}


def filter_candidates(snapshot: dict[str, Any], targets: list[str] | None = None) -> list[dict[str, str]]:
    targets = targets or []
    if len(targets) > 1:
        raise PlanError("assign one target pane per plan to preserve single-writer ownership")
    if len(targets) != len(set(targets)):
        raise PlanError("target pane must be unique")
    by_id = {pane["pane_id"]: pane for pane in snapshot["panes"]}

    if targets:
        target = targets[0]
        if target == snapshot["self_pane_id"]:
            raise PlanError("self pane cannot be a target")
        pane = by_id.get(target)
        if pane is None:
            raise PlanError(f"target pane is not in snapshot: {target}")
        if pane["workspace_id"] != snapshot["workspace_id"]:
            raise PlanError(f"target pane belongs to another workspace: {target}")
        if pane["cwd"] != snapshot["cwd"]:
            raise PlanError(f"target pane has a different cwd: {target}")
        if pane["agent"] is None:
            raise PlanError(f"target pane has no existing worker: {target}")
        if pane["agent"]["state"] not in READY_STATES:
            raise PlanError(f"target worker is not ready ({pane['agent']['state']}): {target}")
        candidates = [pane]
    else:
        candidates = [
            pane for pane in snapshot["panes"]
            if pane["pane_id"] != snapshot["self_pane_id"]
            and pane["workspace_id"] == snapshot["workspace_id"]
            and pane["cwd"] == snapshot["cwd"]
            and pane["agent"] is not None
            and pane["agent"]["state"] in READY_STATES
        ]

    candidates.sort(key=lambda pane: pane["pane_id"])
    if not candidates:
        raise PlanError("no eligible existing workers in the same workspace and cwd")
    return [{"pane_id": pane["pane_id"], "state": pane["agent"]["state"]} for pane in candidates]


def render_prompt(*, task_id: str, task: str, done_when: str, role: str, file_ownership: str,
                  verification: str, reply_to: str, workspace_id: str, session_id: str, cwd: str,
                  self_pane_id: str, target_pane_id: str, target_cwd: str) -> str:
    fields = {
        "task_id": task_id, "task": task, "done_when": done_when, "role": role,
        "file_ownership": file_ownership, "verification": verification, "reply_to": reply_to,
    }
    fields = {key: required_text(value, key) for key, value in fields.items()}
    workspace_id = required_text(workspace_id, "workspace_id")
    session_id = required_text(session_id, "session_id")
    cwd = absolute_cwd(cwd, "cwd")
    target_cwd = absolute_cwd(target_cwd, "target_cwd")
    self_pane_id = required_text(self_pane_id, "self_pane_id")
    target_pane_id = required_text(target_pane_id, "target_pane_id")
    if pane_workspace(self_pane_id) != workspace_id or pane_workspace(target_pane_id) != workspace_id:
        raise PlanError("caller and target must belong to the declared workspace")
    if self_pane_id == target_pane_id:
        raise PlanError("self pane cannot be a prompt target")
    if target_cwd != cwd:
        raise PlanError("target cwd must match caller cwd")

    return "\n".join([
        f"Task ID: {fields['task_id']}", f"Task: {fields['task']}", f"Done when: {fields['done_when']}",
        f"Role: {fields['role']}", f"Workspace: {workspace_id}", f"Session ID: {session_id}", f"Working directory: {cwd}",
        f"Assigned pane: {target_pane_id}", f"File ownership: {fields['file_ownership']}",
        f"Verification required: {fields['verification']}", f"Reply address: {fields['reply_to']}",
        "Timebox: work in segments of at most 5 minutes. At each limit, report progress and blockers; if continuation is authorized, continue in this same existing background worker in another segment.",
        "Do not create agents, panes, tabs, workspaces, or worktrees. Do not infer or guess the model.",
        "Treat new input during active work as queued. Reply once to the main orchestrator with this task ID and whether you accept or defer it. Only an explicit worker reply confirms acceptance; working state alone is not acceptance. The main confirms receipt of that reply; do not request an extra acknowledgement round-trip.",
        "Reviews are read-only. Assign one writer per shared file and edit only files in your ownership statement.",
        "Never answer a blocked approval or question UI automatically; report blocked status to the orchestrator.",
        f"Return completion, changed paths, verification results, and blockers to {fields['reply_to']} and the orchestrator in this session.",
    ])


def build_plan(snapshot: dict[str, Any], *, task_id: str, task: str, done_when: str,
               target_panes: list[str] | None = None, role: str | None = None,
               file_ownership: str | None = None, verification: str | None = None,
               reply_to: str | None = None) -> dict[str, Any]:
    task_id = required_text(task_id, "task_id")
    task = required_text(task, "task")
    done_when = required_text(done_when, "done_when")
    candidates = filter_candidates(snapshot, target_panes)
    prompt_fields = [role, file_ownership, verification, reply_to]
    if target_panes:
        if any(value is None for value in prompt_fields):
            raise PlanError("an explicit target requires role, file ownership, verification, and reply address")
        pane = next(p for p in snapshot["panes"] if p["pane_id"] == candidates[0]["pane_id"])
        candidates[0]["prompt"] = render_prompt(
            task_id=task_id, task=task, done_when=done_when, role=role or "", file_ownership=file_ownership or "",
            verification=verification or "", reply_to=reply_to or "", workspace_id=snapshot["workspace_id"],
            session_id=snapshot["session_id"], cwd=snapshot["cwd"], self_pane_id=snapshot["self_pane_id"], target_pane_id=pane["pane_id"],
            target_cwd=pane["cwd"],
        )
    elif any(value is not None for value in prompt_fields):
        raise PlanError("choose exactly one --target-pane before supplying prompt assignment fields")
    return {
        "task_id": task_id, "task": task, "done_when": done_when,
        "workspace_id": snapshot["workspace_id"], "session_id": snapshot["session_id"], "cwd": snapshot["cwd"],
        "self_pane_id": snapshot["self_pane_id"], "candidates": candidates,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    plan_parser = subparsers.add_parser("plan", help="list eligible workers or prepare one explicit assignment")
    plan_parser.add_argument("snapshot", type=Path, help="offline snapshot from one Herdr session/socket")
    plan_parser.add_argument("--task-id", required=True)
    plan_parser.add_argument("--task", required=True)
    plan_parser.add_argument("--done-when", required=True)
    plan_parser.add_argument("--target-pane", action="append", help="one existing pane; repeat is rejected")
    plan_parser.add_argument("--role")
    plan_parser.add_argument("--file-ownership")
    plan_parser.add_argument("--verification")
    plan_parser.add_argument("--reply-to")

    args = parser.parse_args(argv)
    try:
        try:
            raw = json.loads(args.snapshot.read_text(encoding="utf-8"))
        except OSError as exc:
            raise PlanError(f"cannot read snapshot: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise PlanError(f"invalid snapshot JSON: {exc}") from exc
        snapshot = validate_snapshot(raw)
        result = build_plan(
            snapshot, task_id=args.task_id, task=args.task, done_when=args.done_when,
            target_panes=args.target_pane, role=args.role, file_ownership=args.file_ownership,
            verification=args.verification, reply_to=args.reply_to,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True))
        return 0
    except PlanError as exc:
        parser.error(str(exc))
    return 2


if __name__ == "__main__":
    sys.exit(main())
