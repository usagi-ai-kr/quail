---
name: agent-skill-authoring
description: Agent Skills 형식의 스킬을 만들고 검토·수정합니다. SKILL.md, frontmatter, 스킬 폴더, references, scripts, assets를 작성하거나 점검할 때 사용합니다.
---

# Agent Skill 작성

요청의 범위와 대상에 맞는, 이식 가능하고 필요한 내용만 담은 Agent Skill 폴더를 만든다.

## 작성 절차

1. 사용자가 해결하려는 반복 작업과 스킬이 활성화되어야 할 요청을 파악한다. 사용자가 위치를 지정하면 그대로 따른다. 프로젝트 안에서 만들라고 한 경우 기본 위치는 `.agents/skills/<skill-name>/`이다.
2. 새 저장소 스킬을 시작할 때는 저장소 루트에서 내장 스캐폴드 스크립트를 사용한다. 이 프로젝트의 룰에 따라 `scripts/` 리소스와 결정론적 작업 스크립트를 포함하고, `AGENTS.md` 참조도 함께 등록한다.

   ```bash
   python3 .agents/skills/agent-skill-authoring/scripts/init_skill.py <skill-name> --description "무엇을 하고 어떤 요청에서 사용하는지" --resources scripts --register-in-agents
   ```

   다른 위치에 만들 때는 `--skills-dir <directory>`를 지정한다. 추가 리소스 디렉터리는 `--resources scripts references assets`에서 필요한 것만 요청한다. `--register-in-agents`는 `AGENTS.md`의 스킬 참조 구역에 중복 없이 링크를 추가한다. 스크립트는 기존 스킬 폴더를 덮어쓰지 않는다. 생성된 `SKILL.md`의 안내 문구를 실제 작업 지침으로 바꾼다.
3. 스킬의 핵심 지침을 `SKILL.md`에 작성한다. 디렉터리 이름과 frontmatter의 `name`을 일치시키고, 소문자 영문자·숫자·하이픈만 사용한다. 이름은 하이픈으로 시작하거나 끝내지 않고, 연속 하이픈을 쓰지 않는다.
4. `description`에는 스킬이 하는 일과 활성화할 상황을 함께 적고, 사용자가 실제로 쓸 만한 구체적인 용어를 넣는다. 무관한 요청까지 활성화될 포괄적인 설명은 피한다.
5. 본문에는 작업 결과, 판단 기준, 필요한 절차와 도구, 실제 제약을 적는다. 모델이 이미 할 수 있는 일반 조언, 반복되는 규칙, 근거 없는 예외를 추가하지 않는다. 사용자의 목적이나 승인 범위를 넓혀 해석하지 않는다.
6. 세부 자료는 현재 작업에서 필요한 경우에만 추가한다.
   - 큰 스키마·절차·도메인 규칙은 `references/`에 두고 `SKILL.md`에서 상대 경로로 연결한다.
   - 이 프로젝트에서는 모든 스킬에 작업에 직접 도움이 되는 결정론적 `sh`, Python, 또는 JS/TS 스크립트를 하나 이상 `scripts/`에 둔다. 무관한 예시 스크립트로 규칙만 형식적으로 채우지 않는다.
   - 생성물에 실제로 포함될 템플릿·이미지 등의 정적 자료는 `assets/`에 둔다.
   - 추가 디렉터리나 문서는 실제 사용 이유가 있을 때만 만든다.
7. 생성 후 형식과 내용이 요청에 맞는지 확인한다. 설치·전역 등록·게시 등 외부 상태를 바꾸는 작업은 사용자가 요청한 경우에만 진행한다.

## 형식 기준

- 스킬은 폴더이며, 최소 구성은 YAML frontmatter와 Markdown 본문이 있는 `SKILL.md`다.
- `name`과 `description`은 필수다. `name`은 1–64자이며, 디렉터리 이름과 정확히 같아야 한다.
- `description`은 1–1024자이며, 기능과 사용 시점을 설명한다.
- `license`, `compatibility`, 문자열 키·값으로 된 `metadata`, 실험적 필드인 `allowed-tools`는 필요할 때만 추가한다. 대다수 스킬에 `compatibility`는 필요하지 않다.
- `SKILL.md`는 500줄 미만을 목표로 한다. 지침 본문은 5,000 토큰 미만을 권장하며, 조건부로만 필요한 정보는 참고 파일로 분리한다.
- 다른 파일을 가리킬 때는 스킬 루트 기준 상대 경로를 사용하고, 참조 파일은 한 단계 깊이로 유지한다.
- 스킬은 발견, 활성화, 실행 순으로 점진적으로 공개된다. 따라서 frontmatter는 발견에 필요한 설명만 담고, 본문은 활성화된 작업에 필요한 지침만 담는다.

## 검토

완성 후 다음을 확인한다.

- 폴더명과 `name`이 일치하고 frontmatter가 유효한가?
- 설명이 적절한 요청에서 활성화되고 무관한 작업에는 과하게 적용되지 않는가?
- 지침이 요청 범위와 권한 경계를 보존하는가?
- 연결된 참고 파일과 스크립트가 실제로 존재하고 필요한가?
- 저장소 스킬이라면 `AGENTS.md`의 관리 참조 구역에 링크가 등록되어 있는가?
- 예시, 자리표시자, 불필요한 README나 중복 문서가 남아 있지 않은가?

사용 가능한 경우 `skills-ref validate <skill-folder>`로 Agent Skills 형식을 검증한다. 도구가 없다면 위 필수 형식과 참조 경로를 직접 확인한다.

## 형식 참고

- [Agent Skills 개요](https://agentskills.io/home.md)
- [Agent Skills 명세](https://agentskills.io/specification.md)
- [Agent Skills 빠른 시작](https://agentskills.io/skill-creation/quickstart.md)
