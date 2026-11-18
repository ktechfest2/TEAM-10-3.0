# Tally — Product Requirements Document

| | |
|---|---|
| Status | **APPROVED v2 (Gate 1, 18 Nov 13:20 WAT)** |
| Owner | TEAM-10 (the user, product and engineering lead; Claude, engineering) |
| Last updated | 2026-11-18 13:15 WAT |
| Deadline | Fri 20 Nov 2026, 09:00 WAT (internal target 07:00) |

---

## 1. Problem
Nigerian elections keep the **paper result sheet (EC8A) as the legal record** (Electoral Act 2026), but between the polling-unit wall and the final announcement that record passes through hand-read, hand-added collation at more than 10,000 ward centres, plus an upload channel (IReV) that failed in 2023. The Act does not define a "transmission failure" or say how one is certified. Meanwhile, rumours of violence and vote-buying spread on WhatsApp faster than anyone can check them, and the people most exposed are those with basic phones, low literacy and no English.

The result: when Amaka asks *"is what I saw on the wall what was counted?"*, **nobody can show her the answer**. Trust falls, turnout falls (52% in 1999 → 27% in 2023), and disputes go to tribunals or the street.

Evidence: `problem-brief.md`.

## 2. Goals and success metrics
| Goal | Metric (how we prove it in the prototype) | Target |
|---|---|---|
| **G1.** Any polling-unit result is provably unaltered from the wall to the final collation | Altered collation rows detected in the automated test suite | **100%**, zero false alarms on unaltered rows |
| | Time for a presiding officer + 2 agents to seal a result, offline | **≤ 3 min** (measured in user testing) |
| **G2.** Anyone can get a verified answer about their unit or a rumour, in their language | Time from forwarding a WhatsApp message to the verdict reply | **≤ 30 s** |
| | Languages with reviewed answers | **5** (EN, HA, YO, IG, PCM) |
| **G3.** Problems surface while they can still be fixed, not at the tribunal | Tamper and anomaly alerts shown on mission control after the triggering event | **≤ 10 s** after sync |
| **G4.** AI is accurate and never trusted blindly | EC8A field-level transcription accuracy on our test sheets | **≥ 95%**, with 100% human confirmation before signing |
| **G5.** Usable by real people in real conditions | Testers who complete their role's core task unaided | **≥ 4 of 5** |
| | Public page first load on throttled 3G | **≤ 3 s** |

