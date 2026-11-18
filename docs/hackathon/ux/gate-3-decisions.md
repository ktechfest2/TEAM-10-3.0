# Gate 3: UX decisions

| | |
|---|---|
| Status | Palette and data rules **approved by the user (18 Nov)**. Awaiting final Gate 3 approval. |
| Supersedes | `ux-spec.md` and `mockup.html` (v1, light theme) |
| Reference | Interactive prototype: https://claude.ai/artifact/1NUF5tV6RXzFEubv7Sd2fj · Palettes: https://claude.ai/artifact/5vsH1KJmitSAWikxWRUGtJ · Static boards: https://claude.ai/artifact/Ert9bgdtT6rTTxU1Z755TE |

## 1. Palette: B "True Black" (approved, final choice)
The whole product is dark. The phone screens and mission control share one palette. (The user first chose A, Slate Night, then switched to B.)

| Token | Value | Use |
|---|---|---|
| `bg` | `#000000` | App background |
| `surface` | `#0E0F11` | Cards |
| `raised` | `#17191C` | Chips, inputs, secondary buttons |
| `line` | `#26292E` | Borders, dividers |
| `text` | `#E9EAEC` | Primary text (off-white, never pure white) |
| `muted` | `#9A9EA6` | Secondary text |
| `sealed` | `#3DDC97` | Sealed, matches, success |
| `amber` | `#FFB93B` | Witnessed but not sealed, needs a check |
| `alarm` | `#FF6B6B` | Tampering or dispute only |
| `thumb` | `#A394FF` | The signing gesture |
| button | `#E9EAEC` on `#000000` | Primary button (to be softened if it feels harsh) |

Rules:
- Cards sit on pure black, so surfaces are barely lighter than the background. **Every card gets a 1px `line` border** to separate it.
- Small text uses weight 500 or heavier, to avoid the haze pure black can cause.
- Washes are the colour at 14-16% opacity.
- Contrast is at least 4.5:1 for all text (measured: text 17.4, muted 7.1, sealed 10.9, amber 11.2, alarm 6.9, thumb 7.5).
- Mission control uses pure black behind the map; "no result yet" cells use `raised`.
- Parties never get colours.

### Spectrum (added 18 Nov at the user's request: black is the theme, not the whole palette)
| Token | Value | Use |
|---|---|---|
| `blue` | `#6AA9FF` | Party agents, links, primary buttons (gradient with `thumb`) |
| `cyan` | `#35D6D1` | Observers and logistics |
| `pink` | `#FF63AE` | Voters |
| `orange` | `#FF8F3F` | Presiding officers |
| `thumb` | `#A394FF` | Collation officers and the signing gesture |

- Green, amber and red stay **reserved for status**. Decoration and identity use the spectrum only.
- Each role has its own colour (`lib/roles.ts`); each area council has its own colour on the map and in the council list.
- The multicolour tally mark is the logo; the rainbow hairline and gradient headline are brand-only and never carry meaning.

## 2. Type
- **Bricolage Grotesque** for headlines and figures.
- **Noto Sans** for body text. It covers the Hausa, Yorùbá and Igbo letters.
- **IBM Plex Mono** for hashes.
- Tabular numerals wherever figures line up.
- Real-phone test for diacritics before release.

## 3. Signature elements
- **Tally-mark seal:** one stroke per signing party, a green slash when sealed, a broken red slash when disputed.
- **Hold to sign:** press and hold about 1 second, with a keyboard equivalent.
- **Handwriting crop:** for each figure the AI reads, show the cropped image beside the reading.
- **Territory mosaic map:** one cell per polling site on the real FCT boundary, with a magnifier on the focused unit.
- **Unit day timeline:** the voter's view of events at their unit, from materials arriving through to state collation.
- **Shareable poster:** a sealed or disputed result, for WhatsApp Status.

## 4. Feedback rules
- Motion, sound and haptics are used only on state-changing moments (a signature, a seal, a tamper alert), never on scroll.
- Sound has an off switch.
- `prefers-reduced-motion` is respected.

## 5. Data rules (user decision)
1. The app is real. Every number on screen comes from the database or is clearly labelled.
2. Simulated demo data is allowed. It must be generated through the real code path (real signatures, real ledger) by actors flagged DEMO.
3. The UI shows a visible "Simulation" label whenever demo data is present.
4. There are no hardcoded counts, statuses or alerts in components.
5. A demo reset exists.

## 6. Screen to data contract
| Screen | Shows | Source | Priority |
|---|---|---|---|
| Voter: unit page | Unit name, ward, code | `places` | MUST |
| | Seal state, signers | events + witnesses (trust engine) | MUST |
| | Party figures | `result.declared` (best version) | MUST |
| | Day timeline: materials, opened, queue, result, ward, area council, state | all events for the place and its ancestors | MUST (result and collation steps); SHOULD (materials, opened, queue) |
| | Listen | text-to-speech | COULD |
| | Share poster | rendered from the result | SHOULD |
| Officer: confirm | Figures with handwriting crop and AI reading | `/api/ec8a/read` | MUST |
| | Arithmetic checks | `checkResultArithmetic` | MUST |
| | Photo hash | behind a "details" link | MUST |
| Officer: seal | Signers, QR, seal state | local holds + events | MUST |
| Agent | Figures, hold-to-sign, signed copy | scanned event | MUST |
| Collation officer | Rows and live check against sealed units | `getCollationCheck` | MUST |
| Mission control | Units, sealed, witnessed, tamper counts | DB (`getCoverage`) | MUST |
| | Mosaic map and statuses | `places` + results | MUST |
| | Alerts: tamper, dispute, anchors | events + `anchors` | MUST |
| | Alerts: rumours, statistical flags | agents | SHOULD (shown only once built) |
| | Replay | `reference_2023` | SHOULD |
| | Simulation controls (labelled) | `/api/demo/*` | MUST |

## 7. Open item
The voter's day timeline is assumed (user did not object). The user can veto it.
