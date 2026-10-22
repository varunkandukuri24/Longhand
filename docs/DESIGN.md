# Longhand design spec · v2: paper and a side window

Oct 14, 2026. This replaces the v1 "room" design (full-bleed scene, room colors, lamp glow). Reference mockups: the "E · The side window" row of the Longhand design directions canvas.

## The idea

The whole screen is paper. It's just you and your thoughts, with a few quiet options at the bottom, the way Freewrite feels. The world outside shows up in one place only: a tall, narrow window along the left edge, showing the real time of day and weather where you are. The page never changes. Only the view through the window does.

## Layout (desktop, 1440 × 900 reference)

| Element | Spec |
| --- | --- |
| Background | The whole viewport is paper (see Paper). No other surface behind it. |
| Side window | 112 px wide, inset 36 px from the top, bottom and right edge. Always on the right; it can't be moved. |
| Writing column | Up to 680 px wide, centred in the space left of the window, `left: calc(50% - 74px); transform: translateX(-50%)`. The text's top sits 120 px from the top. The column is its own scroll area ending 88 px above the viewport bottom, so text never runs under the bar; the window, back arrow and bar stay fixed. |
| History icon | Top left of the paper, 28 px from the top and 40 px from the left edge, aligned with the bar's start. It opens the Your pieces pane. |
| Account icon | Top right of the paper, 28 px from the top and 184 px from the right edge, beside the window. The window is always full height and no icon ever sits above it. |
| Bottom bar | 20 px from the bottom. Starts 40 px from the left edge and ends 184 px from the right edge (36 + 112 + 36). |

## Paper

- Color: `#FFFFFF`, a soft pure white like Freewrite. Neutral, never warm, beige or cream.
- Grain: a full-viewport SVG noise layer, `feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"` desaturated with `feColorMatrix type="saturate" values="0"`, at `opacity: 0.03` and `mix-blend-mode: multiply`, `pointer-events: none`. It only softens the white so it reads like real paper; it must never look gray or textured.
- No shadows, cards, gradients or borders on the writing screen.

## Type

| Use | Spec |
| --- | --- |
| Writing | Literata 400, 20 px by default, line-height 1.7, color `#1C1A16` (about 16:1 on paper). Paragraph spacing 22 px. The writer can change the font and size for their own writing screen (see "Type menu"). |
| Published text | Always Literata 400, 20 px, line-height 1.7, 22 px between paragraphs, whatever the writer picked for their screen. |
| Cursor (caret) | `#C9772E`, 2 px wide (`caret-color`). |
| Labels, bar, popovers | DM Mono 400, 13 px (11.5–12 px for small captions), color `#736C61` (meets 4.5:1 on paper). |
| Headings (public page title, sign-in) | Literata 400, 28–32 px, `#1C1A16`. |

No other fonts, except the three extra writing fonts in the Type menu (Newsreader, Instrument Sans, DM Mono), which only ever apply to the writer's own editor. No bold in the writing column.

### Type menu

- A "Type" text button, first in the bar's right group, opens a popover (the standard popover card), 280 px wide.
- FONT: four rows, each name set in its own font at 17 px, a check mark on the current one: Literata (default), Newsreader, Instrument Sans, DM Mono.
- SIZE: four "A" buttons in Literata at increasing sizes, the current one underlined: Small 18 px, Medium 20 px (default), Large 22 px, Extra large 24 px writing size. Each has an `aria-label` and `aria-pressed`.
- A footnote: "Only changes your writing screen. Published pieces are always set in Literata."
- The choice applies instantly, is saved per writer (`users.font`, `users.font_size`) and follows them to every piece and device.
- Self-host all four fonts as local woff2 (`next/font/local`, `display=swap`); only Literata and DM Mono load on public pages. OG images use local TTF files, not a network fetch.

## The writing area

- The text area is invisible: no border, no outline (focused or not), no resize handle, transparent background, `appearance: none`. Only the words and the caret show.
- It grows with the text. The whole column (text, References row) scrolls together inside the column's scroll area.
- **Never under the bar.** The scroll area stops 88 px above the viewport bottom. Its last 64 px fade the text to paper (`mask-image: linear-gradient(to bottom, #000 calc(100% - 64px), transparent)`), and once the column has scrolled, its first 96 px fade in the same way at the top. This is a mask on the text, not a colored overlay.
- **Typewriter scrolling.** While typing, the caret's line is always kept at least 160 px above the bottom of the scroll area: when it would go lower, the column scrolls smoothly (instantly under reduced motion) so the line sits there. Measure the caret position with the mirror layer.
- Opening any editable piece focuses it automatically, with the caret blinking at the end of the existing text and that spot scrolled into view, so you can start typing with no click. This happens after the piece's text has loaded, not before. A brand-new, empty piece opens with the caret at the start of the text.

### No title while writing

The page is one text area. There is no title input anywhere in the editor. A piece's title is set in the publish dialog. It is pre-filled from `pieces.title` if the piece has one, otherwise left empty with the placeholder "Title". The Your pieces pane shows the title if set, otherwise the first 60 characters of the text in `#736C61`. Clicking anywhere on the paper outside the controls and the window focuses the text. Read-only (published) pieces never show a caret.

## The side window

- Frame: 1.5 px solid `#1C1A16` border, 3 px corner radius, `overflow: hidden`.
- Glazing bars: three horizontal 1 px `#1C1A16` bars at 25%, 50% and 75% of the window's height.
- The window is a CSS size container (`container-type: size`). Every element inside is positioned in % and sized in `cqmin`, so nothing is ever cropped or mis-scaled at any window size.
- Rooftops: a fixed SVG skyline (path below) along the bottom, 9% of the window's height, `preserveAspectRatio="none"`.

### Window position

The window is fixed on the right on every page (editor, piece pages, writer pages, sign-in and first run). It can't be dragged, has no Left/Right option, and doesn't respond to arrow keys. It keeps `aria-label="Window: {caption}"` but is no longer focusable. `users.window_side` stays in the database but is ignored. Moving the window is parked for later.

- **Stacking:** the Your pieces pane, dialogs and their scrims sit above the window, always.
- **Coming back to the tab:** scene changes that happen while the tab is hidden apply instantly, with no crossfade. When the tab becomes visible again, the window jumps straight to the current scene, finishing any crossfade that was in progress. The 3-minute crossfade only plays while the writer is actually looking. The window never shows a half-blended sky after returning to a tab.

## Scenes: light × condition

Light (time of day) picks the sky family; the condition (weather) picks the exact sky and what's in it.

