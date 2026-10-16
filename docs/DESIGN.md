# Longhand design spec · v2: paper and a side window

Oct 14, 2026. This replaces the v1 "room" design (full-bleed scene, room colors, lamp glow). Reference mockups: the "E · The side window" row of the Longhand design directions canvas.

## The idea

The whole screen is paper. It's just you and your thoughts, with a few quiet options at the bottom, the way Freewrite feels. The world outside shows up in one place only: a tall, narrow window along the left edge, showing the real time of day and weather where you are. The page never changes. Only the view through the window does.

## Layout (desktop, 1440 × 900 reference)

| Element | Spec |
| --- | --- |
| Background | The whole viewport is paper (see Paper). No other surface behind it. |
| Side window | 112 px wide, inset 36 px from the top, bottom and its side edge. Left by default. |
| Writing column | Up to 680 px wide, centered in the space beside the window (left window: `left: calc(50% + 74px); transform: translateX(-50%)`). Text starts 140 px from the top. The column scrolls; the window and bar stay fixed. |
| Bottom bar | 20 px from the bottom. Starts 184 px from the window's side (36 + 112 + 36), ends 40 px from the other edge. |

## Paper

- Color: `#FFFFFF`, a soft pure white like Freewrite. Neutral, never warm, beige or cream.
- Grain: a full-viewport SVG noise layer, `feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch"` desaturated with `feColorMatrix type="saturate" values="0"`, at `opacity: 0.03` and `mix-blend-mode: multiply`, `pointer-events: none`. It only softens the white so it reads like real paper; it must never look gray or textured.
- No shadows, cards, gradients or borders on the writing screen.

## Type

| Use | Spec |
| --- | --- |
| Writing | Literata 400, 22 px, line-height 1.7, color `#1C1A16` (about 16:1 on paper). Paragraph spacing 26 px. |
| Cursor (caret) | `#C9772E`, 2 px wide (`caret-color`). |
| Labels, bar, popovers | DM Mono 400, 13 px (11.5–12 px for small captions), color `#736C61` (meets 4.5:1 on paper). |
| Headings (dashboard, public page title) | Literata 400, 28–32 px, `#1C1A16`. |

No other fonts. No bold in the writing column.

## The writing area

- The text area is invisible: no border, no outline (focused or not), no resize handle, transparent background, `appearance: none`. Only the words and the caret show.
- It fills the writing column from the 140 px top offset to the bottom bar, and grows with the text.
- Opening any editable piece focuses it automatically, with the caret blinking at the end of the existing text and that spot scrolled into view, so you can start typing with no click. This happens after the piece's text has loaded, not before.
- Clicking anywhere on the paper outside the controls and the window puts focus back in the text area.
- Read-only (published) pieces never show a caret.

## The side window

- Frame: 1.5 px solid `#1C1A16` border, 3 px corner radius, `overflow: hidden`.
- Glazing bars: three horizontal 1 px `#1C1A16` bars at 25%, 50% and 75% of the window's height.
- The window is a CSS size container (`container-type: size`). Every element inside is positioned in % and sized in `cqmin`, so nothing is ever cropped or mis-scaled at any window size.
- Rooftops: a fixed SVG skyline (path below) along the bottom, 9% of the window's height, `preserveAspectRatio="none"`.

### Moving the window to the other side

- Left by default: `users.window_side` defaults to `left`, a missing or invalid value means `left`, and the browser keeps no copy of its own once the server has a value. The writer can drag the window horizontally. Past 24 px of movement it follows the pointer. On release it snaps to the nearer side: it slides over 250 ms ease-out, and the writing column and bar re-center at the same time.
- A press that moves less than 6 px is not a drag and does nothing.
- Keyboard and accessibility: the Scene popover has "Window: Left / Right". The window has `aria-label="Window: {caption}"` and is focusable; Left and Right arrow keys move it.
- The choice is saved per user (`users.window_side`, `left` | `right`) and applies on every device. It is stored locally until the server confirms.
- With reduced motion, the window switches sides instantly, with no slide.

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

