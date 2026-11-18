---
name: kickoff
description: Run when the hackathon challenge is announced. Analyse the brief, brainstorm winning ideas, pick one, choose the stack, and produce a 3-day sprint plan. Pass the challenge text or a link/file as the argument.
---

# Hackathon kickoff

Input: the challenge brief (pasted text, file, or URL) in the arguments. If none given, ask for it.

1. **Decode the brief.** Extract: the problem statement, required deliverables, judging criteria (and weights if given), constraints (tech, APIs, data, themes), deadlines, and submission format. Quote anything ambiguous and list questions to ask organisers.
2. **Ideate.** Propose 4–5 distinct ideas. For each: one-line pitch, target user, the "wow" moment in the demo, how it scores on each judging criterion, build risk (L/M/H), and what can be faked.
3. **Recommend one.** Pick the idea with the best (judging score × demo impact) ÷ build risk. Be decisive; explain in 3 bullets.
4. **Scope ruthlessly.** Split features into MUST (demo breaks without it), SHOULD, and WON'T. The MUST list should fit in ~1.5 days.
5. **Stack.** Choose proven, fast tools the team knows (available locally: Node 22, pnpm, Python 3.14, Docker, gh). Default web pick: Next.js + Tailwind + a hosted DB, deployed to Vercel. Use Claude (latest models) if AI is needed.
6. **Sprint plan.** Hour-blocked plan for Day 1 / Day 2 / Day 3 matching CLAUDE.md's sprint shape, with owners if team roles are known.
7. **Update the repo.** Fill in the Stack section of CLAUDE.md and the Project/Problem/Solution sections of README.md. Then ask whether to scaffold the project now.
