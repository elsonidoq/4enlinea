# Architecture docs index

Authoritative, up-to-date source for project conventions, API contracts, data models, and architectural decisions. Read the relevant file **before** writing code that touches its area — do not rely on memory summaries, which can be stale.

> Non-obvious traps, open bugs, and behavioral surprises live in auto-memory, **not** here (see the two-destination rule in `CLAUDE.md`). This directory holds the stable conventions and decisions.

## Conventions — mandatory reads (read before touching the matching area)

| Doc | Read before… |
|---|---|
| [api-conventions.md](./api-conventions.md) | adding or changing any endpoint (route naming, request/response shapes, auth) |
| [server-conventions.md](./server-conventions.md) | touching `server/` (error logging, handler structure, helpers) |
| [frontend-conventions.md](./frontend-conventions.md) | touching `src/` (the two CSS custom-property systems, component structure) |
| [data-model.md](./data-model.md) | changing schema, queries, or data shapes (UUID keys, table conventions) |
| [db-schema.md](./db-schema.md) | writing migrations or SQL (live Supabase schema) |
| [testing-conventions.md](./testing-conventions.md) | writing tests (`node:test` + `node:assert/strict`, no Jest/Mocha) |
| [index-conventions.md](./index-conventions.md) | reasoning about 0- vs 1-based indexing across movestrings and coordinates |

## LLM coach & lessons

| Doc | Purpose |
|---|---|
| [llm-coach-endpoints.md](./llm-coach-endpoints.md) | The two live LLM-grounded coaching endpoints and their CLI test harnesses (`llmCoachHelpers.js`) |
| [lesson-editor.md](./lesson-editor.md) | In-app lesson JSON authoring tool at `/admin/lessons` |

## Blunder-`reason` engine — read all four (in order) before touching the engine

The engine lives under `connect-four/server/scripts/reason_engine/`. See `CLAUDE.md` for the mandatory-read rule.

1. [reason-INVARIANTS.md](./reason-INVARIANTS.md) — the constitution: 13 non-negotiable principles (I0 correctness over optimization; I12 validate against full case-space).
2. [reason-DECISIONS.md](./reason-DECISIONS.md) — append-only log of resolved decisions + rationale (D1–D34+). Do not relitigate.
3. [reason-case-taxonomy.md](./reason-case-taxonomy.md) — the authoritative `(bestScore, playedScore)` sign taxonomy (tag-first router runs in front, D20).
4. [blunder-reason-evidence.md](./blunder-reason-evidence.md) — the two-halves evidence engine, validated boards, implementation map.

### Reason engine — supporting docs

| Doc | Purpose |
|---|---|
| [reason-AGENT-PREAMBLE.md](./reason-AGENT-PREAMBLE.md) | Paste-verbatim preamble for any fresh-context reason-engine prompt |
| [reason-engine-pseudocode.md](./reason-engine-pseudocode.md) | Integrated engine pseudocode |
| [reason-tag-fastpath-pseudocode.md](./reason-tag-fastpath-pseudocode.md) | The `tagBlunder` realized/denied router design |
| [reason-render-grounded-prompt.md](./reason-render-grounded-prompt.md) | Presenting the reason vector to the LLM (grounded-render prompt; P1–P4) |
| [feature-vector-glossary.md](./feature-vector-glossary.md) | Glossary the LLM reads to interpret a blunder-reason feature vector |
| [feature-vector-sufficiency-experiment.md](./feature-vector-sufficiency-experiment.md) | The FV-sufficiency apparatus (runs on the blunder-reason vector) |
| [reason-opponentPunishment-spec.md](./reason-opponentPunishment-spec.md) | `opponentPunishment` fork-denial spec (partly superseded by D18) |
| [reason-P4-ablation-runbook.md](./reason-P4-ablation-runbook.md) | P4 A-vs-D ablation hand-off runbook |
| [reason-flip-case-investigation.md](./reason-flip-case-investigation.md) | D28/I12 flip-case gap investigation (CLOSED) |
| [reason-algorithm-restart-prompt.md](./reason-algorithm-restart-prompt.md) | Restart prompt for (re)designing the evidence algorithm |

## Meta

| Doc | Purpose |
|---|---|
| [gap-report.md](./gap-report.md) | Decisions found in code whose original intent could not be fully determined |
