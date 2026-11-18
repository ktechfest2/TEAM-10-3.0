---
name: ship
description: Verify the current work builds and runs, then commit and push to GitHub. Use after finishing a feature slice or when the user says ship/push/save progress.
---

# Ship

1. `git status` and `git diff` — review what changed. Flag any secrets, `.env` files, large binaries, or debug leftovers; stop if found.
2. Run the project's fastest checks (lint/typecheck/build/tests as defined in package.json or CLAUDE.md). If they fail, fix or report — don't ship broken `main`.
3. `git pull --rebase` to pick up teammates' work; resolve conflicts carefully and re-run checks.
4. Commit with a short imperative message describing the user-visible change.
5. `git push`. If a deploy is configured, report the deploy URL.
6. One-line summary of what shipped.
