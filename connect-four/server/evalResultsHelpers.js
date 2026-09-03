export function isValidEvalFilename(filename) {
  return /^eval_set_[\w-]+_results_[^/\\]+(\.enriched\.jsonl|\.jsonl)$/.test(filename);
}

export function isValidEvalSetFilename(filename) {
  return /^eval_set_[\w-]+\.json$/.test(filename);
}

// Derive the human-feedback sidecar filename for a given eval-results file by
// inserting `feedback_` right after the `_results_` segment. E.g.
//   eval_set_large_2_..._results_2026-06-25T18-00-09Z.jsonl
//     → eval_set_large_2_..._results_feedback_2026-06-25T18-00-09Z.jsonl
// Returns null if `filename` is not a valid eval-results filename.
export function feedbackFilenameFor(filename) {
  if (!isValidEvalFilename(filename)) return null;
  return filename.replace('_results_', '_results_feedback_');
}

// ── Reason-vector LLM-eval browser (/admin/fv-suff "Eval answers" mode) ──────────
// The page joins three files by id: an eval SET ({id, pattern_category, feature_vector},
// from build_fv_eval_set.mjs / build_reason_eval_set.mjs), an ANSWERS jsonl (explain_from_vector.mjs),
// and an optional GRADES jsonl (grade-fv-sufficiency). These validators/derivers guard the filenames.

export function isFvSuffAnswersFile(name) {
  return typeof name === 'string' && /^fv_suff_answers_[\w.-]+\.jsonl$/.test(name);
}

export function isReasonEvalSetFile(name) {
  return typeof name === 'string' && /^(fv|reason)_eval_set[\w.-]*\.jsonl$/.test(name);
}

// Derive the structured-grades sidecar for an answers file (what grade-fv-sufficiency writes):
//   fv_suff_answers_<ts>.jsonl → fv_suff_answers_<ts>_grades.jsonl
// Returns null if `name` is not a valid answers filename.
export function gradesFilenameFor(name) {
  if (!isFvSuffAnswersFile(name)) return null;
  return name.replace(/\.jsonl$/, '_grades.jsonl');
}

// Does this record's prompt contain a role text that D63/D64 rewrote? Derived, never stored — the
// answer is a pure function of the `render_decision` already on every condition-D answers row, so it
// needs no post-processing pass, cannot drift from the file, and works retroactively on runs written
// before this function existed. That is what makes the /admin/fv-suff arm chip trustworthy.
//
// The two changes it detects, and why the predicate is shaped this way:
//   - D64 (OI-227) rewrote the two `-fork-pivot` branches that say "the square <owner> plays to
//     CREATE the fork". Matching on that PHRASE — present verbatim in both the pre- and post-D64
//     wording — rather than on the `-fork-pivot` HANDLE is deliberate: the handle also covers the
//     `fork-pivot-played` branch ("the square your last move just filled"), which D64 did NOT touch.
//     A handle-based predicate over-counts by exactly one record (eval-36) on the v3retry63 corpus.
//   - D63 (OI-225) rewrote NEAR-TERM `-fork-square` roles only. The 9 `future:` fork-squares were
//     deliberately left alone, hence the `future:` spec exclusion.
//
// Verified against the frozen 2026-09-01 corpus (written before either change): 26 treatment / 37
// control, matching a byte-level diff of `assembleGroundedPrompt` output old-vs-new exactly.
//
// SCOPE WARNING: "treatment" here means *these two changes*. Both happened to touch only fork role
// text, which is why one predicate covers them. A later change to a different role must re-derive
// its own arm — do not reuse this one and assume it still marks the right records.
export function hasForkRolePrompt(renderDecision) {
  const aliases = renderDecision?.zones?.aliases;
  if (!Array.isArray(aliases)) return false;
  return aliases.some((a) => /to CREATE the fork/.test(a?.role || ''))
    || aliases.some((a) => /-fork-square(?:-\d+)?$/.test(a?.handle || '')
      && !String(a?.spec ?? '').startsWith('future:'));
}

// Derive the {id, pattern_category, feature_vector, promptArm} eval-set rows the /admin/fv-suff
// Eval-answers browser needs, straight from the answers file (each answer row embeds its
// feature_vector). One row per unique id (first occurrence wins); rows without a feature_vector are
// skipped. `promptArm` is 'treatment' | 'control' per hasForkRolePrompt above, or null on
// conditions A/B/C, which carry no `render_decision` and therefore have no arm to report (never
// guess one — an absent render decision is missing evidence, not evidence of 'control').
export function deriveSetFromAnswers(answerRows) {
  // The arm is read from the first row per id that HAS a render_decision — deliberately not from
  // the first row per id. On a `--condition all` file the first row for an id is condition A, which
  // carries no render_decision, and a first-row rule would report `null` for every record even
  // though the condition-D rows in the same file have the answer.
  const armSource = new Map();
  for (const r of answerRows) {
    if (!r || armSource.has(r.id) || !r.render_decision) continue;
    armSource.set(r.id, r.render_decision);
  }
  const seen = new Set();
  const out = [];
  for (const r of answerRows) {
    if (!r || !r.feature_vector || seen.has(r.id)) continue;
    seen.add(r.id);
    const rd = armSource.get(r.id);
    const promptArm = rd ? (hasForkRolePrompt(rd) ? 'treatment' : 'control') : null;
    out.push({ id: r.id, pattern_category: r.pattern_category, feature_vector: r.feature_vector, promptArm });
  }
  return out;
}
