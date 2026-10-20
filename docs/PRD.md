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
- One page per published piece, with the receipt at the end, linkable from anywhere, and a personal page per writer at {handle}.{domain} listing their public pieces.
- References: any link in a piece is listed at the end as a small pill.

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

Core use cases for the MVP: journal privately, with nothing ever published; write a freeform piece and publish it with a receipt; write about an article with its link in the piece; share the piece's link on X, LinkedIn or a blog.

## Core concepts

Four objects carry the whole product.

- **Piece:** one document. There are no modes; links in its text become its references.
- **Session:** one continuous stretch of writing on a piece. A piece can have many sessions over days.
- **Event log:** every edit (insert, delete, paste) with a timestamp, streamed to the server in hash-chained batches while you write. It is the evidence.
- **Effort receipt:** stats computed from the event log when a piece is published, shown on a public page with an optional replay.

The rule that makes it trustworthy: the published text must be exactly what the event log rebuilds. If it isn't, the piece can't get a receipt.

## Design language

**The feeling to protect:** coffee on a rainy evening at sunset; focused flow; uncluttered; your own happy corner; the safety of a saved game you know will be waiting tomorrow.

The whole screen is paper, with a tall, narrow window along one edge showing the real time of day and weather where the writer is. The page never changes; only the view through the window does. The full spec, with every color, measurement and a reference implementation, lives in docs/DESIGN.md (v2: paper and a side window), which replaces the v1 room design.

**At a glance**

| | Spec |
| --- | --- |
| Paper | Soft pure white, like Freewrite: #FFFFFF across the whole viewport with a very faint neutral grain, never beige. |
| Writing | Literata 20 px by default (writers can pick from four fonts and sizes for their own screen), line-height 1.7, on `#1C1A16`, caret `#C9772E`; labels DM Mono 13 px `#736C61` |
| Side window | 112 px wide, inset 36 px; left by default, draggable to the right, saved per user |
| Scenes | 16 light × condition skies and elements from DESIGN.md; light boundaries unchanged (sunrise→11:00 morning, 11:00→hour before sunset afternoon, golden hour until 20 min after sunset, else night) |
| Motion | Only inside the window, and slow; still under reduced motion or "Still window"; scene changes crossfade over 3 minutes. There is only ever one sun and one moon: between scenes they move to their new place instead of fading in twice, so two suns never show at once. The sun and moon overlap only from golden hour to night, as the sun sets behind the roofs and the moon fades in. |
| Controls | Bottom bar: scene caption · date · elapsed · saved on the left; Type, Timer, No backspace, Scene, Publish on the right. The history icon sits alone at the top left, beside the window; the account icon sits at the top right. |
| Phones | Under 768 px the window is hidden; under 1024 px it shrinks to 72 px |

- Banned: gradient washes, glassy panels, emoji, sparkle icons, Inter or Roboto, default component-library styling, exclamation marks in copy.
- Copy is plain and dry: "52 minutes. 3 sessions. 94% typed."

## MVP requirements

Seven features ship in the MVP; P0 items block launch.

