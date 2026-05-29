# Connect Four Coach

_Started 2026-05-28 21:40 UTC_

---

## User

You are a product designer tasked with creating high-fidelity mobile mockups for DecodeC4, a Connect Four learning app.

  Read reports/product_vision.md carefully. It contains the full product vision: what the app is, how explanation feedback works, the
  complete screen inventory with layouts and component descriptions, the semantic color system, and all navigation flows.

  The app uses a light, playful, and casual aesthetic — bright backgrounds, rounded corners, friendly typography.

  Use the following screenshots from a reference chess learning app as visual inspiration. Do not copy them — adapt the patterns to
  Connect Four and to the visual style above.

  - during_game.jpeg — how the Coach avatar and chat bubbles appear during an active game. Note the fixed position, compact size, and
  short phrase style.
  - feedback.jpeg — how the Coach provides post-game feedback alongside the board. Note the layout relationship between the board, the
  Coach dialog, and the move evaluation.
  - saga_map.jpeg — the lesson progression map. Note the node style, winding path, and locked/completed/current states.
  - puzzle.jpeg — a puzzle screen. Note the prompt placement, board layout, and action toolbar position.

  Produce a mockup for every screen described in product_vision.md. For each screen:
  - Follow the ASCII layout sketch as the structural guide
  - Apply the semantic color system defined at the end of the document
  - Show all component states described (e.g. completed/current/locked saga nodes; optimal/suboptimal/blunder badges)
  - Respect the layout principles: Coach Avatar chat feed fixed at top, 7×6 board in the center, Action Toolbar fixed at the bottom,
  board never cluttered during play

  Show navigation transitions between screens where they clarify the flow (e.g. Home → Saga Map, Challenge post-move → Deep Reveal
  panel, Post-Game Review → Position Explorer).

## Assistant

_[tool: read_file]_

_[tool: list_files]_

I'll start by reading the product vision document and examining the reference screenshots.

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

Let me examine the reference screenshots closely to absorb the visual patterns.

_[tool: questions_v2]_

I've absorbed the spec and the reference patterns. The brief is very complete, so I just have a few high-leverage questions about visual specifics and how you'd like everything presented before I build all 13 screens.

## User

Questions answered:
- presentation: One big interactive prototype you can click through (tappable nav between screens)
- interactivity: Lightly interactive — tappable nav + a few key states, boards mostly pre-set
- typography: Decide for me
- background: Playful — gentle colored backgrounds per surface (Lessons / Challenges / Sparring each have a tint)
- board_style: 2
- coach: Flat illustrated cartoon figure (like the reference)
- variations: Saga Map (path style / node visuals), Coach dialog + feedback layout
- scope: Decide for me

## Assistant

_[tool: update_todos]_

Answers received. Here's my plan:

- **Type:** Baloo 2 (chunky rounded display) + Nunito (friendly body) — playful but readable
- **Board:** cream/sand board, green + dark-gray discs (your pick)
- **Per-surface tints:** Lessons = sky, Challenges = peach, Sparring = lavender; Home neutral cream
- **Feedback colors (reserved):** green ✓ / orange ? / red ✗ — never touch the disc palette
- **Coach:** flat cartoon figure (bearded, glasses) as placeholder
- **Format:** one clickable prototype, all 13 screens, light interactivity (disc drops, badge reveals, deep-reveal slide-up, timeline rewind), with a screen-jump rail + **variant toggles** for Saga Map and Coach/feedback layoutLet me start with the design tokens CSS, then the HTML shell.

_[tool: write_file]_

_[tool: write_file]_

Now the HTML shell:

_[tool: write_file]_

Now the shared primitives (icons, status bar, top bar, toolbar, progress bar):

_[tool: write_file]_

Now the Coach avatar and dialog. I'll build a flat cartoon figure from layered shapes:

_[tool: str_replace_edit]_

The board needs column-major layout for clean per-column taps and badges. Let me adjust the board CSS:

_[tool: write_file]_

Now the Board component:

_[tool: write_file]_

Now the Home + Stats screens:

_[tool: write_file]_

Now Lessons — Saga Map (3 variants), Concept, Socratic, and the upgrade modal:

_[tool: write_file]_

Now Challenges — Set Picker, Challenge Board, Post-Move Feedback (3 layout variants), Deep Reveal, Post-Set Summary:

_[tool: str_replace_edit]_

Let me add the missing CSS classes (spinner, move chips), then build Sparring:

_[tool: str_replace_edit]_

Now the Sparring screens:

_[tool: write_file]_

_[tool: str_replace_edit]_

Now I need the status bar to sit above every screen cleanly. Let me reserve space via a pseudo-element and add a screen-transition animation:

_[tool: write_file]_

Now the app router + navigator rail:

_[tool: str_replace_edit]_

Let me check it loads cleanly:

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

No errors. Let me screenshot a few key screens to check the visuals:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: eval_js]_

Phone content is black — the screen isn't filling. Let me inspect:

_[tool: save_screenshot]_

Content is there (822px, real text). The black capture may be transient. Let me re-capture with a longer delay:

_[tool: view_image]_

_[tool: eval_js]_

Still black despite real DOM content. Let me check computed backgrounds and positions:

_[tool: multi_screenshot]_

DOM and CSS are all correct (cream bg, content positioned in-bounds) — the black is a pixel-capture quirk with the rounded/shadowed phone region. Let me confirm with the DOM-based renderer:

_[tool: eval_js]_

Two capturers agree on black yet the DOM reads cream — something is painting over it. Let me probe what's actually at the phone's center pixel:

_[tool: str_replace_edit]_

