// OI-176 — /admin/fv-suff opened on a raw "Error: 404 Not Found" and both of its file
// pickers were empty.
//
// Two independent causes, both covered here:
//   1. All four admin eval endpoints (`GET /api/admin/reason[/files]`,
//      `GET /api/admin/fv-suff[/files]`) resolved filenames against `server/scripts/`, while
//      every artifact they serve sits in `server/scripts/fv_suff/`. `basename()` (the traversal
//      guard) discarded the subdirectory, so every read ENOENT'd and every listing was `[]`.
//   2. `GET /api/admin/fv-suff` defaulted to the literal `fv_suff_answers_all.jsonl` — a name
//      no run has ever produced and which exists nowhere in the repo — so that endpoint 404'd
//      even once the directory was right.
//
// The `[SCRIPTS_DIR]`-only assertions below are the old code path written out explicitly: they
// are what the shipped handlers did, and they show the bug is a directory bug rather than a
// missing file. Live pre-fix evidence (all four endpoints curled against the running server:
// two 404s and two empty listings) is in
// .superpowers/sdd/qa-2026-09-08-remediation/batch-G.md — jsdom/node:test cannot boot
// server/index.js (it spawns the solver and listens), so the HTTP layer is verified there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { basename, dirname, sep } from 'node:path';

import {
  SCRIPTS_DIR,
  FV_SUFF_DIR,
  EVAL_ARTIFACT_DIRS,
  listArtifacts,
  listAnswersFiles,
  newestAnswersFile,
  resolveArtifactPath,
} from '../../server/evalArtifacts.js';
import { isFvSuffAnswersFile } from '../../server/evalResultsHelpers.js';

// Same predicate as server/index.js's local `isReasonEvidenceFile`.
const isReasonEvidenceFile = (name) => /^reason_evidence_[\w.-]*\.jsonl$/.test(name);

test('the artifact search order is fv_suff/ first, then scripts/', () => {
  assert.deepEqual(EVAL_ARTIFACT_DIRS, [FV_SUFF_DIR, SCRIPTS_DIR]);
  assert.equal(dirname(FV_SUFF_DIR), SCRIPTS_DIR);
  assert.equal(basename(SCRIPTS_DIR), 'scripts');
  assert.ok(SCRIPTS_DIR.endsWith(`server${sep}scripts`), SCRIPTS_DIR);
});

test('OI-176: the default evidence file resolves — and did NOT under the old scripts/-only lookup', () => {
  const name = 'reason_evidence_all.jsonl'; // GET /api/admin/reason's default
  const resolved = resolveArtifactPath(name);
  assert.ok(resolved, `${name} must resolve to a real path`);
  assert.ok(existsSync(resolved));
  assert.equal(dirname(resolved), FV_SUFF_DIR);

  // The shipped bug, spelled out: the old handlers only ever looked in server/scripts/.
  assert.equal(
    resolveArtifactPath(name, [SCRIPTS_DIR]),
    null,
    'the file is genuinely absent from server/scripts/ — this is what produced the 404',
  );
});

test('OI-176: both pickers list real files (they returned [] before)', () => {
  const evidence = listArtifacts(isReasonEvidenceFile);
  assert.ok(evidence.length > 0, 'reason-evidence picker must not be empty');
  assert.ok(evidence.includes('reason_evidence_all.jsonl'));
  assert.deepEqual([...evidence].sort(), evidence, 'listing must be sorted');
  for (const f of evidence) assert.ok(resolveArtifactPath(f), `${f} must resolve`);

  const answers = listAnswersFiles();
  assert.ok(answers.length > 0, 'answers picker must not be empty');
  for (const f of answers) {
    assert.ok(isFvSuffAnswersFile(f), `${f} must pass the endpoint's own validator`);
    assert.ok(!f.endsWith('_grades.jsonl'), `${f}: grade sidecars are loaded implicitly, not listed`);
    assert.ok(resolveArtifactPath(f), `${f} must resolve`);
  }

  // Old listings were a single non-recursive readdirSync over server/scripts/.
  assert.deepEqual(listArtifacts(isReasonEvidenceFile, [SCRIPTS_DIR]), []);
  assert.deepEqual(listAnswersFiles([SCRIPTS_DIR]), []);
});

test('OI-176: the old hardcoded answers default names a file that exists nowhere', () => {
  assert.equal(resolveArtifactPath('fv_suff_answers_all.jsonl'), null);
});

test('newestAnswersFile picks by run stamp, not lexically (lexical-last is an OLD run here)', () => {
  // Two real filenames from server/scripts/fv_suff/. The eval28 one is lexically LAST
  // (`e` > `b` in the source stem) but its run stamp is 2026-07-02; the other ran 2026-07-06.
  const older = 'fv_suff_answers_eval28_2026-07-02T14-51-23Z.jsonl';
  const newer = 'fv_suff_answers_boards_coverage_opening_2026-07-05T18-58-35Z_2026-07-06T19-08-35Z.jsonl';
  assert.ok(older > newer, 'precondition: the older run sorts lexically last');
  assert.equal(newestAnswersFile([older, newer]), newer);
  assert.equal(newestAnswersFile([newer, older]), newer, 'result must not depend on input order');
  assert.equal(newestAnswersFile([]), null);
  assert.equal(newestAnswersFile(undefined), null);
});

test('the served default is a file the picker itself offers, and it exists', () => {
  const answers = listAnswersFiles();
  const chosen = newestAnswersFile(answers); // exactly what GET /api/admin/fv-suff defaults to
  assert.ok(chosen, 'a default must be derivable from the listing');
  assert.ok(answers.includes(chosen), 'the default must be selectable in the picker');
  assert.ok(existsSync(resolveArtifactPath(chosen)));
});

test('resolveArtifactPath keeps basename() as the traversal guard', () => {
  assert.equal(resolveArtifactPath('../../package.json'), null);
  assert.equal(resolveArtifactPath('/etc/passwd'), null);
  // A path segment is stripped, not honoured: this still lands on the artifact directory.
  assert.equal(
    resolveArtifactPath('../../nowhere/reason_evidence_all.jsonl'),
    resolveArtifactPath('reason_evidence_all.jsonl'),
  );
});
