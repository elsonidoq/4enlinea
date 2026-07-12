/**
 * In-repo OpenAI chat-completion pricing table (spec 047 US5, research.md §7).
 *
 * Rates are USD per 1,000,000 tokens, keyed by the exact model id string sent
 * to OpenAI (never a display label). This table is maintained by hand and can
 * drift from OpenAI's published pricing over time — RATES MUST BE KEPT
 * CURRENT; check https://openai.com/api/pricing/ when adding/adjusting an
 * entry, and update the entry's rates if OpenAI changes them.
 *
 * `estimateCost` NEVER throws: an unrecognized model id logs a warning via
 * logError and returns `null` so the caller can still write a usage row with
 * `cost_usd: null` (a missing price is a data-quality gap, not a reason to
 * drop the row — FR-020, research.md §7).
 */

import { logError } from './logger.js';

// USD per 1,000,000 tokens. Update these constants when OpenAI's published
// pricing changes — this is the single source of truth for cost estimation.
const RATE_TABLE = {
  // Production deep-reveal + offline run_eval model (server/.env OPENAI_MODEL).
  'gpt-5.4-mini': {
    inputPerMillion: 0.25,
    outputPerMillion: 2.0,
  },
  // Offline compute.mjs eval model (server/.env EXPLAIN_MODEL).
  'gpt-5.4': {
    inputPerMillion: 2.5,
    outputPerMillion: 10.0,
  },
};

/**
 * Estimate the USD cost of one OpenAI chat-completion call.
 * @param {string} model - exact OpenAI model id, e.g. 'gpt-5.4-mini'
 * @param {{ promptTokens: number, completionTokens: number }} usage
 * @returns {number|null} USD cost, or null if `model` has no rate-table entry
 *   (never throws — a missing price must never block writing the usage row).
 */
export function estimateCost(model, { promptTokens, completionTokens }) {
  const rates = RATE_TABLE[model];
  if (!rates) {
    logError('[llm-pricing]', new Error(`No rate-table entry for model "${model}"`), { model });
    return null;
  }
  const inputCost = (promptTokens / 1_000_000) * rates.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * rates.outputPerMillion;
  return inputCost + outputCost;
}
