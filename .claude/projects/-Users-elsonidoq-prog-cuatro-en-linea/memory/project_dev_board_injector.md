---
name: project_dev_board_injector
description: DEV-only board injector for Challenge/Sparring QA + the fixture-must-be-non-terminal trap
metadata: 
  node_type: memory
  type: project
  originSessionId: e3a7a7c2-793a-4773-b95b-cfbf38df50ab
---

A DEV-only board injector (all `import.meta.env.DEV`-gated, dead-code-eliminated from prod) lets you
load an arbitrary board into a real Challenge or seed a Sparring game — built to make QA of
solve-time features (e.g. spec 049 puzzle scoring) reachable, since the interesting boards can't be
hit by normal play.

**How to use:**
- Challenge: on the Challenge screen, expand the collapsed `🛠 Dev: load board ▾` bar (fixture
  dropdown of labeled QA boards + custom movestring/category form). Or deep-link
  `/challenge/<category>?devBoard=<movestring>&devMeta=<url-encoded-json>&devCorrectCol=<n>` — the
  **path segment is the authoritative category**; there is no `devCategory` param.
- Sparring: `/game?devBoard=<movestring>&devSide=first|second&devDifficulty=medium` cold-boots a
  seeded game (needs the DEV-only cold-boot exception in `App.jsx`'s mount effect, since `game` is
  session-only and normally redirects home).
- Modules: `src/lib/devFixtures.js` (`DEV_QA_FIXTURES` + `buildDevPuzzle`), `src/lib/devBoardParam.js`
  (`readDevBoardParam`/`parseDevBoardSearch`), `src/components/DevBoardInjector.jsx`. See
  `docs/architecture/frontend-conventions.md` "DEV Board Injector".

**TRAP — DEV fixture boards must be solver-verified non-terminal.** Boards copied from the
per-category *unit* tests (claimeven/figure7_jshape/undercut_overcut.test.js) exercise only the
static predicate functions, which never call the solver — several of those boards are already
*won/terminal* (5–6 in a row). The live `/api/evaluate-move` is solver-backed and **500s
("Invalid position")** on a terminal board, and the Challenge UI then renders the raw key
`challenge.quality.undefined`. Any board destined for a solver-backed endpoint (fixtures, deep-links)
must be a real, non-terminal, solver-verified position — harvest via `gameSampling.js playGame` +
the production detector (`checkUndercutPredicate` etc.), not hand-copied from a predicate unit test.
See also [[feedback_no_random_boards]] and CLAUDE.md "When you need a concrete movestring".
