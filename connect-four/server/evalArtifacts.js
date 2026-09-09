// OI-176 — where the reason-evidence / fv-suff eval artifacts actually live.
//
// The four read-only, localhost-admin browser endpoints in server/index.js
// (`GET /api/admin/reason`, `/api/admin/reason/files`, `/api/admin/fv-suff`,
// `/api/admin/fv-suff/files`) resolved filenames against `server/scripts/` only.
// Every artifact currently in the checkout — `reason_evidence_*.jsonl`,
// `fv_suff_answers_*.jsonl`, `*_grades.jsonl`, `fv_eval_set.jsonl` — sits in the
// `fv_suff/` SUBdirectory, and the handlers' `basename()` traversal guard threw that
// subdirectory away, so every read was an ENOENT 404 and both file pickers listed `[]`.
//
// Why TWO directories rather than simply repointing at `fv_suff/`: the producer still
// writes into `server/scripts/`. `server/scripts/compute.mjs:308` is verbatim
// `  const answersOut = join(__dirname, \`fv_suff_answers_${inputStem}_${ts}.jsonl\`);`
// and `:111` `    : join(__dirname, \`reason_evidence_${inputStem}.jsonl\`);` — with
// `__dirname` = `server/scripts`. The existing artifacts were relocated into `fv_suff/`
// after the fact. Pointing the endpoints at `fv_suff/` alone would surface today's files
// but hide the output of the very next `compute.mjs` run; searching both makes the
// browsers correct under either layout. `fv_suff/` is searched first, so a relocated copy
// wins over a same-named leftover.
//
// `basename()` stays the traversal guard — it is applied inside `resolveArtifactPath`,
// so no call site can reintroduce a path segment.
import { basename, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync } from 'node:fs';
import { isFvSuffAnswersFile } from './evalResultsHelpers.js';

/** `server/scripts` — where compute.mjs writes new runs. */
export const SCRIPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'scripts');
/** `server/scripts/fv_suff` — where the committed/relocated artifacts live. */
export const FV_SUFF_DIR = join(SCRIPTS_DIR, 'fv_suff');
/** Search order for every artifact read and every picker listing. */
export const EVAL_ARTIFACT_DIRS = [FV_SUFF_DIR, SCRIPTS_DIR];

/**
 * Union listing of the artifact directories, filtered by `predicate`, de-duplicated by
 * filename (earlier directory wins) and sorted ascending. Never throws: a directory that
 * does not exist (e.g. a deployed image that ships no eval artifacts) contributes nothing.
 */
export function listArtifacts(predicate, dirs = EVAL_ARTIFACT_DIRS) {
  const seen = new Set();
  for (const dir of dirs) {
    let entries;
    try { entries = readdirSync(dir); } catch { continue; }
    for (const name of entries) {
      if (predicate(name)) seen.add(name);
    }
  }
  return [...seen].sort();
}

/**
 * The answers files the "Eval answers" picker offers: `fv_suff_answers_*.jsonl` minus the
 * `_grades.jsonl` sidecars (which `isFvSuffAnswersFile`'s pattern also matches, and which
 * the page loads implicitly via `gradesFilenameFor`).
 */
export function listAnswersFiles(dirs = EVAL_ARTIFACT_DIRS) {
  return listArtifacts((f) => isFvSuffAnswersFile(f) && !f.endsWith('_grades.jsonl'), dirs);
}

/**
 * Absolute path of `name` in the first artifact directory that has it, or `null` if no
 * directory does (callers turn that into the endpoint's existing 404). Any path segment in
 * `name` is stripped first — this is the traversal guard.
 */
export function resolveArtifactPath(name, dirs = EVAL_ARTIFACT_DIRS) {
  const safe = basename(String(name));
  for (const dir of dirs) {
    const candidate = join(dir, safe);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

// Run stamps are `2026-07-06T19-08-35Z` (colons are illegal in filenames, so `-`).
const RUN_TIMESTAMP = /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z/g;

/**
 * Pick the newest file of a listing, by the LAST run timestamp embedded in its name.
 *
 * Plain lexical order is wrong here and would pick an old run: these names are
 * `fv_suff_answers_<source-stem>_<run-stamp>.jsonl`, so the source stem dominates a lexical
 * sort (`fv_suff_answers_eval28_2026-07-02…` sorts after every `…_boards_coverage_…_2026-07-06…`,
 * i.e. lexical-last is the OLDEST run in this checkout). The trailing stamp is the run time,
 * so that is what we order on; names carrying no stamp sort first (they can only win if
 * nothing else is present). Returns null for an empty list.
 */
export function newestAnswersFile(files) {
  if (!Array.isArray(files) || files.length === 0) return null;
  const stampOf = (name) => {
    const found = String(name).match(RUN_TIMESTAMP);
    return found ? found[found.length - 1] : '';
  };
  let best = files[0];
  for (const f of files.slice(1)) {
    const a = stampOf(best);
    const b = stampOf(f);
    if (b > a || (b === a && f > best)) best = f;
  }
  return best;
}
