# 0005. 저장소 스킬 참조를 AGENTS.md에서 관리

- Status: Accepted
- Date: 2026-10-23

## Context

저장소의 Agent Skills는 `.agents/skills/`에 있고, `AGENTS.md`는 작업별 스킬을 안내한다. 새 스킬을 만들 때 참조 링크가 빠지면 해당 지침이 요청에 맞게 발견되지 않을 수 있다.

## Decision

`AGENTS.md`에 관리형 스킬 참조 구역을 두고, 저장소 스킬을 추가할 때 해당 `SKILL.md` 링크를 등록한다. `agent-skill-authoring/scripts/init_skill.py --register-in-agents`로 중복 없이 링크를 추가하며, 자동 변경 범위는 이 참조 구역으로 한정한다.

## Consequences

- 새 스킬을 추가할 때 AGENTS 참조를 같은 흐름에서 등록한다.
- 기존 참조는 중복 기록하지 않는다.
- `init_skill.py`는 이 옵션이 명시된 경우에만 `AGENTS.md`를 갱신한다.
- 일반적인 `AGENTS.md` 편집은 별도 요청이 필요하다.

## Alternatives considered

- 스킬을 만들 때마다 수동으로 링크를 추가한다: 단순하지만 등록을 빠뜨릴 가능성이 있다.
- 스크립트가 `AGENTS.md` 전체를 다시 생성한다: 참조 외의 룰을 덮어쓸 수 있어 선택하지 않았다.
