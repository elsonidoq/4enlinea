# Quickstart / Verification: Lesson Learning Surface & Authoring Polish (spec 052)

Run from `connect-four/` unless noted. This is the acceptance walkthrough referenced by each user
story's "Independent Test" in spec.md — run it after implementing that story, and again at the end
against every story together.

## 0. Standing setup (every session, unconditional)

```bash
# From repo root — always, even if you don't think you're in a worktree.
eval "$(./worktree-ports.sh)"
```

Never start/kill a server with a bare `3001`/`5173` or `pkill node`; use `$API_PORT`/`$VITE_PORT`.

## 1. Automated gates (run after every story, and once at the end)

```bash
cd connect-four
npm run test:fast   # NOT `npm test` — that runs candidate-generator.test.js (real solver, 10+ min hang risk)
npm run test:dom
```

Both must be green. `test:dom` and `test:fast` are hardcoded, space-separated file-name lists in
`package.json` — not directory globs — so a new test file that isn't added to the right list simply
never runs (FR-031). Route by suite, not by story:
- **`npm run test:dom`** must include the US1 Socratic hint/phase test(s), the
  `SocraticNarration.dom.test.jsx` rewrite (US1), and the US2 `ChallengeScreen` DOM tests
  (title fallback, `goalPrompt` override, and the no-mismatched-clip assertion for FR-029). These
  are React Testing Library/jsdom tests — `test:fast` has zero `tests/dom/` entries today, so they
  cannot live there.
- **`npm run test:fast`** must include US3's `lessonContent.test.js` changes (REMEDIATED-gate
  removal, i18n-title static scan) and US5's `i18nKeyParity.test.js` namespace-collision guard —
  plain `node --test` unit tests.

Confirm by grepping `package.json` after implementation, not by assuming the file was added:
```bash
grep -o '"test:dom":.*' connect-four/package.json
grep -o '"test:fast":.*' connect-four/package.json
```

## 2. US1 — Socratic hint no longer swallows the reward

**Before writing any fix code**, run the existing test that encodes the bug being removed, to learn
whether it's a red gate or silent rot:
```bash
npm run test:dom -- --test-name-pattern="SocraticNarration"
```
`tests/dom/SocraticNarration.dom.test.jsx`'s "run 2" case currently asserts the *sticky*-hint
behavior as expected (it was written around OI-46, not against it). Once `showHint` starts resetting
on phase change, this case and its header comment must be rewritten to assert the new
hint-yields-to-phase contract (FR-030) — do this rewrite as part of US1, not as a follow-up.

Automated (primary evidence, SC-001):
```bash
npm run test:dom -- --test-name-pattern="SocraticHintPhase"   # or the actual file added
```

Manual (supplementary, per the epic's deliberately-split V7 procedure — **do not** collapse into
one pass):
1. Hint-free run: open a Socratic lesson slide, play the taught correct column directly, confirm
   the `correct` message renders and is spoken.
2. Separate Hint run: reload the same slide, click Hint, then play the taught correct column;
   confirm the `correct` message (not the hint text) renders and is spoken. Then reload again,
   click Hint, play a *wrong* column, and confirm the hint text does not linger alongside the
   wrong-move message.

## 3. US2 — One home for lesson content

**Title, part (a) — every screen renders from the lesson JSON:**
1. Temporarily rename/delete a `lesson.<id>.title` key from `en.json` (do not commit this).
2. Load that lesson via the Saga list, its Concept slides, and its Socratic screen. All three must
   still show the correct title, none blank.
3. Restore the key (or better: confirm it's already removed as part of US2's own change, then skip
   step 1 — this check becomes "the keys are gone and titles still render everywhere").

**goalPrompt, part (b) — the two known-misleading findings are fixed:**
```bash
# Server must be freshly restarted before this check — it caches lessons at boot.
```
1. Navigate to `http://127.0.0.1:$VITE_PORT/clchallenge/claimeven`. Confirm the on-screen prompt no
   longer says "secure a draw" on a board the solver scores as won (re-verify the current
   claimeven lesson file's movestrings with `./visualize_board.sh <movestring>` before asserting
   which board is which — file numbering has drifted before).
2. Navigate to `.../clchallenge/undercut`. Confirm the on-screen prompt no longer names the
   grader-rejected column as the one to play.
3. Confirm a DB-drawn (non-lesson) puzzle in the same categories still shows the original
   outcome-neutral shared-pool prompt (regression guard, FR-008).

