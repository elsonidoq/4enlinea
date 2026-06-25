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