- Left: a back button (the back icon and "Pages", DM Mono 13 px, returns to the dashboard, `aria-label="Back to your pages"`), then `{caption} · {weekday, Mon D} · {elapsed} · {status}`, where status is `saved`, `saving` (only while a batch is in flight) or `not saved` (the server refused a batch; same color, no red), and caption is the scene in words: Clear morning, Sunny, Sunset, Clear night, Overcast, Raining, Snowing.
- Right: Timer, No backspace, Scene, Publish. These are plain DM Mono 13 px text buttons in `#736C61`, 44 px tall hit areas, 20 px apart, with a 1 px underline on hover and a visible focus ring. No boxes, checkboxes or native dropdowns.
- The bar fades out after 2 s of typing and fades back in over 300 ms when the mouse moves.
- Popovers open above their button: a `#FFFFFF` card, 1 px `#E6E0D4` border, 6 px radius, shadow `0 8px 24px rgba(28,26,22,0.10)`, DM Mono 12–13 px options as text.
  - Timer: 10, 15 or 25 min, or off.
  - No backspace: on or off.
  - Scene: Auto, or pin a light and a condition; Window: Left / Right; Still window: on or off.
  - Publish: the existing publish sheet, restyled as a popover card.

## Other screens

- **Sign-in, name and city screens:** the same paper and grain, with the side window on the writer's chosen side. Content top-aligned, never vertically centered.
- **Dashboard:** the same paper, grain and side window as the editor, with the same 680 px column. The top of the "Longhand" heading sits exactly 56 px from the top of the viewport: one wrapper sets this, with no other top padding, margin or vertical centering above it.
  - Header: "Longhand" in Literata 32 px, then one DM Mono 13 px `#736C61` line: `{display name} · {city} · Settings · Sign out`.
  - Settings opens a popover with the display name, city, window side, Still window, and the email address (read-only). The email never appears on the page itself.
  - Then one action row, 24 px below the header, left-aligned, with a single icon button (no text label): **plus** (new page, `aria-label="New page"`), with a small DM Mono 12 px tooltip on hover and focus. There is no quote button and no other way to start a piece.
  - Then the pieces, newest first, 32 px below the actions, 28 px apart: the title in Literata 24 px, line-height 1.3, at most 2 lines with an ellipsis; below it a DM Mono 12.5 px meta line, `{date} · {words} words · draft` or `{date} · {words} words · published` (never "receipt"). An untitled draft shows its first 60 characters as the title, in `#736C61`. A draft opens the editor; a published piece opens its piece page (`/p/[slug]`).
  - Every piece looks the same on the dashboard: no icons, site names or modes.
  - No cards, dividers or boxes.
- **Icons:** inline SVG, 1.5 px stroke, round caps and joins, `currentColor` (`#736C61`, `#1C1A16` on hover), 18 px inside a 44 × 44 px button. Only four exist: plus, quote (a pair of curly quotation marks, used only in reference pills, 12 px), back (a left arrow) and check (used only in the receipt's Verified button, 12 px). No icon library.
- **Focus:** keyboard focus only (`:focus-visible`): a 1.5 px `#1C1A16` outline, offset 3 px, 3 px radius. A mouse click never leaves a box around a button.
- **One shared layout:** the editor, dashboard, public piece page, sign-in and name/city screens all use a single paper-page layout component that owns the paper, grain, side window, column position and top offset. Pages pass content in; they never add their own top padding, margin or vertical centering. Top offsets: the editor's text starts 140 px from the viewport top; on every other page, the first heading's top edge sits 56 px from the viewport top.
- **Piece page (`/p/[slug]`):** the only page for a published piece, the same for readers and the writer. There is no separate receipt page, and no link anywhere says "receipt". Paper and grain, with the side window on the left showing the reader's own time of day and a clear sky (never the writer's location or weather). The title in Literata 32 px (top edge 56 px from the viewport top), then the text 24 px below it (Literata 22 px, line-height 1.7, 26 px between paragraphs), then References (if any), then the receipt (see "References" and "The receipt"). When the signed-in writer views their own piece, a "Pages" back link (back icon + "Pages", DM Mono 13 px `#736C61`) sits fixed at the bottom left, exactly where it sits in the editor's bar; readers never see it. Reference mockup: "A published piece · read it, the receipt is at the end".

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
- Section labels: DM Mono 11 px, letter-spacing 0.14em, uppercase, `#9A9387`, 30 px above each section. The order is VERIFIED, SITTINGS, WHAT'S IN IT, REVISIONS, NOTES, then the fingerprints toggle. Verified comes first because it's what the reader clicked.
  - **SITTINGS:** one row per sitting, DM Mono 13 px, three columns (`{weekday, Mon D} · {start time}`, `{minutes}`, `{words} words`), 9 px vertical padding, 1 px `#EEEAE3` rule between rows.
  - **WHAT'S IN IT:** a single 8 px tall bar with a 2 px gap between segments: typed `#1C1A16`, brought in `#BDB6AA`, quoted `#3D5A8A`. Below it, a DM Mono 12.5 px legend with 8 px swatches, listing only non-zero parts: `94% typed here`, `4% brought in`, `2% quoted`. Percentages are whole numbers that add up to 100. Link characters are left out of all three shares.
  - **REVISIONS:** Literata 17 px: `{ratio} words written for every word kept.`
  - **NOTES:** only when there are timing flags or offline stretches, in plain words: `2 stretches of unusually fast typing`, `1 stretch written offline and synced later`.
  - **VERIFIED:** Literata 17 px: "Longhand recorded this piece as it was written, keystroke by keystroke, on its own clock. The published text matches that record exactly, and neither has changed since it was published on {date}." Then, in `#5C564C`: "It shows how the words got onto the page. It can't see what happened off the page, like what the writer read or talked through first."
  - **Fingerprints:** a collapsed DM Mono 11.5 px `#9A9387` toggle, "Technical fingerprints, for anyone who wants to check". When opened, it shows the full SHA-256 of the published text ("Text") and of the writing log head ("Writing log"), each with a copy button.
