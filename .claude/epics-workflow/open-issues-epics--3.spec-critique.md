# Spec critique — specs/053-entitlement-payments-consolidation

## Blocking issues

### 1. The one requirement the owner called "still blocking regardless" — CSP re-verification — is entirely absent from the spec

CSP is invisible under `npm run dev` (Vite enforces none), so a new pricing page will look fine in development and break in production. Only the Express-served `dist/` production build exercises it.

`grep -i "csp|content-security|dist"` over `spec.md` returns zero hits. The epic makes this a **Blocking** task inside US3.4 and repeats it as a standalone Acceptance criterion ("CSP for the new pricing route is verified against the Express-served `dist/` build, never `npm run dev`"). A plan agent working from the spec has no reason to generate a CSP task at all — and if it improvises one, the default instinct is to check it in dev, where the check silently passes.

**Recommended fix:** Add an FR under "Pricing page" and a matching SC. Suggested FR: *"The redesigned pricing page and its checkout action MUST be verified to function under the production content-security policy as actually enforced by the production server build — verification performed against a built, server-served artifact, never against the development server, which does not enforce the policy."* Suggested SC-008: *"The pricing page loads, displays live prices, and launches checkout with zero content-security-policy violations reported, verified on the production build."*

### 2. The locked-lesson API contract was dissolved into prose, against this project's own spec best-practices doc

Owner ratification 4 fixes the exact response: HTTP `200` with body `{ id, title, order, free, locked: true }`, no `slides`. The epic says `locked: true` "is part of the API contract US3.1's integration test asserts" and must be written into `docs/architecture/api-conventions.md`.

FR-002 renders this as *"a successful response identifying the lesson (its id, title, and ordering position), stating that it is not a free lesson, and stating explicitly that it is locked."* The status code `200` is gone (replaced by "successful", which admits 204/206/redirects), and three of five field names are gone: `order` became "ordering position", `free` became "stating that it is not a free lesson", `locked` became "stating explicitly that it is locked". A plan agent can conform perfectly to FR-002 and emit `{ id, title, position, isFree: false, isLocked: true }` — breaking the frontend consumers, the integration test, and the api-conventions entry.

`docs/best_practices_spec_driven_development.md` §"Characteristics of High-Quality Lightweight Specs" item 2 says the opposite of what the spec author did: *"Explicit Input/Output Contracts… AI agents are significantly more reliable when following a machine-readable schema (near 100% conformance) compared to prose descriptions (under 40% conformance)."* Item 4 likewise mandates IF-THEN rules that name status codes.

**Recommended fix:** Put the literal shape in FR-002 and in the "Lesson (locked view)" Key Entity: `HTTP 200`, body `{ id, title, order, free, locked: true }`, `slides` absent (not null, not empty array).

### 3. Three of the epic's Acceptance criteria have no counterpart anywhere in the spec

- **Quota figures, not just prices.** The epic says *"Every price **and quota figure** shown to a user is derived from a live source, on both `/pricing` and `/pricing-legal`."* FR-019, FR-025 and SC-004 all scope to *"price and discount figure"* only. Verified at source: `connect-four/server/pricing.html:26` hardcodes `20 Deep Reveals per week`, duplicating `connect-four/server/quotaLimits.js:5` (`FREE_DEEP_REVEAL_WEEKLY_LIMIT = 20`) — the epic notes this literal *"has already drifted once"*, making it the most empirically proven drift risk in OI-41. The spec as written permits it to survive untouched.
- **Backlog closeout.** The epics file's top matter declares the Issue closeout convention mandatory for every epic; all six covered issues (OI-66, OI-39, OI-55, OI-34, OI-41, OI-25) must be marked resolved-with-date or updated-with-what-remains in `docs/open_issues.md`, in the same change. The spec covers exactly one of the six (FR-017, the OI-34 re-evaluation) and never states the general obligation.
- **No "Out of Scope" section at all.** The epic carries a five-item `NOT included` list. Two are salvaged inside FRs (FR-016, FR-024); three are unrepresented. The best-practices doc lists "Not Included sections" as a defining characteristic of a good spec, precisely to stop *"the 'helpful agent' from over-engineering unrequested complexity"*.

**Recommended fix:** broaden FR-019/FR-025/SC-004 from "price and discount" to "price, discount, and quota figure"; add one FR requiring every issue this epic covers to be closed out in `docs/open_issues.md` in the same change that ships the work; add an "Out of Scope" section transcribing the epic's five `NOT included` items.

## Decisions required

### Decision A — Does the retained legal page keep working without JavaScript?

The epic's stated reason for keeping `pricing.html` is that it preserves a **server-rendered** copy of the MoR clause, refund statement and terms link *"in case a future Paddle spot-check does not execute JavaScript."* That rationale never made it into the spec.

The spec then creates a squeeze: FR-022/FR-024 say the legal page's content stays unchanged in wording and independently reachable; FR-025 says no hand-typed price figure may remain on it; US4 acceptance scenario 5 goes further — *"every number traces back to the live pricing source."* A static, JS-free page cannot fetch a live price.

