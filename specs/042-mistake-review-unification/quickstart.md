# Quickstart — Verifying Mistake Review Unification & Deep-Reveal Overhaul

Manual verification steps per user story, using real fixtures (no synthetic boards). Run
`npm run test:fast` from `connect-four/` first for the automated regression gate (SC-007), then walk
through these to satisfy Constitution III's "manually verified on the golden path + one edge case"
requirement for UI changes.

## Setup

```bash
cd connect-four
npm run test:fast   # must be green before manual QA
npm run dev          # or your usual local dev server command
```

## US1 — Unified detail screen (severity as label only)

1. Open any known `quality: 'suboptimal'` mistake and any known `quality: 'blunder'` mistake from the
   same game (e.g. use the SC-002 fixture game's four mistakes — see below) via Past Games → game →
   mistake.
2. Confirm both open the identical `MistakeDetailScreen` layout: same board, same three actions
   ("Start new game from here", "What should I have played?", "Mark as reviewed"), differing only in
   the severity label/color.

## US2 — Permalinks & reload survival (SC-002 fixture)

Use the real stored papergames game `40fe793a-aa39-429d-8ef4-4e43192cc4db` (41 total moves, 4
mistakes at `move_index` 16/18/28/32 — see `research.md` §3). Its blunder ids:

- `52a28158-8603-4ccf-89f4-b9a73b2910f3` (move_index 18, blunder)
- `33f1e7b8-7922-4cfb-a7de-61a44a261a6d` (move_index 28, suboptimal)
- `29ec665b-0787-416f-9cb8-690ec127a346` (move_index 16, suboptimal)
- `2963acad-45e7-4deb-bbb0-2de3726eb8c0` (move_index 32, suboptimal)

Steps:
1. Copy `https://<host>/blunder/52a28158-8603-4ccf-89f4-b9a73b2910f3` and open it in a fresh
   private/incognito tab (no prior in-app navigation).
2. Confirm the header reads **"Move 19 / 41"** (moveIndex 18 → display 19; total 41).
3. Confirm the stepper reads **"2 of 4"** (this mistake is the 2nd by `move_index` order: 16, 18, 28, 32).
4. Confirm "Start new game from here" is present and functional (this is a papergames-owned mistake —
   the historical gap this feature closes).
5. Separately: navigate to `/mistakeDetail` (or `/mistakeDetail/<category>` post-fix) via in-app nav,
   then reload the browser tab directly. Confirm you stay on the category list — no redirect to Home.

## US3 — Navigation & stepper

1. From a Past Games entry, open a mistake via the game's "view mistake" link.
2. Press Back three times. Confirm the trail is mistake → game → past games list → home, with no
   repeated screen.
3. Open the review stepper on a game with ≥2 mistakes (e.g. the SC-002 fixture game). Click Prev/Next
   and confirm the board changes each time. Click a severe-mistake chip and confirm it navigates to
   that mistake's permalink; confirm this also works when the game source is papergames (the fixture
   above is a papergames game — exercises FR-015 directly).

## US4 — "No mistakes" only means no mistakes

1. Find or identify a completed game with 0 `quality: 'blunder'` rows but ≥1 `quality: 'suboptimal'`
   row (e.g. query `blunders` for a game with only `suboptimal` quality — several exist in the
   candidates surfaced during research, e.g. `papergames_game_id = 'a5d40c9e-14a5-46cb-ade8-cdff4bfa2073'`,
   2 suboptimal mistakes, 0 blunders).
2. Confirm Past Games shows a non-zero mistake count for that game and no "no mistakes" text anywhere.

## US5 — No internal leakage

1. Open several mistake explanations spanning different `pattern_category` values.
2. Search the rendered DOM/text for `sev:`, `tree:`, a raw movestring string, `community-`, and any
   `cXrY`-shaped token. Confirm none appear.

## US6 — Highlighting & split-pane

Use the two detector-verified fork boards (movestrings, not hand-constructed — verified via
`detectDoubleThreat` in `server/classifier.js`):

1. `41442625312235115445550126400` — P1 (Green) double threat; detector-reported cells `c1r4`/`c4r3`.
   Open the mistake/explanation surfacing this position; confirm both cells render highlighted.
2. `3333364101252113121524` — P2 (Gray) double threat; detector-reported cells `c5r3`/`c7r2`. Same
   check.
3. Open the Deep Reveal split pane on either mistake and drag the divider from a neutral position up
   past the point that previously caused a shrink/re-enlarge. Confirm the board's zoom level stays
   constant across the full drag range.
