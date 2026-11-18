# Implementation Plan & Live Task List

## Timeline (WAT)
| Item | Time |
|---|---|
| Start | Wed 18 Nov, 09:00 |
| Planning began | Wed 12:00 |
| **Hard deadline** | **Fri 20 Nov, 09:00** |
| Internal submission target | Fri 07:00 |
| Final 20% reserve | Thu 23:30 → Fri 07:00 |

| Window | Phase | Exit gate |
|---|---|---|
| Wed 12:00–14:30 | Docs, risk checks R1–R4, scaffold, first deploy | Live URL; risk results logged |
| Wed 14:30–20:00 | Tier 1a: places import, actors and keys, signed ledger, offline outbox | Signed event created offline → synced → chain verified (tests) |
| Wed 20:00–Thu 02:00 | Tier 1b: EC8A reader, QR co-signing, trust engine, collation and tamper detection, anchoring | Full result journey works end to end |
| Thu 02:00–08:00 | **User sleeps.** Claude continues unattended Tier 1 work only if left running. | — |
| Thu 08:00–14:00 | Tier 1c: public views, proof of inclusion, mission control, app polish | Demo steps 3–6 work on a phone |
| Thu 14:00–20:00 | Tier 2: WhatsApp intake, rumour verification, incidents, languages, alerts, operations events | Forward → verdict reply works |
| Thu 20:00–23:30 | Tier 3: Replay 2023, twin agents, SMS/USSD | As time allows |
| **Thu 23:30–Fri 07:00** | **Final 20%:** /verify, deploy hardening, seed and reset, write-up, problem brief PDF, diagram, video, form | Submitted by 07:00 |

## Feature tracking
Timeboxes:
- P0: 45 min
- P1: 30 min
- P2: 15 min
- complex integration: 60 min
- at most one extension per feature

| ID | Feature | Pri | Timebox | Start | Actual | Status | Fallback |
|---|---|---|---|---|---|---|---|
| R1 | AI reads real EC8A images | risk | 30m | | | todo | Manual entry + arithmetic check |
| R2 | Speech-to-text Hausa/Yoruba/Igbo | risk | 30m | | | todo | Text only + Pidgin/English voice |
| R3 | INEC polling-unit data for FCT | risk | 30m | | | todo | Hand-load demo wards from the INEC PDF |
| R4 | OpenTimestamps submit from server | risk | 15m | | | todo | Publish Merkle roots to a public GitHub file and label it |
| F1–F12 | Tier 1 | P0 | per feature | | | todo | |
| F13–F21 | Tier 2 | P1 | per feature | | | todo | |
| F22–F25 | Tier 3 | P2 | per feature | | | todo | |

## Needed from the user (blocking)
- [ ] **AI Gateway key** (or Vercel login so `vercel env pull` works)
- [ ] Vercel account for deployment (and Neon via the Marketplace)
- [ ] Meta developer account → WhatsApp Cloud API test number (Tier 2)
- [ ] Africa's Talking sandbox account (Tier 3)
- [ ] The submission form URL saved in `event-context.md`
