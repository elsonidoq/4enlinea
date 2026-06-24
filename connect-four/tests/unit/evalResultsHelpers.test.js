import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEvalFilename } from '../../server/evalResultsHelpers.js';

test('accepts valid eval result filenames', () => {
  assert.ok(isValidEvalFilename('eval_results_2026-06-24T01-16-56Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_results_2026-06-23T18-41-48Z.jsonl'));
  assert.ok(isValidEvalFilename('eval_results_foo-bar.jsonl'));
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
