# TEAM-10 — KTechFest 3.0 Hackathon (3-day sprint)

Goal: **win**. Judges see a demo, a pitch, and a repo — optimise for those, in that order.

## Operating rules
- **Demo-first.** Every decision serves the live demo. Build the happy path end-to-end before polishing anything.
- **Always runnable.** `main` must run at all times. Never leave it broken at the end of a task.
- **Ship in thin vertical slices.** UI → API → data for one feature, working, then the next. No big-bang integrations.
- **Boring, proven tech.** Use what the team already knows. No new frameworks mid-sprint unless they save a day.
- **Fake what isn't judged.** Seed data, mock auth, hardcoded config are fine if they don't show in the demo. Mark them `// HACK:` so we can find them.
- **Commit small and often** with clear messages; push after every working slice so teammates stay in sync.
- **No secrets in git.** Keys go in `.env` (gitignored); keep `.env.example` updated with names only.
- **Deploy early.** Get a public URL on day 1 and redeploy continuously — never debug deployment on demo day.
- **Ask before** large rewrites, swapping core libraries, or anything that could cost more than ~1 hour.
- Keep `README.md` accurate: pitch, how to run, tech stack, team, live link.

## Sprint shape
- **Day 1:** understand challenge → pick idea → scaffold → deploy hello-world → first vertical slice.
- **Day 2:** core features complete, real data, deployed. Feature freeze at end of day.
- **Day 3:** polish UI, fix bugs, demo script, pitch deck, README, rehearse. No new features.

## Project commands
- `/kickoff` — when the challenge drops: analyse the brief, propose ideas, pick one, plan the sprint.
- `/ship` — verify, commit, push.
- `/demo-check` — make sure the demo path works and nothing embarrassing shows.
- `/pitch` — generate pitch narrative, demo script, and README polish.

## Stack
_TBD after challenge is announced — record the chosen stack, run commands, and deploy URL here._
