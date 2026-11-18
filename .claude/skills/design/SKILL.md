---
name: design
description: Architecture phase. Designs the simplest architecture that delivers the P0 requirements, picks the stack on evidence, and writes docs/hackathon/architecture.md, the decision log and a timeboxed implementation plan. Use after product requirements are agreed.
---

# Architecture & plan

Read `docs/hackathon/product-requirements.md`, `event-context.md` and `risk-register.md` first.

1. **Stack selection on evidence.** Don't default to popular tools. For each area (frontend, backend, DB, AI, auth, storage, external APIs, hosting, monitoring), compare up to 2 options on fit, team familiarity, setup time, reliability on poor networks, and cost. Only use what's installed or quick to install (see CLAUDE.md); list any installs needed and ask before installing global software.
2. **AI features** (only if AI fits): define the responsibility, I/O, success metric, invalid-output handling, failure fallback, and latency and cost. Verify model availability and quota with a real call before relying on it.
3. Write `docs/hackathon/architecture.md`: a Mermaid diagram, data model, API contracts, security, service fallbacks, environments and the demo-data reset approach. Prefer a monolith; no microservices without a compelling reason.
4. Record each significant choice in `decision-log.md`.
5. Write `implementation-plan.md`: phase windows based on the real deadline, the final 20% reserved, and each feature with its priority and timebox (P0 45m / P1 30m / P2 15m / complex 60m) and fallback.
6. Update the Stack & commands section of CLAUDE.md. Confirm with the user, then start the project foundation.
