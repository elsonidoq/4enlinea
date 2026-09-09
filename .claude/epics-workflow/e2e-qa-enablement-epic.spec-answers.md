## Blocking issue 1 — FR-023/FR-024 vs the Out of Scope bullet (contradiction; work verifiably undone)
Answer: Accept recommendation (auto-applied — no alternative). Delete the retraction and
worktree-bootstrap clauses from the final `Out of Scope` bullet, keeping ONLY the
`connect-four/.env.local` token item, which really is done. Add a line to FR-023 and FR-024 noting
these were verified still-undone (checked at source: `specs/057-mvp-launch-gate/spec.md:99` and
`docs/open_issues.md:3779` still assert Paddle "does not work locally";
`.claude/skills/app-qa/references/environment.md` still prints the wrong `scripts/set-tier.js` path
and has no worktree-bootstrap or rate-limit section) so no task treats them as pre-satisfied.
IMPORTANT EXCEPTION — do not re-add work that IS done: `environment.md` now HAS a
"Paddle sandbox checkout — test cards" section (added 2026-09-07 by the orchestrator, at
`environment.md:116`). FR-023's `environment.md` corrections are NF3 (set-tier.js path + tier-flip
snippet), NF6 (worktree bootstrap) and NF7 (rate limits) ONLY. No requirement or task may ask for
test-card documentation — it exists.

## Blocking issue 3(b) — cache-reset function naming
Answer: Accept recommendation (auto-applied — no alternative), NARROWED after checking at source.
The critique overstated this: FR-010 does NOT name a function — it reads "The system MUST NOT
introduce a server-reachable cache-invalidation call as part of rollback observability; the
documented page reload is the sole mechanism", which is correct as written. The two
`invalidateEntitlement()` mentions in the spec (`spec.md:52`, `:129`) are in the NEGATIVE sense
("client-only code no server can call", and NF2's original verbatim wording) and are also correct.
Do NOT rewrite those into `clearEntitlement()` — that would corrupt NF2's verbatim text and the
decision-7 rationale.
What TO apply: add the missing rationale to FR-010 (and to Settled decision 7's note in the spec)
that even a soft in-page invalidation would be INSUFFICIENT — `invalidateEntitlement()`
(`src/lib/entitlement.js:58`) only zeroes `lastFetchedAt` and deliberately keeps `lastKnownGood`,
so the fail-open branch can re-pin a stale `entitled: true` after a downgrade; the hard reset is
`clearEntitlement()` (`src/lib/entitlement.js:77`), used only on sign-out
(`src/store/ProfileStore.jsx:110`). This is WHY the page reload is mandatory rather than merely
convenient. State it once, as rationale — do not add a new requirement to call either function.

## Decision A — how should rollback clear the payment ledger?
Answer: **Drop FR-007 entirely.** FR-017/FR-018 already require a fresh `event_id` on every send,
which fully solves replayability; the ledger delete buys no additional coverage and only adds an
unscoped destructive operation to a module that also has a `--yes` non-interactive path.
Renumber nothing — leave the remaining FR ids as they are and mark the slot removed, or renumber
consistently and update every cross-reference; do NOT leave a dangling reference to FR-007.
Also remove any acceptance scenario or Success Criteria line that asserted ledger cleanup.
Record as a Non-obvious fact (carried into the spec) the reason it was dropped: `payment_events`
has columns `id, event_id, event_type, payload, processed_at, created_at` and **no user or customer
column** (created as `stripe_events` in `server/migrations/001_initial.sql:50-57`, renamed by
`060_paddle_rename_and_payment_events.sql`), so there is no per-account filter; and a purchase
writes a SECOND ledger row keyed `upgrade_completed_track:<transactionId>`
(`server/paddleProcessor.js:195-199`) that any narrow delete would miss.

## Decision B — how do we obtain real `paused` and `past_due` sandbox payloads?
Answer: **Actively drive the sandbox subscription into each state, then harvest all three.**
Rewrite FR-016: the harvest task MUST first drive the sandbox subscription into each of the three
states — pause via the Paddle API, cancel via the Paddle API, and dunning via the documented
dunning test card `4000 0027 6000 3184` (`.claude/skills/app-qa/references/environment.md:116`) —
and harvest the three resulting notification-log payloads SEPARATELY. A completed purchase alone
emits only `transaction.completed` and `subscription.created` and produces NONE of the three; the
spec must say so explicitly so no one mistakes a purchase for a sufficient harvest source.
Add to FR-017 an explicit clause: **`data.status` is NOT substitutable.** The allowlist stays at
exactly five fields (`data.customerId`, `data.id`, `event_id`, `occurred_at`, signature timestamp).
Editing `data.status` to manufacture a state converts a harvested payload back into a hand-authored
one for the exact field under test and defeats Settled decision 8.
Option 2 (harvest two, defer `past_due`) was NOT chosen and must not be written in as a fallback.
Note for the plan stage: driving pause/cancel through the Paddle API falls under Settled decision
11's narrow sandbox-only exception — it must not be used to widen that exception.
