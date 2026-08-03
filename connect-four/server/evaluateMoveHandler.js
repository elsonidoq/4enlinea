// Spec 049 (Epic 9) T007a / Plan.md Decision D1.
//
// Extracted, side-effect-free factory for the POST /api/evaluate-move route handler. The handler
// body itself is moved here verbatim from server/index.js (post T004/T005/T006 edits); only
// `solver` and `i18nTranslations` — the two values that differ between the live server and a
// test — become factory parameters. Everything else the handler needs is a pure import, imported
// directly inside this module (never injected), per the task's explicit instruction.
//
// IMPORTANT: this module MUST remain importable in isolation without booting the production
// server. Do NOT export this factory from server/index.js, and do NOT add any module-level
// side effects here (no app.listen(), no solver process creation) — server/index.js has no
// exported `app` and boots the full production server (with a live solver process) at import
// time; importing THIS module must never trigger that. See memory
// project_integration_test_slowness and tests/integration/evaluateMoveMultiSolution.test.js's
// header comment for why this separation exists.

import { classify } from './classifier.js';
import { classifyAiMove } from './classifyAiMove.js';
import { scoreMove } from './moveQualityScorer.js';
import { evaluatePredicate, buildPredicatePuzzle } from './predicates.js';
import { SINGLE_ANSWER_CATEGORIES, MULTI_SOLUTION_CATEGORIES } from './categories.js';
import { logError } from './logger.js';

const EMPTY_BOARD_SCORES = [0, 0, 1, 2, 1, 0, 0];
const MOVES_RE = /^[0-6]{0,42}$/;

function isValidCol0(col) {
  return Number.isInteger(col) && col >= 0 && col <= 6;
}

/**
 * Navigate a nested translations object by dot-separated prefix and return
 * a randomly chosen full key string (e.g. 'coach.spoken.immediate_threat.optimal.0').
 * Returns null if the prefix resolves to a non-object or empty object.
 */
function pickFromPool(translations, prefix) {
  const parts = prefix.split('.');
  let node = translations;
  for (const part of parts) {
    if (!node || typeof node !== 'object') return null;
    node = node[part];
  }
  if (!node || typeof node !== 'object') return null;
  const keys = Object.keys(node);
  if (keys.length === 0) return null;
  const idx = Math.floor(Math.random() * keys.length);
  return `${prefix}.${keys[idx]}`;
}

