---
name: design
description: System design phase. Produces docs/architecture.md (architecture, data model, API contracts, security, deployment) and ADRs from docs/requirements.md. Use after requirements are agreed or when the architecture needs to change.
---

# System design

Read `docs/requirements.md` first. If it's missing, run the requirements phase first.

1. **Architecture options.** Propose 2–3 viable architectures and compare them against the NFRs (scalability, security, cost, operability, team familiarity). Recommend one and confirm it with the user.
2. **Write `docs/architecture.md`:**
   - Context and container diagrams (Mermaid)
   - Components and responsibilities
   - Data model / schema (ER diagram, entities, relations, indexes)
   - API contracts (endpoints or RPCs, request/response schemas, error model, auth); add an OpenAPI spec if it's REST
   - AuthN/AuthZ model and threat considerations
   - External services and integrations
   - Deployment topology, environments, CI/CD, observability
   - Traceability: which components satisfy which FR/NFR
3. **ADRs:** write one `docs/adr/NNNN-title.md` per significant decision (stack, database, auth, hosting) using Context / Decision / Consequences.
4. Update the **Stack** section of CLAUDE.md with the chosen stack and commands.
5. Open a `docs/design` PR.
