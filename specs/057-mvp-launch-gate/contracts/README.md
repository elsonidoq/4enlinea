# Contracts: MVP Launch Gate

This feature adds **no new API endpoint and changes no request/response shape** on any existing
endpoint. It is explicitly scoped as "removes blockers; does not add features" (epic Settled
Decision 3). Documenting why, per endpoint area, so a later reader does not have to re-derive it:

## US1 — pool health & grading correctness

No endpoint contract changes. `POST /api/admin/candidates/:id/approve`
(`server/index.js:3374`) and `/api/admin/candidates/approve-batch` (`:3430`) are used as-is by the
per-environment promotion remedy (FR-003/FR-004) — their existing request bodies
(`{ goal_prompt, difficulty, cooperative_ai_moves }` / `{ category, goal_prompt, difficulty }`) are
unchanged. `evalOvercut`/`evalUndercut`/`evalZThreat` (`server/predicates.js`) are internal grading
functions, not an HTTP contract — their *behavior* against stale data changes via D1's repair, not
their signature.

## US2 — response-seam text integrity

No endpoint contract change. `stripInternalTokens(text, locale)` (`server/reasonRenderGuard.mjs:41`)
keeps its signature; only `CXRY_RE`'s regex coverage changes (FR-008). If D3 resolves toward wiring
`validateAnnotation` (`server/annotationGate.js:486`) into the live path, that is an internal call
added inside `guardExplainMovePayload`/`guardExplainMoveLlmPayload` — the *served* explanation
payload's shape (`oneLiner`, `patternTag`, `deepReveal`, etc.) does not change; only its content is
more aggressively sanitized. No new response field.

## US3 — billing recovery and conversion

No new route and no new query parameter contract: `?_ptxn=` is a parameter Paddle **already appends**
to its emailed links today (confirmed: nothing in the codebase currently reads it) — FR-013 makes
`/pricing` (`PricingScreen.jsx`) start reading a parameter that was already arriving unused, not
define a new one. `GET /api/user/entitlement`'s existing `authenticated` field (already documented in
`docs/architecture/api-conventions.md:~1034`) is *read by three more callers* (FR-017) — the endpoint
itself is unchanged.

## US4 — grading stability

No endpoint contract change. Whichever way D4 resolves, the client-visible `quality` value shape
(`'blunder' | 'suboptimal'`) is unchanged — only which server-side code path determines it changes.

## US5 — release gate and deploy

Not applicable — this story touches test fixtures, migration application, and an owner-run probe
script, none of which are HTTP contracts.

## Summary

Nothing under this feature requires a new file in `contracts/`. This README is the complete Phase 1
contracts deliverable for this feature — its existence records that the "does this need a
contracts/*.md file" question was asked and answered "no," not skipped.
