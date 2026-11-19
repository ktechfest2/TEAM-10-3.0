# Tally

**Is what you saw on the wall what was counted?**

Tally makes every Nigerian polling-unit result provable from the wall to the final announcement. Rival party agents co-sign each result offline, every collation level is checked against those signatures, and anyone can check the proof from any phone.

Built for **KTech Fest 3.0 · "Every Vote, Every Voice"** (theme: *Building Trust in Governance Using Technology*).

## The link we strengthen
Inform voters → identify them (BVAS) → move materials and staff → vote (paper) → **count (EC8A) → transmit (IReV) → collate (EC8B → EC8E) → declare** → disputes.

The Electoral Act 2026 keeps the paper EC8A as the primary record when electronic transmission "fails". It doesn't define failure, and collation is still read aloud and added up by hand. Tally makes the law's own safeguard verifiable: the **agents' countersignature becomes a cryptographic signature**, and every later number is checked against it.

## How it works
1. **Presiding officer** photographs the EC8A. AI transcribes it; the officer confirms every figure; arithmetic rules flag impossible results (over-voting, wrong totals). The officer signs with an Ed25519 key held on the phone.
2. **Rival agents co-sign offline.** Each scans the officer's QR code, compares the figures with the sheet, and signs with their own key. Two different parties signing identical figures makes the result **Sealed**. Signed figures that differ are **Disputed**, and every version is kept.
3. **Any phone can relay.** Signed items wait in an on-device outbox and sync once any network appears. Syncing is idempotent.
4. **Collation is checked row by row.** Ward and area-council figures are compared with what rival agents sealed. A changed number is flagged with *announced vs sealed* and the exact unit.
5. **Anyone can verify.** Every event is hash-chained and Merkle-anchored to **Bitcoin via OpenTimestamps**. `/verify` re-checks every signature and hash, and catches even direct database edits.

Tally works alongside INEC. It never records voter identity or ballot choices, never declares a winner, and never replaces the paper result.

## How AI is used
| Where | What AI does | What decides |
|---|---|---|
| EC8A reader (`/api/ec8a/read`) | Transcribes a handwritten result-sheet photo into structured figures and flags unclear fields | The officer confirms every figure; deterministic arithmetic checks; rival agents' signatures |
| Trust engine | — (no LLM) | Transparent, inspectable math: independent witness chains, witness kind, source reliability |

If the model is unavailable, the app falls back to manual entry and labels it. AI output is never signed without human confirmation.

## Run locally
Requires Node 22, pnpm and PostgreSQL.
```bash
pnpm install
cp .env.example .env.local      # set DATABASE_URL
pnpm build                      # migrates + seeds the FCT data + builds
pnpm dev                        # http://localhost:3000
pnpm test                       # core unit tests
pnpm check:journey              # end-to-end result journey against a running server
```
Official roles (officer, agent, observer, collation officer) sign up with an invite code issued by the deploying organisation: set `TALLY_INVITE_CODE`. Operator tools (test data, ledger reset) live at `/ops` behind `OPS_CODE`; without it they are switched off in production.

**Deploy:** link the repo to Vercel, add a Postgres database (Neon) from the Vercel Marketplace, and deploy. The build migrates and seeds automatically. AI runs through Vercel AI Gateway: the default model (`google/gemini-2.5-flash-lite`) runs on the Gateway's free tier on Vercel; set `AI_GATEWAY_API_KEY` elsewhere, and `TALLY_MODEL` to change the model. Without it the app still works: the officer enters figures by hand, and rumours are read by fixed rules, and the screens say so.

## SMS alerts
Voters can follow a polling unit by phone number and get a text when it moves, when voting starts, and when its figures are changed at collation. Texts go through Africa's Talking. Until a key is set, alerts are saved and the page says text messages are not switched on yet.

To switch them on, set `AT_USERNAME` and `AT_API_KEY` (and optionally an approved `AT_SENDER_ID`) in Vercel, then redeploy. Use the username `sandbox` for the free simulator, or your live username to text real phones (prepaid). Check the keys with `npx tsx --conditions=react-server scripts/sms-test.mts 0803xxxxxxx`.

## Credits
- **Data:** 2023 presidential polling-unit figures and coordinates for the FCT (2,822 units), from [mundus01/irev-2023-results-map](https://github.com/mundus01/irev-2023-results-map) (sums of INEC IReV polling-unit sheets). Polling-unit structure follows INEC codes.
- **Libraries:** Next.js, React, Tailwind CSS, Drizzle ORM, postgres.js, @noble/ed25519 and @noble/hashes, zod, idb, qrcode, jsQR, Vercel AI SDK, Vitest.
- **Services:** OpenTimestamps calendars (Bitcoin anchoring), Vercel AI Gateway (Google Gemini 2.5 Flash-Lite for EC8A transcription and for reading forwarded messages).
- **Approach:** the trust-engine ideas (independent evidence chains, firsthand vs. hearsay weighting, source reliability) carry over from the team's own KTech screening project and were rewritten from scratch for this challenge.
- **AI coding assistant (declared per rule 1.4):** Claude Code (Anthropic) was used throughout design and development.

## Team
TEAM-10. Docs: [`docs/hackathon/`](docs/hackathon/) (problem brief, PRD, architecture, decisions, risks).
