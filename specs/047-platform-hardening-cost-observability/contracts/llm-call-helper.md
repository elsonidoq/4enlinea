# Contract: Unified OpenAI-Chat Call Helper (`server/llmChat.js`)

This is an **internal** contract (a function signature, not an HTTP API) — it is the interface every
in-scope OpenAI chat call site is rewritten to use (FR-017), and the interface any future OpenAI chat
call site should use to inherit telemetry automatically (FR-023).

## Signature

```js
async function callOpenAIChat(prompt, {
  model,             // string, required — the exact OpenAI model id (e.g. 'gpt-5.4-mini')
  apiKey,            // string, required — process.env.OPENAI_API_KEY, passed explicitly (no implicit env read
                      //   inside the helper — keeps it unit-testable without env mutation)
  endpoint,           // string, required — which feature/endpoint triggered the call (FR-019)
  userId = null,      // string | null — Supabase user id, or null for offline/CLI calls (FR-019, US5 AC2)
  purpose,            // string, required — why the call was made, e.g. 'deep-reveal', 'offline-eval' (FR-019)
  maxCompletionTokens = 4000,  // number — caller-overridable; defaultCallLLM/callExplainLLM both use
                                //   4000 today, callLLM (llmCoachHelpers.js) uses 400 — preserve per-caller budgets
  useJsonFormat = true,        // boolean — caller-overridable; only the two reason-engine callers need
                                //   response_format: { type: 'json_object' } — callLLM's prose output does not
  fetchImpl = fetch,           // function — DI test seam (see Decision below); defaults to global fetch
}) → Promise<{ content: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } }>
```

Throws on any non-2xx OpenAI response or network failure — same as all three current implementations
(`callLLM`, `defaultCallLLM`, `callExplainLLM` all currently throw `Error('OpenAI API error ...')` on
`!res.ok`). Callers' existing try/catch blocks are unchanged.

## Behavior

1. **Retry-on-`response_format`-rejection** (module-level `useJsonFormat` flag per model call site, not
   global — see Open Question below): if `useJsonFormat` is requested and the response body matches
   `/response_format/i`, retries once without `response_format`, mirroring the existing
   `defaultCallLLM`/`callExplainLLM` behavior exactly (ported, not redesigned).
2. On success:
   - Returns `{ content, usage }` where `content = data.choices[0].message.content` and `usage` is
     mapped from OpenAI's response `usage.prompt_tokens` / `usage.completion_tokens` / `usage.total_tokens`.
   - Computes `costUsd` via `llmPricing.estimateCost(model, usage)` (research.md §7 — null if the model
     has no rate-table entry).
   - Fire-and-forget: `llmUsageLedger.recordUsage({ endpoint, purpose, userId, model, usage, costUsd })`
     — **not** awaited; a ledger-write failure or delay must never affect the caller's response latency
     or success (Constitution V; data-model.md "Write path").
3. On failure: logs via `logError('[llm-chat]', err, { endpoint, purpose, userId, model })` **and**
   re-throws. No `recordUsage` call happens — no partial/fabricated ledger row (FR-022).

## Callers (all three edited in place)

| Call site | File | Context passed |
|---|---|---|
| Production deep-reveal | `mechanismExplainer.mjs`, `defaultCallLLM` becomes a thin wrapper calling `callOpenAIChat(prompt, { model, apiKey, endpoint: 'explain-move-llm', userId, purpose: 'deep-reveal' })` — see the two named edit points below; both MUST be made together or `userId` silently persists as `null` for every production deep-reveal call, defeating US5 AC1. |
| Offline eval harness | `llmCoachHelpers.js`, `callLLM(prompt)` becomes `callOpenAIChat(prompt, { model: process.env.OPENAI_MODEL, apiKey: process.env.OPENAI_API_KEY, endpoint: 'run-eval', userId: null, purpose: 'offline-eval', maxCompletionTokens: 400, useJsonFormat: false })` — `run_eval.mjs`'s two call sites (lines 212, 235) destructure `{ content }` from the new return shape instead of treating the old return as a bare string. |
| Offline compute/eval | `scripts/compute.mjs`'s `callExplainLLM` is **deleted**; `runLlm()` calls `callOpenAIChat(prompt, { model, apiKey: process.env.OPENAI_API_KEY, endpoint: 'compute-eval', userId: null, purpose: 'offline-eval' })` directly (imported from `llmChat.js`). |

### userId threading for the production deep-reveal call site (two edit points, both required)

`computeMechanism` (`mechanismExplainer.mjs:99`, `export async function computeMechanism(movestring, col,
{ solver, model, callLLM } = {})`) currently has no user-context parameter, and its internal default-call
closure (`mechanismExplainer.mjs:106`, `const call = callLLM ?? ((p) => defaultCallLLM(p, { model, apiKey:
process.env.OPENAI_API_KEY }))`) does not forward one either. The route that calls it
(`POST /api/explain-move-llm`, `index.js:1083`, `const result = await computeMechanism(movestring, col, {
solver, model: process.env.OPENAI_MODEL })`) already has `req.user` populated at this point (checked at
`index.js:1036`, `if (!req.user) return res.status(401)...`) but does not currently pass it through. Both
edits are required, not optional or interchangeable — fixing only one leaves `userId` as `null`:

1. **`mechanismExplainer.mjs`**: add `userId = null` to `computeMechanism`'s destructured options object
   (`{ solver, model, callLLM, userId = null } = {}`) and forward it into the internal call closure at
   line 106 (`defaultCallLLM(p, { model, apiKey: process.env.OPENAI_API_KEY, endpoint: 'explain-move-llm',
   userId, purpose: 'deep-reveal' })`), and update `defaultCallLLM`'s own signature (line 29,
   `export async function defaultCallLLM(prompt, { model, apiKey })`) to accept and forward `{ endpoint,
   userId, purpose }` into `callOpenAIChat`.
2. **`index.js:1083`**: the route's call to `computeMechanism` must add `userId: req.user.id` to the options
   object it passes (`req.user` is guaranteed non-null at this point per the `index.js:1036` guard, so no
   additional null-check is needed here — but `computeMechanism`'s own default of `userId = null` must stay,
   since `computeMechanism` has other/test callers that don't pass one).

## Testability

`connect-four/tests/unit/llmChat.test.js` (new — matches the `tests/unit/adminAuth.test.js`
convention in server-conventions.md; see plan.md Project Structure. NOT `connect-four/server/tests/unit/`,
which does not exist — `connect-four/package.json`'s `test`/`test:fast` scripts also require this file be
added explicitly to both script lists, since they do not auto-discover files; see tasks.md T002) injects
`fetchImpl` (see Decision
above) and a stub `recordUsage`, asserting: (a) a successful call returns `{ content, usage }`;
(b) `recordUsage` is called with the right `costUsd` for a known model; (c) an unpriced model still
returns a row with `costUsd: null` and logs a warning; (d) a thrown fetch error propagates and
`recordUsage` is never called; (e) the `response_format` retry fires exactly once, not in a loop.

## Decision: `fetch` dependency injection (resolved)

`callOpenAIChat` accepts an optional `fetchImpl = fetch` parameter (default: the global `fetch`),
mirroring the `lessonAudio.js` `{ synthesize = ... }` DI pattern documented in
`server-conventions.md`'s "Admin Batch-Generation Modules" section. This makes the helper
unit-testable without a global `fetch` mock, consistent with that documented precedent. This does not
change the FR-017–023 contract surface — `fetchImpl` is a test seam, not part of the caller-facing
`{ model, apiKey, endpoint, userId, purpose, ... }` context object.
