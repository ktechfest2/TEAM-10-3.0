# TEAM-10 — KTechFest 3.0

We are building a **real, production-grade product** that solves the challenge, not a demo or prototype.
No mocks, fake data, or hardcoded shortcuts that stand in for real functionality. If something cannot be built properly, raise it; do not fake it.

## Engineering process
Follow these phases in order. Each phase produces an artifact in the repo before the next starts. Revisit earlier phases when requirements change.

1. **Requirements** (`/requirements`): analyse the challenge and produce `docs/requirements.md`: problem statement, stakeholders, functional requirements, non-functional requirements (performance, security, scalability, accessibility), user stories with acceptance criteria, constraints, and open questions. Create GitHub Issues from the user stories.
2. **System design** (`/design`): `docs/architecture.md`: architecture and component diagram, data model/schema, API contracts, auth model, third-party services, deployment topology. Record significant decisions as ADRs in `docs/adr/NNNN-title.md`.
3. **Project setup:** repo structure, package manager, formatter, linter, strict type checking, test framework, env config (`.env.example`), GitHub Actions CI (lint, typecheck, test, build on every PR), and branch protection on `main`.
4. **Implementation:** one issue → one feature branch → one PR. Small, reviewable changes. Tests are written alongside code.
5. **Testing:** unit tests for logic, integration tests for API/data layers, and end-to-end tests for critical user flows. CI must be green before merge.
6. **Security:** validate all input, enforce authorization server-side, keep secrets out of git, and run a dependency audit. Run `/security-review` before releases.
7. **Deployment:** automated CI/CD, separate preview and production environments, versioned database migrations, structured logging, and error monitoring.
8. **Documentation:** README (overview, setup, architecture summary, environment variables), API docs, ADRs, and updated documentation in every PR that changes behaviour.

## Code standards
- Clean, readable, idiomatic code. Clear names, small functions, single responsibility, no dead code.
- Handle errors explicitly; never swallow exceptions. Return meaningful errors to clients.
- Strict typing everywhere (TypeScript `strict`, Python type hints + checker).
- No secrets, credentials, or `.env` files in git.
- Pin dependency versions; prefer well-maintained libraries.

## Git workflow
- `main` is protected and always releasable. No direct commits to `main` once setup is done.
- Branches: `feat/<issue>-short-name`, `fix/...`, `chore/...`, `docs/...`.
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- PRs link their issue (`Closes #N`), describe the change and how it was tested, and pass CI. Review with `/code-review` before merge. Squash-merge.

## Project commands
- `/requirements`: challenge → requirements spec + GitHub Issues
- `/design`: requirements → architecture, data model, API contracts, ADRs
- `/pr`: verify, commit on a feature branch, push, open a PR
- `/verify`: check the build against requirements and acceptance criteria before a release

## Stack
_Decided in the design phase. Record the stack, run/test/build commands, and environment URLs here._
