---
name: agent-orchestration
description: Plan bounded work for existing Herdr workers from a JSON snapshot and generate one explicit offline assignment prompt. Use when coordinating current workers without creating agents or sending prompts.
---

# Agent Orchestration

Use `scripts/orchestrate.py` to filter an offline worker snapshot and prepare a deterministic plan. The script never invokes Herdr, starts workers, or transmits prompts.

## Operating rules

- Control only existing live Herdr workers. Never create subagents, agents, panes, tabs, workspaces, or worktrees. When Herdr control is requested, follow the `herdr` skill: confirm `HERDR_ENV=1`, discover current live state and IDs, and target only existing workers.
- Assemble each snapshot from one current Herdr session/socket. Do not mix local and remote inventories or IDs from different servers. Pane IDs are unique only within their server context; keep that context for any later control action. The root and every pane must declare the same non-empty `session_id`. This checks the snapshot declarations only; it does not prove the actual socket identity.
- Use workspace-qualified pane IDs and only assign a worker in the caller's same workspace and cwd. Exclude the caller's own pane. Treat pane ID as worker identity. Herdr's `agent list` may report an `agent` kind such as `codex`, which is not a unique name; do not use or infer identity or model from it. An optional agent kind in a snapshot is informational only.
- Require a task ID, task, and concrete done-when criterion for every plan. A prompt also requires explicit role, file ownership, verification, and reply address.
- Keep reviews read-only. Assign one writer per shared file, name the owned paths, and have workers edit only their assigned files.
- Treat input received during active work as queued. The worker replies once to the main orchestrator with the current task ID and whether it accepts or defers the input. Only that explicit response confirms acceptance; an existing `working` state alone does not. The main confirms receipt of the worker reply; do not add a second approval round-trip.
- Never answer a blocked approval or question UI automatically. Report the worker as blocked and wait for the orchestrator's direction.
- Work in segments of at most 5 minutes. At the limit, report progress and blockers. If continuation is authorized, continue in the same existing background worker in another 5-minute segment; do not spawn a replacement.
- Return completion, changed paths, verification results, and blockers to the explicit reply address and the orchestrator in this session.
- Never guess a model. Use model information only when explicitly supplied by the orchestrator.

## Snapshot format

The snapshot root requires non-empty `workspace_id` and `session_id`, absolute normalized `cwd`, `self_pane_id`, and a non-empty `panes` array. Every pane requires `pane_id`, `workspace_id`, `session_id`, `cwd`, and `agent` (`null` for a shell, or an object with `state`). Every pane `session_id` must equal the root `session_id`; this is a manual consistency declaration, not proof that the snapshot came from that actual socket. The caller pane must be present and match the root session, workspace, and cwd. Valid states are `idle`, `done`, `working`, `blocked`, and `unknown`; only existing `idle` and `done` workers are eligible.

Example snapshot from one session/socket:

```json
{
  "workspace_id": "w1",
  "session_id": "local-session-1",
  "cwd": "/workspace/quail",
  "self_pane_id": "w1:p1",
  "panes": [
    {"pane_id": "w1:p1", "workspace_id": "w1", "session_id": "local-session-1", "cwd": "/workspace/quail", "agent": null},
    {"pane_id": "w1:p2", "workspace_id": "w1", "session_id": "local-session-1", "cwd": "/workspace/quail", "agent": {"kind": "codex", "state": "idle"}},
    {"pane_id": "w1:p3", "workspace_id": "w1", "session_id": "local-session-1", "cwd": "/workspace/quail", "agent": {"kind": "codex", "state": "blocked"}},
    {"pane_id": "w2:p1", "workspace_id": "w2", "session_id": "local-session-1", "cwd": "/workspace/quail", "agent": {"kind": "codex", "state": "idle"}}
  ]
}
```

The script filters other workspaces and cwds, the caller pane, shells, busy workers, unknown states, and blocked workers. Duplicate panes, mismatched caller context, explicit self/cross-workspace/cross-cwd targets, and empty work inputs fail.

## Offline plan and prompt

List eligible panes first. This produces candidate choices only and never creates prompts for multiple workers:

```sh
python3 .agents/skills/agent-orchestration/scripts/orchestrate.py plan snapshot.json \
  --task-id T-42 \
  --task "Review the proposed change" \
  --done-when "Findings and verification are returned to the orchestrator"
```

After choosing one pane, request exactly one assignment prompt:

```sh
python3 .agents/skills/agent-orchestration/scripts/orchestrate.py plan snapshot.json \
  --task-id T-42 \
  --task "Review the proposed change" \
  --done-when "Findings and verification are returned to the orchestrator" \
  --target-pane w1:p2 \
  --role "read-only reviewer" \
  --file-ownership "No writes; review only" \
  --verification "Inspect the diff and report actionable findings" \
  --reply-to "orchestrator w1:p1"
```

A plan can assign at most one target. Supplying a target requires all prompt fields; supplying prompt fields without a target fails. The output is JSON containing `task_id`, `task`, and `done_when`, plus either the sorted candidate list or one explicitly assigned candidate with a prompt. Each candidate is identified by `pane_id`; `agent.kind` such as `codex` is not a unique worker name. Do not pipe this output to Herdr or another CLI; submission and any later control action are separate explicit orchestrator actions.
