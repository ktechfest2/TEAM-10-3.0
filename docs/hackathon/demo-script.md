# Demo Script (3-minute video)

> Status: **DRAFT 1.** Every step below uses a feature that has been run against the real app. Data on the live site is **simulated and labelled**; say so once, early.
> Live site: https://tally-election.vercel.app · Brief: /brief · Sketch: /sketch

## Before recording (10 minutes)
- [ ] Record on a **phone-width browser window** (about 390 px) for the app screens, and a normal window for mission control. Screen-record at 1080p.
- [ ] Open these tabs in order: `/` · `/sketch` · a unit with short materials (Mission control → Materials card → first row) · `/p/37-01-04-007` (moved unit) · `/rig` · `/mission` · `/check`.
- [ ] Do **one dry run** of `/rig`. Each rig attempt adds a collation to the live ledger. That is fine, but the second run in a ward looks the same as the first.
- [ ] Do not claim texts are sent unless `AT_USERNAME` and `AT_API_KEY` are set. Without them the page says "Text messages are not switched on yet". Either show that line honestly, or set the Africa's Talking sandbox keys and show the simulator.
- [ ] Do **not** show camera or QR scanning between two phones unless you have tested it on real phones. It has not been tested.
- [ ] Mic check, notifications off, browser zoom 100%.

## The story in one line
Everything on election day except the ballot box is now signed, witnessed and checkable. **Try to rig it.**

## Script

| Time | On screen | Say |
|---|---|---|
| **0:00–0:15** Hook | `/` home, hero and the map. | "In 2023 the first result sheet reached the portal at 8:55 at night. After that, nobody could prove what was written on the wall was what got counted. This is Tally." |
| **0:15–0:40** The idea | `/sketch`. Scroll to "One result. One changed number." and let the animation play: three phones sign 50, the seal draws, the ward announces 150, the card turns red. | "The officer and agents of rival parties sign the same number on their own phones, even offline. Two rivals agreeing seals it. When the ward announces a different number, Tally catches it at the exact unit. All the data you will see is simulated, and it is labelled that way." |
| **0:40–1:05** Before polls | Mission control → **Materials** card → open the first unit with a shortfall. Show "Received with a different count: 48 short". | "Before polls open, the store signs what it sends. The officer signs what arrives. Agents co-sign. Here a unit received 48 fewer ballot papers than were sent. That used to be found at 8 in the morning, in a queue." |
| **1:05–1:25** The voter | `/p/37-01-04-007`. Show the amber "This polling unit has moved" card, then tap **Get directions**. Scroll to the phone box and **priority help** buttons. | "A voter finds her unit. It has moved, so the page leads with the new site and directions, and she can ask for a text. An elderly or disabled voter can tap once for priority help, with no name or number. If nobody answers in fifteen minutes, mission control is told." |
| **1:25–1:45** Any voter, any language | A sealed unit page. Switch language to **Hausa**, tap **Listen**. | "Results are in five languages and can be read aloud. The verdict comes from signed records, not opinion." |
| **1:45–2:30** **The moment** | `/rig`. Pick a ward. Tap one APC number, type a bigger one. Tap **Announce the changed total**. Hold on the red card: "Caught in 24 ms". Then cut to **Mission control**: the map spotlight on that unit, the red alert at the top. | "Now you are the corrupt collation officer. I change one number and announce it. Tally compares it with what rival agents signed at the unit. Caught. It names the unit, the figure announced, and the figure signed, and mission control lights up red. Anyone following that unit gets a text with the proof." |
| **2:30–2:50** Rumours | `/check`. Paste: `Apc cheated ??`. Show the result. | "Someone forwards 'APC cheated'. Tally does not take sides. It shows the signed facts for that party: where a collation differed, and how many results its agents co-signed." |
| **2:50–3:00** Close | `/` or `/brief`. | "Tally. Everything except the ballot box, signed, witnessed and checkable. You cannot rig it. Try." |

## If you have 5 minutes
Add after 1:45: the **officer's phone** (materials count, sign result), then the **agent's phone** scanning and signing. Only if you have tested the camera and QR code on real phones first.

## Talking points for judges
- **Why only two parties to seal:** rivals agreeing is the proof; requiring all parties would give any one of them a veto. Every extra signature is shown. A disagreeing agent makes the unit "disputed", with both versions kept.
- **What is real:** signing, the ledger, Bitcoin stamping, the collation check, the rumour verdict, materials, priority help, the moved-unit alerts. **What is simulated:** the election data (labelled "Simulated data"), and the polling-unit moves (labelled "estimated").
- **What we do not do:** record who anyone voted for, declare a winner, or replace paper results.
- **AI:** reads the result sheet photo and the forwarded message. It never decides. Rules and the signed ledger do.

## Honest limitations (say them if asked)
- Never run with the camera and QR codes on two real phones, or fully offline on a phone.
- Real handwriting not yet tested with the sheet reader.
- Hausa, Yorùbá, Igbo and Pidgin text is not yet checked by native speakers.
- One shared invite code for official roles; no per-unit assignment or admin page yet.
- SMS and push alerts need provider keys to switch on.

## Likely judge questions
| Question | Answer |
|---|---|
| Can't the officer just enter a false number? | Yes, and two rival agents must sign it for it to seal. A false number nobody signs stays unsealed, and a number changed later is caught at collation. |
| What if agents collude? | Then the paper is no worse. Citizens' wall photos and observers can still disagree, and every version is public and stamped. |
| Why not full e-voting? | Secrecy plus verifiability is unsolved at this scale. INEC already runs registration and BVAS. We make what happens around them checkable. |
| Does it work offline? | Signing does: records queue on the phone and send when there is a network. |
| Who pays for SMS? | The deployer, per message, through Africa's Talking. It is off until keys are set. |

## Fallback plan
- Site down: run `pnpm build && pnpm start` locally with the seeded database and record from `localhost:3100`.
- `/rig` fails: open a ward's unit page that already shows "Tampering suspected" and use mission control's red alert.
- No network: this video is the fallback.
