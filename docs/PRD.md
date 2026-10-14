# Longhand — PRD

Oct 13, 2026 · Varun

## Summary

Longhand (working name) is a focused writing app whose byproduct is a shareable **effort receipt**: proof of how long you spent writing, across how many sessions, and how much was typed versus pasted. It is the lovechild of Freewrite (a distraction-free place you want to write) and Pangram (trust in who made the text), built as a consumer product rather than a policing tool.

**The problem.** AI made polished text free, so polish no longer signals effort. Readers can't tell a considered essay from a generated one, and writers who still do the work have no way to show it. Existing provenance tools (WritersProof, Puddin AI, Proof of Human, Grammarly Authorship) mostly serve teachers and compliance: the writer produces proof because someone demands it.

**The bet.** If the editor is good enough that people write there by choice, proof of effort comes for free. Writers will attach a receipt the way runners share a Strava trace, because it is a status signal, not an obligation. Responses to things people read ("I read this, here's what I think") are the sharpest version: they prove attention, not just authorship.

## Goals and positioning

The MVP has one job: find out whether writers attach an effort receipt when nobody asks them to.

**Goals**

- A minimal, focused web editor people choose to write in.
- A tamper-evident record of how each piece was written, captured live.
- A public receipt page with stats and a replay, linkable from anywhere.
- A response mode: paste a link, write your take, and the receipt ties to the source.

**Non-goals for the MVP**

- Detecting AI in finished text. Longhand vouches for process; it never scores someone else's text.
- Classroom or LMS features, teacher dashboards, plagiarism checks.
- Browser extensions that watch other editors.
- Native mobile apps, hardware-backed signatures, a social feed.
- Promising better attention span. Focus is the editor's design philosophy, not a claim we make.

**Positioning: Strava, not Turnitin.** The receipt describes effort in facts (minutes, sessions, % typed), never a "humanity score". Effort is the honest claim: someone can retype AI text by hand, but that still costs real time, and the receipt shows it.

## Target users

The first user is someone who already writes in public and wants credit for doing it by hand.

| User | What they write | Why they'd share a receipt |
| --- | --- | --- |
| Independent writers, newsletter and blog authors | Essays, posts | Signal that the piece is theirs, not generated |
| Readers who respond publicly | Takes on articles and books | Show they actually read it and thought it through |
| Job seekers | Cover letters, take-home writing | Stand out from generated applications |
| Students, voluntarily | Essays | Pre-empt a false AI-detector flag |
| Journalers | Private thoughts, morning pages | Mostly won't share; they come for the Freewrite-style ritual, and their private session history keeps them writing |

Core use cases for the MVP: journal privately, with nothing ever published; write a freeform piece and publish it with a receipt; respond to an article by pasting its link; share the receipt link on X, LinkedIn or a blog.

## Core concepts

Four objects carry the whole product.

- **Piece:** one document. Mode is `freewrite` or `response`. A response piece stores a source URL and its title.
- **Session:** one continuous stretch of writing on a piece. A piece can have many sessions over days.
- **Event log:** every edit (insert, delete, paste) with a timestamp, streamed to the server in hash-chained batches while you write. It is the evidence.
- **Effort receipt:** stats computed from the event log when a piece is published, shown on a public page with an optional replay.

The rule that makes it trustworthy: the published text must be exactly what the event log rebuilds. If it isn't, the piece can't get a receipt.

## Design language

The writing screen is a lamp-lit page in a room whose light follows the time of day and whose weather follows the writer's real weather. The page never changes; the room around it does. That constant page is the safe corner, and the changing world outside is what makes it feel warm.

**The feeling to protect:** coffee on a rainy evening at sunset; focused flow; uncluttered; your own happy corner; the safety of a saved game you know will be waiting tomorrow.

**The page (constant in every scene)**

| Token | Value |
| --- | --- |
| Page | #FFFBF2, about 820 × 620 px on desktop, 6 px corners, a soft shadow lifting it off the room |
| Ink | #2B2722 |
| Cursor | #C9772E |
| Writing font | Literata, 21 px, 1.75 line height, about 65 characters per line |
| Interface font | DM Mono, 12–13 px, used only for small labels |
| Lamp accent | #E2A45A, for the saved dot and buttons |

**Light (time of day) sets the room's base color**

| Light | Room base | Daytime extra |
| --- | --- | --- |
| Morning | #EEF0EC, near-white | Pale gold sun beams |
| Afternoon | #DCE5E9, airy daylight | Warm sun beams |
| Golden hour | #D4956A, amber | Deep amber beams |
| Night | #1D2430, dusk slate | None |

