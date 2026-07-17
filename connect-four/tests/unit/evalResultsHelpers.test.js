import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEvalFilename, feedbackFilenameFor,
  isFvSuffAnswersFile, isReasonEvalSetFile, gradesFilenameFor,
  deriveSetFromAnswers,
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

test('deriveSetFromAnswers dedupes by id, keeps {id,pattern_category,feature_vector}', () => {
  const answers = [
    { id: 'eval-1', condition: 'A', run_index: 0, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-1', condition: 'A', run_index: 1, pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-2', condition: 'B', run_index: 0, pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 } },
  ];
  const set = deriveSetFromAnswers(answers);
  assert.deepEqual(set, [
    { id: 'eval-1', pattern_category: 'win_to_draw', feature_vector: { case: 'win_to_draw', bestCol: 1 } },
    { id: 'eval-2', pattern_category: 'draw_to_lose', feature_vector: { case: 'draw_to_lose', bestCol: 3 } },
  ]);
});

test('deriveSetFromAnswers skips rows without feature_vector', () => {
  assert.deepEqual(deriveSetFromAnswers([{ id: 'eval-1', pattern_category: 'x' }]), []);
});
