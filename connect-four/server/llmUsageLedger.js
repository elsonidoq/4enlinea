/**
 * LLM usage ledger writer (spec 047 US5) — inserts one row per successful
 * OpenAI chat-completion call into the append-only `llm_usage` table
 * (migration 056). See specs/047-platform-hardening-cost-observability/
 * data-model.md "Write path".
 *
 * Called fire-and-forget from server/llmChat.js — a ledger-write failure or
 * delay must NEVER propagate to the LLM caller (FR-021). All internal errors
 * are caught and logged here via logError('[llm-usage-ledger]', ...).
 *
 * Lazily creates its own service-role Supabase client (DB operations only,
 * per server-conventions.md's "Supabase Two-Client Pattern" — never the
 * auth-purposed `authClient`), rather than depending on index.js's
 * module-scope singleton, so this module stays independently importable and
 * `node --test`-able without booting the Express app.
 */

import { logError } from './logger.js';

let cachedClient = null;
let cachedClientPromise = null;

async function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (cachedClientPromise) return cachedClientPromise;

  cachedClientPromise = (async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    const { createClient } = await import('@supabase/supabase-js');
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return cachedClient;
  })();

  return cachedClientPromise;
}

/**
 * Insert one row into `llm_usage`. Never throws — any failure (missing env,
 * network, DB error) is caught and logged internally.
 *
 * @param {object} params
 * @param {string} params.endpoint - which feature/endpoint triggered the call
 * @param {string} params.purpose - why the call was made
 * @param {string|null} params.userId - Supabase user id, or null
 * @param {string} params.model - exact OpenAI model id
 * @param {{ promptTokens: number, completionTokens: number, totalTokens: number }} params.usage
 * @param {number|null} params.costUsd - from llmPricing.estimateCost, or null
 * @returns {Promise<void>}
 */
export async function recordUsage({ endpoint, purpose, userId, model, usage, costUsd }) {
  try {
    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('llm_usage').insert({
      endpoint,
      purpose,
      user_id: userId ?? null,
      model,
      prompt_tokens: usage.promptTokens,
      completion_tokens: usage.completionTokens,
      total_tokens: usage.totalTokens,
      cost_usd: costUsd ?? null,
    });
    if (error) throw error;
  } catch (err) {
    logError('[llm-usage-ledger]', err, { endpoint, purpose });
  }
}
