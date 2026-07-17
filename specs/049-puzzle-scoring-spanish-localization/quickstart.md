# Quickstart / Manual Verification

## Puzzle scoring (US9.1–US9.2)

1. `cd connect-four && npm run test:fast` — must be green before starting (baseline).
2. After implementation, run `npm run test:fast` again — new/updated tests in
   `tests/integration/evaluateMoveMultiSolution.test.js` and the six-category coverage added by
   US9.1 task 6 must pass.
3. Manual verification (Constitution III — UI features need golden-path + edge-case manual check):
   - Load the app locally, navigate to a `z_threat` puzzle via `./visualize_board.sh
     3333302444422222060315555054` to confirm the board, then play column 0 in the Challenge
     screen (via a challenge session drawing this board, or `/admin/curate`/dev tooling to force
     it) — verdict must read "wrong", not "correct".
   - Same for repro board 2 (`3333334512266550121166`), playing the taught column (0) — verdict
     must read "correct", not "Suboptimal"; SFX/coach mood must agree.
   - Spot-check one of the other five categories (e.g. `undercut`) end-to-end: correct move →
     "correct" verdict + correct SFX; killing column → "wrong".

## Spanish localization (US9.3–US9.4)

1. `npm run test:fast` after `es.json` translation is complete — the new
   `tests/unit/i18nKeyParity.test.js` must pass (only possible once translation is complete, per
   the required sequencing US9.3 → US9.4).
2. Manual verification: switch app language to Spanish (Settings), walk through Home, a
   Challenge/puzzle, the Coach, Settings, and Onboarding screens — no leftover English text in
   translated sections, no raw `t()` keys rendered, disc-color text reads verde/gris.
3. Regression check for the guard test: temporarily delete one key from `es.json`, confirm
   `node --test tests/unit/i18nKeyParity.test.js` fails with a clear missing-key message, then
   restore the key and confirm it passes again (SC-004).
