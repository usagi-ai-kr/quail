# 0010. Keep AGENTS concise and task guidance in skills

- Status: Accepted
- Date: 2026-10-24
- Related: ADR 0005

## Context

AGENTS.md had grown to repeat detailed orchestration and authentication procedures that are maintained in repository skills. Long duplicated instructions make it harder to preserve one authoritative workflow. ADR 0005 already establishes the managed skill-reference block.

## Decision

Keep AGENTS.md to concise, cross-task rules and one-line skill triggers. Put orchestration details in Agent Orchestration and layered application/authentication, test, security, and SemVer procedures in Layered Auth Development. Keep the managed skill-reference block in AGENTS.md and register new repository skills there.

## Consequences

- Task-specific guidance has one authoritative skill document.
- AGENTS.md retains core protections, five-minute work units, deterministic-script and ADR requirements, and worker/orchestrator responsibilities.
- Skill references remain the discovery mechanism and must be kept current.

## Alternatives considered

- Keep all procedures in AGENTS.md: duplicates skill content and increases the chance that guidance drifts.
- Remove the skill-reference block: makes task-specific procedures harder to discover.