| # | Feature | Requirement | Priority |
| --- | --- | --- | --- |
| F1 | Accounts | Sign in with Google or an email magic link; both create the account on first use, and an email account and a Google account with the same address are the same writer. Sign-in emails are limited to 5 per address and 20 per IP address per hour. Writers choose a display name and a page address at first sign-in (the name is pre-filled from Google when they used it); public pages show only that name, never any part of the email address. The page address (handle: lowercase letters, numbers and hyphens, 3 to 30 characters, unique) gives them a personal page at {handle}.{domain}. It can be changed in Account, and old addresses redirect for 90 days. Signing in opens a fresh page (see F2), not a list. Past pieces live in the Your pieces pane. Account things live behind one icon at the top right: Your page, Settings (page address, name, city and sign-in in one dialog) and Sign out. No screen ever shows "localhost" or any development host in production. | P0 |
| F2 | Focus editor | Immersive by default, like Freewrite: the whole screen is paper, with the side window (F7) along one edge, and enters browser fullscreen on the first click or keystroke (browsers require a user gesture), with Esc to exit. One serif font, no toolbar, and any controls fade out while typing. Signing in, or opening Longhand while signed in, opens a fresh page: the newest untouched draft if there is one, otherwise a new piece, so empty drafts never pile up. A blank page greets the writer with placeholder text that disappears on the first keystroke and is never part of the writing record: "Good morning / afternoon / evening, {first name}." in the title line and "What has been on your mind?" in the text. A history icon at the top left of the paper, beside the window, opens the Your pieces pane, which slides in from the left over the window: New piece, a search box, then every piece newest first, grouped Today / This week / Earlier, with draft, public or private and a word count. A draft opens in the editor; a published piece opens its page. An account icon at the top right opens the account menu. Both icons fade with the bar while typing. An optional title line sits above the text: a new piece opens with the caret there, and Enter moves to the text. The title is saved with the piece but isn't part of the writing record. Text never runs under the bottom bar: the column scrolls on its own, fades out above the bar, and keeps the line being typed well above it. Writing is Literata 20 px by default; a Type menu lets each writer pick from four fonts (Literata, Newsreader, Instrument Sans, DM Mono) and four sizes for their own screen, saved per writer. Published pieces are always Literata 20 px. The clock in the bar shows the piece's total writing time across all sittings, counted the same way as the receipt's active time, carrying on from where the piece left off; hovering it shows this sitting and all sittings. Optional timer (10, 15, 25 min). Optional no-backspace mode, which blocks every kind of deletion, including cut and undo. Autosaves continuously. Opening a piece puts a blinking caret at the end of the text, ready to type with no click; the writing area never shows a border or focus box. | P0 |
| F3 | Live event capture | Every edit is recorded with a timestamp and streamed to the server every 5 seconds in hash-chained batches. Works offline and syncs on reconnect, flagged as delayed. Resending a batch is harmless (idempotent), and a writer can close the tab and resume exactly where they left off. If the server refuses a batch (anything other than a network failure), the bar says "not saved" instead of "saving" and the error is logged; it never sits on "saving" indefinitely. Publish first waits for every pending batch to be saved, and if one was refused it says so in plain words instead of "Try again after saving". | P0 |
| F4 | References | There is one way to start a piece: New piece in the Your pieces pane (or simply signing in, which opens a fresh page). Any http or https link in the text becomes a reference. At the end of a published piece, above the receipt, a References row lists one pill per unique address, in the order they first appear: the quote icon and the hostname without "www." (theatlantic.com). While writing, a link shortens in place as soon as the writer types a space or Enter right after it (or pastes a link that already has a space after it): the full address becomes its hostname, underlined, with the full address kept behind it. Cmd/Ctrl+Z right after restores the full address. Backspace right after a shortened link removes it whole; editing inside one turns it back into plain text. Any link still written out in full at publish is shortened then. In the published text, each link shows as its hostname, underlined, opening in a new tab. The References row appears under the text while writing as soon as a link is typed. Longhand never fetches linked pages. Link characters don't count toward the typed, brought in or quoted shares. Text pasted onto a line starting with "> " counts as quoted, and those lines publish as indented italic quotes. | P0 |
| F5 | Publish and receipt | Publishing verifies the event log rebuilds the final text, computes the receipt, and creates the piece's page (its address depends on who can read it; see below). That is the only page for a published piece, for readers and the writer alike: title, text, references, then the receipt. There is no separate receipt page. From the Your pieces pane, a published piece opens this page, and the writer sees the same history icon and account menu as in the editor. Publishing opens a centred dialog with the title and who can read it: Public (listed on the writer's page; its address is {handle}.{domain}/{slug}) or Private (only people with the link, at {domain}/p/{slug}; never listed, never indexed). After publishing, the dialog shows the link with Copy link and Open the page. The writer can switch Public and Private later from their own view of the piece. The writer's page lists their public pieces, newest first, under their name and a one-line summary (pieces, total writing time, since when); with none it shows their name and "Nothing published here yet." Every piece opened on a writer's page has the same top-left back arrow, leading back to that page, for every reader. Every page on a writer's subdomain also has a "Write on Longhand" link at the top right, back to the main site. Owner chooses whether the replay is public (off by default). Publishing freezes the piece: no editing after publish in the MVP. The receipt is a signature line at the end of the piece, with the full details behind a single "Verified · See how it was written" link (see the Effort receipt spec and docs/DESIGN.md). Times show as minutes and hours ("52 min", "1 hr 12 min"), never decimals. | P0 |
| F6 | Replay | Removed from the MVP: there is no public replay. The full event log is kept, so it can return later. | P1 |
| F7 | Ambient room | A narrow side window shows the local time of day (light) and current weather (condition), per the Design language section and docs/DESIGN.md. It sits on the left by default; writers can drag it to the right edge, and the choice is saved per user. Location is coarse and optional: the display-name screen also asks "What city are you writing from?", which writers can skip or change later. There is no IP lookup and never a browser location prompt. If skipped, light follows the device clock with typical sunrise and sunset times and the condition defaults to clear. Weather is checked about once an hour. Writers can choose Auto or pin a scene. The receipt may note conditions ("2 of 3 sessions in the rain"), never the place. | P1 |

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
| Sittings | Sessions less than 30 minutes apart count as one sitting; raw sessions stay in the log for integrity | "3 sittings" |
| Typed share | Characters in the final text that came from typed input ÷ final length | "94% typed" |
| Pasted share | Final characters from paste events, excluding quoted text and links | "4% brought in" |
| Quoted share | Final characters pasted inside a quote block (`> `) | "2% quoted" |
| Revision ratio | Total characters typed ÷ final characters | "1.6x written for every word kept" |
| Word count | Final words | "812 words" |
| Timing flags | A fast stretch is any rolling 60-second window above 150 wpm (5 characters = 1 word); uniform typing is 50+ consecutive keystrokes whose intervals vary by less than 15% (coefficient of variation) | Neutral note, e.g. "2 unusually fast stretches" |
| Delayed sync | Batches that reached the server more than 2 minutes late (offline) | "1 offline stretch" |

