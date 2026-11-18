---
name: requirements
description: Run when the challenge statement is released (pass the text, file or URL). Analyses the problem, researches the opportunity, proposes up to 3 scored solution directions, and after the user picks one writes the product requirements. Does not write code.
---

# Challenge → problem brief → requirements

Input: the official challenge statement. If it's missing, ask for it. **Write no code in this phase.**

1. Read `docs/hackathon/event-context.md`. Paste the statement verbatim into `docs/hackathon/problem-brief.md`, and extract each stated requirement, constraint, deliverable and judging criterion. Update `event-context.md` with anything newly confirmed.
2. **Understand the problem:** what the actual problem is, who has it, how often, why existing solutions fall short, and the cost of leaving it unsolved.
3. **Research the opportunity** with web search: existing solutions and competitors, technical limits, differentiation, and available APIs, datasets and models (with pricing and quotas). Account for the Nigerian context (network, data cost, devices, payments, local services). Cite sources.
4. **Propose at most 3 serious directions.** Score each 1–5 on problem relevance, innovation, feasibility, competition fit, UX, scalability, demonstrability and time. Recommend the strongest, and challenge any that only sound futuristic.
5. **Stop and get the user's decision.** Ask only the questions that matter.
6. Write `docs/hackathon/product-requirements.md`: P0/P1/P2 features with Given/When/Then acceptance criteria, the main user journey, NFRs and out-of-scope items. Distinguish what is confirmed, assumed and unknown.
7. Log the decision in `decision-log.md` and new risks in `risk-register.md`. Then hand off to `/design`.
