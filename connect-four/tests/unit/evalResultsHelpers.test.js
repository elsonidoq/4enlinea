import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEvalFilename, feedbackFilenameFor,
  isFvSuffAnswersFile, isReasonEvalSetFile, gradesFilenameFor,
  deriveSetFromAnswers, hasForkRolePrompt,
} from '../../server/evalResultsHelpers.js';

test('accepts valid eval result filenames', () => {
  assert.ok(isValidEvalFilename('eval_set_large_2_results_2026-06-24T01-16-56Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_set_foo_results_2026-06-23T18-41-48Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_set_bar_results_foo-bar.jsonl'));
});

test('rejects path traversal attempts', () => {
  assert.equal(isValidEvalFilename('../index.js'), false);
  assert.equal(isValidEvalFilename('../../.env'), false);
  assert.equal(isValidEvalFilename('eval_results_../secret.json'), false);
  assert.equal(isValidEvalFilename('/etc/passwd'), false);
});

test('rejects filenames with wrong extension', () => {
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.txt'), false);
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.js'), false);
  assert.equal(isValidEvalFilename('eval_results_2026-06-24.json'), false);
  assert.equal(isValidEvalFilename('eval_set.json'), false);
});

test('rejects filenames with empty suffix between prefix and extension', () => {
  assert.equal(isValidEvalFilename('eval_results_.jsonl'), false);
});

test('rejects empty string', () => {
  assert.equal(isValidEvalFilename(''), false);
});

test('feedbackFilenameFor inserts feedback_ after the _results_ segment', () => {
  assert.equal(
    feedbackFilenameFor('eval_set_large_2_nonfiring_lookup_evals_results_2026-06-25T18-00-09Z.jsonl'),
    'eval_set_large_2_nonfiring_lookup_evals_results_feedback_2026-06-25T18-00-09Z.jsonl'
  );
});

test('feedbackFilenameFor preserves the .enriched.jsonl extension', () => {
  assert.equal(
    feedbackFilenameFor('eval_set_large_2_results_2026-06-25T14-42-33Z.enriched.jsonl'),
    'eval_set_large_2_results_feedback_2026-06-25T14-42-33Z.enriched.jsonl'
  );
});

test('feedbackFilenameFor returns null for invalid filenames', () => {
  assert.equal(feedbackFilenameFor('../../.env'), null);
  assert.equal(feedbackFilenameFor('eval_set.json'), null);
});

// ── fv-suff eval-answers browser helpers ──
test('isFvSuffAnswersFile accepts answers files, rejects traversal/extension', () => {
  assert.ok(isFvSuffAnswersFile('fv_suff_answers_2026-06-30T12-00-00Z.jsonl'));
  assert.ok(isFvSuffAnswersFile('fv_suff_answers_all.jsonl'));
  assert.equal(isFvSuffAnswersFile('fv_suff_answers_../secret.jsonl'), false);
  assert.equal(isFvSuffAnswersFile('fv_suff_answers_all.json'), false);
  assert.equal(isFvSuffAnswersFile('../../.env'), false);
  assert.equal(isFvSuffAnswersFile(''), false);
});

test('isReasonEvalSetFile accepts fv_/reason_ eval sets, rejects others', () => {
  assert.ok(isReasonEvalSetFile('fv_eval_set.jsonl'));
  assert.ok(isReasonEvalSetFile('reason_eval_set.jsonl'));
  assert.ok(isReasonEvalSetFile('reason_eval_set_v2.jsonl'));
  assert.equal(isReasonEvalSetFile('eval_set_large_3.json'), false);
  assert.equal(isReasonEvalSetFile('reason_evidence_all.jsonl'), false);
  assert.equal(isReasonEvalSetFile('../x.jsonl'), false);
});

test('gradesFilenameFor appends _grades before .jsonl, null for invalid', () => {
  assert.equal(
    gradesFilenameFor('fv_suff_answers_2026-06-30T12-00-00Z.jsonl'),
    'fv_suff_answers_2026-06-30T12-00-00Z_grades.jsonl'
  );
  assert.equal(gradesFilenameFor('fv_suff_answers_all.jsonl'), 'fv_suff_answers_all_grades.jsonl');
  assert.equal(gradesFilenameFor('eval_set.json'), null);
});