Character attribution works by tracking origin per character: each character in the live document is tagged typed, pasted or quoted, and deletions remove tags. The final shares come from those tags, so deleting a pasted block removes it from the pasted share. Characters that are part of a link are left out of all three shares, so pasting a long address never makes a handwritten piece look gathered.

**What the reader sees.** At the end of the piece, a signature line: one plain sentence saying who wrote it and how, then the minutes, sittings and dates ("52 min over 3 sittings · Oct 11–13"). Below it, one quiet link, "Verified · See how it was written", opens the details inline: a plain-language Verified explanation first, then sittings, what's in it (typed, brought in, quoted), revisions and any timing notes. The text and writing-log fingerprints (hashes) are stored but not shown: nobody outside Longhand can check them yet, so they'd only be decoration.

| Typed share of the final text | Signature sentence |
| --- | --- |
| 95% or more | "{name} wrote this by hand." |
| 75–95% | "{name} wrote most of this by hand." |
| 40–75% | "{name} wrote and gathered this." |
| Under 40% | "{name} gathered and shaped this." |
| Links | Never change the sentence; they're listed under References. |

**Language rules.** Facts, never verdicts: no scores, no "only", no red or warnings. Effort always leads: every piece shows its minutes and sittings, whatever the mix. Percentages appear only in the details, never in the signature. Say "brought in", not "pasted". Never say "AI": we can't know where brought-in words came from.

## Integrity and privacy

