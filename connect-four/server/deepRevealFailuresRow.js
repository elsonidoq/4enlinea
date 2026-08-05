// deepRevealFailuresRow.js — pure builders for the two `deep_reveal_failures` insert shapes
// (spec 058, US2). Extracted out of server/index.js's route handler so the test file
// (server/tests/deepRevealFailuresLogging.test.mjs) exercises the EXACT object the production
// route inserts, not a hand-rolled copy of it (testing-conventions.md, "test the real seam").
//
// Two independent insert shapes, both writing into the same table:
//   - buildTerminalFailureRow: the pre-existing terminal-failure case (callError/parseError/empty
//     mechanism, server/index.js). UNCHANGED shape — this migration/feature never touches it.
//   - buildMissingRequiredSquaresRow: the new case (migration 065) — the coach's retry still
//     omitted a required square. Writes the six new nullable columns plus
//     failure_reason = 'missing_required_squares'. served_attempt is always 2 (FR-009: the second,
//     retried attempt is always the one served, regardless of whether it itself still misses a
//     required square).

export function buildTerminalFailureRow({ positionHash, movestring, col, endpoint, prompt, raw, failureReason }) {
  return {
    position_hash: positionHash,
    movestring,
    col,
    endpoint,
    llm_prompt: prompt,
    raw_llm_output: raw,
    failure_reason: failureReason,
    created_at: new Date().toISOString(),
  };
}

export function buildMissingRequiredSquaresRow({
  positionHash, movestring, col, endpoint, prompt, raw, mechanism, attempt1, missingHandles,
}) {
  return {
    position_hash: positionHash,
    movestring,
    col,
    endpoint,
    llm_prompt: prompt,
    raw_llm_output: raw,
    failure_reason: 'missing_required_squares',
    attempt1_raw_llm_output: attempt1?.raw ?? null,
    attempt1_mechanism: attempt1?.mechanism ?? null,
    attempt2_raw_llm_output: raw,
    attempt2_mechanism: mechanism,
    missing_handles: missingHandles,
    served_attempt: 2,
    created_at: new Date().toISOString(),
  };
}