Every writer starts on **Auto**: light from the device clock and the city's sunrise and sunset, condition from the live weather. A scene is pinned only when the writer picks one in the Scene popover. The debug scene picker previews a scene for the current tab only and never saves anything. Light boundaries are unchanged: morning runs from sunrise to 11:00, afternoon from 11:00 until an hour before sunset, golden hour from an hour before sunset until 20 minutes after it, and night the rest of the time.

### Sky colors (one hand-picked color per scene, no formulas)

| | Clear | Cloudy | Rain | Snow |
| --- | --- | --- | --- | --- |
| Morning | `#A7CBE6` | `#BCC6CE` | `#8C99A6` | `#B2C0CD` |
| Afternoon | `#6FA7D8` | `#9DA9B4` | `#75838F` | `#9AABBB` |
| Golden hour | `#E09862` | `#B98F78` | `#8D6F62` | `#C09A90` |
| Night | `#172031` | `#1E2634` | `#141B25` | `#1F2838` |

### What's in each scene

- **Rooftops:** at night `rgb(12,18,27)`; at golden hour the sky mixed 60% toward `rgb(74,44,34)`; otherwise the sky mixed 55% toward `rgb(52,60,72)`. In snow, a white cap (`#F3F5F8`) sits on every roof (the same path drawn 1.4 units higher, underneath).
- **Lit windows:** at night and golden hour, six small warm windows (`#F3B866`, 90% opacity, 1.3 × 1.8 cqmin) glow in the buildings.
- **Clear:** morning has a pale sun (`#FFE9AE`) high on the left plus one small cloud; afternoon has a white sun (`#FFF3D2`) high on the right plus one small cloud; golden hour has a low sun (`#FFD27F`) touching the rooftops with a warm band (`#EDB077`, 55%) behind it; night has a crescent moon (`#F2E8CC`) and about 40 small warm stars.
- **Cloudy:** three solid clouds (a flat base plus three round puffs), lighter than the sky by day and slate at night. No blur, no cropping at the window's edges.
- **Rain:** two darker clouds plus thin slanted streaks (rotated 14°): white at 70% by day, warm white at golden hour, cool blue at night.
- **Snow:** two soft clouds plus round white flakes. By day each flake gets a 0.5 px outline (`rgba(70,85,105,0.3)`) so it shows on pale skies.
- **Storms** use the rain scene; **fog** uses cloudy. Nothing harsh: no lightning.

The reference implementation below draws exactly these. Port it; don't redesign it.

### Motion (inside the window only)

- Rain streaks fall slowly: each loops top to bottom over 1.6–2.4 s, with staggered delays.
- Snow drifts down over 10–16 s with a slight sideways sway.
- Clouds drift sideways by about 4 cqmin over 40 s, back and forth.
- The sun, moon, stars and rooftops are still.
- Scene changes (light or weather) crossfade over 3 minutes and never jump mid-session.
- **One sun, one moon.** Never show two suns (or two moons) at once. The sun and the moon are not part of the crossfading layers: each is one persistent element that stays mounted across scene changes and CSS-transitions its `left`, `top`, `width`, `background` and `box-shadow` over the same 3 minutes (ease-in-out). The sky color, clouds, band, stars, lit windows, rain and snow keep the normal crossfade.
  - Both scenes have a sun (morning → afternoon, afternoon → golden): the sun slides to its new position, size and color. Morning to afternoon it drifts right and up; afternoon to golden hour it sinks to the rooftops and turns `#FFD27F`.
  - Only the old scene has a sun: at golden hour → night it sets, moving straight down behind the rooftops (`top: 100%`, under the front layer) while the moon fades in. This is the only time a sun and moon show together. When the weather turns cloudy, rainy or snowy, the sun fades out where it is.
  - Only the new scene has a sun: at night → morning it rises from behind the rooftops at its morning `left`, while the moon fades out. When the weather clears, it fades in at its spot.
  - The moon only ever fades in or out at its night position; it never moves.
  - Under reduced motion or "Still window", the sun and moon jump to their new state with no transition.
- With `prefers-reduced-motion`, or the "Still window" setting, nothing moves; the window shows the static frame from the mockups.

## Bottom bar and popovers

