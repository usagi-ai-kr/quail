# 0007. Coordinate existing Herdr workers with offline task plans

- Status: Accepted
- Date: 2026-10-24

## Context

The user requested improvements to orchestration skills, scripts, and repository rules after coordinating two existing Luna sessions. The repository prohibits subagents and requires deterministic skill scripts, worker replies, and five-minute work units. Existing Herdr panes share a working tree and Git index. Prompt submission to a working session does not prove that the new task was accepted.

## Decision

Coordinate existing Herdr workers through a repository-local `agent-orchestration` skill. Keep the installed Herdr CLI and its skill authoritative for live session control. Use a standard-library Python script for offline planning from an explicit agent snapshot and task assignments; it must not send terminal input or control sessions.

Use one current Herdr session/socket inventory. Require matching declared session IDs and reject duplicate pane IDs. Restrict candidates to the caller's workspace and repository, excluding the caller pane. Assign explicit task IDs, roles, file ownership, completion criteria, verification, reply destination, and a budget of at most five minutes. Use a single writer per file and read-only reviewers. Confirm acceptance through a worker reply containing the task ID, separately from delivery or an existing working state, collect worker results, and verify them before reporting completion. Never automatically answer approval dialogs or retry an ambiguous submission.

## Consequences

- Plans and task prompts can be validated without socket access or live agent mutations.
- Existing workers can collaborate without creating subagents or racing over shared files.
- Declared session IDs validate input consistency, not the source socket's identity. A snapshot can become stale; the orchestrator must check live identity and state immediately before sending work.
- Live delivery, acceptance, and result collection remain the orchestrator's responsibility. Offline validation cannot establish worker identity or successful execution.
- Work beyond a five-minute unit continues in existing background workers with an explicit progress report.

## Alternatives considered

- Create new subagents for each task: conflicts with the repository rule and ignores the existing sessions the user wants coordinated.
- Automatically send prompts from a planning script: couples deterministic validation to live terminal mutations and makes uncertain delivery harder to recover safely.
- Coordinate only through ad hoc messages: lacks repeatable scope checks, ownership declarations, and result reporting.
