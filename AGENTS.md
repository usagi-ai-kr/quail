- '룰' 파일은 이 파일을 의미한다.
- 명시적 요청 없이 README.md를 편집하지 않는다.
- 명시적 요청 없이 AGENTS.md의 다른 내용을 편집하지 않는다. 저장소 스킬 추가 시 아래 참조 구역에 링크를 등록한다.
- 모든 작업은 최대 5분 단위로 나눈다. 더 걸리면 기존 작업자에서 백그라운드로 이어가고 진행 상황을 보고한다.
- 스킬마다 작업에 직접 필요한 결정론적 스크립트를 둔다.
- 프로젝트 기술 결정은 docs/adr/의 Markdown ADR로 기록한다. 미정은 Proposed, 확정은 Accepted로 표시한다.
- 서브에이전트를 만들지 않는다. 오케스트레이터는 기존 작업을 분배·수집·검증하고 워커는 결과를 회신한다.
- 오케스트레이션 요청에는 Agent Orchestration 스킬을 적용한다.
- 레이어·인증·BDD/TDD·보안·버전 작업에는 Layered Auth Development 스킬을 적용한다.
- 색상 팔레트 작업에는 Color Palette 스킬을 적용한다.

<!-- BEGIN SKILL REFERENCES -->
- 스킬 작성·검토: [Agent Skill Authoring](.agents/skills/agent-skill-authoring/SKILL.md)
- ADR 작성·검토: [ADR Authoring](.agents/skills/adr-authoring/SKILL.md)
- [Commit Authoring](.agents/skills/commit-authoring/SKILL.md)
- [Favicon Generation](.agents/skills/favicon-generation/SKILL.md)
- [Agent Orchestration](.agents/skills/agent-orchestration/SKILL.md)
- [Layered Auth Development](.agents/skills/layered-auth-development/SKILL.md)
- [Color Palette](.agents/skills/color-palette/SKILL.md)
<!-- END SKILL REFERENCES -->
