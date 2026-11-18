# Risk Register

L = likelihood, I = impact (H/M/L).

| # | Risk | L | I | Mitigation / fallback | Status |
|---|---|---|---|---|---|
| R1 | AI misreads handwritten EC8A sheets | M | H | Test on real 2023 sheets early. Arithmetic checks, PO confirmation and agent review before signing. Fallback: manual entry. | **Partly mitigated:** 7/7 figures on synthetic and degraded copies; real handwriting still untested |
| R2 | Speech-to-text poor for Hausa/Yoruba/Igbo | M | M | Measure early. Fallback: text plus Pidgin/English voice. | Open |
| R3 | No clean INEC polling-unit dataset | M | H | Find a public dataset. Fallback: hand-load one LGA from INEC's published list. | Open |
| R4 | OpenTimestamps calendar unreachable | L | M | Multiple calendars. Fallback: publish roots to a public repo file (labelled). | Mitigated: stamp created and `.ots` downloads; Bitcoin confirmation pending |
| R5 | No API keys or accounts yet (AI Gateway, Vercel, Meta) | H | H | Ask the user now. Rules-based fallbacks keep the app usable. | **AI Gateway and Vercel resolved** (free-tier model, no key). **Meta/WhatsApp still open** |
| R6 | Public repo exposes our work to other teams | H | L | Allowed by the rules; push in meaningful increments. | Accepted |
| R7 | Scope too large for 2 people in 45h | M | H | Tiers, hard timeboxes, final 20% reserved, cut Tier 3 first | Open |
| R8 | Venue or demo network failure | M | H | Recorded video; offline-first app; local deploy fallback | Open |
| R9 | WhatsApp test number limited to 5 recipients | H | L | Register the demo phones in advance | Accepted |
| R10 | Election data sensitivity (anomaly flags read as accusations) | M | M | Wording: "statistical flag for review", never "fraud"; cite the method | Open |
| R11 | Low-end Android performance | M | M | Small bundle, no heavy map on phone views, test on a real device | Open |
| R12 | Vulnerable dependencies (13 Next.js advisories, three critical) | H | H | Upgrade; audit in CI | **Closed:** Next.js 16.4.6, audit clean |
| R13 | Public AI endpoints drained or abused | M | M | Per-caller limit on both; free-tier credit caps spend | Mitigated (per instance only) |
| R14 | Simulated data mistaken for real results | M | H | Label on every screen that shows it; tests | **Closed for this build; keep it labelled in any new screen** |
| R15 | Free-tier model access changes before judging | L | H | Re-run `scripts/bench-ec8a.mts` before the demo; manual-entry and rules fallbacks | Open |
| R16 | Phone flows fail on a real device | M | H | Real-phone test round; fix before the final 20% | **Open (blocking)** |
| R17 | Non-English text wrong or offensive | M | M | Draft notice shown; native-speaker review | Open |

