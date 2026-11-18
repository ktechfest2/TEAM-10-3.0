# Problem Brief — Tally

> This is also the one-page problem brief deliverable (to be exported as a PDF for submission).

## The link we chose, inside the bigger picture
A Nigerian election is a chain:
**inform voters → identify them (BVAS) → move materials & staff → vote (paper) → count (EC8A) → transmit (IReV) → collate (ward EC8B → LGA EC8C → state EC8D → national EC8E) → declare → settle disputes.**

INEC already digitises identity (BVAS) and publishes result-sheet images (IReV). What is **not** digital, witnessed or checkable by ordinary people is everything that **surrounds** those systems:
- the custody of materials and staff
- whether a polling unit actually opened
- whether the number on the wall is the number that reached collation
- whether a rumour is true
- whether a claimed "upload failure" really happened

**Tally goes deep on one link: the journey of a result from the polling-unit wall to the final announcement.** Every event in that journey becomes signed and witnessed (by rival party agents, observers and citizens), and anyone can check it from any phone, in their own language. The same witnessed-event engine also covers the steps before and around counting: voter information, opening and queue status, materials and staff, incidents and rumours.

## Why it matters
- **The 2023 IReV failure:** presidential result uploads failed because of a server bug, and the first sheet only appeared at 8:55 pm. Tribunals spent months on EC8A sheets that never reached the portal.
- **The Electoral Act 2026:** makes electronic transmission mandatory (s.60) but keeps **paper as primary when transmission fails**, and **does not define "failure"** or say how a failure is independently certified.
- **Collation:** still read aloud and added up by hand at more than 10,000 ward centres. Changes between the wall and the ward are hard to prove.
- **Misinformation:** WhatsApp is the main channel for election misinformation, and older voters are especially exposed. Fact-checkers cannot keep up.
- **Turnout:** fell from 52% (1999) to 27% (2023). Researchers link this to eroded trust in the process.
- **Access:** rural Nigeria has about 51% ownership of internet-capable handsets and about 33% mobile internet use. Many voters do not read English.
- **Timing:** the next general election is reportedly **16 Jan 2027**, about 8 weeks after judging.

## Who it affects (Amaka's day)
| Moment | Problem | What Tally does |
|---|---|---|
| Morning | Polling unit moved; she finds out on the day | Advance alerts in her language, lookup, landmark directions |
| Arrival | Long queue, late officials | Live opening and queue status, materials tracking, auto-escalation, priority help for elderly and disabled voters |
| Evening | Results pasted on the wall, people take photos | Rival agents co-sign the EC8A offline; a QR code on the poster links to the sealed record; citizen photos become witnesses |
| Days later | "Is what I saw what was counted?" | Proof that her unit's sealed figures appear unchanged in the ward, LGA, state and national totals |
| All day | Rumours of violence and vote-buying | Forward to Tally's WhatsApp, get a verdict and proof back; corrections pushed to nearby people |

Other affected groups:
- **Presiding officers:** errors in the forms lead to cancellations.
- **Party agents:** cannot prove alterations.
- **Observers and community leaders:** have no shared source of truth.
- **Lawyers:** evidence takes weeks to gather.

## Existing tools and the gap
| Tool | Gap |
|---|---|
| IReV, Mundx, Dataphyte/NEDO | Depend on IReV images (single source, failed in 2023); one-way (no witnesses); smartphone/web only |
| MyPollingUnit, E Don Kast, iReport, VotesMonitor | Photo upload or agent tallies; no cross-party proof, no ward-level reconciliation, no basic-phone or local-language access |
| Yiaga PVT | Statistical sample, not every unit, not public |
| CDD, Dubawa | Fact-check articles, not a live verification channel |

No tool turns rival agents' countersignatures (which the Act already requires on paper) into cryptographic proof that anyone can check, reconciles every collation level against them, and makes it reachable by voice, WhatsApp and SMS in local languages.

## Sources
INEC Election Manual 2023 · Electoral Act 2026 (via Babalakin & Co, The Conversation) · TheCable (IReV HTTP error) · AllAfrica (AI & civic tech in result tracking, Sep 2026) · GSMA Mobile Connectivity 2025 · Reuters Institute and Dubawa (2023 misinformation).
