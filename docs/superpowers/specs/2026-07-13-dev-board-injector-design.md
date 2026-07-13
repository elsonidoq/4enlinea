# Design: DEV board injector for Challenge & Sparring

**Date**: 2026-07-13
**Status**: Approved (brainstorm complete)
**Motivation**: QA of spec 049 (puzzle scoring-by-pattern, OI-1) requires loading specific board
positions — the two OI-1 z_threat repro boards and one board per single-answer category — into a
real Challenge session to verify the `accepted`-gate verdict, coach message, SFX, badge, and win
overlay. These positions cannot be reached by normal play. This design adds a DEV-only board
injector so a human or a QA agent can load an arbitrary board (fixture or hand-typed) into a
Challenge, and seed an arbitrary starting position into a Sparring (live-AI) game.

Not shippable to production: every surface is gated behind `import.meta.env.DEV`, which Vite
dead-code-eliminates from the production bundle (same convention as the AuthModal "🛠 Dev: skip
auth" button at `src/components/AuthModal.jsx:55`).

## Goals

- Load any board into a Challenge session via **(a)** a fixture dropdown, **(b)** a custom
  movestring+category form, or **(c)** a `?devBoard=…` deep-link URL — reusing the production
  evaluate-move path so the verdict/coach/SFX/badge behavior under test is the real one.
- Seed any starting position into a Sparring game via a `?devBoard=…` URL param only (no panel).
- Zero footprint in the production build and zero clutter on the normal screens (collapsed by
  default).

## Non-goals (YAGNI)

- Persisting dev boards across reloads.
- Auto-deriving taught-pattern metadata via a server call (explicitly rejected — would break the
  "no server change" constraint and add solver load). Custom single-answer boards without
  metadata will read "wrong"; the panel warns about this inline.
- Any UI panel on the Sparring/game screen (sparring is URL-param only, by request).
- A prod-visible surface of any kind.

## Key decisions (locked during brainstorm)

1. **Placement**: collapsed `🛠 Dev: load board ▾` bar at the top of `ChallengeScreen`, plus a
   `?devBoard=…&devCategory=…` deep-link that `ChallengeScreen` reads on load. (Challenge is not a
   session-only screen, so the deep-link cold-boots without any router change.)
2. **Custom metadata**: the custom form has optional `correctCol` and `highlightMetadata (JSON)`
   fields with an inline hint that single-answer categories need metadata or the verdict reads
   "wrong". No blocking validation beyond well-formedness (valid movestring, parseable JSON).
3. **Sparring**: URL-param only, reusing `GameScreen`'s existing `initialMoves` prop. Needs one
   DEV-gated exception in `App.jsx`'s cold-boot logic because `game` is session-only.

## Architecture

Six units (four new, two edited):

| # | Unit | New/edit | Purpose |
|---|------|----------|---------|
| 1 | `src/lib/devFixtures.js` | new | Frozen QA board fixtures + baked-in metadata |
| 2 | `src/lib/devBoardParam.js` | new | Shared `?devBoard…` URL-param parser (DEV-only) |
| 3 | `src/components/DevBoardInjector.jsx` | new | Collapsed fixture+custom panel (Challenge only) |
| 4 | `src/screens/ChallengeScreen.jsx` | edit | Render panel; DEV branch in `loadPuzzles` (prop or URL param) |
| 5 | `src/screens/GameScreen.jsx` | edit (likely none) | Receives `initialMoves` via App.jsx params |
| 6 | `src/App.jsx` | edit | DEV cold-boot exception for `/game?devBoard=` |

### 1. `src/lib/devFixtures.js` (new)

Exports `DEV_QA_FIXTURES`: an array of frozen QA boards. Each entry:

```js
{
  label,             // human-readable, states the taught column and expected verdict for a probe
  movestring,        // 0-indexed movestring for the pre-move position
  category,          // one of the puzzle category slugs
  correctCol,        // present for claimeven/figure_7/j_shape
  highlightMetadata, // present for z_threat/undercut/overcut
  taughtCol,         // the column that IS the taught pattern (for the tester's reference)
}
```

Preloaded fixtures (seven), sourced **verbatim** from the passing integration-test fixtures — each
entry carries a provenance comment naming its source file so it cannot silently drift:

- `z_threat` — OI-1 board 1: `3333302444422222060315555054`, `highlightMetadata { type:'capsule',
  column:6, fromRow:1, toRow:5, badgeCount:5 }`, taughtCol 6. (Probe: play col 0 → WRONG.)
  Source: `tests/integration/evaluateMoveMultiSolution.test.js` / `singleAnswerCategoriesAccepted.test.js`.
- `z_threat` — OI-1 board 2: `3333334512266550121166`, `highlightMetadata { column:0, fromRow:1,
  toRow:3, badgeCount:3 }`, taughtCol 0. (Probe: play col 0 → CORRECT, not Suboptimal.)
- `claimeven` — board + `correctCol` from `tests/integration/claimeven.test.js`.
- `figure_7` — `041015021326`, `correctCol 2` (from `tests/integration/figure7_jshape.test.js:27`).
- `j_shape` — `04101502`, `correctCol 1` (from `tests/integration/figure7_jshape.test.js:39`).
- `undercut` — board + `highlightMetadata.cells` (role `killing_threat`) from
  `tests/integration/undercut_overcut.test.js`.
- `overcut` — board + `highlightMetadata.cells` (role `major_threat`) from
  `tests/integration/undercut_overcut.test.js`.

Also exports a pure `buildDevPuzzle({ movestring, category, correctCol, highlightMetadata })`
helper that returns the inline puzzle object shape (below) — used by both the panel and the URL
path.

### 2. `src/lib/devBoardParam.js` (new)

`readDevBoardParam(search = window.location.search)` → `{ movestring, correctCol,
highlightMetadata, side, difficulty } | null`.

- Returns `null` immediately when `!import.meta.env.DEV` or no `devBoard` key is present.
- Parses: `devBoard` (movestring), `devCorrectCol` (int), `devMeta` (URL-encoded
  JSON → `highlightMetadata`; on parse failure returns the field as `undefined` and logs a dev
  warning, does not throw), `devSide`, `devDifficulty`. There is no `devCategory` param: for the
  Challenge deep-link the verdict category comes from the `/challenge/:category` path segment
  (authoritative), never from a query param.
- One param contract shared by all three consumers (Challenge deep-link, sparring cold-boot,
  panel's URL builder), so the format never diverges.

### 3. `src/components/DevBoardInjector.jsx` (new, DEV-only)

Collapsed `🛠 Dev: load board ▾` disclosure. Props: `onLoad(puzzleObj, category)`.

Expanded state has two sub-sections:

- **Fixture dropdown** — options from `DEV_QA_FIXTURES` (label as text). Selecting + "Load" builds
  the inline puzzle via `buildDevPuzzle` from the fixture and calls `onLoad`.
- **Custom form** — `movestring` text, `category` select (all `VALID_CATEGORIES`), optional
  `correctCol` number, optional `highlightMetadata (JSON)` text, and an inline note shown when a
  single-answer category is selected with both metadata fields blank. Validates the movestring
  (`/^[0-6]{0,42}$/`) and the JSON (`JSON.parse`) before loading; shows an inline red error and
  does not load on bad input.

Styling mirrors the dashed-border, muted "Dev: skip auth" button convention. Component is only
ever rendered inside an `import.meta.env.DEV` guard, so it is dead-code-eliminated from prod.

### 4. `src/screens/ChallengeScreen.jsx` (edit)

- Render `{import.meta.env.DEV && <DevBoardInjector onLoad={handleDevLoad} />}` at the top of the
  screen.
- `handleDevLoad(puzzleObj, category)` → `go('challenge', { category, devPuzzles: [puzzleObj] })`
  — re-navigates so the `category` prop (hence `effectiveCategory` and the accepted-gate) is
  correct for the loaded board.
- New DEV branch at the top of `loadPuzzles()`, in priority order:
  1. If the `devPuzzles` prop is present → use it via the existing client-side inline construction
     path (the same code path as `confirmationChallenges`), `sessionIdRef.current = null`.
  2. Else if `import.meta.env.DEV` and `readDevBoardParam()` returns non-null → `buildDevPuzzle`
     from the params and use that.
  3. Else the normal `GET /api/puzzles/draw`.
- Accept a new `devPuzzles` prop (default `undefined`).

Inline puzzle object shape (reuses the proven `confirmationChallenges` mapping):

```js
{ id:`dev-${movestring}`, category, move_string: movestring,
  interaction_mode: 'single_move', highlight_metadata, correct_col, user_player: undefined }
```

### 5. `src/screens/GameScreen.jsx` (edit — likely none)

`GameScreen` already destructures `initialMoves` and feeds it to `useGameBoard({ initialMoves })`.
The sparring seed arrives as `initialMoves` in the cold-boot params set by App.jsx (unit 6), so
GameScreen likely needs no change. If, during implementation, params don't flow cleanly, the
fallback is a one-line DEV read: `initialMoves || (import.meta.env.DEV ? readDevBoardParam()?.movestring ?? '' : '')`.

### 6. `src/App.jsx` (edit — one DEV-gated exception)

In the mount effect (`App.jsx:25-41`), `game` is session-only so it currently resolves to `home`
on cold boot. Add a DEV-gated exception: when `import.meta.env.DEV && screenKey === 'game' &&
readDevBoardParam()` is present, keep `game` and set:

```js
resolvedParams = {
  difficulty: devParam.difficulty ?? <app default difficulty>,
  side:       devParam.side ?? 'first',
  initialMoves: devParam.movestring,
};
```

The production path is byte-identical (the whole branch is inside an `import.meta.env.DEV` guard).
This is the one load-bearing-routing touch; keep it minimal and fully guarded.

## Data flow

```
Challenge:
  Fixture dropdown ─┐
  Custom form ──────┼→ buildDevPuzzle() → handleDevLoad → go('challenge',{category,devPuzzles})
  ?devBoard= URL ───┘                                          │
                                             ChallengeScreen.loadPuzzles() DEV branch
                                               → existing inline construction → normal play
                                               → POST /api/evaluate-move (UNCHANGED production path)

Sparring:
  /game?devBoard=333333&devSide=first
     → App.jsx DEV cold-boot exception → GameScreen initialMoves=333333
     → useGameBoard seeds board → live AI play continues (UNCHANGED production path)
```

No server change. The evaluate-move and sparring gameplay paths under test are exactly the
production ones — that is the whole point of injecting rather than mocking.

## Error handling

- Custom form: invalid movestring or malformed metadata JSON → inline red error, no load.
- Single-answer custom board with no metadata → loads, but the inline hint already warned the
  verdict will read "wrong" (fail-closed is correct behavior, not a bug).
- URL param with malformed `devMeta` JSON → logged dev warning, `highlightMetadata` treated as
  absent (fail-closed), does not throw or white-screen.
- Sparring cold-boot with a `devBoard` whose parity implies it is the AI's turn → handled by
  `useGameBoard`'s existing initial-AI-move logic (same as any `initialMoves`).

## Testing

- Pure unit test on `buildDevPuzzle()` — correct inline-puzzle shape from inputs, for a
  `correctCol` category and a `highlightMetadata` category.
- Anti-drift guard test: every `DEV_QA_FIXTURES` entry carries the metadata its category requires
  (single-answer → has `correctCol` or `highlightMetadata`; the two z_threat fixtures have
  `highlightMetadata.column`).
- Pure unit test on `readDevBoardParam()` — returns `null` outside DEV / with no `devBoard`;
  parses a full param set; tolerates malformed `devMeta`.
- The `DevBoardInjector` component and the App.jsx/ChallengeScreen DEV branches are DEV-only and
  dead-code-eliminated from prod; no heavier UI/integration testing warranted.

## Rollout / verification

After implementation, verify by: `/challenge/z_threat?devBoard=3333334512266550121166&devMeta=%7B%22column%22%3A0%7D`
loads OI-1 board 2 and playing col 0 reads CORRECT (not Suboptimal) with a congruent coach
message; the fixture dropdown loads all seven boards; `/game?devBoard=<any>&devSide=first`
cold-boots a seeded sparring game; and a production `vite build` contains none of the DEV strings
(`Dev: load board`, `DEV_QA_FIXTURES`).

Note: the `z_threat` category above comes from the path segment (`/challenge/z_threat`), which is
the sole and authoritative source of verdict category for the Challenge deep-link — there is no
`devCategory` query param.
