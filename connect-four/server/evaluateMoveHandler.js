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
 * a randomly chosen full key string (e.g. 'coach.immediate_threat.optimal.0').
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

// Factory: builds the POST /api/evaluate-move handler, parameterized on the solver process and
// the i18n translations object (the two values that differ between the live server and a test).
export function createEvaluateMoveHandler({ solver, i18nTranslations }) {
  return async function evaluateMoveHandler(req, res) {
    const { movestring, col, category, correctCol, highlightMetadata } = req.body;

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
      // Get solver scores
      let scores;
      if (movestring === '' || movestring.length === 0) {
        scores = EMPTY_BOARD_SCORES;
      } else {
        scores = await solver.query(movestring);
      }

      // Score the move (bestCol is unused here, same as the original inline handler — kept
      // destructured to match scoreMove's return shape verbatim, prefixed to satisfy lint)
      const { badge, quality, bestCol: _bestCol } = scoreMove(scores, colInt);

      // Classify for pattern tag
      let patternTag;
      if (req.body.aiMove === true) {
        patternTag = await classifyAiMove(movestring, colInt, solver);
      } else {
        const classifyResult = classify(movestring, colInt, scores);
        patternTag = classifyResult?.tag ?? null;
      }

      // Determine phrase pool key (request category takes priority)
      const phrasePoolKey = category || patternTag;

      // Pick i18n keys from pools
      const coachPhraseKey = phrasePoolKey
        ? pickFromPool(i18nTranslations, `coach.${phrasePoolKey}.${quality}`)
        : null;

      const summaryLineKey = phrasePoolKey
        ? pickFromPool(i18nTranslations, `eval.${phrasePoolKey}.${quality}.summary`)
        : null;

      // Determine coach mood
      const coachMoodMap = { optimal: 'happy', suboptimal: 'think', blunder: 'oops' };
      const coachMood = coachMoodMap[quality] ?? 'think';

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
        const predicatePuzzle = buildPredicatePuzzle(category, movestring, { correctCol, highlightMetadata });
        const predicateResult = evaluatePredicate(predicatePuzzle, colInt, scores);
        accepted = predicateResult.result === 'correct' || predicateResult.result === 'tied';
      }

      res.json({ badge, quality, coachPhraseKey, coachMood, summaryLineKey, patternTag, accepted });
    } catch (err) {
      logError('[evaluate-move]', err);
      res.status(500).json({ error: 'internal error' });
    }
  };
}
