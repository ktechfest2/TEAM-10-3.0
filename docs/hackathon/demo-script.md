# Demo video script (3 minutes)

> Live site: https://tally-election.vercel.app · Data on the site is **simulated and labelled**. Say so once, early.
> Spoken text is written to be said out loud, about 130 words a minute. Read it, don't recite it.

## The story
Amaka votes in Abuja. The result is stuck on a wall. After that, nobody can prove the number didn't change. Tally makes that impossible to do quietly.

## Shots and words

**0:00–0:20 · The problem** (home page, then the map)
> "Election day in Abuja. Amaka votes. The result is written on a sheet and stuck on the wall. Then it's read out, added up, and read out again at four more levels. At any step, can anyone prove the number is still the same? No. In 2023 the first sheet reached the portal at 8:55 at night, and the courts spent months arguing over paper. So we built Tally."

**0:20–0:55 · At the polling unit** (two phones side by side)
Officer's phone: photograph the sheet, confirm the figures, sign. Agent's phone: scan the officer's QR code, compare with the wall, hold to sign. Show the seal close.
> "This is the polling unit. The presiding officer photographs the sheet. Tally reads the figures, she confirms them, and signs with her own phone. Now an agent from a rival party scans her code, checks it against the wall, and signs the same number. Two rivals agree, so the result is sealed. No network needed."

**0:55–1:10 · Anyone can check** (unit page, switch to Hausa, tap Listen)
> "Anyone can see who signed. Amaka looks up her unit and hears the result in Hausa."

**1:10–2:05 · The moment** (`/rig`, then mission control)
Pick a ward. Change one APC number. Tap announce. Hold on the red card. Cut to mission control: the red spotlight on that unit.
> "Now the part that matters. This is the ward, where numbers get read out and added up. I'm the corrupt officer. I change one number… and announce it. Caught. In twenty-four milliseconds. Tally names the unit: announced a hundred and fifty, but agents of three parties signed fifty. Mission control goes red, and everyone following that unit gets the proof."

**2:05–2:30 · Before the vote** (mission control → Materials card; a unit page → priority help)
> "And it starts before the polls open. The store signs what it sends, the officer signs what arrives. Here, a unit is forty-eight ballot papers short. Found now, not in a queue. An elderly voter taps once for priority help. If nobody answers in fifteen minutes, mission control is told."

**2:30–2:45 · Rumours** (`/check`, paste "Apc cheated ??")
> "Someone forwards 'APC cheated'. Tally doesn't take a side. It shows what was signed."

**2:45–3:00 · Close** (home page, `/rig` in the address bar)
> "Everything except the ballot box, signed, witnessed and checkable. You can't rig it. Try."

## Before recording
- Phone-width window for app screens; normal window for mission control. 1080p, notifications off.
- Do one dry run of `/rig` (each attempt adds a collation to the live ledger).
- The text-message line is only true if `AT_USERNAME` and `AT_API_KEY` are set. If they aren't, cut "gets the proof" to "is told".
- Rehearse the two-phone signing once end to end with good light on the paper.

## Honest answers for judges
- **Why two parties, not all?** Rivals agreeing is the proof. Requiring all would give any one party a veto. Every extra signature is shown; a disagreeing agent makes the unit "disputed", with both versions kept.
- **What if the officer lies?** A number no rival signs never seals. A number changed later is caught at collation.
- **Why not e-voting?** Ballot secrecy plus verifiability isn't solved at this scale. INEC already runs registration and BVAS; we make what happens around them checkable.
- **Real vs simulated:** signing, the ledger, Bitcoin stamping, collation checks, materials, priority help and the rumour verdict are real. Election data and unit moves are simulated and labelled.
- **Not done:** native-speaker review of Hausa, Yorùbá, Igbo and Pidgin; real-handwriting testing; per-unit assignment and an admin page; SMS and push need provider keys.

## Fallback
Site down: `pnpm build && pnpm start` and record from `localhost:3100`. `/rig` fails: use a unit that already shows "Tampering suspected" and the red alert in mission control.
