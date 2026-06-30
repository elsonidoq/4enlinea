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
