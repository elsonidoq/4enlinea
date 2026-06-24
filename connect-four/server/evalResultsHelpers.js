export function isValidEvalFilename(filename) {
  return /^eval_results_[\w-]+\.jsonl$/.test(filename);
}
