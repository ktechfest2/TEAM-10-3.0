# Tally — UX Specification

| | |
|---|---|
| Status | **SUPERSEDED by gate-3-decisions.md** |
| Visual mockup | [`mockup.html`](mockup.html). Open it in a browser. |
| Inputs | PRD v2 personas and journeys; architecture A4, A8, A9, A11 |

## 1. Design principles
1. **One question per screen.** Each screen answers exactly one thing ("Is my result real?", "Do these match the wall?").
2. **Proof before decoration.** Every status links to its evidence in one tap.
3. **Calm by default, loud only for tampering.** Red appears only for tampering or dispute, never for routine states.
4. **Readable by anyone.** Plain words (reading age ~10), local languages, big numbers, 48 px targets, no meaning carried by colour alone.
5. **Offline is normal, not an error.** The app shows "saved on phone", not failure messages.
6. **Neutral.** No party colours or logos. Parties appear as plain text acronyms.

## 2. Visual direction
| Token | Value | Use |
|---|---|---|
| Brand / Sealed | `#008751` (Nigerian flag green) | Sealed, matches, success |
| Amber | `#c27803` | Witnessed but not sealed, needs checking, offline-saved |
| Alarm | `#d42a2a` | Tampering, disputed, "do not sign" (rare by design) |
| Ink / Paper | `#0c1220` / `#f5f3ee` | Text and background (light public and phone screens) |
| Night | `#070b14` | Mission control (dark, big screen, election night) |
| Type | Geist (800–900 for headlines, tabular figures), Geist Mono for hashes | |
| Signature element | **The Seal**: a ring with one segment per rival party that signed, and a check mark when sealed | Appears on unit pages, the officer flow and the map legend |
| Shape | 16–24 px radii, soft shadows, generous spacing | |

## 3. Information architecture
```
Public (no login)                     App (installable, role-based)
/            Find your polling unit   /app  → onboarding (role, key, place)
/p/[code]    Unit / ward / LGA proof        → Officer: Open → Result → Seal → Upload
/mission     Mission control (live)         → Agent/Observer: Scan → Compare → Sign
/mission?replay=2023                        → Collation officer: rows checked live
/check       Check a rumour (web)           → Voter: my unit, alerts
/verify      Audit + Bitcoin anchors
WhatsApp     Forward → verdict, unit lookup, alerts
```

## 4. Screen inventory and states
| Screen | Journey | Empty | Loading | Offline | Error |
|---|---|---|---|---|---|
| A. Voter unit page | J3 | "No signed result yet. It appears when the officer and agents sign." | Skeleton seal + chain | Last cached copy, marked with its time | "Couldn't load. Try again." |
| B. Officer: confirm figures | J1 | — | "Reading the sheet…" | Manual entry, "saved on phone" | AI unavailable → manual entry, labelled |
| C. Officer: collect seal | J1 | Ring empty, "0 of 2 parties" | — | Fully works | Invalid signature → "Ask the agent to sign again" |
| D. Agent: compare and sign | J1 | — | — | Fully works | Tampered QR → "Do not sign: signature invalid" |
| Collation officer | J2 | — | Skeleton rows | Needs one load of the ward list | — |
| E. Mission control | J2, J5, J6 | "No results yet" map | Map tiles loading | "Live updates paused" banner | Feed error banner |
| F. WhatsApp verdict | J4 | Welcome + language menu | "Checking…" reply within 5 s | — | "Can't check now. Try again." (never a guessed verdict) |
| Rumour check (web) | J4 | Example claims | — | — | Same as WhatsApp |
| Verify | — | — | — | — | Audit failure shown prominently |

## 5. Key interaction details
- **Officer figures:** AI-filled values are plain; uncertain values are outlined in amber with a "CHECK" tag. Arithmetic status is shown live under the figures. The sign button is always enabled, but if there are issues it reads "Sign anyway — problems will be shown publicly".
- **Seal ring:** fills one segment per *distinct party*. It turns green with a check at 2 or more parties. A second signer from the same party adds no new segment.
- **Agent compare:** very large figures (≥ 28 px) for comparing with a wall poster in low light. Two clear actions: green "Yes — sign", red outline "They don't match".
- **Collation:** each row turns green (matches the seal), red (differs: shows the sealed value) or grey (no seal yet) as it is typed.
- **Mission control:** dots coloured by status; tampering pulses. The alert feed is ordered newest first, with severity colours; clicking one opens the proof.
- **WhatsApp verdicts** follow one template: verdict word → one-sentence reason → evidence line → link → language menu.

## 6. Content and tone
- Verdicts: **TRUE / FALSE / NOT YET CONFIRMED**. Never "fake news" or accusatory language.
- Anomalies: "Statistical flag · for review". Never "fraud".
- Plain verbs: "Sign", "Scan", "Check", not "authenticate" or "attest".
- Every AI-produced value is labelled "Read by AI · confirm".

## 7. Accessibility
- WCAG 2.2 AA contrast on all text, including the dark mission control.
- Status always has text and an icon as well as colour.
- 48 px minimum targets; works at 200% zoom; `prefers-reduced-motion` disables the pulse.
- Voice-first support comes through WhatsApp voice notes (SHOULD) and voice replies (COULD).

## 8. Out of this gate
Pixel-perfect polish of secondary screens (verify, onboarding) follows the same tokens and is reviewed in the build PRs.
