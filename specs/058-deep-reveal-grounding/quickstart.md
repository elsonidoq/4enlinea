# Quickstart: Deep-Reveal Grounding

How to exercise each user story's Independent Test locally, once its tasks are implemented. This is a
verification quickstart, not a build/install guide.

**Hard prerequisite**: Plan A's `stripInternalTokens`/`RANGE_RE` widening
(`connect-four/server/reasonRenderGuard.mjs`) and its `GET /api/user/tts/deep-reveal` sanitizer
routing must already be merged. If `git log --oneline -- connect-four/server/reasonRenderGuard.mjs`
does not show Plan A's en-dash `RANGE_RE` fix, stop and wait — this epic is written against the
post-Plan-A version of that file and must not duplicate or race it.

## Before any story

```bash
cd /Users/elsonidoq/prog/cuatro_en_linea
eval "$(./worktree-ports.sh)"
cd connect-four
npm run test:fast   # baseline: 0 failures (per CLAUDE.md, confirmed since 2026-08-04)
```

## US1 — future-square handle offered

```bash
# Re-run one of the 4 motivating staging boards through the condition-D pipeline and inspect the
# offered alias set for a future-square (deep fork-cell) entry:
node --experimental-vm-modules server/scripts/compute.mjs --movestring 3154442332131341225551 --col <playedCol> \
  --condition D --dry-run-offer   # exact flag TBD at task time; see compute.mjs's existing CLI surface
```
Independent Test success (spec.md US1): the offered `aliases[]` for this board includes an entry for
`forkCells: ["c2r6","c5r5"]` (the epic's own evidence row) marked distinct from a present-tense
structural handle.

## US2 — required set mandatory + retry

```bash
node --test server/tests/mechanismExplainer.test.mjs   # extended with a required-set-miss fixture
```
Independent Test success: a synthetic first-attempt answer omitting a required handle triggers exactly
one retry naming the miss; the second attempt is always what `computeMechanism` returns as
`mechanism`, regardless of whether it still misses.

## US3 — nothing ungrounded reaches the player

```bash
node --test server/tests/reasonRenderGuard.test.mjs   # extended: promoteRawCoordinates, allowedSet
                                                        # threading, SPAN_CARRYING_CODES 'P5strong'
node --test tests/annotationGate.test.js               # checkP5Strong: windows: branch + future: prefix
                                                        # (verified the file that owns checkP5Strong's
                                                        # existing P1-P5Strong coverage today)
```
Independent Test success: a synthetic explanation with (a) a raw un-highlighted `cNrM` that IS
offered promotes to a real `[zone:cNrM]` highlight that survives `checkP5Strong`, (b) a raw
un-highlighted `cNrM` that is NOT offered gets promoted then rejected by `checkP5Strong`, falling
back to the same flattened "column N" prose as today (no residual `[zone:...]` tag — verify this
explicitly, since a leftover wrapper here would be a regression `stripInternalTokens` alone would
have caught before this feature), and (c) a highlight naming a cell outside the offered set is
stripped **and does not reach the player** (this specifically requires `SPAN_CARRYING_CODES`
including `'P5strong'` — before that fix, this case would log a warning but still serve the
highlight) — all independent of US2's retry logic.

## US4 — board numbering on deep-reveal only

```bash
npm run dev   # or the worktree-scoped equivalent using $VITE_PORT
```
Open a past-mistake with a Deep Reveal available, tap "Learn more" to open `DeepRevealPane`. Confirm
the board (`MistakeDetailScreen.jsx:410`) shows column/row numbers. Navigate to any other Board.jsx
caller (e.g. `/challenge`) and confirm no visible change (spec FR-015, SC-007).

## End-to-end acceptance (epic AC1)

For each of the 4 staging movestrings in `docs/epics/deep-reveal-grounding-epic.md`'s evidence table
(`3154`, `315444233213`, `315444233213134122`, `3154442332131341225551`), re-run the explanation
through the deployed pipeline (not a hand-written fixture) and confirm every named square/line/future
square carries a highlight, per SC-001.
