# Verification report

Run Wed 18 Nov 2026, night, against `main` at the time of writing and the production deployment. "Met" means shown by a test, a scripted run against the real server, or a manual run. Nothing here was exercised on a physical phone.

## 1. Build and tests (actual results)
| Check | Result |
|---|---|
| Unit tests | 94 passed |
| Typecheck, lint | clean |
| Production build (`pnpm build`: migrate, seed, build) | passes, 32 routes |
| `check:journey` (result journey, roles, tamper, idempotency, ledger) | passes, on a production-mode server |
| `check:sim` (simulation, map, tamper alert, rumour verdicts, labels, rate limit) | passes |
| Clean clone: `pnpm install --frozen-lockfile`, typecheck, test, lint | passes |
| Deployed pages at 390 px width, console errors | `/`, `/mission`, `/check`, `/verify`, `/replay`, `/p/…`, `/app`: no horizontal scroll, no errors |

## 2. Amaka's day (problem brief) and the personas
| Moment | Status | Evidence / gap |
|---|---|---|
| Morning: unit moved, advance alerts, directions | **Partial** | Search of all 2,822 FCT units works. No alerts, no "moved" data (needs INEC), no landmark directions. |
| Arrival: queue, materials, escalation, help for elderly and disabled | **Not met** | The event types exist on the ledger and show in the timeline, but there is no screen to record or display queue, materials or escalation. |
| Evening: agents co-sign offline; poster QR; citizen photos as witnesses | **Partial** | Co-signing built and tested at protocol level. **No printable poster QR. No citizen photo witness.** Never run offline on a phone. |
| Days later: "was my result counted?" | **Met** | Unit page journey (opened, signed, upload, ward, area council, state); tamper shows announced vs sealed. `check:journey`, `check:sim`. |
| All day: rumours, forward to WhatsApp, verdict back | **Partial** | In-app paste and Android share target work, five languages, verdict with reasons. **No WhatsApp number.** No pushed corrections. |
| Mama Ngozi (cannot read, voice-first) | **Not met** | No voice in or out. |
| Lawyer / journalist (exportable evidence) | **Partial** | `/verify`, downloadable `.ots` proof, public unit pages. No evidence pack. |

## 3. Journeys
| | Status | Note |
|---|---|---|
| J1 Seal a result (offline) | **Partial** | Protocol, sync idempotency, roles, sealing: tested. Camera, QR scan, press-and-hold and offline queue: **not run on a device**. |
| J2 Catch tampering at collation | **Met** | Exact unit pinpointed; unverifiable rows never shown as OK. Collation screens not run on a device. |
| J3 Was my result counted | **Met** | |
| J4 Check a rumour | **Partial** | See B2. |
| J5 Watch the election | **Met** | Live map, alerts (each opens its proof), polling every 5 s. Map cells themselves are not clickable. |
| J6 Replay 2023 | **Partial** | 2,822 real units analysed and mapped; no timeline (dataset has no timestamps). |

## 4. Requirements
| ID | Status | Evidence |
|---|---|---|
| P1 signed events | Met | core tests; altered event rejected (`check:journey`) |
| P2 role authority | Met | agent cannot record a result (`check:journey`); collation officer only for collations |
| P3 offline + idempotent sync | **Partial** | idempotent re-sync tested; offline queue implemented, never run with the network off on a phone |
| P4 EC8A AI reading + confirmation | **Partial** | 7/7 figures right on synthetic and degraded sheets (`scripts/bench-ec8a.mts`); confirmation and arithmetic built; **real handwriting untested**; manual fallback labelled |
| P5 rival co-signing | Met | sealed = 2+ parties; same party once; disputed keeps versions (core tests) |
| P6 collation reconciliation | Met | `check:journey` |
| P7 tamper-evident ledger | Met | edited a stored record by hand: audit reported `intact: false`, record 1 pinpointed; restored: intact |
| P8 anchoring | Met | stamp created over 449 entries; `.ots` proof downloads (HTTP 200). Bitcoin confirmation takes hours, so "confirmed" is not yet shown |
| B1 mission map | Met | all FCT units, status colours, alerts open their proof; sync to screen within 5 s polling |
| B2 rumour verification | **Partial** | claim → verdict with reasons, injection-resistant; **no corroborating reports, forwarded copies not counted as one chain** |
| B3 anomaly detection | Met | 288 of 2,822 units flagged for review; neutral wording |
| B4 Replay 2023 | **Partial** | no timeline |
| V1 role-based app | **Partial** | one home per role; the ≤ 2 taps target is untested on a phone |
| V2 public proof pages | Met | |
| V3 WhatsApp official number | **Not met** | needs a Meta developer account and number from the user |
| V4 languages | **Partial** | EN, PCM, HA, YO, IG for the voter sentences; **draft, not native-reviewed**; officer, agent, collation and mission screens are English only |
| V5 voter alerts | **Partial** | in-app "changed since you last looked"; no push, SMS or WhatsApp; no opening or delay alerts |

SHOULD list in the PRD: poster QR and citizen photo witness are **not built** (an earlier report wrongly called the SHOULD tier complete).

## 5. Simulated functionality
Mission control and the home page carry a "Simulated data" chip. As of this run, unit and area pages, the share card and rumour verdicts also say so in all five languages whenever the signed results come from the labelled test actors (found missing during this verification, fixed, and covered by `check:sim`). Replay 2023 is real historical data and labelled as such. Production holds 434 simulated units (signed through the real path by `DEMO` actors), one altered ward collation and two honest ones.

## 6. Security
- `pnpm audit --prod`: **13 advisories, all in Next.js 16.3.5, including three critical remote-code-execution issues (one in `next/og`, used by the share card). Fixed by upgrading to 16.4.6; audit now reports none.**
- No secrets in tracked files or history (only CI's throwaway local database login).
- Server-side: zod validation on routes, role and invite-code checks, operator tools closed without `OPS_CODE` (403), idempotent writes.
- **Found and fixed:** `/api/ec8a/read` was public with no rate limit (the rumour check had one). Both now share a per-caller limit. The limit is per server instance, so it is a speed bump, not a hard cap.
- Run `/security-review` before submission.

## 7. Deployment
Production runs the latest `main`; migrations and seed applied; `TALLY_INVITE_CODE` set and verified (wrong code → 403, correct code → account created); `OPS_CODE` deliberately unset, so `/ops` stays closed. AI Gateway: default model works on the free tier without a key.

## 8. Problems, by severity
**Blockers for a credible submission**
1. Nothing has been tried on a real phone (camera, QR, press-and-hold, offline, install, share target).
2. Submission pack not started: write-up, system diagram, problem-brief PDF, demo script, demo video, official form.

**Judge-visible gaps**
3. No WhatsApp number (V3). Needs the user to create a Meta developer account.
4. No poster QR, no citizen photo witness, no queue/materials/escalation screens, no voice, no push alerts.
5. Real handwriting untested; officer, agent and collation screens English only; translations unreviewed.

**Minor**
6. Rumour: no forwarded-copy chain or corroboration. Replay: no timeline. Map cells not clickable.
7. `AGENTS.md` heading changed by Next's install step (harmless, uncommitted).