## 3. Non-goals
- Electronic voting, or any record of how a person voted (secret ballot; a vote-buying risk).
- Voter identification or accreditation (INEC's BVAS).
- Declaring winners or making projections (INEC's guidance for civic tools).
- Replacing IReV or the legal paper process. Tally makes them verifiable.
- Reading anyone's private WhatsApp chats. Only messages people forward to us.

## 4. Users
| Persona | Context | Job to be done | Design implications |
|---|---|---|---|
| **Amaka, voter** | Small town, mid-range Android, patchy data, prefers Igbo/Pidgin | "Tell me where to vote, and prove my unit's result wasn't changed." | Plain language, local language, works on slow networks, answer in one screen |
| **Mama Ngozi, elderly voter** | Basic phone, cannot read | "Tell me what's true and help me vote." | Voice-first, no reading required |
| **Presiding officer** | Temporary staff, trained for a day, under pressure, poor network | "Record the result correctly and get it accepted." | Step-by-step checklist, AI help, error prevention, offline |
| **Party agent** | Motivated to protect their party's votes, smartphone, offline at night | "Prove that the figure I witnessed is the one that gets counted." | Fast scan-and-sign, keeps own signed copies, clear verify screen |
| **Collation officer** | Ward/LGA centre, reads results aloud, scrutinised | "Collate quickly without accusations." | Rows pre-checked live against sealed units |
| **Observer / community leader** | Trusted locally, reports incidents | "Confirm or kill a rumour in my area." | Higher-weight witness role, simple reporting |
| **Mission control** (Situation Room, observer HQ, INEC, security) | Big screen, many units | "See where the election is going wrong, now." | Live map, alerts ranked by severity, drill-down |
| **Lawyer / journalist** | After the election | "Get evidence I can rely on." | Exportable, independently verifiable proof |

## 5. Key user journeys (the demo spine)
- **J1. Seal a result (offline).** The officer photographs the EC8A → AI fills in the figures → the officer confirms them (arithmetic checks) → signs → agents of 2+ parties scan, compare with the wall and sign → the result shows **Sealed** → it syncs when the network returns.
- **J2. Catch tampering at collation.** The officer enters the ward rows as they're read out → each row is checked live against the sealed units → a changed figure is flagged (announced vs sealed, with the exact unit) → mission control alerts.
- **J3. "Was my result counted?"** A voter finds their unit (search, or the QR on the poster) → sees the sealed figures, who signed, and the trust score → sees that each collation level carried the figures unchanged.
- **J4. Check a rumour.** A voter forwards a WhatsApp message → AI extracts the claim → the claim is checked against ledger events and corroborating reports → the verdict comes back with proof in the voter's language.
- **J5. Watch the election.** Mission control shows a live map of units by status → alerts appear (tampering, anomalies, rumours) → drill down to the proof.
- **J6. Replay 2023.** The real 2023 FCT polling-unit figures are replayed through the twin → the anomaly agent flags statistical outliers for review.

## 6. Scope for this hackathon (senior cut)
Capacity: about 42 hours left. The final 20% is reserved, leaving **about 33 build hours**. The proof core (Section 7, PROOF P0) is already built and tested, pending architecture approval. **We go deep on results integrity, and show the rest of the system in the system sketch.**

| Tier | In scope | Why |
|---|---|---|
| **MUST** | J1, J2, J3, J5 (mission control map), the UX redesign of all screens | The core value, and the first thing judges see. Without these there is no product. |
| **SHOULD** (in order) | J4 WhatsApp rumour check · J6 Replay 2023 + anomaly agent · 5-language answers · voter alerts · upload-failure certification + margin-of-lead · poster QR + citizen photo witness | Covers the brief's misinformation and accessibility areas; the strongest "AI" and "innovation" story |
| **COULD** | Operations events (materials, staff, opening escalation), incidents + community-leader role, evidence pack, voice replies, SMS/USSD, radio bulletins, device anti-tamper lock | Shown as roadmap in the system sketch if not built |
| **WON'T (this event)** | E-voting, BVAS/INEC integration, national data beyond FCT | Out of scope or needs INEC |

**Rule:** a SHOULD item starts only when every MUST journey passes its acceptance test.

## 7. Functional requirements and acceptance criteria
### PROOF
| ID | Requirement | Acceptance criteria |
|---|---|---|
| P1 | Every action is a signed event (Ed25519; the key never leaves the device) | Changing any byte after signing is rejected; a signature from an unregistered key is rejected |
| P2 | Role-based authority | Only an officer can record a result; only a collation officer can record a collation; violations are rejected server-side |
| P3 | Offline capture and idempotent sync | With the network off, events and co-signatures queue; when it returns, everything syncs exactly once; any holder can relay |
| P4 | EC8A AI reading with human confirmation | AI pre-fills the figures; the officer must confirm; arithmetic issues are shown before signing; if AI fails, labelled manual entry |
| P5 | Rival co-signing | Sealed = 2+ distinct parties signed identical figures; same-party signatures don't count twice; differing signed figures = Disputed, all versions kept |
| P6 | Collation reconciliation | Each row is compared with the sum of sealed units beneath it; mismatches show field, announced and sealed values; rows with no sealed data are "unverifiable", never "OK" |
| P7 | Tamper-evident ledger | A public audit re-verifies every hash and signature and the chain; a direct DB edit is detected |
| P8 | Public anchoring | Merkle roots go to OpenTimestamps at least every 10 min while activity continues; a .ots proof is downloadable |

### BRAIN
| ID | Requirement | Acceptance criteria |
|---|---|---|
| B1 | Mission control map | All FCT units plotted; colour = status; live alert feed; click → proof page; updates within 10 s of sync |
| B2 | Rumour verification | Claim extracted (place, event type, source depth); checked against ledger events and corroboration; verdict ∈ {confirmed, false, unverified} with the reasoning shown; forwarded copies count as one chain |
| B3 | Anomaly detection | Flags turnout above a threshold, outliers vs. neighbouring units, accredited > registered; wording is "statistical flag for review", never "fraud" |
| B4 | Replay 2023 | Replays the real FCT 2023 unit figures on a timeline; anomalies are flagged on the map; clearly labelled historical data |

### VOICE
| ID | Requirement | Acceptance criteria |
|---|---|---|
| V1 | Role-based app | One home screen per role; the core task is reachable in ≤ 2 taps from home |
| V2 | Public proof pages | Unit → ward → LGA → state drill-down; trust score with its reasoning; signers; the "wall = counted" check |
| V3 | WhatsApp intake (official number) | Forwarded text, image or voice note is received; reply within 30 s; reply in the sender's language |
| V4 | Languages | All voter-facing answers are available in EN, HA, YO, IG, PCM; templates reviewed by a native speaker where possible |
| V5 | Voter alerts | Subscribe to a unit; get notified on opening, delay and sealed result |

## 8. Non-functional requirements
| Area | Requirement |
|---|---|
| Offline | Officer and agent flows fully usable with zero network after first setup |
| Performance | Public pages ≤ 3 s on throttled 3G; app shell ≤ 300 KB JS for the phone flows |
| Security | See the threat model (Section 9). Server-side validation (zod) on every input, rate limiting, webhook signature verification, secrets only in env |
| Privacy (NDPA 2023) | No voter PII; phone numbers stored only as salted hashes; WhatsApp messages kept only as long as needed for the verdict |
| Accessibility | WCAG 2.2 AA contrast, 48 px tap targets, readable at 200% zoom, plain language (reading age ~10), no colour-only meaning |
| Reliability | Every external dependency (AI, WhatsApp, OpenTimestamps) has a labelled fallback; the app never blocks on one |
| Integrity of claims | Any simulated or historical data is labelled in the UI |
| Quality | CI on every PR: typecheck, lint, unit tests, build; end-to-end journey test before each merge to main |

## 9. Threat model (abridged)
| Threat | Mitigation |
|---|---|
| Officer or collation officer alters figures later | Rival co-signatures + row-by-row reconciliation; nothing is overwritten |
| Forged or replayed signature | Ed25519 over the content hash; content-hash uniqueness; registered keys only |
| Fake agents (Sybil) inflate trust | Invite codes issued per organisation; independence counted per **party**, not per person |
| All agents at a unit collude | Out of scope cryptographically (same as paper). Mitigated by observers, citizen photos and anomaly flags |
| Server operator edits the database | Public audit detects edits; Merkle roots anchored on Bitcoin |
| Lost or seized phone | Signed copies are held by several witnesses; the key is device-local (production: OS keystore + PIN) |
| Fake rumour verdicts used as propaganda | Verdicts show the evidence and source depth; "unverified" is the default, not "true" |
| Anomaly flags read as accusations | Neutral wording, method shown, "for review" |

## 10. Assumptions and dependencies
| Item | Status |
|---|---|
| Party agents carry smartphones that can scan QR codes | Assumption; validate in user testing |
| Vercel hosting + Neon Postgres + AI Gateway (no API keys; OIDC on Vercel) | The user is linking the repo |
| Meta WhatsApp Cloud API test number | Needed for J4. **The user must create it.** |
| OpenTimestamps calendars reachable | Verified 18 Nov |
| Real 2023 FCT unit data | In repo (credited) |

## 11. Judging fit
| Criterion (weight) | Requirements that score it |
|---|---|
| Relevance (25%) | J1–J4 answer Amaka's exact questions; the system sketch covers the whole chain |
| Innovation (20%) | Rival co-signing, live collation reconciliation, Bitcoin anchoring, an evidence-weighted rumour engine |
| Technical execution (25%) | Real crypto, offline sync, tested journeys, real 2023 data, CI |
| Nigerian impact (20%) | Electoral Act 2026 gap, basic phones, 5 languages, WhatsApp, offline, the Jan 2027 election |
| Presentation (10%) | Airplane-mode sealing, red tamper alert, live map, a rumour killed on WhatsApp |

## 12. Open questions for approval
1. Do you approve the **MUST / SHOULD / COULD** cut in Section 6?
2. Do you approve the **success metrics** in Section 2 (we'll measure and report them)?
3. Can you create the **WhatsApp test number** (needed for J4)?
4. Can you find **3–5 people** for a 10-minute user test on Thursday (they count toward G5 and the judges' bonus)?
