---
name: verify
description: Release verification (QA). Checks the built system against docs/requirements.md (every FR, NFR, and acceptance criterion), runs the full test suite, and audits security and deployment readiness. Use before a release or submission.
---

# Release verification

1. Run the full test suite (unit, integration, e2e) and the build. Report failures first.
2. **Requirements traceability.** For each FR and user story in `docs/requirements.md`, mark Met / Partial / Not met, with evidence (test name, code path, or manual check).
3. **NFRs.** Check performance (measure key endpoints/pages), accessibility, error handling, logging, and that the app is configured only through environment variables.
4. **Security.** Run a dependency audit, look for unvalidated input and missing authorization checks, and check for secrets in the repo. Recommend `/security-review`.
5. **Deployment.** Confirm production matches `main`, migrations have been applied, health checks pass, and the README setup steps work on a clean clone.
6. Output a release report: blockers, gaps against requirements, and recommended fixes as issues.
