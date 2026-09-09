# spec_critique output

## Blocking issues

### 1. The spec both requires and disowns the same doc-repair work (FR-023 / FR-024 vs. Out of Scope) — and the work is verifiably *not* done

`specs/058-e2e-qa-enablement/spec.md` states FR-023 ("`environment.md` MUST be corrected for NF3, NF6, NF7") and FR-024 ("the four 'Paddle does not work locally' locations MUST be retracted"), backed by US4 acceptance scenarios 2 and 4. Its final **Out of Scope** bullet then says the retractions and the worktree-bootstrap documentation "are handled as direct, non-speckit edits … outside this pipeline." `/speckit-tasks` reads the Requirements section; a reader resolving the contradiction the other way generates zero tasks and the work silently disappears.

The tree was checked: the work has **not** been done. `specs/057-mvp-launch-gate/spec.md:99` and `docs/open_issues.md:3779` still assert Paddle "does not work locally," and `.claude/skills/app-qa/references/environment.md:99,114` still prints the wrong `scripts/set-tier.js` path with no worktree-bootstrap or rate-limit section. Orchestrator-established fact 2 also explicitly re-classifies the NF3/NF6/NF7 corrections as **outstanding pipeline work under AC6** — which the spec's own Out of Scope bullet contradicts.

**Fix:** delete the retraction/bootstrap clauses from that Out of Scope bullet (keep only the `.env.local` token item, which really is done), and add a line to FR-023/FR-024 noting they were verified still-undone so no task treats them as pre-satisfied.

### 2. FR-016's named harvest source cannot produce the payloads FR-017 needs — AC3a is unachievable as written

FR-017 requires three harvested real sandbox payloads: `subscription.updated -> paused`, `subscription.canceled`, and `subscription.updated -> past_due`. FR-016 names the harvest source as "one real completed sandbox purchase plus the `paddle-sandbox` MCP's subscription/notification data." A completed purchase emits `transaction.completed` and `subscription.created` — it emits **none** of the three downgrade events. Those only exist in the notification log after someone actually pauses, cancels, or dunning-fails that sandbox subscription.

The trap this sets is precise and dangerous: an implementer who cannot find a real `paused` payload will take a `subscription.updated` payload and edit `data.status` — a field that is **not** in Settled decision 8's closed allowlist (`data.customerId`, `data.id`, `event_id`, `occurred_at`, signature timestamp). That is exactly the hand-authored-fixture failure decision 8 exists to prevent, and it would go green while proving nothing.

**Fix:** rewrite FR-016 to require that the harvest task first *drive* the sandbox subscription into each of the three states (pause via the Paddle API/dashboard; cancel; dunning via the already-documented declined/dunning test cards at `environment.md:116`) and harvest the three resulting notification-log payloads separately. Add an explicit "`data.status` is NOT substitutable" clause to FR-017.

### 3. Two rollback requirements rest on source claims that don't hold

**(a) FR-007 is not expressible against the actual schema.** It requires the reset to "clear the target account's `payment_events` rows for the run." `payment_events` (created as `stripe_events` in `server/migrations/001_initial.sql:50-57`, renamed by `060_paddle_rename_and_payment_events.sql`) has columns `id, event_id, event_type, payload, processed_at, created_at` — **no user or customer column**. There is no per-account filter; only a JSONB dig into `payload`. Separately, FR-007 is largely redundant with FR-017/FR-018, which already re-stamp `event_id` per send — the actual fix for NF12. Note also that a purchase writes a *second* ledger row keyed `upgrade_completed_track:<transactionId>` (`server/paddleProcessor.js:195-199`), which any narrow delete would miss.

**(b) FR-010 / Settled decision 7 name the wrong cache function.** Both cite `invalidateEntitlement()` (`src/lib/entitlement.js:58`). That function only zeroes `lastFetchedAt` and *deliberately keeps* `lastKnownGood` so fail-open still has an answer — so on a **downgrade** it can re-pin a stale `entitled: true`. The hard reset is `clearEntitlement()` (`src/lib/entitlement.js:77`), called only on sign-out (`src/store/ProfileStore.jsx:110`). The epic's conclusion still holds (both are client-only; the reload is the mechanism), but the requirement names the weaker function and understates why the reload is mandatory.

**Fix:** resolve FR-007 per Decision A below; in FR-010 and Settled decision 7, replace `invalidateEntitlement()` with `clearEntitlement()` and state that even a soft invalidation would be insufficient because fail-open re-pins the stale entitled answer.

---

## Decisions required

### Decision A — How should rollback clear the payment ledger?
- Option 1 (recommended): drop FR-007 entirely.
- Option 2: delete-all locally (truncate).
- Option 3: filter on `payload` JSONB.

### Decision B — How do we obtain real `paused` and `past_due` sandbox payloads?
- Option 1 (recommended): actively drive the sandbox subscription into each state, then harvest all three from the notification log.
- Option 2: harvest two, defer `past_due` as a documented gap.
- Option 3: widen the allowlist to include `data.status`. Not recommended.