// Factory: builds the POST /api/evaluate-move handler, parameterized on the solver process, the
// i18n translations object, and (Spec 051 US3 T050) the supabase client used by the stored-set
// grading branch. `supabase` may be undefined (e.g. some tests) — the stored-set branch is only
// reached when req.body.puzzleId is present, and every call site that sends puzzleId also has a
// live supabase client threaded through.
// Everything about the /api/evaluate-move response EXCEPT `accepted`. Both grading branches
// (stored-set and computed-live) shape their response through this one function, because the two
// branches differ *only* in how `accepted` is derived — badge/quality/patternTag/coach keys/mood
// are identical by definition. Keeping it in one place is not cosmetic: the sequence below was
// previously written out verbatim in both branches, so any future change to the coach-key
// derivation or the mood map applied to only one of them would silently make the same move grade
// differently depending on whether the request carried a `puzzleId` — which, post-backfill, is the
// difference between almost every real puzzle drill and every lesson inline challenge.
async function buildEvaluationResponse({ movestring, colInt, category, isAiMove, solver, i18nTranslations }) {
  const scores = (movestring === '' || movestring.length === 0)
    ? EMPTY_BOARD_SCORES
    : await solver.query(movestring);

  // bestCol is unused here, same as the original inline handler — kept destructured to match
  // scoreMove's return shape verbatim, prefixed to satisfy lint.
  const { badge, quality, bestCol: _bestCol } = scoreMove(scores, colInt);

  let patternTag;
  let classifyPhrasePoolKey = null;
  if (isAiMove) {
    patternTag = await classifyAiMove(movestring, colInt, solver);
  } else {
    const classifyResult = classify(movestring, colInt, scores);
    patternTag = classifyResult?.tag ?? null;
    // US3 (spec 052): classify() surfaces a distinct phrasePoolKey (e.g. 'forfeited_win') when
    // this drawing_move forfeited a forced win, without changing `tag` itself (contracts C5).
    classifyPhrasePoolKey = classifyResult?.phrasePoolKey ?? null;
  }

  // classify()'s Category 3/4/6 tags (double_threat, forced_win, figure_7, j_shape) fire ONLY on
  // an absent→present transition — the tag itself already asserts "this move just built the
  // pattern", regardless of how `quality` (a pure score-rank comparison against the best-scoring
  // column) happens to land. Their coach.spoken/eval pools are shared with other callers
  // (ChallengeScreen's "did you pick the correct completing cell" semantics for figure_7/j_shape;
  // the historical double_threat/forced_win praise-on-best-move-only semantics) where
  // 'suboptimal'/'blunder' mean "you did NOT build it" — reusing those tiers verbatim for a
  // creation-tag would tell a player who just built the pattern that a different column would
  // have built it instead (verified live: playing a fork/figure_7-creating move that still scored
  // below some unrelated best column rendered "Good move, but a different column creates two
  // threats at once" / "...builds the Figure-7").
  //
  // Resolution depends on how bad the move actually is, because these categories are NOT
  // score-gated — a move can create a fork and still throw the game (verified: `060550303021255625`
  // col 3 creates a double_threat scoring -12 against a +12 best; `34510362124443001124000` col 1
  // is a losing j_shape):
  //   - suboptimal: the move DID build the pattern and is genuinely good, just not top-scoring —
  //     promote to the 'optimal' pool so the copy stops contradicting itself.
  //   - blunder: never praise a game-losing move. Drop the pattern-specific pool entirely and fall
  //     back to the generic blunder pool, which is score-truthful and makes no claim about the
  //     pattern either way.
  // POOL SELECTION only — `quality`/`badge` in the response stay score-based for any other
  // consumer (e.g. move-quality stats).
  const CREATION_ONLY_TAGS = new Set(['double_threat', 'forced_win', 'figure_7', 'j_shape']);
  const isCreationTag = !isAiMove && CREATION_ONLY_TAGS.has(patternTag);
  const suppressCreationPraise = isCreationTag && quality === 'blunder';
  const poolQuality = (isCreationTag && !suppressCreationPraise) ? 'optimal' : quality;

  // Category takes priority over the classifier's tag; classify()'s own phrasePoolKey signal
  // (forfeited-win) takes priority over the plain patternTag fallback, ahead of the generic
  // 'drawing_move' pool key it would otherwise resolve to.
  const phrasePoolKey = suppressCreationPraise
    ? (category || 'generic')
    : (category || classifyPhrasePoolKey || patternTag);

  const coachPhraseKey = phrasePoolKey
    ? pickFromPool(i18nTranslations, `coach.spoken.${phrasePoolKey}.${poolQuality}`)
    : null;
  const summaryLineKey = phrasePoolKey
    ? pickFromPool(i18nTranslations, `eval.${phrasePoolKey}.${poolQuality}.summary`)
    : null;
  const coachMoodMap = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
  const coachMood = coachMoodMap[poolQuality] ?? 'think';

  // `scores` is returned for the caller's own `accepted` derivation; it is NOT part of the
  // response body (see api-conventions.md — the stored set and raw scores never ship to a client).
  return { scores, response: { badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag } };
}

