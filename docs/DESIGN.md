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

Light (time of day) picks the sky family; the condition (weather) picks the exact sky and what's in it. Light boundaries are unchanged: morning runs from sunrise to 11:00, afternoon from 11:00 until an hour before sunset, golden hour from an hour before sunset until 20 minutes after it, and night the rest of the time.

Every writer starts on **Auto**: light from the device clock and the city's sunrise and sunset, condition from the live weather. A scene is pinned only when the writer picks one in the Scene popover. The debug scene picker previews a scene for the current tab only and never saves anything.

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
- With `prefers-reduced-motion`, or the "Still window" setting, nothing moves; the window shows the static frame from the mockups.

## Bottom bar and popovers

- Left: a back button (the back icon and "Pages", DM Mono 13 px, returns to the dashboard, aria-label="Back to your pages"), then `{caption} · {weekday, Mon D} · {elapsed} · saved`, where caption is the scene in words: Clear morning, Sunny, Sunset, Clear night, Overcast, Raining, Snowing.
- Right: Timer, No backspace, Scene, Publish. These are plain DM Mono 13 px text buttons in `#736C61`, 44 px tall hit areas, 20 px apart, with a 1 px underline on hover and a visible focus ring. No boxes, checkboxes or native dropdowns.
- The bar fades out after 2 s of typing and fades back in over 300 ms when the mouse moves.
- Popovers open above their button: a `#FFFFFF` card, 1 px `#E6E0D4` border, 6 px radius, shadow `0 8px 24px rgba(28,26,22,0.10)`, DM Mono 12–13 px options as text.
  - Timer: 10, 15 or 25 min, or off.
  - No backspace: on or off.
  - Scene: Auto, or pin a light and a condition; Window: Left / Right; Still window: on or off.
  - Publish: the existing publish sheet, restyled as a popover card.

## Other screens

- **One shared layout:** the editor, dashboard, public piece page, sign-in and name/city screens all use a single paper-page layout component that owns the paper, grain, side window, column position and top offset. Pages pass content in; they never add their own top padding, margin or vertical centering. Top offsets: the editor's text starts 140 px from the viewport top; on every other page, the first heading's top edge sits 56 px from the viewport top.
- **Sign-in, name and city screens:** the same paper and grain, with the side window on the writer's chosen side. Content top-aligned, never vertically centered.
- **Dashboard:** the same paper, grain and side window as the editor, with the same 680 px column. The top of the "Longhand" heading sits exactly 56 px from the top of the viewport: one wrapper sets this, with no other top padding, margin or vertical centering above it.
  - Header: "Longhand" in Literata 32 px, then one DM Mono 13 px #736C61 line: "{display name} · {city} · Settings · Sign out".
  - Settings opens a popover with the display name, city, window side, Still window, and the email address (read-only). The email never appears on the page itself.
  - Then one action row, 24 px below the header, left-aligned, with two icon buttons (no text labels): plus (new blank page, aria-label="New page") and quote (respond to a link, aria-label="Respond to a link"). Each shows a small DM Mono 12 px tooltip with its label on hover and focus. The quote button asks for the URL in a small popover.
  - Then the pieces, newest first, 32 px below the actions, 28 px apart: the title in Literata 24 px, line-height 1.3, at most 2 lines with an ellipsis; below it a DM Mono 12.5 px meta line, "{date} · {words} words · draft" or "· published · receipt". An untitled draft shows its first 60 characters as the title, in #736C61.
  - Response pieces: the title is the writer's own title or first line, never the source article's title. The meta line starts with the quote icon (12 px) and the source's site name, e.g. "[quote] theathletic.com · Oct 14 · 412 words · draft".
  - No cards, dividers or boxes.
- **Icons:** inline SVG, 1.5 px stroke, round caps and joins, currentColor (#736C61, #1C1A16 on hover), 18 px inside a 44 × 44 px button. Only three exist: plus, quote (a pair of curly quotation marks) and back (a left arrow). No icon library.
- **Focus:** keyboard focus only (`:focus-visible`): a 1.5 px #1C1A16 outline, offset 3 px, 3 px radius. A mouse click never leaves a box around a button.
- **Public piece page:** paper and grain, with the side window on the left showing the reader's own time of day and a clear sky (never the writer's location or weather). The title in Literata 32 px (top edge 56 px from the viewport top), then the text 24 px below it, then the receipt 64 px below the text.
- **Receipt card:** keeps the library-card design, but on paper it's `#F6F1E6` with a 1 px `#E3DACA` border and no shadow. Max 440 px wide. Stamp in `#3D5A8A`, below the table.

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
- [ ] Every piece (draft, published or read-only) has a working "Pages" back button.
- [ ] Response pieces show the quote icon and site name on the dashboard, and their title is never the article's title.
- [ ] Clicking a button with the mouse never leaves a focus box; tabbing to it shows the outline.
- [ ] On a public piece page, the title's top edge is 56 px from the viewport top, at every window size and for short and long pieces alike.
- [ ] Every paper page renders through the one shared layout component; no page sets its own top padding, margin or vertical centering.

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