**Condition (weather) tints the room and adds one ambient element**

| Condition | Tint and strength | Ambient element |
| --- | --- | --- |
| Clear | None | Window beams by day, a few warm stars at night |
| Cloudy | #8C929B, 38% by day, 15% at night | Solid cloud shapes (a flat base and three puffs), lighter than the sky by day, slate at night |
| Rain | #3E4A5B, 50% | Thin slanted streaks |
| Snow | #E9EEF2, 55% by day, 22% at night | Small soft flecks |

Whenever a scene comes out dark, a warm lamp glow (#E2A45A at about 18%) sits behind the page. That glow keeps rain and night cozy rather than gloomy. Storms map to rain: no lightning, nothing harsh.

**Rules**

- Motion is almost still: slow drift only, and none when the device asks for reduced motion.
- Scenes never jump mid-session. A change in weather crossfades over a few minutes.
- Banned: gradient washes, glassy panels, emoji, sparkle icons, Inter or Roboto, default component-library styling, exclamation marks in copy.
- Copy is plain and dry: "52 minutes. 3 sessions. 94% typed."
- Reference mockups live on the Longhand design directions canvas (the Rain on the window direction and the weather room).

## MVP requirements

Seven features ship in the MVP; P0 items block launch.

| # | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| F1 | Accounts | Email magic-link sign-in. A dashboard lists your pieces with draft or published status. Writers choose a display name at first sign-in; public pages show only that name, never any part of the email address. | P0 |
| F2 | Focus editor | Immersive by default, like Freewrite: the lamp-lit page fills the view inside the ambient room (F7) and enters browser fullscreen on the first click or keystroke (browsers require a user gesture), with Esc to exit. One serif font, no toolbar, and any controls fade out while typing. Optional timer (10, 15, 25 min). Optional no-backspace mode, which blocks every kind of deletion, including cut and undo. Autosaves continuously. | P0 |
| F3 | Live event capture | Every edit is recorded with a timestamp and streamed to the server every 5 seconds in hash-chained batches. Works offline and syncs on reconnect, flagged as delayed. Resending a batch is harmless (idempotent), and a writer can close the tab and resume exactly where they left off. | P0 |
| F4 | Response mode | A new piece starts as "Blank page" or "Respond to something" (paste a URL). The server fetches only the page's title and site name, safely (see Privacy). If the fetch fails, the piece is still created with the hostname as an editable title. A line above the text reads "In response to [title] · [site]", linking to the source, and the receipt shows "Response to [title]". Text pasted onto a line starting with "> " counts as quoted, not pasted. | P0 |
| F5 | Publish and receipt | Publishing verifies the event log rebuilds the final text, computes the receipt, and creates a public page at /p/[slug]. Owner chooses whether the replay is public (off by default). Publishing freezes the piece: no editing after publish in the MVP. The receipt uses the library card design from Rain on the window, and shows times as minutes and hours ("52 min", "1 hr 12 min"), never decimals. On the public page the title sits above the text, the card is compact (about 440 px wide) with its stamp below the session table, never over it, and zero shares (0% pasted, 0% quoted) are left off the stamp | P0 |
| F6 | Replay | Plays the piece being written at 1x, 4x, 16x, with a timeline scrubber. Idle gaps over 5 seconds compress to 1 second. Events are served only when the writer made the replay public, and the replay ends with a line confirming it matches the published text. | P1 |
| F7 | Ambient room | The room around the page reflects the local time of day (light) and current weather (condition), per the Design language section. Location is coarse: a city from IP or typed once at onboarding, never a browser location prompt. Weather is checked about once an hour. Writers can choose Auto or pin a scene. The receipt may note conditions ("2 of 3 sessions in the rain"), never the place. | P1 |

**User stories**

- As a writer, I open a blank page and write for 20 minutes without any UI getting in my way.
- As a writer, I come back tomorrow, continue the same piece, and the receipt counts both sessions.
- As a reader-responder, I paste an article link, write my take, and my receipt shows the source it responds to.
- As a reader of someone's post, I click their receipt link and see active time, sessions, % typed and a replay, without signing in.
- As a writer, I paste a 200-word block from ChatGPT; the receipt honestly shows that share as pasted.

## Effort receipt spec

The receipt shows facts derived from the event log, never a verdict.

| Metric | Definition | Shown as |
| --- | --- | --- |
| Active writing time | Sum of gaps between consecutive events, counting only gaps under 60 s | "52 min active" |
| Elapsed span | First session start to the last batch's server receive time (server time, not client time) | "over 3 days" |
| Sessions | Count of sessions with at least 1 event | "3 sessions" |
| Typed share | Characters in the final text that came from typed input ÷ final length | "94% typed" |
| Pasted share | Final characters from paste events, excluding quoted source text | "4% pasted" |
| Quoted share | Final characters pasted inside a quote block (`> `) in response mode | "2% quoted from source" |
| Revision ratio | Total characters typed ÷ final characters | "1.6x written for every word kept" |
| Word count | Final words | "812 words" |
| Timing flags | A fast stretch is any rolling 60-second window above 150 wpm (5 characters = 1 word); uniform typing is 50+ consecutive keystrokes whose intervals vary by less than 15% (coefficient of variation) | Neutral note, e.g. "2 unusually fast stretches" |
| Delayed sync | Batches that reached the server more than 2 minutes late (offline) | "1 offline stretch" |

Character attribution works by tracking origin per character: each character in the live document is tagged typed, pasted or quoted, and deletions remove tags. The final shares come from those tags, so deleting a pasted block removes it from the pasted share.

The receipt page shows: title, author, publish date, the source card (response mode), the full text, the metrics row, the replay (if public), and a "verify" line with the final text hash and event-chain head hash.

## Integrity and privacy

The receipt is credible because time is witnessed by the server as it passes, not claimed by the client afterward.

**Integrity**

- **Live streaming.** Batches arrive every ~5 s and the server stamps each with its own receive time. A 50-minute session can't be fabricated in 5 minutes.
- **Hash chain.** Each batch carries `hash = sha256(prevHash + seq + JSON(events))`. The server rejects gaps in `seq` or a broken chain.
- **Rebuild check.** On publish, the server replays all events and requires the result to match the submitted final text byte for byte.
- **Clock sanity.** Client timestamps within a batch must be increasing, and the batch's span must roughly match the server gap since the last batch (±20%). Suspect batches are flagged, never rejected, so no writing is lost.
- **One writer at a time.** A piece can be written from only one session at a time: opening it in a new tab or on another device takes over, and the newest session always wins. The server rejects batches from a superseded session (409, "superseded"), and the old tab becomes read-only with a note to refresh. Without this, edits made against stale text in two places would scramble the piece on replay.
- **What it doesn't stop.** Someone retyping AI text by hand, or a script that types slowly in real time. We accept this: retyping still costs the time shown, which is why we claim effort, not humanity.

**Privacy**

- Drafts and event logs are private to the owner. Nothing is public until they publish.
- Replay is opt-in per piece and off by default. The toggle warns that replay shows everything typed, including deleted text. Without it, only the text and metrics are public.
- Keystroke timing is treated as sensitive. It is never sold, shared or used for training, and it's deleted with the piece.
- Response mode stores only the source URL, title and site name, never the article's text.
- Fetching a pasted URL is locked down: http and https only, no localhost, private or internal addresses (including after redirects), at most 3 redirects, a 5-second timeout and 1 MB read limit.

## Success metrics

The one number that decides whether to keep going: the share of published pieces whose receipt link gets opened from outside Longhand.

**Validation test (first 2 weeks after launch):** recruit 20 writers on X and LinkedIn, and use it yourself for every post.

| Metric | How it's measured | Keep-going bar |
| --- | --- | --- |
| Unprompted sharing | Published pieces with ≥1 receipt view from an external referrer | ≥ 40% of pieces |
| Return writing | Writers with sessions on ≥ 3 separate days in 14 days | ≥ 30% of writers |
| Response pull | Share of published pieces in response mode | Tracked; tells you which mode to lead with |
| Receipt engagement | External viewers who open the replay | Tracked; tells you if replay is worth investing in |

The bars are starting guesses to revise after the first cohort. If writers only share receipts when someone requires it, the product has drifted into the crowded compliance market.

## Technical architecture

A single Next.js app on a DigitalOcean droplet, backed by Postgres, handles everything in the MVP.

Six parts:

- **Focus editor (browser):** captures every edit and tags typed vs pasted text.
- **Batch API:** receives batches every 5 s, checks seq and the hash chain, stamps server receive time.
- **Postgres:** stores pieces, sessions, batches and receipts.
- **Publish service:** on publish, rebuilds the text from events and computes the receipt only on a byte-exact match.
- **Public receipt page:** text, metrics and replay; anyone can open it without signing in.
- **Source fetcher:** fetches a response source's title and site only; no article text stored.

Edits stream from the browser every 5 seconds; the server checks the chain and timestamps each batch. Publishing replays the stored events, and only a byte-exact match produces a public receipt.

**Data model**

| Table | Key fields |
| --- | --- |
| users | id, email, display_name, created_at |
| pieces | id, user_id, title, mode (freewrite / response), source_url, source_title, source_site, status (draft / published), slug, final_text, final_text_hash, replay_public, active_session_id, published_at |
| sessions | id, piece_id, started_at, ended_at |
| event_batches | id, session_id, seq, events (jsonb), prev_hash, hash, client_t_start, client_t_end, server_received_at, delayed |
| receipts | piece_id, metrics (jsonb), chain_head_hash, version, computed_at |

Each event in a batch is `{t, type, pos, len, text}`, where `t` is ms since session start and `type` is insert, delete or paste. Receipts store a `version` so the metric definitions can change later without breaking old receipts.

## Cursor build instructions

Build in phases, one Cursor Agent conversation per phase, and don't start a phase until the previous one passes its checks.

**Setup**

1. Save this file in the repo as `docs/PRD.md`.
2. Have Cursor create `.cursor/rules/longhand.mdc` and `.cursor/rules/design.mdc` from the two blocks below.
3. Start each phase in a new Agent chat with `@docs/PRD.md` attached, then paste the phase prompt.
4. Commit after every phase that passes. If a phase goes sideways, revert and re-prompt rather than patching on top.

**Rules file** (`.cursor/rules/longhand.mdc`)

```markdown
---
description: Longhand project rules
alwaysApply: true
---
- Product spec lives in docs/PRD.md. Read it before changing behavior.
- Stack: Next.js (App Router) + TypeScript strict, Tailwind, Postgres with Drizzle ORM, Auth.js email magic links, Vitest for tests.
- The event log is the source of truth. Never add a code path that changes a piece's text without recording an event.
- All receipt math lives in lib/receipt/ as pure functions with unit tests. No receipt logic in components or route handlers.
- Hashing uses SHA-256 via Web Crypto on the client and node:crypto on the server; both must produce identical output (shared test vectors).
- The editor UI stays minimal: no toolbars, no formatting, no AI features.
- Never log or send event text to third-party services (analytics, error tracking).
- Prefer small files and server components; client components only where input is handled.
- When unsure about product behavior, stop and ask instead of guessing.
```

**Design rules file** (`.cursor/rules/design.mdc`)

```markdown
---
description: Longhand design rules
alwaysApply: true
---
- Follow the Design language section of docs/PRD.md exactly. Its tokens are the only colors.
- Page #FFFBF2, ink #2B2722, cursor #C9772E, lamp #E2A45A. Fonts: Literata for writing, DM Mono for small labels. No other fonts.
- The page never changes with the scene. Only the room behind it does.
- Banned: gradient washes, glassmorphism, emoji, sparkle icons, Inter or Roboto, default shadcn styling, toasts or modals while writing.
- Motion: slow drift only. Nothing moves under prefers-reduced-motion. Scene changes crossfade over minutes.
- Copy is plain and dry, with no exclamation marks.
- When a design choice isn't covered here or in the PRD, ask instead of inventing one.
```

**Phase 0: Scaffold**

```text
Scaffold the Longhand app per @docs/PRD.md: Next.js App Router, TypeScript strict, Tailwind, Drizzle + Postgres (docker-compose for local DB), Auth.js with email magic links, Vitest. Create the data model from the PRD's architecture section as a Drizzle schema with a migration. Add a signed-in dashboard page listing the user's pieces (empty state OK). No editor yet.
```

Done when: `docker compose up` + `npm run dev` works, sign-in by email works, migration runs clean, `npm test` passes.

**Phase 1: Editor and event capture**

```text
Build the focus editor at /write/[pieceId] per the Design language section of @docs/PRD.md: the lamp-lit page on a plain room background for now (the weather room comes in Phase 5b). It enters browser fullscreen (Fullscreen API) by default on the first click or keystroke, Esc exits; Literata, no toolbar, controls fade out while typing; optional timer (10/15/25 min) and optional no-backspace mode. Capture every edit with the textarea's beforeinput/input events as events {t, type: insert|delete|paste, pos, len, text}. t is ms since session start. Keep a per-character origin array (typed|pasted|quoted) in sync with the text. Write a pure applyEvents(events) function in lib/receipt/ that rebuilds text, with unit tests covering typing, deleting, selection-replace, paste, and undo.
```

Done when: applyEvents rebuilds the exact textarea contents after a scripted 2-minute editing session, including paste and undo.

**Phase 2: Sessions and live streaming**

```text
Stream events to POST /api/pieces/[id]/batches every 5 seconds. Each batch has sessionId, seq, events, prevHash, hash = sha256(prevHash + seq + JSON(events)). Server rejects seq gaps and broken chains, stamps serverReceivedAt, and stores the batch. Start a new session after 30 min idle or on page load. Queue batches in IndexedDB when offline and flush on reconnect; mark late batches. Add shared hash test vectors for client and server.
```

Done when: killing the network for 1 minute and restoring it loses no events, and a tampered batch is rejected with a 409.

**Phase 3: Receipt computation**

```text
Implement computeReceipt(batches, finalText) in lib/receipt/ per the PRD's receipt spec table: active time (gaps under 60s), elapsed span, sessions, typed/pasted/quoted shares from character origins, revision ratio, word count, timing flags (over 150 wpm for 60s+, near-uniform keystroke intervals), delayed-sync count. Pure functions only, with tests for each metric using fixture logs.
```

Done when: every metric has a passing test, including a fixture where pasted text is later deleted.

**Phase 4: Publish and public receipt page**

```text
Add Publish. The server rebuilds the text from all batches and rejects publishing if it doesn't match the final text. On success, compute and store the receipt, create a slug, and render a public page at /p/[slug] (no sign-in) with title, author, date, text, the metrics row, and a verify line showing the final text hash and chain head hash. Add an Open Graph image showing the key metrics so links unfurl well on X and LinkedIn.
```

Done when: a published piece's link unfurls with its metrics, and publishing a piece with a tampered stored text fails.

**Phase 5: Response mode and replay**

```text
Response mode: on new piece, allow pasting a URL. Server fetches the page and extracts only og:title / <title> and site name (store no article text). Show a source card above the editor. Text pasted inside a '> ' quote line counts as quoted. Replay: on the public page, if the owner enabled it, play events at 1x/4x/16x with a scrubber, compressing idle gaps over 5s to 1s.
```

Done when: a response piece shows its source on the receipt, quoted text is counted separately, and replay matches the final text at the end.

**Phase 5b: Ambient room**

```text
Build the ambient room (F7) per the Design language section of @docs/PRD.md. Add lib/scene/ with a pure sceneFor(light, condition) that returns the room color (the light's base mixed with the condition's tint at the listed strength), whether the scene is dark, and the ambient elements to draw (beams, stars, cloud shapes, rain streaks, snow flecks, lamp glow when dark). Map local time to light using sunrise and sunset; map weather codes to clear, cloudy, rain or snow (storms become rain, fog becomes cloudy). Add /api/weather: it takes a coarse location (city from IP via request headers, or the city typed at onboarding), calls Open-Meteo for current weather plus sunrise and sunset, and caches per city for 60 minutes. Render the room as CSS layers behind the unchanged page. Elements drift very slowly and stay still under prefers-reduced-motion. Crossfade scene changes over 3 minutes; never switch abruptly mid-session. Add a setting: Auto, or pin any light and condition. Store only the condition per session for the receipt; never store or show the city on public pages. Unit-test sceneFor for all 16 combinations.
```

Done when: a dev toggle shows all 16 scenes matching the design canvas, reduced motion stops all movement, and no public page contains location data. Open-Meteo's free tier is for non-commercial use, so check its terms before you charge.

**Phase 6: Deploy**

```text
Containerize the app with a production Dockerfile and docker-compose (app + Postgres + Caddy for HTTPS) for a DigitalOcean droplet. Add nightly pg_dump backups, environment variable docs, and a privacy page describing what is stored, per the PRD.
```

Done when: the app runs on your domain over HTTPS and a restore from backup works.

## Open questions and later roadmap

**Open questions**

- [ ] Final name. Longhand is a placeholder; check the domain and trademark.
- [ ] Is no-backspace mode the default (pure Freewrite) or an opt-in?
- [ ] Should pasting be blocked entirely in a strict mode, or always allowed and just counted?
- [ ] Is replay public by default? It's the most persuasive proof, and also the most exposing.
- [ ] Free forever, or charge for custom domains, embeds and verified badges later?
- [ ] Stopping-moment style: the "Your page is safe" card from Rain on the window, or the save slots from Save point? (The public receipt uses the library card.)

**Later, if the validation test passes**

- Embeddable receipt badge for Substack, Ghost and personal sites.
- Built-in reader view for response mode, with highlights that link to your response.
- A page per source URL listing every published response to it.
- Book responses as a series of sessions over weeks.
- Signed receipts (C2PA-style) that verify without trusting Longhand's server.