- Language rules: facts, never verdicts (no scores, "only", red or warnings); effort always leads; percentages only in the details; say "brought in", never "pasted"; never say "AI".
- Removed: the library card, the rotated stamp, the "Verify · text · chain" line, and the public replay ("Watch it being written", the "Show replay" toggle and the public replay endpoint). The canvas mockups still show three links under the signature; this spec supersedes them.

## Small screens

- Under 1024 px wide: the window shrinks to 72 px, and the insets and bar offsets shrink to match (window side offset = 24 + 72 + 24).
- Under 768 px (phones): the window is hidden. The scene caption stays in the bar, the column fills the width with 20 px margins, and the writing size drops to 19 px.

## Removed from v1

The room color, full-bleed scenes, lamp glow, dark-scene control colors and the room crossfade layers. Delete that code rather than hiding it. Keep the light, weather, location, pinning and caching logic from Phase 5b: the window now reads from it.

## Acceptance checklist

- [ ] With the debug scene picker, all 16 scenes match the "every scene" contact sheets on the canvas, on both sides.
- [ ] No cloud, sun or moon is cropped at any viewport size; snow is visible in every daytime scene.
- [ ] The writing text is `#1C1A16` on `#FFFFFF` paper, the paper reads as white (not beige), and no control text falls below 4.5:1 contrast.
- [ ] Opening a piece shows a blinking caret at the end of the text with no click, and the text area never shows a border or focus box.
- [ ] Dragging the window snaps to either side, the column re-centers, and the choice persists after a reload and on another browser.
- [ ] Reduced motion stops everything moving in the window, including the side switch.
- [ ] No gradients, shadows or dark backgrounds remain on the writing screen.
- [ ] A brand-new account, and an existing one with no saved choices, starts on Auto with the window on the left.
- [ ] The dashboard is top-aligned, shows the side window, and never shows the email address outside Settings.
- [ ] The "Longhand" heading's top edge is 56 px from the viewport top, at every window size.
- [ ] On a public piece page, the title's top edge is 56 px from the viewport top, at every window size and for short and long pieces alike.
- [ ] Every paper page renders through the one shared layout component; no page sets its own top padding, margin or vertical centering.
- [ ] A public piece ends with the signature line (rule, seal, sentence, meta line, links) on the paper, with no card, box or background.
- [ ] The signature sentence matches the typed-share tier; links never change it.
- [ ] Under the signature there is exactly one link, "Verified · See how it was written"; it opens and closes the details inline, with Verified first; hashes only appear inside the fingerprints toggle.
- [ ] The seal is the exact SVG in this spec.
- [ ] No public page offers a replay, and no public endpoint serves events.
- [ ] Sittings merge sessions less than 30 minutes apart by real clock time, so a piece written in one sitting with reloads shows "1 sitting".
- [ ] In every light change (morning → afternoon → golden → night → morning), at most one sun is ever visible; a sun and moon show together only from golden hour to night.
- [ ] No public text says "pasted" or "AI".
- [ ] Every piece (draft, published or read-only) has a working "Pages" back button.
- [ ] The dashboard has only the plus button; published pieces say "published" (never "receipt") and open their piece page.
- [ ] There is one page per published piece (`/p/[slug]`); any old receipt-only route redirects to it. The writer sees a "Pages" back link there; readers don't.
- [ ] Links in a piece show as hostnames in the text and as pills under REFERENCES, one per unique address, above the receipt; the same row shows live under the text while writing.
- [ ] Pasting a long URL into an otherwise typed piece still reads "wrote this by hand."
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
