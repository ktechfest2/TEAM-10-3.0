---
name: verify
description: Pre-submission verification. Runs all tests, checks every P0/P1 acceptance criterion, verifies critical user journeys, demo readiness, security and deployment, and updates the submission checklist. Use before judging, at milestones, and at the start of the final 20%.
---

# Verification

1. Run the full test suite and build, and report actual results.
2. **Traceability.** For each feature in `product-requirements.md`, mark Met / Partial / Not met with evidence (test, code path or manual run). Flag any simulated functionality and make sure it is clearly labelled.
3. **Critical journeys.** Execute the main user journey and the `demo-script.md` steps against the real running app (and the deployed URL if one exists). Check loading, empty and error states, console and server errors, mobile layout, and the demo reset.
4. **Security.** Run a dependency audit, look for secrets in the repo and history, check input validation, authorization and duplicate-transaction protection. Suggest running `/security-review`.
5. **Deployment.** Confirm the deployed build matches `main`, migrations and seeds have been applied, and the README setup works from a clean clone.
6. Update `submission-checklist.md` and `risk-register.md`. Output the problems ranked by severity: blockers, then judge-visible, then minor.