**goalPrompt, part (c) — the override is silent, not mis-spoken (FR-029):**
**This step MUST be run manually with audio ON in a real browser session, not under automated
browser tooling.** Per memory `project_app_qa_setup_gotchas`: automation Chrome fakes autoplay, so
audio ships silent under automation regardless of whether the fix is correct — an automated pass
here would prove nothing and must not be reported as verification.
1. With the device volume on and the app's own audio/narration setting enabled, reload the claimeven
   confirmation puzzle from step 1. Confirm no audio clip plays for the coach's prompt message (no
   sound, not the old "secure a draw" clip). Repeat for the undercut puzzle from step 2.
2. Confirm a DB-drawn (non-lesson) puzzle in the same categories still narrates its shared-pool
   prompt audibly, unchanged (regression guard — only override-carrying puzzles go silent).
3. As a faster, harness-safe cross-check, confirm the automated assertion added for FR-029 (no
   `speakCoachMessage`/`lastCoachKeyRef` call when a `goalPrompt` override renders) passes under
   `npm run test:dom` — this is reliable evidence for "the code takes the silent branch," but is
   NOT a substitute for step 1's audible confirmation, since jsdom never plays real audio either way.

## 4. US3 — Verifier/finder hardening

```bash
# Malformed input produces a FAIL row, not a crash:
node server/scripts/verify_lesson_content.mjs   # confirm it completes even if one lesson has a bad movestring (inject one temporarily to prove it, do not commit)

# --help works with zero other args and exits 0:
node server/scripts/find_lesson_boards.mjs --help; echo "exit=$?"

# Re-check specific already-shipped boards against the tightened solver-optimal gate:
node server/scripts/find_lesson_boards.mjs z_threat_socratic --check <movestring>
```

Confirm each matcher touched this pass has a detector-and-side comment (read the file, not a
script). Confirm the `REMEDIATED` set and its three `if (!REMEDIATED.has(...)) continue;` guards are
gone entirely from `tests/unit/lessonContent.test.js` (settled decision — deletion, not a
permanently-empty named constant), and that the file's header comment no longer references it.

## 5. US4 — Editor cosmetics + OI-68 closeout

1. Open `/admin/lessons`, edit a slide's `infoProse` field — confirm it renders in the same font as
   the adjacent coach-message field.
2. Confirm `docs/open_issues.md`'s OI-68 entry reads `✅ RESOLVED <date>` with the "overlays kept
   as-is" rationale and an explicit "no rendering code changed" note.

## 6. US5 — String and KB coverage

```bash
# Spanish sweep:
```
1. Switch the app to Spanish (Settings language selector). Visit `/game?...` or wherever
   `PlayOnlineScreen` is reached; confirm "Play Online" now renders in Spanish.
2. Attempt to introduce a lesson id colliding with a reserved `lesson.*` sub-key (e.g. temporarily
   create `lessons/lesson-16-node.json` with `"id": "node"`, do not commit) and confirm the new
   guard test fails clearly.
```bash
npm run sync-kb
git diff --stat connect-four/server/kb/   # confirm the two OI-62 edits propagated
```
3. Confirm `docs/open_issues.md`'s OI-38 entry states 47/4/43, not "45 of 49."

## 7. Full-suite acceptance (SC-007)

```bash
cd connect-four
npm run test:fast
npm run test:dom
node server/scripts/audit_answer_ambiguity.mjs   # expect 39/39 lessons, unchanged
```

Also confirm every new/modified test file this feature added actually appears in the `test:dom` or
`test:fast` string it belongs to (FR-031) — a file present on disk but absent from both script
strings passes silently with zero coverage and would not be caught by the commands above:
```bash
grep -o '"test:dom":.*\|"test:fast":.*' package.json
```

## 8. Issue closeout audit (SC-008)

```bash
grep -n "^## OI-4[46]\|^## OI-6[2389]\|^## OI-73\|^## OI-19\|^## OI-38" ../docs/open_issues.md
```
Confirm each entry's status line matches the closure/UPDATE convention: OI-46/44/63/69/19/73/62
resolved with a date; OI-68 resolved as a recorded decision; OI-38 left open with the corrected
count and an explicit "translation deferred to a standalone spec" note; a brand-new OI entry exists
for the lesson-editor puzzle-existence check (FR-020).
