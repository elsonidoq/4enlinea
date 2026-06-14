---
name: project_epic2a_implementation
description: "Epic 2a (Challenges: Set Picker + Challenge Board + Tier-1 Feedback) — implementation state, live endpoints, stubs, and known gotchas"
metadata:
  type: project
---

Epic 2a implemented on branch `101-new-design` on 2026-05-31. All 21 tasks complete.

**Why:** Delivers the first interactive Challenges surface — browse sets, solve single-move puzzles, get Tier-1 quality feedback.

**How to apply:** When working on Epic 2b (Deep Reveal, Post-Set Summary), start from these stubs and extend rather than rebuilding.

## What's live

**New server modules**:
- `server/moveQualityScorer.js` — `scoreMove(scores, playedCol)` → `{ badge:'good'|'mid'|'bad', quality:'optimal'|'suboptimal'|'blunder', bestCol }`. Zero deps, pure function. Reuse in Epic 3b.
- `server/challengeSets.js` — `CHALLENGE_SETS` (ordered array) + `CHALLENGE_SET_MAP`. 5 free + 5 Pro sets; no `forced_win`/`forbidden_columns` (Epic 2b).

**New endpoints** (all registered before `GET /api/puzzles/:id`):
- `GET /api/puzzles/counts` → `{ counts: { [category]: number }, sets: ChallengeSet[] }`. No auth. Supabase GROUP BY not used — over-fetches and counts in JS.
- `GET /api/puzzles/draw?category=<slug>&n=8` → `{ puzzles: DrawnPuzzle[] }`. `mixed` checked before `VALID_CATEGORIES`; Pro-gated.
- `POST /api/evaluate-move` `{ movestring, col, category? }` → `{ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag }`. Returns i18n key strings, never resolved English. No auth gate.

**New frontend**:
- `src/lib/board.js` — shared `buildBoard(moves)` → `{ board, heights }`. Extracted from PuzzlesPage; import from here in all new screens.
- `src/screens/SetPickerScreen.jsx` — registered as `setpicker`.
- `src/screens/ChallengeScreen.jsx` — registered as `challenge`. State machine: `loading → pre-move → post-move`. Commit-first move (no confirm). `useStore()` returns `{ store, session, supabase }`.

## Intentional stubs (Epic 2b completes these)

- `handleLearnMore()` in `ChallengeScreen`: anonymous → opens `AuthModal`; quota check hardcoded `false`; eligible users get `console.log('[Epic 2b] Deep Reveal would open here')`.
- `summary` screen is still `PlaceholderScreen`; `go('summary', { results, category })` lands gracefully.
- No Flag icon in Tier-1 strip (Epic 2b scope).

## Known bugs (unfixed as of implementation)

- `src/lib/surfaceGroups.js` maps `setpicker`/`challenge`/`summary` to `'--bg-challenges'` but the CSS token is `--bg-chal` (tokens.css line 44). App-level background is transparent. Fix: change to `'--bg-chal'`.
- `ChallengeScreen.jsx` Hint button uses `t('sparring.hintsOn')` which resolves to `"Hints on"` — should be `"Hint"`. Fix: use `t('common.hint', 'Hint')` or similar.
- `ChallengeScreen.jsx` TopBar title uses `t('setpicker.title')` = "Challenges". Mockup shows no title in challenge screen (only in lessonMode). Cosmetic.

## i18n namespaces added

- `setpicker.*`, `challenge.*` (including `challenge.quality.optimal/suboptimal/blunder`)
- `coach.<category>.prompt.*`, `.hint.*`, `.optimal.*`, `.suboptimal.*`, `.blunder.*` for 5 free categories
- `eval.<category>.optimal.summary.0`, `.suboptimal.summary.0`, `.blunder.summary.0` — canonical Tier-1 summary line convention
