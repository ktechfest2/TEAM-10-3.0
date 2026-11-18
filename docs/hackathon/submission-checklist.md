# Submission Checklist

> Official submission requirements are **UNKNOWN**. Update this once the organisers publish them.

## Official requirements
- [ ] _(from organisers)_

## Engineering
- [x] `main` builds and runs from a clean clone using the README steps (verified: install, typecheck, test, lint)
- [x] All tests pass (actually run; 94 unit tests, `check:journey`, `check:sim`; see verification-report.md)
- [x] No secrets in the repo or git history; `.env.example` is complete (scanned; `pnpm audit --prod` clean after the Next.js 16.4.6 upgrade)
- [x] Deployed and reachable at a public URL: https://tally-election.vercel.app (no login needed)
- [x] Demo data seeded in production (434 simulated units, labelled). Reset works locally; the production reset is closed (no `OPS_CODE`) on purpose
- [ ] Critical user journeys verified end to end: **protocol and server verified; phone flows (camera, QR, offline) NOT yet run on a device**
- [x] All mocks or simulations clearly labelled in UI and docs (mission, home, unit and area pages, share card, rumour verdicts)

## Documentation
- [ ] README: problem, solution, features, architecture, stack, setup, environment variables, live link, team (setup, stack, credits done; write-up sections pending)
- [ ] API docs (no OpenAPI yet)
- [x] Third-party IP / libraries / models / APIs disclosed (README credits)
- [ ] Limitations stated honestly (list is in verification-report.md section 8; copy into the README)

## Presentation
- [ ] Slides
- [ ] Demo script rehearsed and timed
- [ ] Backup demo video recorded
- [ ] Team present for the day-3 announcement (attendance was mandatory in previous editions)