The receipt is credible because time is witnessed by the server as it passes, not claimed by the client afterward.

**Integrity**

- **Live streaming.** Batches arrive every ~5 s and the server stamps each with its own receive time. A 50-minute session can't be fabricated in 5 minutes.
- **Hash chain.** Each batch carries `hash = sha256(prevHash + seq + JSON(events))`. The server rejects gaps in `seq` or a broken chain. It also checks every event before storing a batch: positions and lengths are whole numbers inside the current text, a batch holds at most 2,000 events and 1 MB, and a link event must replace exactly its own http(s) address with exactly that address's hostname label. Anything else refuses the whole batch, so link events can't be used to slip in text that the receipt doesn't count.
- **Rebuild check.** On publish, the server replays all events and requires the result to match the submitted final text byte for byte.
- **Clock sanity.** Client timestamps within a batch must be increasing, and the batch's span must roughly match the server gap since the last batch (±20%). Suspect batches are flagged, never rejected, so no writing is lost.
- **One writer at a time.** A piece can be written from only one session at a time: opening it in a new tab or on another device takes over, and the newest session always wins. The server rejects batches from a superseded session (409, "superseded"), and the old tab becomes read-only with a note to refresh. Without this, edits made against stale text in two places would scramble the piece on replay.
- **What it doesn't stop.** Someone retyping AI text by hand, or a script that types slowly in real time. We accept this: retyping still costs the time shown, which is why we claim effort, not humanity.

**Privacy**

- Drafts and event logs are private to the owner. Nothing is public until they publish. Private pieces are reachable only by their link: never listed on the writer's page, left out of sitemaps and marked noindex. Sign-in cookies stay on the main domain and are never shared with writers' subdomains.
- There is no public replay. Public pages show the text and the receipt only; the event log is never served publicly.
- Keystroke timing is treated as sensitive. It is never sold, shared or used for training, and it's deleted with the piece.
- Longhand never fetches linked pages; a reference is only the address the writer typed. Published links open with rel="noopener nofollow ugc".
- The server makes no outbound requests for links in a piece, so there is no URL-fetching code to lock down.

## Success metrics

The one number that decides whether to keep going: the share of published pieces whose receipt link gets opened from outside Longhand.

**Validation test (first 2 weeks after launch):** recruit 20 writers on X and LinkedIn, and use it yourself for every post.

| Metric | How it's measured | Keep-going bar |
| --- | --- | --- |
| Unprompted sharing | Published pieces with ≥1 receipt view from an external referrer | ≥ 40% of pieces |
| Return writing | Writers with sessions on ≥ 3 separate days in 14 days | ≥ 30% of writers |
| Reference pull | Share of published pieces with at least one reference | Tracked; tells you which mode to lead with |
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
| users | id, email, display_name, handle (unique), city, lat, lon, window_side (left / right), font (literata / newsreader / instrument-sans / dm-mono), font_size (18 / 20 / 22 / 24), created_at |
| pieces | id, user_id, title, status (draft / published), visibility (public / private), slug, draft_text (nullable; latest accepted draft body for batch checks), final_text, final_text_hash, links (jsonb: start, end, url; computed by the server from the event log at publish), active_session_id, published_at |
| sessions | id, piece_id, started_at, ended_at |
| event_batches | id, session_id, seq, events (jsonb), prev_hash, hash, client_t_start, client_t_end, server_received_at, delayed |
| receipts | piece_id, metrics (jsonb), chain_head_hash, version, computed_at |

Old handles live in handle_redirects (old_handle, user_id, expires_at) for 90 days.

