---
name: adr-authoring
description: "아키텍처 결정 기록(ADR)을 작성·검토·수정합니다. 구현 중 프로젝트 차원의 기술 결정을 새로 정하거나 바꿀 때도 사용합니다."
---

# ADR 작성 및 유지관리

Write and maintain concise Architecture Decision Records (ADRs) that capture one technical decision and its rationale.

## Workflow

1. At the start of an ADR request or implementation task, read `AGENTS.md` and inspect `docs/adr/` plus nearby technical documentation.
2. Track project-level decisions made in the task, including choices directly specified by the user and choices selected while implementing. At completion, add an ADR for each new decision not already recorded, even if the user did not say “ADR.”
3. Keep one decision boundary per ADR. Record confirmed facts, constraints, assumptions, and open questions accurately. Do not turn reversible local implementation details into project decisions or invent alternatives, evidence, approval, or consequences.
4. State the decision directly, explain why it fits the context, and record meaningful positive and negative consequences, risks, and follow-up obligations. Include plausible alternatives and why they were not selected when the available information supports that comparison.
5. Follow the repository's existing ADR format and location. For this repository, use Markdown files under `docs/adr/`; if there is no established filename convention, use the bundled script to create the next numbered draft. Keep separate decisions in separate ADRs.
6. Set status from the evidence: use `Proposed` while the choice is unresolved. Use `Accepted` when the user has selected the direction or the existing project state clearly establishes an intentional decision. Do not imply approval that has not happened.
7. For a changed decision, add a new ADR that links to and supersedes the old one. Preserve the old record's reasoning; update only its status and supersession link when appropriate. Do not implement the recorded decision unless the user also requests implementation.
8. Review the result for a clear problem statement, an unambiguous decision, traceable rationale, honest trade-offs, valid links, and consistency with existing ADRs.

## Create a draft

Run from the repository root:

```bash
python3 .agents/skills/adr-authoring/scripts/new_adr.py "Use Cloudflare Workers for the API" --status Proposed
```

The script creates `docs/adr/NNNN-<slug>.md`, choosing the next number from existing numbered Markdown ADRs. It never overwrites an existing file. Use `--date YYYY-MM-DD` to set a specific date or `--directory <path>` when the repository's ADR directory differs. The script creates only a blank scaffold; complete its sections using the task and repository evidence before presenting the ADR.

When the repository already uses a different file naming or template convention, follow that convention instead of forcing the script's default. For review-only requests, inspect and comment on the existing ADR without creating a new one.

## Default sections

When no repository template exists, use:

- **Status** and **Date**
- **Context** — the problem, constraints, and relevant history
- **Decision** — the chosen option, stated as a direct outcome
- **Consequences** — benefits, costs, risks, and follow-up work
- **Alternatives considered** — viable options and reasons for rejecting them