Found it: the screen-entrance animation freezes at its `opacity:0` start frame when the iframe is backgrounded (capture-time). That's risky — I'll remove the screen-level fade so the base state is always visible:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: show_html]_

Still black — let me reload and re-check the opacity:

_[tool: eval_js]_

_[tool: save_screenshot]_

Fixed — opacity 1, no animation. The earlier capture was pre-reload. Let me re-capture:

_[tool: view_image]_

_[tool: eval_js]_

Renders well now. I notice the bubble on Home is invisible (frozen `bubbleIn` opacity) and the status-bar time overlaps the "DecodeC4" title. Let me check the overlap precisely and fix the opacity-frozen animations:

_[tool: str_replace_edit]_

DOM confirms no real overlap (title y97, status bar ends y89 — the image was deceptive). The real issue is `bubbleIn` freezing at `opacity:0`. Since bubbles are always-visible core elements, I'll make the entrance animations transform-only so a paused frame stays visible:

_[tool: show_html]_

Let me reload and capture a full tour. First reload for the CSS change:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

Saga Map variant A looks excellent — all node states present. Let me check the rest of the tour:

_[tool: view_image]_

Concept screen is great. Let me check Set Picker, Game, and Review:

_[tool: view_image]_

_[tool: eval_js]_

Let me verify the actual geometry on the Game screen, where "Move 14" looks cramped against the status icons:

_[tool: view_image]_

Geometry is actually clean (meta single-line at y100, icons at y57 — well separated; the captures just compress perception). Let me check the Review screen and then test the interactive Challenge feedback + Deep Reveal:

_[tool: str_replace_edit]_

Found a real bug: the Review timeline renders everything as red because my quality comparison checks `"good"` but the data uses `"g"`. Let me fix:

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me test the interactive Challenge flow (play a move → feedback variant A → deep reveal). Reloading first:

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: str_replace_edit]_

The drop animation also floats the disc when paused (capture artifact). I'll make it a safe scale-settle that rests correctly even on a paused frame:

_[tool: view_image]_

_[tool: show_html]_

Those chal shots predate the drop fix. Let me reload and re-test: drop animation, Deep Reveal, and feedback variants B & C:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: list_files]_

_[tool: save_screenshot]_

Nothing saved (call aborted on error). Let me capture Deep Reveal cleanly:

_[tool: view_image]_

_[tool: eval_js]_

Drop fix works (disc contained now). But Deep Reveal still isn't opening. Let me debug directly:

_[tool: str_replace_edit]_

The sheet IS open (DOM confirms) — its `slideUp` animation just froze off-screen at `translateY(100%)` during capture. Same paused-animation class of issue. Let me make the sheet and modal entrances contained/opacity-safe:

_[tool: str_replace_edit]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: show_html]_

Step ordering caused a same-tick no-remount. Let me split navigation into separate steps:

_[tool: save_screenshot]_

_[tool: view_image]_

_[tool: view_image]_

Deep Reveal works great now. Let me check feedback variants B and C:

_[tool: view_image]_

Variant B (compact inline) looks great. Now variant C:

_[tool: save_screenshot]_

Variant C (docked card) works well too. Let me capture the remaining unverified screens — Stats, Socratic, Summary, Difficulty, Position Explorer, and Saga variants B & C:

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

Position Explorer is solid — mistake overlay (red), opponent threat (gray), legend, explore CTA. Let me check Stats, Summary, Difficulty, and the two Saga variants:

_[tool: view_image]_

_[tool: view_image]_

_[tool: view_image]_

All three Saga variants are distinct and polished. Let me check Difficulty and Summary:

_[tool: view_image]_

_[tool: str_replace_edit]_

All 13 screens verified and polished. Two small cleanups: remove the stray tree emoji on Saga B, and prevent the top-bar meta from wrapping.

_[tool: str_replace_edit]_

_[tool: update_todos]_

All screens build and verify. Let me finalize the todos and hand off:

_[tool: done]_

_[tool: fork_verifier_agent]_

All 13 DecodeC4 screens are built and verified — open in your preview now.

**What's there**
- **Clickable prototype** in a phone frame. Navigate inside the app (cards, nodes, set cards, timeline flags all work) *or* jump to any screen from the left rail.
- **All 13 screens:** Home, Stats, Saga Map, Concept, Socratic, Set Picker, Challenge Board + Post-Move Feedback, Deep Reveal, Post-Set Summary, Difficulty Picker, Game Board, Post-Game Review, Position Explorer.
- **Light interactivity:** discs drop into columns, eval badges (✓/?/✕) appear on the played column, the Tier-1 strip → Deep Reveal slide-up (with a brief loading state), the sparring bot replies and the Coach reacts, Hint heatmap, and tappable timeline flags → Position Explorer.

**Variations you can toggle (left rail)**
- **Saga Map** — A) winding path, B) meadow stepping-stones, C) clean list spine
- **Feedback layout** — A) strip below board, B) compact inline (eval in the Coach bubble), C) docked card

**System applied:** Baloo 2 + Nunito, per-surface tints (Lessons sky / Challenges peach / Sparring lavender), cream board with green & dark-gray discs, and red/orange/yellow reserved strictly for evaluation. Coach is a flat placeholder figure with happy/think/oops moods.

**Worth noting**
- Discs/boards are pre-set positions, not a real solver — taps trigger scripted optimal/suboptimal/blunder outcomes to show each state.
- The Coach figure is a placeholder per the brief; ready to swap when the real identity lands.

Next steps if you want them: pick winning directions for the two variant sets so I can lock them in, add the Lesson Concept slide-1 (this shows slide 2/3), or flesh out the upgrade/paywall flow.

