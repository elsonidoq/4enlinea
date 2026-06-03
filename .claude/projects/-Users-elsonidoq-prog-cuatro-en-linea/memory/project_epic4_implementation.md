---
name: project_epic4_implementation
description: Epic 4 lesson infrastructure implementation state — screens, API, lessonLoader, known gotchas
metadata:
  type: project
---

Epic 4 (Lesson Infrastructure & Saga Map) is fully shipped on branch `101-new-design`.

**Why:** Delivers the four lesson screens and lesson API as infrastructure for Epic 5 (lesson content).

**How to apply:** When working on lesson content (Epic 5) or extending the lesson flow, start from this state.

## What's built

- `connect-four/lessons/` — lesson JSON directory (has `lesson-01-immediate-threat.json` test file)
- `server/lessonLoader.js` — startup file loader; `loadLessons()`, `getLessons()`, `getLesson()`
- `GET /api/lessons` + `GET /api/lessons/:id` — public endpoints, no auth
- `src/lib/board.js` — exports `boardSpecToBoard(boardSpec)` (`'g'`→`'red'`, `'d'`→`'yellow'`)
- `src/lib/socraticReducer.js` — pure 4-phase reducer (`ask|wrong1|wrong2|correct`)
- `src/screens/SagaScreen.jsx` — lesson list, 4 node states, UpgradeModal for locked
- `src/screens/ConceptScreen.jsx` — slide carousel, static Board, legend row, infoProse
- `src/screens/SocraticScreen.jsx` — 4-phase board challenge, 1500ms auto-advance with cleanup
- `src/screens/CLChallengeScreen.jsx` — thin wrapper passing `lessonMode={true}` to ChallengeScreen
- `src/screens/ChallengeScreen.jsx` — extended with `lessonMode` props (6 edit sites)
- All four screen keys (`saga`, `concept`, `socratic`, `clchallenge`) wired in `screenRegistry.jsx`
- `src/i18n/en.json` — `socratic.*` and `lesson.confirmation.*` keys added

## Known gotchas

- **`lessons/` is at `connect-four/lessons/`** (not repo root). Server uses `join(__dirname, '../lessons')` where `__dirname` is `connect-four/server/`.
- **`ChallengeScreen` `category` is undefined in lesson mode** — any code in that component that reads `category` directly (not `effectiveCategory = lessonMode ? confirmationCategory : category`) will produce raw i18n keys. Already fixed in `initPuzzle` and `handleNext`; watch for future additions.
- **`join` not `path.join`** — `server/index.js` imports `{ dirname, join }` from `'path'`, not the `path` namespace. Use `join(...)` directly.
