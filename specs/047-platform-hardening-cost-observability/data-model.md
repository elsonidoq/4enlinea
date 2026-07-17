# Data Model: Platform Hardening & Cost Observability

This feature introduces exactly one new table. No existing table is modified.

## `llm_usage`

Append-only ledger of every OpenAI chat-completion call made through the unified `llmChat.js` helper
(FR-021). One row per call attempt that **completed successfully** — failed calls are logged (FR-022)
but never produce a row here (no partial/fabricated records).

Migration: `connect-four/server/migrations/056_llm_usage.sql` (next number after `055`).

| Column | Type | Nullable | Notes |
|---|---|---|---|
| `id` | `uuid` | no | PK, `gen_random_uuid()` default |
| `endpoint` | `text` | no | Which feature/endpoint triggered the call, e.g. `'explain-move-llm'`, `'compute-eval'`, `'run-eval'` (FR-019). Free text, not an enum/FK — new call sites add new values without a migration. |
| `purpose` | `text` | no | Why the call was made, e.g. `'deep-reveal'`, `'offline-eval'` (FR-019). |
| `user_id` | `uuid` | **yes** | Supabase user id, when known. Null for offline/CLI calls (US5 AC2) — no FK constraint to `users` to avoid coupling ledger writes to a live user row (analytics table, not a relational one — same rationale as `tracks`). |
| `model` | `text` | no | The exact model id string sent to OpenAI (e.g. `'gpt-5.4-mini'`), never a display label. |
| `prompt_tokens` | `integer` | no | From the OpenAI response's `usage.prompt_tokens`. |
| `completion_tokens` | `integer` | no | From `usage.completion_tokens`. |
| `total_tokens` | `integer` | no | From `usage.total_tokens` (kept as its own column rather than derived, in case OpenAI's total ever diverges from prompt+completion, e.g. reasoning tokens). |
| `cost_usd` | `numeric` | **yes** | Derived via `llmPricing.js`'s rate table for `model`. Null only when `model` has no rate-table entry (research.md §7) — the row is still written; a missing price is a data-quality gap surfaced via a `logError` warning, not a reason to drop the row. |
| `created_at` | `timestamptz` | no | `now()` default. |

**Indexes**: none required beyond the PK for this feature's scope (no dashboard/query FR in-scope —
Out of Scope explicitly excludes a cost-visualization UI). A future consumer can add
`(endpoint, created_at)` or `(user_id, created_at)` indexes without touching this feature.

**RLS**: enabled, deny-by-default, **no policies** — matches every other backend-only table
(`explanation_cache`, `stripe_events`, per migrations `010`/`037`/`055` precedent, F10 positive
control). All access is server-side via the service-role Supabase client (`supabase`, never
`authClient` — see server-conventions.md "Supabase Two-Client Pattern"; this table is written via
`from('llm_usage').insert(...)`, a DB operation, never an `auth.*` call).

**Lifecycle**: append-only, **never truncated or purged by deploy** (FR-021, US5 AC5) — this is the
defining difference from `explanation_cache`, which the deploy pipeline TRUNCATEs (memory
`project_spec039_audio_interactive_coach`). No migration or deploy script may add a TRUNCATE/DELETE
against `llm_usage`.

**Write path**: `server/llmUsageLedger.js` exports `recordUsage({ endpoint, purpose, userId, model,
usage, costUsd })`, called fire-and-forget from `llmChat.js` after a successful OpenAI response (never
awaited by the caller of `callOpenAIChat` — see `contracts/llm-call-helper.md`). Errors inside
`recordUsage` are caught and logged via `logError('[llm-usage-ledger]', err, { endpoint, purpose })`
internally; they never propagate to the LLM caller (a ledger-write failure must not fail or delay the
user-facing LLM response).
