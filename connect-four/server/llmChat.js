/**
 * Unified, instrumented OpenAI chat-completion helper (spec 047 US5, FR-017/018/020/021/022/023).
 *
 * Every in-scope OpenAI chat call site (production deep-reveal, offline
 * run_eval, offline compute.mjs eval) is rewritten to call `callOpenAIChat`
 * so token usage and USD cost are recorded uniformly, with zero bespoke
 * per-site logging (FR-023). See
 * specs/047-platform-hardening-cost-observability/contracts/llm-call-helper.md
 * for the authoritative contract this ports.
 *
 * The request shape and the retry-once-on-response_format-rejection behavior
 * are ported verbatim from the pre-existing `defaultCallLLM`
 * (mechanismExplainer.mjs) / `callExplainLLM` (scripts/compute.mjs)
 * implementations. One intentional difference: those two used a *module-level*
 * `useJsonFormat` flag that, once flipped false by a rejection, stayed false
 * for the rest of the process (a single-model-per-module assumption). This
 * helper is now shared across call sites with different models, so the
 * disable-and-retry is scoped to a single `callOpenAIChat` invocation
 * (function-local), not shared process-wide state — this avoids one model's
 * response_format quirk silently degrading a different model's calls.
 */

import { logError } from './logger.js';
import { estimateCost } from './llmPricing.js';
import { recordUsage } from './llmUsageLedger.js';

/**
 * @param {string} prompt
 * @param {object} ctx
 * @param {string} ctx.model - exact OpenAI model id, e.g. 'gpt-5.4-mini'
 * @param {string} ctx.apiKey - process.env.OPENAI_API_KEY, passed explicitly
 * @param {string} ctx.endpoint - which feature/endpoint triggered the call (FR-019)
 * @param {string|null} [ctx.userId] - Supabase user id, or null for offline/CLI calls
 * @param {string} ctx.purpose - why the call was made, e.g. 'deep-reveal'
 * @param {number} [ctx.maxCompletionTokens=4000]
 * @param {boolean} [ctx.useJsonFormat=true]
 * @param {typeof fetch} [ctx.fetchImpl] - DI test seam, defaults to global fetch
 * @param {typeof recordUsage} [ctx.recordUsageImpl] - DI test seam, defaults to
 *   llmUsageLedger.recordUsage — not part of the caller-facing contract, exists
 *   so tests can inject a stub without module-mocking.
 * @returns {Promise<{ content: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } }>}
 */
export async function callOpenAIChat(prompt, {
  model,
  apiKey,
  endpoint,
  userId = null,
  purpose,
  maxCompletionTokens = 4000,
  useJsonFormat = true,
  fetchImpl = fetch,
  recordUsageImpl = recordUsage,
} = {}) {
  let data;
  try {
    data = await requestChatCompletion(prompt, { model, apiKey, maxCompletionTokens, useJsonFormat, fetchImpl });
  } catch (err) {
    logError('[llm-chat]', err, { endpoint, purpose, userId, model });
    throw err;
  }

  const content = data.choices[0].message.content;
  const rawUsage = data.usage || {};
  const usage = {
    promptTokens: rawUsage.prompt_tokens ?? 0,
    completionTokens: rawUsage.completion_tokens ?? 0,
    totalTokens: rawUsage.total_tokens ?? 0,
  };
  const costUsd = estimateCost(model, usage);

  // Fire-and-forget: never awaited, never allowed to affect the caller's
  // response latency or success (data-model.md "Write path").
  void recordUsageImpl({ endpoint, purpose, userId, model, usage, costUsd });

  return { content, usage };
}

/**
 * Perform the actual fetch, with the retry-once-on-response_format-rejection
 * behavior ported from defaultCallLLM/callExplainLLM. Function-local retry
 * (see module doc comment) rather than a shared module-level flag.
 */
async function requestChatCompletion(prompt, { model, apiKey, maxCompletionTokens, useJsonFormat, fetchImpl }) {
  const body = {
    model,
    messages: [{ role: 'user', content: prompt }],
    max_completion_tokens: maxCompletionTokens, // reasoning + output share this budget on gpt-5.x
  };
  if (useJsonFormat) body.response_format = { type: 'json_object' };

  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (useJsonFormat && /response_format/i.test(errBody)) {
      // Model doesn't support json_object — retry once without it.
      return requestChatCompletion(prompt, { model, apiKey, maxCompletionTokens, useJsonFormat: false, fetchImpl });
    }
    throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
  }
  return res.json();
}
