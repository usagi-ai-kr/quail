---
name: commit-authoring
description: "Git 커밋을 검토하고 작성하며 요청된 경우 생성합니다. 변경 범위 확인, staged diff 검토, 커밋 메시지 작성이 필요할 때 사용합니다."
---

# Commit Authoring

Create focused, reviewable Git commits with accurate messages, while keeping unrelated work out of the commit.

## Workflow

1. Read `AGENTS.md`, inspect `git status`, and review recent commit subjects for the repository's message convention. If the repository has no commit history or no consistent convention, use Conventional Commits.
2. Determine the requested commit scope. Inspect staged, unstaged, and untracked changes so the commit contains only the work the user asked to commit. Do not stage everything by default.
3. Keep each commit to one logical change. Stage the intended paths, then inspect the staged diff before writing the message. Do not include build output, generated files, secrets, or unrelated work unless the request calls for them.
4. Write a concise, imperative subject that names the change. Use the repository's convention or, when absent, `<type>(<scope>): <subject>`. Add a body only when context or rationale is useful. Use breaking-change markers and issue references only when accurate.
5. Use the bundled formatter for a Conventional Commit header when that format applies:

   ```bash
   python3 .agents/skills/commit-authoring/scripts/format_commit_message.py feat "Add Nixgon font assets" --scope ui
   ```

   It prints the header only; the agent still reviews the diff and decides whether a body is needed.
6. Create the commit only when the user asks to commit. A request to draft, review, or suggest a message does not authorize `git commit`. Do not amend, rebase, or push unless explicitly requested. If a commit hook fails, report it instead of bypassing it.
7. After a commit, inspect the latest commit and remaining worktree status, then report the commit hash and message.

## Conventional Commit format

- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- Optional scope is a short area such as `ui`, `api`, or `deploy`.
- Use `!` before the colon for a breaking change, for example `feat(api)!: remove legacy endpoint`.
- Keep the subject to one line, use an imperative verb, and omit trailing punctuation. The formatter enforces a 72-character header limit.