1. **Delete the price figures from the legal page; keep it static.** Only the MoR clause, refund statement and terms link — no numbers.
2. **Make the legal page fetch live prices.** Preserves the price table but makes the page JavaScript-dependent.
3. **Leave the literals, accept drift on the legal page only.** Contradicts FR-025 and the epic.

*Recommended default: option 1* — the epic allows it (*"de-hardcoded **or removed**"*), and it is the only option preserving the no-JS property that justified retaining the file. Requires softening US4 scenario 5 and FR-022's "unchanged in wording" so removal is clearly permitted.

### Decision B — When the entitlement lookup fails on the *client*, do the five migrated screens fail open or fail closed?

The spec defines fail-closed for the **server** (FR-010, US2 scenario 3). It says nothing about the **client**: what the five screens do when the entitlement request fails — offline, 5xx, timeout. Current code already picks a side: `src/lib/useLessonLockGuard.js:58` ends with `.catch(() => 'free')` — fail closed today.

1. **Client fails open to the last known good answer** (use last cached entitlement even if stale; fall back to "free" only when there has never been an answer). Server gate remains the real enforcement point.
2. **Client fails closed** (any failed lookup shows the free/locked experience). Matches today; risks locking out paying users on flaky networks.
3. **Split:** fail open for display decisions, fail closed for anything that would trigger a purchase-avoiding action.

*Recommended default: option 1* — once US1 lands the server is the only enforcement that matters, which frees the client to optimize for not insulting paying customers. Must be written as an explicit FR so the plan agent doesn't silently re-derive today's fail-closed behavior.

## Handoff context

**Systemic issues.** One root cause produces most of what was flagged: the spec author applied "no implementation details" as a *lexical* filter — strip file paths, module names, endpoint names, field names, status codes — rather than a *semantic* one (strip the how, keep the observable contract). The casualties are all externally observable and belong in a spec: an HTTP status code, a JSON field name, a verification environment. `docs/best_practices_spec_driven_development.md` argues the opposite position explicitly (schemas over prose, ~100% vs <40% agent conformance; IF-THEN rules naming status codes; a mandatory "Not Included" section) — and the spec's own quality checklist marked all 16 items green including "No implementation details leak into specification", so the checklist actively rewarded the over-filtering. A fix agent should treat that checklist's line 30 as satisfied-in-spirit and not let it push back on restoring contract details.

**Second systemic pattern:** the spec covers *functional* requirements well but drops everything in the epic's "verification and bookkeeping" register — CSP verification, `npm run test:fast` green, `staging_checks.md` appends, `docs/open_issues.md` closeout for six issues, and doc updates to `api-conventions.md`/`server-conventions.md` (only partially present via FR-014/FR-015). A fix agent should sweep the epic's Acceptance criteria list once more for the same class.

**Reviewer frame.** Weighted, in order: (1) the four owner ratifications, treated as inviolable; (2) the epic's `Settled decisions`, `Acceptance criteria` and `NOT included`; (3) the project's own best-practices doc, decisive on issue 2; (4) real source code. Verified at source: the five tier-read sites (`grep -a "\.tier" src/` — exactly the five named: `SettingsScreen.jsx:108`, `SagaScreen.jsx:191`, `PostSetSummaryScreen.jsx:79`, `DeepRevealPane.jsx:283`, `useLessonLockGuard.js:58`), the hardcoded quota literal in `pricing.html:26` against `quotaLimits.js:5`, the price literals in `pricing.html:23`, and the absence of any CSP mention in the spec. Did NOT re-verify the routing-structure claims (`URL_MAP`/`SCREENS`/`App.jsx`) or the Express registration-order claim — the spec never depends on them; they're plan-stage facts.

**Non-obvious intent.** The spec's Assumptions section deliberately states the payment provider's domain is already cleared and this epic waits on no provider review — owner ratification 3, must not be walked back into a blocking gate. FR-016 forbids touching identity-binding code and is repeated on purpose. The `/pricing-legal` address name is carried across four places in the epic — if a fix agent adds the path name to the spec it must use exactly `/pricing-legal`. Zero `[NEEDS CLARIFICATION]` markers is by design, not oversight.

**What was not flagged, and why.** (a) The stale Overview triage table — knowingly stale per handoff. (b) OI-N codes absent from the spec body — only the *closeout obligation* was folded into issue 3, since issue identifiers are legitimately traceability metadata. (c) Task-count hints — stale and non-binding. (d) **FR-007/008/009/010's reconstruction of "one shared module, thin wrapper endpoint, no HTTP hop between server handlers, fail closed" survives the prose translation intact** — FR-008's "without introducing an additional network call between one server-side decision point and another" is unambiguous. This was the risk the task asked to check hardest; it passed. Same for the five-site migration (FR-013 names all five by role) and the identity no-code-change constraint (FR-016). (e) The loss of "the retained legal page must be server-rendered" is inseparable from Decision A. (f) The missing `paddle-docs` confirmatory check — the owner explicitly demoted it from gate to note.