export function createEvaluateMoveHandler({ solver, i18nTranslations, supabase }) {
  return async function evaluateMoveHandler(req, res) {
    const { movestring: bodyMovestring, col, category: bodyCategory, correctCols: bodyCorrectCols, highlightMetadata: bodyHighlightMetadata, puzzleId } = req.body;

    let movestring = bodyMovestring;
    let category = bodyCategory;
    let correctCols = bodyCorrectCols;
    let highlightMetadata = bodyHighlightMetadata;

    // Spec 051 US3 (FR-024/FR-024a/FR-025): stored-set grading branch. When puzzleId is present,
    // look up the row and grade directly against its stored correct_cols — the seven pattern
    // evaluators (evaluatePredicate/buildPredicatePuzzle) are never consulted for this branch.
    // If correct_cols is NULL (not yet backfilled), fall through to the computed-live branch
    // below using the row's own category/move_string/correct_cols/highlight_metadata as inputs
    // (fail-open, not an error). Absence of puzzleId is unchanged — it always selects the
    // pre-existing computed-live branch (Decision D2 / FR-028).
    if (puzzleId) {
      let puzzle = null;
      if (supabase) {
        const { data } = await supabase
          .from('puzzles')
          .select('id, category, move_string, highlight_metadata, correct_cols')
          .eq('id', puzzleId)
          .eq('is_active', true)
          .single();
        puzzle = data;
      }

      // A puzzleId that resolves to no active row falls through to the computed-live branch rather
      // than failing the request. This deviates deliberately from T051's original "404 if not found"
      // instruction, for the same reason FR-024a makes a NULL correct_cols fail open: a live drill
      // must never be broken by a row the server can't find. The request still carries
      // movestring/category/correctCol/highlightMetadata, so computed-live grading is fully
      // possible and loses nothing — whereas a 404 silently killed grading feedback entirely
      // (ChallengeScreen commits the phase change before the response lands, so the learner saw
      // no error, just nothing). This is what OI-84 reported against lesson confirmation
      // challenges, every one of whose authored puzzleIds resolves to zero rows today.
      // The warn keeps the underlying data bug observable instead of hiding it.
      if (!puzzle) {
        console.warn(`[evaluate-move] puzzleId ${puzzleId} did not resolve to an active puzzles row — falling through to computed-live grading`);
      }

      if (puzzle && puzzle.correct_cols != null) {
        // Stored-set branch: grade directly, no evaluator call at all.
        try {
          const colInt = typeof col === 'number' ? col : parseInt(col, 10);
          if (!isValidCol0(colInt)) {
            return res.status(400).json({ error: 'invalid col' });
          }

          const { response } = await buildEvaluationResponse({
            movestring: puzzle.move_string,
            colInt,
            category: puzzle.category,
            isAiMove: req.body.aiMove === true,
            solver,
            i18nTranslations,
          });

          // The ONE thing that makes this branch different: correctness comes straight from the
          // stored set. The seven pattern evaluators are never consulted (FR-024/Decision D2a).
          const accepted = puzzle.correct_cols.includes(colInt);

          return res.json({ ...response, accepted });
        } catch (err) {
          logError('[evaluate-move]', err);
          return res.status(500).json({ error: 'internal error' });
        }
      }

      // FR-024a: not yet backfilled — fall through to the computed-live branch below, sourcing
      // its inputs from the row itself rather than the request body.
      // When the id resolved to no row at all (the warn above), there is nothing to source from,
      // so the request body's own fields stand as-is — that is exactly the pre-existing
      // computed-live input shape, which is what a lesson inline challenge already sends.
      if (puzzle) {
        movestring = puzzle.move_string;
        category = puzzle.category;
        correctCols = puzzle.correct_cols ?? [];
        highlightMetadata = puzzle.highlight_metadata ?? null;
      }
    }

    // Validate movestring
    if (typeof movestring !== 'string' || !MOVES_RE.test(movestring)) {
      return res.status(400).json({ error: 'invalid movestring' });
    }

    // Validate col
    const colInt = typeof col === 'number' ? col : parseInt(col, 10);
    if (!isValidCol0(colInt)) {
      return res.status(400).json({ error: 'invalid col' });
    }

    try {
      // Shared with the stored-set branch above — see buildEvaluationResponse's header for why
      // this must not be inlined per-branch again.
      const { scores, response } = await buildEvaluationResponse({
        movestring,
        colInt,
        category,
        isAiMove: req.body.aiMove === true,
        solver,
        i18nTranslations,
      });

      // Spec 044 US3 / FR-015a (multi-solution) + Spec 049 (Epic 9) FR-001–FR-012
      // (single-answer): for these nine categories, add an additive `accepted` field computed
      // via evaluatePredicate against the taught-pattern metadata (either recomputed correctness
      // for multi-solution boards, or client-sent stored puzzle metadata for the six
      // single-answer categories) rather than the raw scoreMove quality comparison. This is
      // recomputed at solve time — no persistence, no schema change — and gated strictly to
      // these categories so no other category's response shape changes. Does NOT touch
      // quality/badge/coachPhraseKey/coachMood/summaryLineKey/patternTag, which have other
      // callers (ChallengeScreen.jsx and others) — see server-conventions.md.
      let accepted = null;
      if (MULTI_SOLUTION_CATEGORIES.has(category) || SINGLE_ANSWER_CATEGORIES.has(category)) {
        const predicatePuzzle = buildPredicatePuzzle(category, movestring, { correctCols, highlightMetadata });
        const predicateResult = evaluatePredicate(predicatePuzzle, colInt, scores);
        accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied';
      }

      res.json({ ...response, accepted });
    } catch (err) {
      logError('[evaluate-move]', err);
      res.status(500).json({ error: 'internal error' });
    }
  };
}
