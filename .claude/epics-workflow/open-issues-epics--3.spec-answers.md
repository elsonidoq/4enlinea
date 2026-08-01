## Blocking issue 1 — CSP re-verification is entirely absent from the spec
Answer: Accept recommendation (auto-applied — no alternative)

Add an FR under the pricing-page group and a matching success criterion, in outcome language:
- FR: *"The redesigned pricing page and its checkout action MUST be verified to function under the production
  content-security policy as actually enforced by the production server build — verification performed against
  a built, server-served artifact, never against the development server, which does not enforce the policy."*
- SC-008: *"The pricing page loads, displays live prices, and launches checkout with zero content-security-policy
  violations reported, verified on the production build."*

## Blocking issue 2 — the locked-lesson API contract was dissolved into prose
Answer: Accept recommendation (auto-applied — no alternative)

Put the literal contract back into FR-002 and into the "Lesson (locked view)" Key Entity: **HTTP 200**, body
`{ id, title, order, free, locked: true }`, with `slides` **absent** — not null, not an empty array. Use the
exact field names `id`, `title`, `order`, `free`, `locked`; do not paraphrase them as "ordering position" or
"stating that it is locked". Rationale, from this project's own `docs/best_practices_spec_driven_development.md`
§"Characteristics of High-Quality Lightweight Specs" item 2: agents conform to a machine-readable schema at
near 100% versus under 40% for prose. An API response schema is an externally observable contract, not an
implementation detail. Do not let the requirements checklist's "No implementation details leak into
specification" item push back on this — treat it as satisfied in spirit.

## Blocking issue 3 — three of the epic's Acceptance criteria have no counterpart in the spec
Answer: Accept recommendation (auto-applied — no alternative), with one scope change from Decision A below

- Add an FR requiring every issue this epic covers (OI-66, OI-39, OI-55, OI-34, OI-41, OI-25) to be closed out
  in the project issue backlog in the same change that ships the work — each either resolved-with-date or left
  open with a dated update naming exactly what remains. State the obligation generally; the spec need not carry
  the OI-N codes inline if traceability metadata is kept elsewhere, but the obligation itself must be a
  requirement, not an assumption.
- Add an **Out of Scope** section transcribing the epic's five `NOT included` items: do not migrate off the
  payment provider or change the plan/price catalog; do not add new paywall entry points beyond the pricing
  page; do not backfill historical upgrade analytics; do not close the first-payment identity window with a
  server-minted customer id; do not delete the retained legal pricing page (it moves, it does not disappear).
- **Quota figures:** broaden FR-019 and SC-004 from "price and discount figure" to "price, discount, and quota
  figure" — but scope that obligation to the redesigned `/pricing` page ONLY, per Decision A. The
  `20 Deep Reveals per week` literal in the retained legal page is explicitly exempted (see Decision A).

## Decision A — does the retained legal page keep working without JavaScript?
Answer: Leave the price literals on the legal page (option 3)

The owner chose to leave `connect-four/server/pricing.html` byte-stable rather than edit a page the payment
provider has already reviewed. The page stays static, server-rendered, JavaScript-free, and unchanged in
wording — which fully preserves FR-022 and FR-024 and the reason the file was retained in the first place.

Required consequential edits — do NOT skip these, they are what keeps the artifact honest:
- **Scope FR-025 to the redesigned `/pricing` page only.** It must no longer assert that no hand-typed figure
  remains on the retained legal page. Same for SC-004 and US4 acceptance scenario 5 ("every number traces back
  to the live pricing source") — both scope to `/pricing`.
- **Record the accepted residual risk explicitly** in the spec (Assumptions or a Deferred subsection): the
  retained legal page keeps hardcoded `$2.99` / `$21.99` / `39%` / `$1.83` price literals and the
  `20 Deep Reveals per week` quota literal, which duplicates `FREE_DEEP_REVEAL_WEEKLY_LIMIT` in
  `connect-four/server/quotaLimits.js` and has already drifted once. The drift risk on that surface is
  knowingly accepted in exchange for not modifying a page the payment provider has already approved.
- **OI-41 must NOT be marked resolved.** Under the epic's Issue closeout convention it stays open with a dated
  update naming exactly what remains: the price and quota literals on the retained legal page. The
  backlog-closeout FR added under blocking issue 3 must accommodate this "still open, with a dated update"
  outcome, not assume every covered issue closes.
- Amend the epic's Acceptance criterion "Every price and quota figure shown to a user is derived from a live
  source, on both `/pricing` and `/pricing-legal`" so it scopes to `/pricing` and states the legal-page
  exemption. Edit `docs/epics/open-issues-epics.md` §Epic 3 for this — the epic and spec must not disagree.

## Decision B — client-side behaviour when the entitlement lookup fails
Answer: Fail open to the last known good answer

Add an explicit FR: when the entitlement lookup fails (offline, timeout, 5xx), the migrated client surfaces use
the last known good entitlement answer even if stale, and fall back to the free/locked experience ONLY when no
answer has ever been obtained for that user. Rationale: once the server-side gate ships, the server is the only
enforcement that matters — no paid content can leak — so the client should optimize for not showing a paying
customer an upgrade prompt during a transient network failure.

This must be written as its own requirement precisely because it **reverses** today's behaviour:
`src/lib/useLessonLockGuard.js` currently ends with `.catch(() => 'free')`, i.e. fails closed. Without an
explicit FR a plan agent will silently re-derive the current fail-closed behaviour into the shared helper. Keep
FR-010's **server-side** fail-closed rule unchanged — the two are deliberately opposite, and the spec should say
so in one sentence so the asymmetry does not read as a contradiction.