- The history and account icons are not in the bar (see Layout). They fade out and back in together with the bar.
- Left: `{caption} · {weekday, Mon D} · {time} · {status}`, where time is the piece's total writing time (see "Writing time"), status is `saved`, `saving` (only while a batch is in flight) or `not saved` (the server refused a batch; same color, no red), and caption is the scene in words: Clear morning, Sunny, Sunset, Clear night, Overcast, Raining, Snowing.
- **Writing time.** The clock counts writing time for the whole piece, across every sitting, exactly the way the receipt counts active time (gaps under 60 s count; longer pauses don't). It carries on from where the piece left off instead of restarting at 0:00, and stops ticking while you pause. Format `m:ss` under an hour, `h:mm:ss` from an hour. It's a button: hover or keyboard focus shows a small popover with two rows, "This sitting {m:ss}" and "All sittings {h:mm:ss}", and the note "Writing time only. It pauses when you stop for a minute." While a countdown from Timer runs, the clock shows `{m:ss} left` instead and goes back to the total when it ends. Reference mockup: "Time: this sitting and the whole piece", option A.
- Right: Type, Timer, No backspace, Scene, Publish. These are plain DM Mono 13 px text buttons in `#736C61`, 44 px tall hit areas, 20 px apart, with a 1 px underline on hover and a visible focus ring. No boxes, checkboxes or native dropdowns. (The one filled button in the app is the main action inside a dialog; see "Publishing and your page".)
- The bar fades out after 2 s of typing and fades back in over 300 ms when the mouse moves.
- Popovers open above their button: a `#FFFFFF` card, 1 px `#E6E0D4` border, 6 px radius, shadow `0 8px 24px rgba(28,26,22,0.10)`, DM Mono 12–13 px options as text.
  - Timer: 10, 15 or 25 min, or off.
  - No backspace: on or off.
  - Scene: Auto, or pin a light and a condition; Still window: on or off.
  - Publish: not a popover. It opens the centred publish dialog (see "Publishing and your page").
- `.editor-popover` is only for popovers that open upward from the bottom bar. Anything that opens downward (account menu, Public/Private) uses `.popover-surface`: white background, 1 px `#E6E0D4` border, 6 px radius, the popover shadow, and no positioning of its own. Every popover and dialog has an opaque `#FFFFFF` background; nothing behind it ever shows through.

## Other screens

- **Sign-in, name and city screens:** the same paper and grain, with the side window on the writer's chosen side. Content top-aligned, never vertically centered.
- **Home is a fresh page.** `/` for a signed-in writer opens the editor on the newest draft with no title and no text, or creates one. `/dashboard` redirects to `/`. There is no list page.
- **Writing as a guest**
  - **Home for a visitor** (`/`, not signed in) is the editor in guest mode, with the window on the right as everywhere.
    - Top left, where the history icon would be: "Longhand" in Literata 18 px, `#1C1A16`, not a link.
    - Top right, beside the window (184 px from the right edge): "See an example · Sign in" in DM Mono 13 px. "See an example" is `#736C61` and opens `EXAMPLE_PIECE_URL` in the same tab; it's hidden when that's unset. "Sign in" is an ink link with a 1 px underline at a 4 px offset.
    - The bottom bar is the normal bar. Publish is greyed out until there's text; then it opens the sign-in dialog (G4).
    - No history icon, no account icon. Reference: G1.
  - **The nudge card** (G2):
    - Placement: once the guest piece reaches 50 words, a small card appears at the bottom left, 40 px from the left edge and 64 px from the bottom (just above the bar).
    - Size and surface: 264 px wide, the dialog card style (white, 1 px `#E6E0D4` border, 8 px radius, soft shadow), 16 px padding.
    - Contents: "Not saved to an account" in Literata 17 px; "It lives in this browser for 7 days. Sign in to keep it." in DM Mono 11.5 px `#736C61`; a full-width dark button, "Sign in to keep this" (40 px tall, DM Mono 13 px); and a × button at the top right.
    - Behaviour: it never takes focus or blocks typing (`role="status"`). × hides it for that piece (remembered in `localStorage`, wrapped in try/catch). It fades with the bar while typing, like every other control.
  - **The sign-in dialog**: the publish dialog's card, 460 px wide, centred over the writing column, with the scrim. It has a title and a subline in Literata 17 px `#5C564C`, then **Continue with Google**, an "or" divider, EMAIL, **Email me a link**, and a footnote in DM Mono 11.5 px `#9A9387`. Variants:
    - From "Sign in" with no text yet: "Sign in" / "Write, publish and keep everything in one place."
    - From "Sign in" or the nudge with text (G3): "Keep this page" / "Sign in and it’s yours, with every minute counted from your first word." Footnote: "Your page stays right here while you sign in. Every minute so far counts toward its receipt."
    - From Publish (G4): "Sign in to publish" / "Your receipt needs a name to sign it with, and your piece needs a page to live on."
    - At the word limit (G6): "Keep going?" / "You’ve written 500 words as a guest. That’s as far as a page goes without an account." Footnote: "Nothing is lost. Sign in and keep going from this exact word."
    - "Too many new pages": shown when creating a guest piece is refused by the IP limit. Title "Sign in to keep writing", subline "Too many new pages have been started from this network today. Sign in and you can write as much as you like." Then the same Google / email buttons. The footnote is dropped. While it's open, the text area is read-only. Closing it leaves the page read-only and shows the dialog again on the next keystroke. No message about this ever appears in the bottom bar.
  - **Email sent** (G5): the same card, "Check your email" / "We sent a sign-in link to", the address in a 1 px bordered box, "Open the link in this browser and you’ll land back here, on this page, signed in. Keep writing while you wait.", then "Use a different email" (text button) and **Keep writing** (closes the dialog).
  - **The word limit** (G6): at 500 words the text area stops accepting new text (deleting still works) and the G6 dialog opens. Closing it leaves the page readable and editable down, but not up, until sign-in.
  - **After signing in**, the writer lands back on the same text with the caret where it was. The guest top bar becomes the history and account icons. A brand-new account goes through first run, then straight back to the piece. Signing in from Publish opens the publish dialog right away.
- **The blank page.** A blank piece shows one blinking caret at the start of the text, with placeholder text in `#B5AEA2` (the writer's own font and size) right after it: "Write something" for a guest; "Good morning, {first name}. What has been on your mind?" for a signed-in writer (Good morning 5:00 to 11:59, Good afternoon 12:00 to 16:59, Good evening otherwise, local time; {first name} is the first word of the display name). It vanishes on the first keystroke, never enters the event log, and comes back if the text is emptied. Reference mockups: G1 and G1b.
- **Your pieces pane.** The history icon (three lines of 12, 12 and 8 px, 1.5 px stroke, 20 px inside a 44 × 44 px button, `aria-label="Your pieces"`) opens a pane:
  - Size and motion: 320 px wide, full height, from the left edge, over the window. It slides in over 200 ms ease-out (instant with reduced motion). The rest of the screen gets a `rgba(255,255,255,0.6)` scrim.
  - Surface: `#FFFFFF`, a 1 px `#E6E0D4` right border, `0 0 48px rgba(28,26,22,0.10)` shadow, 28 px top and 24 px side padding.
  - Contents, top to bottom:
    1. "Your pieces" in Literata 22 px, with a close button (×) on the right.
    2. A New piece button: full width, 44 px tall, 1 px `#E6E0D4` border, 6 px radius, plus icon and "New piece" in DM Mono 13 px.
    3. A search field: DM Mono 13 px, placeholder "Search your pieces", 1 px `#E6E0D4` bottom rule. It filters by title and first line as you type.
    4. The pieces, grouped under TODAY, THIS WEEK and EARLIER (DM Mono 11 px, 0.14em letter-spacing, `#9A9387`), by last edit in local time. Each row is the title in Literata 17 px (an untitled piece shows its first 60 characters in `#736C61`) over a DM Mono 11.5 px `#736C61` meta line, `draft · 159 words`, `public · 812 words` or `private · 640 words`. The piece on screen has a `#F4F1EB` background with a 6 px radius. Untouched empty drafts are hidden, except the one on screen.
    5. Pinned to the bottom: `{n} pieces · {handle}.{domain}`, with the address as an ink link to the writer's page in a new tab.
  - Behaviour: Esc, the close button or a click on the scrim closes it. Focus moves into the pane on open, is trapped while it's open, and returns to the icon on close.
  - Reference mockups: "A · Your pieces in a left pane" and "P1 · Pane slides over the window".
- **Account menu.** The account icon is a line icon in the same family as the history icon: a 7 px circle for the head (centre 10,7) and a shoulder arc (`M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5`). It uses a 1.5 px stroke, round caps, `currentColor` (`#736C61`, `#1C1A16` on hover or while the menu is open), and is 20 px inside a 44 × 44 px button with `aria-label="Account"`. It sits at exactly the same top (28 px) as the history icon, so the two centres share one horizontal line. There is no circle, fill or initial.
  - The menu opens 8 px below the icon, right-aligned to it: 260 px wide, the standard popover style (`.popover-surface`).
  - Header: display name (Literata 18 px) over the email (DM Mono 12 px `#736C61`), then a 1 px `#EEEAE3` rule.
  - Items: **Your page** (with `{handle}.{domain}` as a second line, opens the writer's page in a new tab), **Settings** (no second line), then a rule, then **Sign out**.
  - Keyboard: `role="menu"`, arrow keys move between items, Esc closes.
  - The email appears only here and in Settings, never on a page.
  - Reference mockup: "One icon, top right: page, settings, sign out".
- **Settings dialog.** A centred 560 px dialog with the same scrim, card and keyboard behaviour as the publish dialog. Title "Settings" in Literata 22 px, with a close button. No tabs. Changes apply on **Save**; Cancel or Esc discards them.
  - Fields, top to bottom:
    1. YOUR PAGE: the handle field reading `[handle].{domain}`, with the same availability check and help line as before.
    2. NAME, with the help line "Signs your receipts: “{name} wrote this by hand.”"
    3. CITY, with the help line "Sets the weather in your window. City-level only, never shown on your pages."
    4. SIGN-IN: "Google — connected" (or a "Connect Google" text button that links Google to this account), and "Email link · {email} — on".
  - Save and Cancel. Window side and Still window stay in the Scene menu, and font and size stay in the Type menu. They are not repeated here.
  - Reference mockup: "Settings, centred".
- **Sign in.**
  - Content: "Longhand" (Literata 36 px), the line "A quiet place to write, and a record of how you wrote it." (Literata 18 px `#5C564C`), then **Continue with Google** (full width, 48 px, 1 px `#CFC9BE` border, 6 px radius, the Google "G" mark, DM Mono 14 px). Under that, an "or" divider, the EMAIL field, **Email me a sign-in link** as the primary button, and "No password. New here? Either way makes your account." in DM Mono 11.5 px `#9A9387`.
  - The Google button only shows when Google sign-in is configured.
  - Reference mockup: "Sign in: Google, or an email link".
- **First run** asks "What should we call you?" with NAME (pre-filled from Google when available) and YOUR PAGE `[handle].{domain}`, then **Start writing**, which opens a fresh page. Reference mockup: "First run: name and address, on the real domain".
- **Icons:** inline SVG, 1.5 px stroke, round caps and joins, `currentColor` (`#736C61`, `#1C1A16` on hover), 18 px inside a 44 × 44 px button. Only six exist: plus, quote (a pair of curly quotation marks, used only in reference pills, 12 px), back (a left arrow, only for readers on writer pages), check (used only in the receipt's Verified button, 12 px), history (three lines, used for Your pieces) and account (head and shoulders, used for the account menu). No icon library.
- **Focus:** keyboard focus only (`:focus-visible`): a 1.5 px `#1C1A16` outline, offset 3 px, 3 px radius. A mouse click never leaves a box around a button.
- **One shared layout:** the editor, public piece page, sign-in and name/city screens all use a single paper-page layout component that owns the paper, grain, side window, column position and top offset. Pages pass content in; they never add their own top padding, margin or vertical centering. Top offsets: the editor's text starts 120 px from the viewport top; on every other page, the first heading's top edge sits 56 px from the viewport top.
- **Piece page (`/p/[slug]`):** the only page for a published piece, the same for readers and the writer. There is no separate receipt page, and no link anywhere says "receipt". Paper and grain, with the side window on the right showing the reader's own time of day and a clear sky (never the writer's location or weather). The title in Literata 32 px (top edge 56 px from the viewport top), then the text 24 px below it (Literata 20 px, line-height 1.7, 22 px between paragraphs), then References (if any), then the receipt (see "References" and "The receipt"). When the signed-in writer views their own piece, the history icon and account menu sit where they do in the editor; readers never see them. Reference mockup: "A published piece · read it, the receipt is at the end".

## Publishing and your page

Reference mockups: "Publish · centred, with who can read it", "Published · the link, ready to share", "anon24.longhand.com · your public page" and "Pages · your address, and public or private on each piece". The domain in mockups is a placeholder; use `ROOT_DOMAIN` everywhere.

### The publish dialog

- Publish opens a modal dialog centred in the viewport (not anchored to the bar): `role="dialog"`, `aria-modal="true"`, focus moves to the title field, Tab stays inside, Esc or Cancel closes it and returns focus to the Publish button.
- Behind it, a scrim over the whole screen (window included): `rgba(255,255,255,0.74)`. No blur.
- The card: 520 px wide (`min(520px, 100vw - 32px)`), padding 32 px 32 px 24 px, `#FFFFFF`, 1 px `#E6E0D4` border, 8 px radius, shadow `0 16px 48px rgba(28,26,22,0.12)`.
- Contents, top to bottom: "Publish" (Literata 26 px); TITLE label (DM Mono 11 px, letter-spacing 0.14em, `#9A9387`) and the title input (Literata 20 px, 1 px `#CFC9BE` bottom rule, placeholder "Title", pre-filled from `pieces.title` if the piece has one); WHO CAN READ IT, two radio rows 10 px apart, each a 1 px bordered box (`#1C1A16` when selected, `#E6E0D4` otherwise, 6 px radius, padding 14px 16px) with a custom 16 px radio, the option in Literata 18 px and a DM Mono 12 px line under it:
  - **Public** (default): "On your page, {handle}.{domain}, and for anyone with the link."
  - **Private**: "Only people you send the link to. Not on your page, not in search."
- Then the note (DM Mono 12 px `#736C61`): "Publishing freezes the text and adds its receipt. You can change who can read it later."
- Buttons, right-aligned, 12 px apart: "Cancel" (text button) and "Publish". Publish is the app's one filled button style, used only for the main action in a dialog: 44 px tall, padding 0 22 px, `#1C1A16` fill, white DM Mono 13 px text, 4 px radius.
- Errors (title missing, writing not saved) appear as one DM Mono 12 px line above the buttons, in `#736C61`, never red.
- **After publishing**, the same card becomes: the 44 px seal beside "Published." (Literata 26 px) and the signature line in short form (DM Mono 12.5 px: `{name} wrote this by hand · 52 min over 3 sittings`); a label `ON YOUR PAGE · PUBLIC` or `PRIVATE · ONLY PEOPLE WITH THE LINK`; a 48 px bordered row with the full link in DM Mono 13 px (ellipsis if long) and a "Copy link" text button that reads "Copied" for 2 s; then "Back to pages" (text button) and "Open the page" (filled). Esc goes back to Pages.

### Addresses

- A public piece's address is `{handle}.{ROOT_DOMAIN}/{slug}`. A private piece's is `{ROOT_DOMAIN}/p/{slug}`. Slugs get a 10-character random suffix.
- `{ROOT_DOMAIN}/p/{slug}` for a public piece redirects (308) to its subdomain address, except for the signed-in owner, who stays on the main domain and sees their own view (back arrow, visibility control).
- `{handle}.{ROOT_DOMAIN}/{slug}` for a private piece, a draft, or another writer's piece is a plain 404.
- An old handle redirects (308) to the new one for 90 days, then 404s.
- Writers' subdomains serve only their page, their public pieces and those pieces' share images. Everything else (sign-in, Pages, writing) lives on the main domain. Sign-in cookies are host-only on the main domain.
- Private pieces carry `<meta name="robots" content="noindex">`.

### The writer's own view of a piece

- On the main domain, the owner's piece page shows the history icon at the top left (replacing the back arrow) and the account icon at the top right, 184 px from the right edge beside the window. Immediately left of the account icon, 8 px from it, a DM Mono 13 px text button `Public` or `Private` opens a small popover with the same two radio rows; choosing one saves immediately and shows the new link with Copy link. Readers never see these.

### The writer's page (`{handle}.{ROOT_DOMAIN}`)

- The shared paper layout, the side window on the right showing the reader's own time with a clear sky (like piece pages).
- The writer's display name in Literata 40 px, line-height 1.15, its top edge 56 px from the viewport top. 12 px below, one DM Mono 13 px `#736C61` line: `{n} pieces · {total writing time} of writing · since {Month YYYY}` (writing time summed from their public pieces' receipts, formatted like the receipt; "1 piece" for one). Facts only: never "by hand" here, since pieces differ.
- 48 px below, their public pieces, newest first, 36 px apart. Each is one link: title (Literata 24 px, line-height 1.3), then the first two lines of the text (Literata 16.5 px, line-height 1.6, `#5C564C`, clamped to 2 lines; links shown as hostnames, quote marks removed), then a DM Mono 12.5 px meta line: `{date} · {words} words · {duration} over {n} sittings` (or `in 1 sitting`).
- With no public pieces: the name, then "Nothing published here yet." in Literata 17 px `#5C564C`. No summary line.
- 72 px after the list: the 72 px rule, then a row with the seal at 22 px and "Every piece here was written on Longhand, with a record of how." (DM Mono 12 px `#736C61`), "Longhand" linking to the main domain.
- On a public piece page, the writer's name in the signature sentence links to their page.
- **Back from a piece on a writer's page.** Every piece page served on `{handle}.{ROOT_DOMAIN}` shows the same arrow-only back button at the top left (same position, size and color as everywhere else), linking to `{handle}.{ROOT_DOMAIN}/`. Its tooltip and `aria-label` use the writer's display name ("Back to anon24"). It shows for everyone, signed in or not. A private piece at `/p/{slug}` shows no back button to readers (only to its owner, back to Pages).
- **Write on Longhand.** Every page on a writer's subdomain (their page and each public piece) shows "Write on Longhand" at the top right of the paper: DM Mono 13 px `#736C61`, underlined on hover, 28 px from the top and 184 px from the right edge, beside the window. It links to `https://{domain}/`, which opens a fresh page for a signed-in writer and the guest editor for anyone else. It is the same for everyone. Sign-in cookies are deliberately never sent to subdomains, so these pages can't tell the owner from a reader.
- Share image for the writer's page: the name and the summary line on paper, in the existing share-image style.

## References

Links in a piece become references. There are no response pieces and no source cards. Reference mockups: "A published piece", "Writing · a pasted link becomes a reference" and option A on "References · three ways to show a link".

- **What counts:** any `http://` or `https://` URL in the text, up to the next whitespace, with trailing `.,;:!?)]"'` trimmed. One reference per unique address (compare the full URL), in the order each first appears.
- **The label:** the hostname, lowercase, without a leading `www.` (`theatlantic.com`, `en.wikipedia.org`). Never fetched: no titles, favicons or previews.
- **In the published text:** each URL shows as its label in place, underlined (1 px, `#BDB6AA`, 4 px offset), ink `#1C1A16`, opening in a new tab with `rel="noopener nofollow ugc"`. The full URL is the `href`. A URL that already sits in parentheses keeps them.
- **The References row:** 56 px below the last paragraph. The label "REFERENCES" in DM Mono 11 px, letter-spacing 0.14em, `#9A9387`; 12 px below it, the pills in a wrapping row with a 10 px gap. Then the receipt's 72 px rule spacing starts below this row. No row at all when there are no links.
- **A pill:** an `<a>`, 32 px tall, padding 0 14 px 0 11 px, 1 px `#E6E0D4` border, fully rounded, no fill; the quote icon (12 px, `#736C61`), a 7 px gap, then the label in DM Mono 12.5 px `#3A352E`. Hover: border and text `#1C1A16`. Long labels truncate with an ellipsis at the column width.
- **While writing, links shorten in place.** The moment the writer types a space or Enter right after a URL, the URL (minus any trailing punctuation, which stays as typed) is replaced by its label, and the full URL is kept behind it. A pasted URL that is already followed by whitespace in the pasted text shortens at paste time. A URL still being typed, with nothing after it, stays as typed until then.
  - The editor is a textarea, so the underline comes from a mirror layer: a `div` behind the textarea with identical font, size, line-height, padding, width and wrapping, holding the same text in transparent color, with each link label wrapped in a span that draws the underline (1 px `#BDB6AA`, 4 px offset). It scrolls with the textarea. The textarea's own text stays ink.
  - Backspace with the caret right after a label removes the whole label. Any other edit inside a label turns it back into plain text (the link is dropped). Typing at either edge is ordinary text.
  - Cmd/Ctrl+Z immediately after a link shortens restores the full URL, like undoing an autocorrect (the browser's own undo does this, because the shortening is a normal text replacement).
  - Copying a shortened link copies its label.
  - The writing area grows with its text; it never fills the screen with empty textarea. Clicking the empty paper below the text puts the caret at the end. The References row sits 56 px under the last line of text and scrolls with it, never pinned to the viewport and never under the bottom bar. It appears as soon as the text contains a link (shortened or not), updating live. Here the pills are plain labels, not links. The row never takes focus or moves the caret.
- **At publish:** any URL still written out in full is shortened the same way, so the published text never shows a raw address.
- **Quotes:** a line starting with `> ` publishes as an indented quote: 28 px left padding, Literata italic, `#3A352E`, with the `> ` removed. No border or bar beside it.

The quote icon SVG (18 × 18 viewBox, drawn at 12 px):
```html
<svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 5C5 6 3.5 8.2 3.5 11v2.5H7V10H4"/><path d="M14.5 5C12 6 10.5 8.2 10.5 11v2.5H14V10h-3"/></svg>
```

## The receipt

The receipt answers one question: did a person write this? It sits on the paper itself, with no card, box, background or border. Reference mockups: "R2 · Signature line", "Signature line: four ways to say it" (option A) and "How this was written (expanded)" on the design canvas.

### The signature line (always visible)

- 72 px below the last paragraph: a 72 px wide, 1 px `#1C1A16` rule.
- 22 px below the rule, a row with a 16 px gap:
  - **The seal:** this exact 44 px inline SVG, copied as-is (don't redraw or simplify the paths). It's a double ring with a quill stroke and a baseline inside, and it's decorative (`aria-hidden`):
    ```html
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="20.5" stroke="#3D5A8A" stroke-width="1.5"/>
      <circle cx="22" cy="22" r="16.5" stroke="#3D5A8A" stroke-width="0.8"/>
      <path d="M15.5 26.5c2.2-0.4 4.2-2.2 5.6-4.6 1.2-2 2.2-4.6 4.4-6 1.6-1 3.1-0.6 3 0.9-0.2 2.2-3.4 4-6 5.2" stroke="#3D5A8A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M14.5 29.5h15" stroke="#3D5A8A" stroke-width="1" stroke-linecap="round"/>
    </svg>
    ```
  - **The sentence:** Literata 19 px, `#1C1A16`, picked by typed share of the final text:
    - 95% or more: `{name} wrote this by hand.`
    - 75–95%: `{name} wrote most of this by hand.`
    - 40–75%: `{name} wrote and gathered this.`
    - under 40%: `{name} gathered and shaped this.`
    - links never change the sentence; they're listed under References.
  - **The meta line** below it, 4 px gap: DM Mono 12.5 px `#736C61`: `{duration} over {n} sittings · {date range}`, e.g. `52 min over 3 sittings · Oct 11–13`. Use "1 sitting" for one. Add the year only when it isn't the current year. Duration uses the existing formatter ("52 min", "1 hr 12 min").
- 22 px below: **one** text button, DM Mono 12.5 px `#736C61`, `#1C1A16` on hover: the check icon (12 px), a 6 px gap, then `Verified · See how it was written`. It toggles the details below (`aria-expanded`, `aria-controls`); the label stays the same open or closed. There are no other links: no "Watch it being written", no separate "How this was written" or "Verified".
- A sitting is a stretch of writing with no break longer than 30 minutes; sessions closer than that merge for display. The gap is measured in real clock time: the end of one session (its last event's absolute timestamp) to the start of the next. The raw sessions stay in the log.

### How this was written (opens inline on click)

- 44 px below the links: a 1 px `#E8E3DA` top rule, 36 px padding, then "How this was written" in Literata 24 px.
- Section labels: DM Mono 11 px, letter-spacing 0.14em, uppercase, `#9A9387`, 30 px above each section. The order is VERIFIED, SITTINGS, WHAT'S IN IT, REVISIONS, NOTES. Verified comes first because it's what the reader clicked.
  - **SITTINGS:** one row per sitting, DM Mono 13 px, three columns (`{weekday, Mon D} · {start time}`, `{minutes}`, `{words} words`), 9 px vertical padding, 1 px `#EEEAE3` rule between rows.
  - **WHAT'S IN IT:** a single 8 px tall bar with a 2 px gap between segments: typed `#1C1A16`, brought in `#BDB6AA`, quoted `#3D5A8A`. Below it, a DM Mono 12.5 px legend with 8 px swatches, listing only non-zero parts: `94% typed here`, `4% brought in`, `2% quoted`. Percentages are whole numbers that add up to 100. Link characters are left out of all three shares.
  - **REVISIONS:** Literata 17 px: `{ratio} words written for every word kept.`
  - **NOTES:** only when there are timing flags or offline stretches, in plain words: `2 stretches of unusually fast typing`, `1 stretch written offline and synced later`.
  - **VERIFIED:** Literata 17 px: "Longhand recorded this piece as it was written, keystroke by keystroke, on its own clock. The published text matches that record exactly, and neither has changed since it was published on {date}." Then, in `#5C564C`: "It shows how the words got onto the page. It can't see what happened off the page, like what the writer read or talked through first."
  - **No fingerprints.** The text and writing-log hashes are stored but never shown on public pages or in share images, until readers have a real way to check them (see the PRD roadmap).
- Language rules: facts, never verdicts (no scores, "only", red or warnings); effort always leads; percentages only in the details; say "brought in", never "pasted"; never say "AI".
- Removed: the library card, the rotated stamp, the "Verify · text · chain" line, and the public replay ("Watch it being written", the "Show replay" toggle and the public replay endpoint). The canvas mockups still show three links under the signature; this spec supersedes them.

## Small screens

- Under 1024 px wide: the window shrinks to 72 px, and the insets and bar offsets shrink to match (window side offset = 24 + 72 + 24).
- Under 768 px (phones): the window is hidden. The scene caption stays in the bar, the column fills the width with 20 px margins, the writing size drops one step (Medium becomes 18 px), and the back arrow sits 20 px from the left.

## Removed from v1

The room color, full-bleed scenes, lamp glow, dark-scene control colors and the room crossfade layers. Delete that code rather than hiding it. Keep the light, weather, location, pinning and caching logic from Phase 5b: the window now reads from it.

## Acceptance checklist

- [ ] With the debug scene picker, all 16 scenes match the right-hand "every scene" contact sheet on the canvas.
- [ ] No cloud, sun or moon is cropped at any viewport size; snow is visible in every daytime scene.
- [ ] The writing text is `#1C1A16` on `#FFFFFF` paper, the paper reads as white (not beige), and no control text falls below 4.5:1 contrast.
- [ ] Opening a piece shows a blinking caret at the end of the text with no click, and the text area never shows a border or focus box.
- [ ] On every page the window is on the right, full height, and can't be dragged or moved by keyboard. There is no Left/Right option anywhere.
- [ ] A writer whose saved `window_side` is `left` still sees the window on the right.
- [ ] Reduced motion stops everything moving in the window, including the side switch.
- [ ] No gradients, shadows or dark backgrounds remain on the writing screen.
- [ ] A brand-new account, and an existing one with no saved choices, starts on Auto.
- [ ] Signing in, and opening `/` while signed in, lands on a blank page with a blinking caret. Doing it twice in a row never creates a second empty draft. `/dashboard` redirects to `/`.
- [ ] A blank piece shows one placeholder in the text ("Write something" for a guest; "Good {time of day}, {first name}. What has been on your mind?" for a signed-in writer). The first keystroke removes it, and it never appears in the event log or the receipt.
- [ ] The history icon opens the Your pieces pane over the window. Esc, the scrim and the close button close it, and focus returns to the icon. New piece, search and the Today / This week / Earlier groups work, and the open piece is highlighted.
- [ ] The account icon is a line icon matching the history icon, at the same height. Its menu has exactly Your page, Settings and Sign out, works by keyboard, and is the only place the email shows besides Settings.
- [ ] Settings opens one dialog with page address, name, city and sign-in. Changes save only on Save. Changing the handle there moves the page, and the old address redirects.
- [ ] The account menu and every popover and dialog are opaque white. Nothing shows through.
- [ ] Leaving the tab for an hour across a light change, then coming back, shows the new scene at once, never a grey or half-blended sky.
- [ ] On `{handle}.{domain}` and its pieces, "Write on Longhand" at the top right goes to the main site.
- [ ] Continue with Google signs in. A Google account whose email matches an existing email-link writer signs into that same writer. A new Google writer goes through first run with the name pre-filled.
- [ ] No page, placeholder, email or help line shows "localhost", "Mailpit" or "127.0.0.1" when `ROOT_DOMAIN` is a real domain, including pages built before the real environment variables were set.
- [ ] On a public piece page, the title's top edge is 56 px from the viewport top, at every window size and for short and long pieces alike.
- [ ] Every paper page renders through the one shared layout component; no page sets its own top padding, margin or vertical centering.
- [ ] A public piece ends with the signature line (rule, seal, sentence, meta line, links) on the paper, with no card, box or background.
- [ ] The signature sentence matches the typed-share tier; links never change it.
- [ ] Under the signature there is exactly one link, "Verified · See how it was written"; it opens and closes the details inline, with Verified first; no hash appears anywhere on a public page or share image.
- [ ] The seal is the exact SVG in this spec.
- [ ] No public page offers a replay, and no public endpoint serves events.
- [ ] Sittings merge sessions less than 30 minutes apart by real clock time, so a piece written in one sitting with reloads shows "1 sitting".
- [ ] In every light change (morning → afternoon → golden → night → morning), at most one sun is ever visible; a sun and moon show together only from golden hour to night.
- [ ] No public text says "pasted" or "AI".
- [ ] Typing past the bottom of the screen never puts text under the bar: the caret line stays at least 160 px above the scroll area's bottom, and text fades out above the bar.
- [ ] Writing text defaults to Literata 20 px; the Type menu switches font and size instantly and remembers it on another device; published pages stay Literata 20 px.
- [ ] A visitor at `/` sees one blinking caret with "Write something", "Longhand" at the top left, and "See an example · Sign in" at the top right. They can type immediately.
- [ ] Loading `/` without typing creates no database rows.
- [ ] A guest's first keystroke creates one guest piece. Reloading the page brings back the same text, and a second tab shows the same piece.
- [ ] At 50 words the nudge card appears bottom left, never steals focus, and × hides it for that piece.
- [ ] Signing in with Google, or with an email link opened in the same browser, lands back on the same piece, now owned by the account. Its receipt (after publishing) counts time from the guest's first keystroke.
- [ ] A new account signing in from a guest piece goes through first run, then back to that piece.
- [ ] Publish as a guest opens "Sign in to publish". After signing in, the publish dialog opens.
- [ ] At 500 words a guest can't add text, the G6 dialog appears, and the server rejects any batch that would exceed 500 words or 4,000 characters.
- [ ] A 4th new guest piece from one IP address in a day opens the 'Sign in to keep writing' dialog and blocks typing; the bottom bar never shows a limit message; existing guest pieces keep working.
- [ ] On every page with a text area (guest home and /write/[id]), the caret is blinking in the text the moment the page loads, with no click.
- [ ] Guest pieces older than 7 days that were never claimed are deleted, along with their sessions and batches.
- [ ] No editor shows a title input. The publish dialog pre-fills an existing title.
- [ ] Reopening a piece continues its clock from its previous total; hovering the clock shows this sitting and all sittings; the total matches the receipt's active time.
- [ ] There is one page per published piece (`/p/[slug]`); any old receipt-only route redirects to it. The writer sees the history icon and account menu there; readers don't.
- [ ] Links in a piece show as hostnames in the text and as pills under REFERENCES, one per unique address, above the receipt; the same row shows live under the text while writing.
- [ ] Pasting a long URL into an otherwise typed piece still reads "wrote this by hand."
- [ ] Publish opens a centred dialog with a scrim, Public selected by default, keyboard-trapped, Esc closes; after publishing it shows the right link with Copy link.
- [ ] A public piece lives at `{handle}.{ROOT_DOMAIN}/{slug}` and is listed on the writer's page; a private one lives only at `/p/{slug}`, is never listed, 404s on the subdomain and has noindex.
- [ ] The owner can switch Public and Private from their own view of the piece, and the writer's page updates at once.
- [ ] A writer with no public pieces has a page showing their name and "Nothing published here yet."
- [ ] Every piece opened from a writer's page has a back arrow to that page, signed in or not.
- [ ] Changing the handle in Settings moves the page, and the old address redirects.
- [ ] Sign-in cookies are never sent to a writer's subdomain.
- [ ] Typing a URL and then a space turns it into its underlined hostname in the editor at once, with the caret after the space; Cmd/Ctrl+Z right after brings the full URL back; Backspace after a shortened link removes it whole; reloading the draft keeps it shortened; the piece still publishes.
- [ ] After every edit, rebuilding the event log gives exactly the text on screen.
- [ ] On every piece page (old and new), no full URL is ever shown in the text.
- [ ] In the editor, REFERENCES sits right under the text, never under the bottom bar.
- [ ] Each reference pill is one row (icon and label side by side) inside a rounded 1 px outline, never stacked.
- [ ] Nothing in the app says "response", "respond" or "source", and no code fetches linked pages.
- [ ] Clicking a button with the mouse never leaves a focus box; tabbing to it shows the outline.

## Reference implementation

Pure function, from the approved mockups. `sceneFor(light, condition, { density, groundH })` returns the sky, the rooftop colors and a list of absolutely positioned elements (`back` sits behind the rooftops, `front` in front). All positions are % of the window and all sizes are `cqmin`, so the same output works at any window size. The side window uses `density: 1.6, groundH: 9`. Port this to TypeScript in `lib/scene/window.ts`, keep the numbers, and add the motion classes on top.

```js
const SKY = {
  morning:   { clear: '#A7CBE6', cloudy: '#BCC6CE', rain: '#8C99A6', snow: '#B2C0CD' },
  afternoon: { clear: '#6FA7D8', cloudy: '#9DA9B4', rain: '#75838F', snow: '#9AABBB' },
  golden:    { clear: '#E09862', cloudy: '#B98F78', rain: '#8D6F62', snow: '#C09A90' },
  night:     { clear: '#172031', cloudy: '#1E2634', rain: '#141B25', snow: '#1F2838' },
};
// Rooftop skyline, drawn in an SVG with viewBox="0 0 100 20" preserveAspectRatio="none".
const ROOF = 'M0 20 L0 9 L8 9 L8 6 L14 6 L14 9 L22 9 L22 4 L25 2 L28 4 L28 9 L37 9 L37 7 L46 7 L46 10 L55 10 L55 5 L63 5 L63 8 L71 8 L71 3 L74 1 L77 3 L77 8 L86 8 L86 6 L93 6 L93 9 L100 9 L100 20 Z';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (a) => `rgb(${a.join(',')})`;

export function sceneFor(light, cond, { density = 1.6, groundH = 9 } = {}) {
  const night = light === 'night';
  const sky = hex(SKY[light][cond]);
  // Deterministic random, so a scene always looks the same.
  let seed = light.length * 131 + cond.length * 977 + Math.round(density * 10) + 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const f = (n) => n.toFixed(2);
  const back = [], front = [];

  const ground = night ? [12, 18, 27]
    : light === 'golden' ? mix(sky, [74, 44, 34], 0.6)
    : mix(sky, [52, 60, 72], 0.55);

  const disc = (x, y, s, c, halo) => back.push({ kind: 'sun', style:
    `left:${x}%;top:${y}%;width:${s}cqmin;aspect-ratio:1;border-radius:50%;background:${c};box-shadow:0 0 0 ${f(s * 0.3)}cqmin ${halo}` });

  // A cloud = one flat base + three round puffs, anchored at (x%, y%), scaled by k.
  const cloud = (x, y, k, c) => {
    const at = (a, b, w, h, r) => back.push({ kind: 'cloud', style:
      `left:calc(${x}% + ${f(a * k)}cqmin);top:calc(${y}% + ${f(b * k)}cqmin);width:${f(w * k)}cqmin;height:${f(h * k)}cqmin;border-radius:${r};background:${c}` });
    at(0, 7.7, 32, 6.3, '999px'); at(3.8, 4.5, 9.6, 9.6, '50%');
    at(10.9, 0.5, 13.4, 13.4, '50%'); at(20.5, 5.6, 8.3, 8.3, '50%');
  };

  const cloudColor = cond === 'rain'
    ? rgb(mix(sky, night ? [60, 72, 90] : [70, 80, 92], night ? 0.6 : 0.45))
    : night ? rgb(mix(sky, [100, 115, 138], 0.45))
    : rgb(mix(sky, [255, 255, 255], cond === 'clear' ? 0.7 : 0.6));

  if (cond === 'clear') {
    if (light === 'morning')   { disc(16, 14, 15, '#FFE9AE', 'rgba(255,233,174,0.35)'); cloud(56, 34, 0.55, cloudColor); }
    if (light === 'afternoon') { disc(68, 10, 14, '#FFF3D2', 'rgba(255,243,210,0.35)'); cloud(10, 30, 0.6, cloudColor); }
    if (light === 'golden') {
      back.push({ kind: 'band', style: `left:0;right:0;bottom:${f(groundH * 0.55)}%;height:26%;background:#EDB077;opacity:0.55` });
      disc(56, 52, 20, '#FFD27F', 'rgba(255,210,127,0.35)');
    }
    if (night) {
      for (let i = 0; i < Math.round(26 * density); i++) back.push({ kind: 'star', style:
        `left:${f(rnd() * 100)}%;top:${f(rnd() * 55)}%;width:max(1.5px,0.55cqmin);aspect-ratio:1;border-radius:50%;background:rgba(255,236,200,${f(0.5 + rnd() * 0.4)})` });
      back.push({ kind: 'moon', style: 'left:72%;top:12%;width:13cqmin;aspect-ratio:1;border-radius:50%;box-shadow:inset 3.4cqmin -1.6cqmin 0 0 #F2E8CC' });
    }
  }
  if (cond === 'cloudy') { cloud(5, 8, 1, cloudColor); cloud(44, 3, 1.3, cloudColor); cloud(64, 32, 0.85, cloudColor); }
  if (cond === 'rain')   { cloud(3, 3, 1.2, cloudColor); cloud(46, 2, 1.35, cloudColor); }
  if (cond === 'snow')   { cloud(8, 5, 1, cloudColor); cloud(56, 12, 0.9, cloudColor); }

  if (night || light === 'golden') {
    [9.5, 24, 40, 57.5, 73, 89].forEach((x) => front.push({ kind: 'litWindow', style:
      `left:${x}%;bottom:${f(groundH * (0.18 + rnd() * 0.25))}%;width:1.3cqmin;height:1.8cqmin;background:#F3B866;opacity:0.9` }));
  }
  if (cond === 'rain') {
    const c = night ? 'rgba(175,195,220,0.55)' : light === 'golden' ? 'rgba(255,228,200,0.7)' : 'rgba(255,255,255,0.7)';
    for (let i = 0; i < Math.round(38 * density); i++) front.push({ kind: 'rain', style:
      `left:${f(rnd() * 100)}%;top:${f(rnd() * 88 - 6)}%;width:max(1px,0.45cqmin);height:${f(6 + rnd() * 5)}cqmin;border-radius:1px;background:${c};transform:rotate(14deg)` });
  }
  if (cond === 'snow') {
    for (let i = 0; i < Math.round(48 * density); i++) front.push({ kind: 'snow', style:
      `left:${f(rnd() * 100)}%;top:${f(rnd() * 96)}%;width:max(2px,${f(0.9 + rnd() * 1.4)}cqmin);aspect-ratio:1;border-radius:50%;background:#FFFFFF;box-shadow:0 0 0 0.5px rgba(70,85,105,${night ? 0 : 0.3})` });
  }

  return { sky: rgb(sky), ground: rgb(ground), roof: ROOF, snowCap: cond === 'snow', groundH: `${groundH}%`, back, front };
}

export const captionFor = (light, cond) => cond === 'clear'
  ? { morning: 'Clear morning', afternoon: 'Sunny', golden: 'Sunset', night: 'Clear night' }[light]
  : { cloudy: 'Overcast', rain: 'Raining', snow: 'Snowing' }[cond];
```

Rendering order inside the window: the sky color, then `back` elements, then the rooftops SVG (the white snow cap path first, translated `0 -1.4`, only in snow, then the rooftop path), then `front` elements, then the three glazing bars, then the frame border on top.
