## Blocking issues

### 1. Three of the epic's 16 issues are already owned by another epic — and both files claim they don't overlap

The epic's opening says it is a "companion to `docs/epics/open-issues-epics.md`" and that "this file does **not** duplicate them." That companion file makes the same claim back — its note at `docs/epics/open-issues-epics.md:44-49` says verbatim *"The two files do not overlap in scope."* Both statements are false:

- Its Traceability table (`:2085`) states *"Every open `OI-N` maps to exactly one epic"* and assigns **OI-41 → Epic 3**, **OI-5 → Epic 4**, **OI-31 → Epic 4**.
- Epic 4's own story text (`:992-993`) already carries the exact same instructions Epic 10's US5 gives: *"the staging `DATABASE_URL` port question after checking what Railway actually injects (OI-31); run the refresh-rotation probe against a real account and either build the de-dup Map or close OI-5."*
- Epic 4 also already routes those sign-offs to `staging_checks.md` (`:881`), which Epic 10 does not mention.

A spec agent reading Epic 10 alone will write tasks that silently re-do — or contradict — work another epic still claims. Worse, whichever runs second will find an `OI-N` already closed and have no rule for what to do.

**Recommended resolution:** decide the single owner for each of OI-5, OI-31, OI-41 and record it in *both* files in the same change. Given Epics 3 and 4 have already shipped (spec 053 and spec 054 respectively) and left these three open, the cleanest move is: Epic 10 takes all three, and `open-issues-epics.md`'s Traceability table plus the "do not overlap" note are corrected to say so. Then delete the false "does not duplicate them" sentence from Epic 10's header.

### 2. Design decision D2 offers two options that a listed source of truth already rules out by owner decision

D2 asks: *"What is the serving policy for a category that cannot reach N=20? Hide it, serve it below the floor, or block launch on it?"*

But `specs/051-pattern-acceptance/pool-thresholds.md` — which Epic 10 itself lists as the authoritative source for the pool floor — records an owner decision dated 2026-07-30 that closes two of those three doors, verbatim:

> "The threshold is absolute. A category below 20 active puzzles is not servable, whatever put it there."
> "The remedy is always the same: generate and promote more puzzles. Never lower the threshold, and never exempt a category for having been broken already."

Presenting "serve it below the floor" as a live option invites `/clarify` to reverse a recorded owner ruling without anyone noticing they are reversing it. Separately, D2's premise that this might be a *feature-flag or category-registry* change is misleading — the same source (§"How to fill a category") states the remedy is a promotion pass over already-queued candidates, making no solver calls.

The one genuinely open sub-question D2 buries: `forced_win` has only **2** queued candidates against a floor of 20, and OI-83 is precisely the bug that retired its last puzzle. So `forced_win` alone may need real *generation* (which does cost solver calls, unlike the other seven categories), or a documented exception.

**Recommended resolution:** rewrite D2 to the actual open question — *"`forced_win` cannot reach 20 by promotion alone (2 candidates). Generate fresh candidates, or hide the category from serving until it can?"* — and state explicitly that the seven other empty categories are a promotion pass with no decision attached. Cite the pool-thresholds quote in the epic's Non-obvious facts so no downstream agent re-opens it.

### 3. US3 contains one item with no acceptance criterion and one that no agent can satisfy

US3 lists three issues (OI-98, OI-95, OI-41), but its acceptance criteria only cover OI-98 and OI-41. **OI-95 has no definition of done anywhere in the epic**, while the epic-wide criteria still mandate closing it. Settled decision 3 says "take the smallest correct version" of OI-95, but never says what that is — and the underlying issue (`docs/open_issues.md:3470`) is explicit that this is *"a product decision nobody has made"* and that the contract fix *"must amend spec 053 FR-002, its 'Lesson (locked view)' entity, and the epic's Settled decision #7 **together** — do not amend just one."* That is a three-file coordinated change, not a smallest-correct-version.

Separately, US3's OI-98 criterion — *"reaches an open checkout, verified end-to-end in the sandbox with a real transaction id"* — is not reachable from a spec task. OI-96's closeout records the owner's confirmation verbatim: *"`VITE_PADDLE_CLIENT_TOKEN` is unset (owner-confirmed: Paddle does not work locally)."* And OI-98's own "If picked up" adds a step the epic never mentions: *"Confirm the dashboard's Default payment link points at that page"* — a Paddle dashboard setting only the owner can change, with a hard constraint (*"Do not point the default payment link at `/pricing-legal`"*).

**Recommended resolution:** (a) give OI-95 either an acceptance criterion or an explicit move to *NOT included* with the decision recorded — see Decision 1 below; (b) split US3's OI-98 criterion into an agent-satisfiable half (mount-time Paddle.js init + `_ptxn` read, unit/CSP-verified against a production build) and an owner-gated half (Paddle dashboard default-payment-link config + sandbox transaction), and route the owner half to `staging_checks.md` the way Epic 4 already does for its ops verifications.

---

## Decisions required

### Decision 1 — What is OI-95's "smallest correct form"?

A signed-out visitor and a signed-in free user currently see the identical "Upgrade" prompt on a locked lesson, because the locked-lesson API response is the same stub for both. A signed-out visitor may have already paid on another device and just needs "Sign in".

- **A. Close it won't-fix.** Record that both audiences get "Upgrade" at launch and revisit post-launch. Zero code.
- **B. Client-side only.** The three lesson screens call the existing `GET /api/user/entitlement` (which already carries the `authenticated` signal) and branch the copy. No API contract change, no spec amendment.
- **C. Re-add `authenticated` to the locked-lesson stub.** Requires amending spec 053 FR-002, its "Lesson (locked view)" entity, and that epic's Settled decision #7 in one change.

**Recommended default: B.** It is the only option that changes user-visible behavior without reopening a contract the owner already ratified verbatim, and the signal it needs already exists. If you would rather not spend any US3 budget here, A is defensible — this is conversion polish, not a broken path.

### Decision 2 — Where does the Paddle default payment link point, and who verifies it?

Paddle appends `?_ptxn=<transaction_id>` to your account's **default payment link** on every "update your payment method" email it sends subscribers. The target page must load Paddle.js on page load for the checkout to auto-open. Today no page reads `_ptxn`, and Paddle.js only loads inside a click handler — so those emails dead-end.

- **A. Point it at `/pricing`.** The existing React pricing screen; add a mount-time Paddle.js init and an `_ptxn` reader. Cheapest, but every payment-recovery email lands a paying subscriber on a marketing page.
- **B. Add a dedicated minimal route** (e.g. `/billing/update`) whose only job is to init Paddle.js and open the transaction. Cleaner UX, but Settled decision 3 says this epic adds no new screens — this would need an explicit carve-out.
- **C. Defer OI-98 past launch** with the decision recorded, accepting involuntary churn on failed cards until then.

**Recommended default: A**, with the dashboard change and the sandbox end-to-end verification assigned to you (not an agent) and recorded in `staging_checks.md`. Note `/pricing-legal` is disqualified — OI-98 states it must stay JavaScript-free.