Each event in a batch is `{t, type, pos, len, text}`, where `t` is ms since session start and `type` is insert, delete, paste or link (replaces a written-out address with its hostname and carries the url). Receipts store a `version` so the metric definitions can change later without breaking old receipts.

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
- docs/DESIGN.md is the visual source of truth. Follow it exactly, including its reference implementation for the side window. Its tokens are the only colors.
- Paper #FFFFFF (soft pure white, very faint neutral grain, never beige) fills the whole screen; ink #1C1A16; caret #C9772E; labels #736C61. Fonts: Literata for writing and headings, DM Mono for labels. No other fonts.
- The page never changes with the scene. Only the side window does.
- Banned: gradient washes, glassmorphism, emoji, sparkle icons, Inter or Roboto, default shadcn styling, cards or shadows on the writing screen, toasts or modals while writing.
- Motion only inside the side window, and slow. Nothing moves under prefers-reduced-motion. Scene changes crossfade over minutes.
- Copy is plain and dry, with no exclamation marks.
- When a design choice isn't covered by DESIGN.md or the PRD, ask instead of inventing one.
```

**Phase 0: Scaffold**

```text
Scaffold the Longhand app per @docs/PRD.md: Next.js App Router, TypeScript strict, Tailwind, Drizzle + Postgres (docker-compose for local DB), Auth.js with email magic links, Vitest. Create the data model from the PRD's architecture section as a Drizzle schema with a migration. Signing in opens a fresh page; past pieces live in the Your pieces pane (empty state OK). No editor yet.
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

**Phase 5c: Paper and the side window**

```text
Build Phase 5c. Replace the v1 room design with the v2 design in DESIGN.md, in this order:
a. Paper, grain and type across the writing screen. Delete the v1 room layers, lamp glow and dark control colors.
b. The side window: port DESIGN.md's reference implementation to lib/scene/window.ts and keep its numbers. Feed it from the existing light, weather, location and pinning logic from Phase 5b. Add the slow motion and the Still window setting.
c. Drag to switch sides, with snapping and re-centering per DESIGN.md, saved in users.window_side (with a migration) and in the Scene popover as "Window: Left / Right".
d. The bottom bar and popovers.
e. Restyle the sign-in, name/city, Your pieces pane and public pages, including the receipt card on paper.
f. The small-screen rules.
g. Extend the debug scene picker to show all 16 scenes on either side.

When done, stop and go through the DESIGN.md acceptance checklist item by item, reporting pass or fail for each. Don't start Phase 6.
```

Done when: every item on the DESIGN.md acceptance checklist passes.

**Phase 6: Deploy**

```text
Production runs on one DigitalOcean droplet with Docker Compose: app, Postgres, Caddy (custom build with the caddy-dns/digitalocean plugin, serving {domain} and *.{domain} with a wildcard certificate via the DNS-01 challenge), a one-shot migrate service and a nightly backup service. Sign-in emails go through Resend's HTTP API (DigitalOcean blocks SMTP ports). Sign-in emails are rate-limited. See the deploy runbook.
```

Done when: the app runs on your domain over HTTPS and a restore from backup works.

## Open questions and later roadmap

**Open questions**

- [ ] Final name. Longhand is a placeholder; check the domain and trademark.
- [ ] Is no-backspace mode the default (pure Freewrite) or an opt-in?
- [ ] Should pasting be blocked entirely in a strict mode, or always allowed and just counted?
- [ ] Resolved: there is no public replay in the MVP. It added little for readers and exposed deleted text.
- [ ] Free forever, or charge for custom domains, embeds and verified badges later?
- [ ] Stopping-moment style: the "Your page is safe" card from Rain on the window, or the save slots from Save point? (The public receipt uses the signature line.)

**Later, if the validation test passes**

- Embeddable receipt badge for Substack, Ghost and personal sites.
- Built-in reader view for response mode, with highlights that link to your response.
- A page per source URL listing every published response to it.
- Book responses as a series of sessions over weeks.
- Signed receipts (C2PA-style) that verify without trusting Longhand's server: writers can download their own writing log for anyone to check with an open-source checker, and Longhand publishes a daily list of all fingerprints somewhere public and permanent. Only then do fingerprints return to the public page.
