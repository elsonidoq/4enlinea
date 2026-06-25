---
name: project_sparse_lookahead_unvalidated
description: Sparse look-ahead is two-mode (optimal/mistake) and STILL not eval-validated; case-3 traps (3 searches, latency, pre-move-query tests, DFS budget)
metadata:
  node_type: memory
  type: project
  originSessionId: af7ae640-0a81-4a6c-b3e1-5bf4a296fbfa
---

The sparse-board forward look-ahead engine (`connect-four/server/sparseLookahead.js`) lives on `stagging`. Architecture, the case table, mode selection, and invariants are in `docs/architecture/llm-coach-endpoints.md` → "Sparse-board forward look-ahead" (kept current). This memory holds only the traps not visible from the doc + code.

## Two-mode redesign (2026-06-25) — judged once; fixes from that round NOT re-judged

`runSparseLookahead` queries the **pre-move** position once and picks a strategy from per-column scores: `optScore≥0` → optimal-opponent (cases 1&2); `optScore<0` → case 3 (BOTH a player surviving-slip mistake-mode search AND an optimal-opponent-from-blunder search with the **opponent** as perspective).

**Judged 2026-06-25** via `/judge-deep-reveals` on `eval_set_large_2_nonfiring_lookup_evals` (positions where the look-ahead did NOT fire). Finding: on decisive `outcome_flip` sparse positions the shallow `compareOpportunities` returned `null` (`sparse_no_winner`) because no near-term Tier-1 structure separates the moves — the edge is deep/positional (e.g. center = first-player win). The ungrounded prompt then let the LLM fabricate threats/parity. Fixes applied that round (all on `stagging`, **not yet re-judged**):
- **Case 1&2 deepening:** when the player-structure comparison yields no winner AND the played move actually loses (`blunderScore<0`), fall through to the opponent-punishment search on the played root (same machinery case 3 uses) and return a `case:3` oppTag-only shape. Grounds mid-sparse losses (eval-10 now surfaces a `j_shape` refutation); empty-board openings still null → honest-minimal.
- **INITIAL_GAME depth/budget tier:** `movestring.length ≤ INITIAL_GAME_MS_THRESHOLD(4)` → `INITIAL_GAME_DEPTH(10)`, `INITIAL_GAME_CALL_BUDGET(2000)` — a large one-time search for the handful of opening positions (cached per position). Below `EARLY_GAME_MS_THRESHOLD(8)` → `EARLY_GAME_DEPTH(8)`; else `LOOKAHEAD_DEPTH(4)`. Budget is now per-tier, passed into `searchOpportunities`.
- Prompt-side (not in this file): the `always_include` KB-term mechanism was removed ([[project_kb_major_minor_threat_not_always_include]]); a no-empty-section rule and a `hasGroundedPattern` gate on the "name the pattern" instruction were added; the `drawing_move` grounding rule reworded ([[project_drawing_move_mislabels_wins]]).

## Traps (cost real time)

- **Case 3 = 3 real-solver searches** (vs 2 for cases 1&2), each up to `GLOBAL_CALL_BUDGET` classify calls at depth 8. Anchorless case-3 blunders are noticeably slower end-to-end; the gated e2e (`sparseLookahead.e2e.test.js`, eval-8 = `2031133` = case 3) can take many minutes. Latency is a watch item.
- **Tests/direct calls must control the pre-move query separately.** `runSparseLookahead` calls `solver.query(movestring)` for mode selection. A fake solver returning uniform scores for *every* query routes through the optimal path. Use a solver that returns distinct PRE scores (for `movestring`) vs NODE scores (deeper) to pin the mode — see `preNodeSolver` in `sparseLookahead.test.js`.
- **DFS budget can be exhausted in the first opponent-reply subtree.** `searchOpportunities` is depth-first and only decrements budget at player (classify) nodes; mistake-mode's wide branching at depth 8 can spend the whole budget under the FIRST reply before reaching later replies, so a structure reachable only via a later first-reply silently never surfaces. (Bit me writing a unit test; made the match land on the first-explored reply.)
- **eval-14 (`3333311115555`, case 3) is an honest null even at depth 8** — pure parity/zugzwang win, no Tier-1 geometry to surface. Honest null is correct behavior, not a bug. See [[feedback_deep_reveal_product_mindset]] (sparse ≠ no-reason).
- **e2e `solver.close?.()` is a no-op** — the wrapper exposes `destroy()`, not `close()`, so the e2e leaks `c4solver` child processes on each run. The dev server (`npm run dev`) also owns a `c4solver`; don't kill solver PIDs without checking parentage.
- **Don't conflate "losing position" with `forced_win`.** The mode selector keys on `optScore<0` / `blunderScore<0` = *every move loses to optimal play* (see [[reference_c4solver_score_universality]], max<0 = ALL lose). That is a score fact and is **unrelated** to the `forced_win` *pattern*, which is structural (`detectForcedWin`, no score) — see [[project_blunder_tagging_design]]. Reasoning about branching by score does not mean you're detecting `forced_win`.

**Why this stays in memory:** an agent seeing green unit tests + the arch doc would assume the two-mode feature is validated and cheap; it is neither (prompt wording unjudged; case 3 triples solver work).
