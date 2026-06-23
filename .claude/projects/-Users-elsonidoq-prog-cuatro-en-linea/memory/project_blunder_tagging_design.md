---
name: project-blunder-tagging-design
description: Authoritative doc and settled design decisions for the pattern→blunder→challenge tagging system; key invariants that are non-obvious from code alone
metadata: 
  node_type: memory
  type: project
  originSessionId: 0e333f7b-7643-4eee-959f-2f5b34c43c45
---

**Authoritative doc:** `docs/mvp/patterns_blunders_challenges.md` — wins over any older classifier comments.

## Key invariants

**Storage gate is independent of tagging.** A blunder row is stored whenever `scoreMove()` says `quality === 'blunder'`. `tagBlunder` runs after this gate; failure to find a named pattern never prevents storage.

**`unknown` tag is eliminated.** The final catch-all is `suboptimal_move`. Unclassified blunders are stored as `suboptimal_move` so they remain inspectable and can be promoted to named patterns later.

**`forced_win` is a first-class pattern** (not a score-based fallback). Predicate: `solver.score(ms, player) > 0`. Participates in `classifyPattern` registry, appears in both missed-own and enabled-opponent cascades, ranked above `double_threat`. Distinct from `forced_win` as a multi-move puzzle category.

**`tagBlunder` throws `NotABlunderError` on a TERMINAL position** (already won, or 42-move full board) — a precondition violation, surfaced loudly, NOT masked. Callers MUST distinguish it from a solver failure: on `NotABlunderError`, skip the ply / record nothing (never fabricate a `suboptimal_move`); on any OTHER error, fall back to `{ tag: 'suboptimal_move', reason: 'solver error: <msg>' }`. (`NotABlunderError` is exported from `classifier.js`; reference handling in `index.js` / `papergamesImporter.js` / `reprocess_blunders.mjs`.) The old "never throws → degenerate resolves to suboptimal_move" contract is GONE. Also: missed_own now means "correctCol *builds* pattern X, playedCol doesn't" — not the old "had X, lost it". Full phase cascade in docs/architecture/server-conventions.md → tagBlunder. See [[reference_game_simulation_harness]] for fixture sourcing.

**`reason` TEXT column on `blunders` table** (nullable, prerequisite migration). Stores the human-readable explanation from `tagBlunder` (e.g. `"matched missed_own: double_threat"`, `"solver error: timeout"`).

**Anonymous path:** `tagBlunder` always runs (tag computed). The DB write is skipped at the call site when `user_id` is absent — do not gate the `tagBlunder` call itself.

**Three prerequisite migrations before tagging code ships:**
- (a) Update `blunders_pattern_category_check`: add `drawing_move`, `suboptimal_move`, `odd_even_threat`, `claimodd`, `forced_win`; remove `unknown`.
- (b) Add nullable `reason TEXT` column to `blunders`.
- (c) Row relabeling via `reprocess_blunders.mjs` — deferrable.

**Screen 6/8 prompts in scope:** Coach prompts + Deep Reveal labels for `undercut`, `overcut`, `odd_even_threat`, `claimodd` are part of this work (defined in §4 of the source doc), not deferred to a separate UI spec.
