---
name: demo-check
description: Audit the app for demo readiness — run the demo path end to end, find crashes, placeholder text, broken states, slow loads, and console errors. Use before judging, rehearsals, or at end of each day.
---

# Demo check

1. Start the app (or use the deployed URL) and walk the demo script path step by step. If no script exists, infer the happy path from README/CLAUDE.md.
2. Check for: errors in server logs and browser console, unhandled loading/empty/error states, lorem ipsum or "TODO" visible in UI, broken images/links, slow (>2s) interactions, mobile layout breakage, missing favicon/title.
3. Grep the code for `TODO`, `FIXME`, `HACK:`, `console.log`, hardcoded localhost URLs, and exposed keys.
4. Confirm the deployed version matches `main`.
5. Report a prioritised list: **Blockers** (demo fails) → **Embarrassing** (judges notice) → **Nice to fix**. Offer to fix blockers immediately.
