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
| Morning: unit moved, advance alerts, directions | **Partial** | Search of all 2,822 FCT units works; poster QR on the wall lets neighbours check their unit. No alerts, no "moved" data (needs INEC), no landmark directions. |
| Arrival: queue, materials, escalation, help for elderly and disabled | **Partial** | Voters sign queue and "officials have not arrived" reports; unit pages show them (one count per person); two voters at an unopened unit raise a mission alert. Browser-tested end to end. **No materials tracking, no automatic escalation, no priority-help flow.** |
| Evening: agents co-sign offline; poster QR; citizen photos as witnesses | **Partial** | Co-signing built and tested at protocol level. **Printable poster with a QR that decodes to the unit page (built).** **Citizen wall photo: photo, AI read, comparison with the signed result, signed by the citizen (built, browser-tested with the real reader).** Never run offline or on a phone. |
| Days later: "was my result counted?" | **Met** | Unit page journey (opened, signed, upload, ward, area council, state); tamper shows announced vs sealed. `check:journey`, `check:sim`. |
| All day: rumours, forward to WhatsApp, verdict back | **Partial** | In-app paste and Android share target work, five languages, verdict with reasons. **No WhatsApp number.** No pushed corrections. |
| Mama Ngozi (cannot read, voice-first) | **Partial** | "Listen" reads the verdict and figures aloud with the phone's own voice (tested with a mocked speech engine). Depends on the phone having a voice for the language (Hausa, Yorùbá and Igbo are often missing; the page says so). No voice input. |
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
| V3 WhatsApp official number | **Cut on purpose** | decision 28; replaced by paste and the share target |
| V4 languages | **Partial** | EN, PCM, HA, YO, IG for the voter sentences; **draft, not native-reviewed**; officer, agent, collation and mission screens are English only |
| V5 voter alerts | **Partial** | in-app "changed since you last looked"; no push, SMS or WhatsApp; no opening or delay alerts |

SHOULD list in the PRD: poster QR and citizen photo witness are now built (an earlier report wrongly called the SHOULD tier complete before they were).

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
3. No WhatsApp number (V3): **cut on purpose** (decision 28). Say so plainly in the pitch; the forwarded-message check works by paste and share target.
4. No materials tracking, escalation or priority-help flow; no push alerts; no voice input.
5. Real handwriting untested; officer, agent and collation screens English only; translations unreviewed.

**Minor**
6. Rumour: no forwarded-copy chain or corroboration. Replay: no timeline. Map cells not clickable.
7. `AGENTS.md` heading changed by Next's install step (harmless, uncommitted).

## 9. Added after this report was first written
Poster, listen, voter reports and citizen wall photos were built the next morning. Verified by: 99 unit tests; `check:journey` (voter reports, role rules, wall photos, alerts); `check:sim` (labels, rate limit, simulated voters); a QR decode of the poster; a mocked speech engine; and a **real-browser run against a production build** (sign up as a voter, report a queue, upload a photo through the real reader, sign and send, then see it on the ledger, unit page and mission control). That run also found and fixed: phone photos over the server's 3 MB limit were rejected in the officer's wizard (now downscaled), and `/api/media` had no rate limit.
Still not run on a physical phone: camera capture, QR scanning between two phones, offline queue, install, share target.
