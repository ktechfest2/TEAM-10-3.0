---
name: requirements
description: Requirements engineering phase. Turns the challenge brief (pasted text, file, or URL) into a full requirements specification at docs/requirements.md and GitHub Issues. Use when the challenge is announced or requirements change.
---

# Requirements engineering

Input: the challenge brief in the arguments. If it's missing, ask for it.

1. **Analyse the brief.** Extract the problem, target users/stakeholders, explicit requirements, evaluation criteria, constraints (tech, data, APIs, regulations), and submission requirements. Research the domain where needed (existing solutions, relevant standards, data sources).
2. **Clarify.** List ambiguities and assumptions. Ask the user about anything that changes scope before writing the spec.
3. **Write `docs/requirements.md`:**
   - Problem statement and goals; out-of-scope items
   - Stakeholders and personas
   - Functional requirements (FR-1, FR-2, … each testable)
   - Non-functional requirements (NFR-n): performance, security, privacy, scalability, availability, accessibility, maintainability
   - User stories (`As a … I want … so that …`) each with acceptance criteria (Given/When/Then), traced to FRs
   - Priority (MoSCoW) per story
   - Constraints, assumptions, risks, open questions
4. **Create GitHub Issues** (after confirming with the user) for each user story with acceptance criteria and labels (`feature`, priority). Use a milestone for the release.
5. Open a `docs/requirements` PR containing the spec.
