---
name: pr
description: Takes a finished slice of work through the quality gates (format, lint, typecheck, tests, build), commits it with Conventional Commits, and with the user's approval pushes and optionally opens a PR. Use when a change is ready.
---

# Commit / PR

1. Review `git status` / `git diff`. Stop if there are secrets, `.env` files, debug leftovers or unrelated changes.
2. Run every quality gate the project defines. Fix failures; never skip or disable tests. Record the real results.
3. Check that new behaviour has tests and that docs (README, API docs, `docs/hackathon/*`) reflect the change. Update the feature row in `implementation-plan.md` (actual time, status).
4. Commit on the current feature branch using Conventional Commits.
5. **Ask the user before pushing.** Remember the repo is public. Once approved: `git pull --rebase`, re-run tests, push, and if requested open a PR with `gh pr create` (summary, acceptance criteria met, how it was tested).
6. Report using the standard format: completed, files changed, what works, tests and results, remaining problems, next task.