test('deriveSetFromAnswers dedupes by id, keeps {id,pattern_category,feature_vector,promptArm}', () => {
  const answers = [
    { id: 'eval-1', condition: 'A', run_index: 0, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-1', condition: 'A', run_index: 1, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-2', condition: 'B', run_index: 0, pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 } },
  ];
  const set = deriveSetFromAnswers(answers);
  // `promptArm` is null on these rows and that is the point: they are conditions A/B, which carry no
  // `render_decision`, so there is no arm to report. Abstaining is I2 — an absent render decision is
  // missing evidence, NOT evidence of 'control'. The deepEqual is kept exact rather than loosened to
  // a subset match, so the next field added to a set row surfaces here instead of shipping unnoticed.
  assert.deepEqual(set, [
    { id: 'eval-1', pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 }, promptArm: null },
    { id: 'eval-2', pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 }, promptArm: null },
  ]);
});

test('deriveSetFromAnswers skips rows without feature_vector', () => {
  assert.deepEqual(deriveSetFromAnswers([{ id: 'eval-1', pattern_category: 'x' }]), []);
});

// ── promptArm: the old-vs-new comparison arm shown as a chip in /admin/fv-suff ─────────────────
// Derived, never stored, so it works on runs written before it existed. See `hasForkRolePrompt`.
test('hasForkRolePrompt matches the D64 pivot phrase, not the -fork-pivot handle', () => {
  // Both the pre- and post-D64 wording contain "plays to CREATE the fork", which is why the
  // predicate keys on the phrase: it must classify an OLD file and a NEW file identically.
  const preD64 = { zones: { aliases: [{ handle: 'you-fork-pivot', spec: 'future:c2r4',
    role: 'the square you play to CREATE the fork — the move that makes both winning squares live at once' }] } };
  const postD64 = { zones: { aliases: [{ handle: 'you-fork-pivot', spec: 'future:c2r4',
    role: 'the square you play to CREATE the fork — the move that makes a winning square live at once' }] } };
  assert.equal(hasForkRolePrompt(preD64), true);
  assert.equal(hasForkRolePrompt(postD64), true);

  // `fork-pivot-played` shares the HANDLE but not the phrase, and D64 did not touch it. A
  // handle-based predicate over-counts by exactly this shape (eval-36 on the v3retry63 corpus).
  const played = { zones: { aliases: [{ handle: 'you-fork-pivot', spec: 'c6r3',
    role: 'the square your last move just filled — that move is what set up the fork' }] } };
  assert.equal(hasForkRolePrompt(played), false);
});

test('hasForkRolePrompt counts NEAR-TERM fork squares only (D63 left the `future:` ones alone)', () => {
  const nearTerm = { zones: { aliases: [{ handle: 'opp-fork-square', spec: 'c7r1',
    role: 'a square that will finish your opponent\'s four-in-a-row — it completes nothing yet' }] } };
  const future = { zones: { aliases: [{ handle: 'you-fork-square', spec: 'future:c7r6',
    role: 'a single square on your four-in-a-row line — it matters later' }] } };
  assert.equal(hasForkRolePrompt(nearTerm), true);
  assert.equal(hasForkRolePrompt(future), false);
});

test('hasForkRolePrompt abstains on a missing/!malformed render_decision rather than guessing', () => {
  for (const bad of [null, undefined, {}, { zones: {} }, { zones: { aliases: null } }]) {
    assert.equal(hasForkRolePrompt(bad), false);
  }
});

test('deriveSetFromAnswers reads the arm from the first row that HAS a render_decision', () => {
  // On a `--condition all` file the first row per id is condition A, which carries no
  // render_decision. A first-row rule would report null for every record even though the
  // condition-D rows in the same file answer the question.
  const fv = { movestring: '3', playedCol: 1, bestCol: 2 };
  const rd = { zones: { aliases: [{ handle: 'you-fork-pivot', spec: 'c2r1',
    role: 'the square you play to CREATE the fork — the move that makes a winning square live at once' }] } };
  const rows = [
    { id: 'x', condition: 'A', feature_vector: fv },                    // no render_decision
    { id: 'x', condition: 'D', feature_vector: fv, render_decision: rd },
    { id: 'y', condition: 'D', feature_vector: fv, render_decision: { zones: { aliases: [] } } },
    { id: 'z', condition: 'A', feature_vector: fv },                    // never any render_decision
  ];
  const set = deriveSetFromAnswers(rows);
  assert.equal(set.find((r) => r.id === 'x').promptArm, 'treatment');
  assert.equal(set.find((r) => r.id === 'y').promptArm, 'control');
  assert.equal(set.find((r) => r.id === 'z').promptArm, null,
    'no render_decision anywhere for this id -> abstain (I2), never default to "control"');
});
