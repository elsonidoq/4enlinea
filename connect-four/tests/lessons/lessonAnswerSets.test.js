// Blocking gate for the answer-set invariant on lesson content (2026-07-28).
//
// Every socratic node and every confirmation challenge in connect-four/lessons/ must satisfy
//     optimalCols ⊆ acceptedCols     and     acceptedCols ∩ optimalCols ≠ ∅
// so a learner is never told a winning move is wrong, and the taught answer always wins.
//
// This exists because the rule was previously enforced nowhere: server/scripts/
// audit_answer_ambiguity.mjs and verify_lesson_content.mjs are manual scripts in neither `test`
// nor `test:fast`, so nothing ran them. The originating bug — lesson 6's first fork challenge
// accepting only 1 of its 3 genuine double-threat columns — sat in shipped content undetected.
//
// The rule itself lives in server/answerSetInvariant.js and is shared with the generation guard
// (candidate-generator.js#checkPredicate); this file only applies it to lesson JSON.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSolverProcess } from '../../server/c4solver-wrapper.js';
import {
  optimalCols, acceptedCols, classifyAnswerSet, isPassing,
} from '../../server/answerSetInvariant.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '..', '..', 'lessons');

const lessons = fs.readdirSync(LESSONS_DIR)
  .filter(f => /^lesson-\d+-.*\.json$/.test(f))
  .sort()
  .map(f => ({ file: f, lesson: JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8')) }));

const show = (cols) => `[${cols.join(',')}] (display ${cols.map(c => c + 1).join(',')})`;

describe('lessonAnswerSets: no lesson board grades a winning move wrong', () => {
  let solver;
  before(() => { solver = createSolverProcess(); });
  after(() => { solver.destroy(); });

  test('lessonAnswerSets: every socratic correctCol is the unique best move', async () => {
    for (const { file, lesson } of lessons) {
      const soc = lesson.socratic;
      if (!soc || typeof soc.movestring !== 'string' || !Number.isInteger(soc.correctCol)) continue;
      const scores = await solver.query(soc.movestring);
      // SocraticScreen.jsx:95 grades with `col === socratic.correctCol` — a single column,
      // client-side, no predicate and no solver. That is only sound while the authored column
      // is the UNIQUE optimum; any tie means a learner playing the tied column is told "Not
      // quite" for a move that wins just as fast.
      const accepted = [soc.correctCol];
      const optimal = optimalCols(scores);
      const verdict = classifyAnswerSet(accepted, optimal, scores);
      assert.ok(
        isPassing(verdict),
        `${file} socratic: ${verdict} — board ${soc.movestring}, ` +
        `accepted ${show(accepted)} vs optimal ${show(optimal)}, scores ${JSON.stringify(scores)}`,
      );
    }
  });

  test('lessonAnswerSets: every confirmation challenge accepts all of its winning moves', async () => {
    for (const { file, lesson } of lessons) {
      for (const [i, ch] of (lesson.confirmationChallenges ?? []).entries()) {
        const category = ch.goalPredicateType || lesson.confirmationCategory;
        const scores = await solver.query(ch.moveString);
        const accepted = acceptedCols(category, ch.moveString, scores, {
          correctCol: ch.correctCol,
          highlightMetadata: ch.highlightMetadata,
        });
        const optimal = optimalCols(scores);
        const verdict = classifyAnswerSet(accepted, optimal, scores);
        assert.ok(
          isPassing(verdict),
          `${file} confirmationChallenges[${i}] (${category}): ${verdict} — board ${ch.moveString}, ` +
          `accepted ${show(accepted)} vs optimal ${show(optimal)}, scores ${JSON.stringify(scores)}`,
        );
      }
    }
  });
});
