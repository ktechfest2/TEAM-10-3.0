---
name: pr
description: Takes completed work through the team's PR workflow. Ensures a feature branch exists, runs lint/typecheck/tests/build, makes Conventional Commits, pushes, and opens a GitHub PR linked to its issue. Use when a change is ready for review.
---

# Pull request

1. If on `main`, create a branch: `feat|fix|chore|docs/<issue>-short-name`.
2. Review `git status` / `git diff`. Stop if there are secrets, `.env` files, debug leftovers, or unrelated changes.
3. Run every quality gate the project defines (format, lint, typecheck, tests, build). Fix failures; never skip or disable tests to pass.
4. Confirm tests cover the change (new behaviour has new tests) and that docs are updated if behaviour changed.
5. Commit using Conventional Commits. Rebase on the latest `origin/main`, then re-run tests.
6. Push and open a PR with `gh pr create`. Include a summary, linked issue (`Closes #N`), which acceptance criteria are met, how it was tested, and screenshots for UI changes.
7. Report the PR URL and CI status. Suggest running `/code-review` on it.
