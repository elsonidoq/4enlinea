# QA 2026-07-15 Remediation — Product/Design Decisions

**Date:** 2026-07-16
**Status:** Approved
**Scope:** The four forked decisions behind the QA remediation plan (`docs/superpowers/plans/2026-07-16-qa-2026-07-15-remediation.md`). The plan's other 21 findings are mechanical and carry no design decision.

---

## Context

A 6-batch agentic QA run (`agentic_QA_2026-07-15-1321.md`, specs 041–049) produced 2 majors, 16 minors and 2 polish findings. Most have a single right answer. Four did not: three were genuinely forked product questions, and a fourth surfaced while planning. This document records those four decisions and their rationale so they are not relitigated.

---

## D1 — Lesson content localization

**Problem.** All 13 lessons render English body text in Spanish mode: `lessonLoader.js` has no locale logic and the lesson JSONs have no Spanish fields. A Spanish learner gets an English course behind a Spanish shell. This is the app's core "Learn" pillar and the single biggest gap in the run.

**Scope.** ~6,860 translatable words across exactly 5 field paths: `title`, `slides[].coachMessages[].text`, `slides[].legendItems[].label`, `slides[].infoProse`, and `socratic`/`confirmationChallenges[].goalPrompt`.

**Decision.** Spanish lives in `_es` sibling fields inside each lesson JSON. `getLesson(id, locale)` gains a locale-merge seam with **per-field** English fallback. Translations are drafted by a **one-time offline script** reusing the existing `SPANISH_OUTPUT_DIRECTIVE`, then committed and human-reviewed. No LLM in the request path.

**Rationale.**
- *Per-field* fallback (not per-lesson) means a partial translation degrades gracefully instead of blanking a slide.
- Offline drafting keeps runtime static and deterministic: a lesson must read identically on every load. LLM-at-request-time would make the core teaching surface nondeterministic, latent, and costly.
- The audio pipeline is decisive: clips are keyed `sha256(text)`, so narration can only be pregenerated if the text is fixed at build time. Runtime translation makes lesson audio impossible.

**Rejected.**
- *i18n keys* (`lesson.<id>.*`): 6.8k words balloons the bundle from 580 keys, arrays (slides/coachMessages/legendItems) map badly to flat keys, and it splits content from the lesson it belongs to.
- *Runtime LLM translation*: latency/cost on the Learn surface, nondeterministic text, and the audio blocker above.
- *Defer*: this is the primary product pillar for Spanish users.

**Consequences.**
- `ttsProvider.synthesize(text)` must gain a language arg (back-compatible). `scripts/generate-tts.js` already solved per-locale output for coach clips; this brings lessons to parity.
- `pruneOrphanedLessonAudio` must learn about `_es` fields, or the next prune deletes every Spanish clip as an orphan.
- **`title` is excluded.** `lesson.<id>.title` in en/es.json already owns titles via `t(..., {defaultValue: lesson.title})` and wins over the JSON. A `title_es` would be a second, silently-losing source.

---

## D2 — Anon free deep reveal (REVISED 2026-07-16)

**Problem.** The one anon free deep reveal can be spent on a suboptimal move. The anon plan's Global Constraints say "Blunders only open the free reveal."

**Decision.** **Retire the "blunders only" constraint.** Delete it from the anon plan doc. Ship no code. Spec-042 FR-001/FR-002 stand unamended: deep reveal is offered on every mistake regardless of severity, and severity remains "label + color only, never gates an action."

> **Revision note.** An earlier version of this decision (D2, 2026-07-16 morning) chose the opposite — restrict the free reveal to blunders, with an anon carve-out to spec-042. It was reversed the same day for the reasons below. The plan's W3 was rewritten from a code workstream to a doc edit.

**Rationale.**
- **"Blunders only" was never a decision the code made.** It was recorded as a no-op, resting on a false premise — that `ReviewScreen.selectStep` navigates only for stored *blunder* rows. It actually navigates for **any** non-optimal move with a stored row. No client branch and no server gate ever existed.
- **The server gate is not cleanly implementable.** The anon gate is keyed `${moveString}:${col}`. Enforcing quality server-side means looking up the stored row by `(moveString, col)` — ambiguous, since the same position+column can appear in multiple rows across games and users with differing stored quality. There is no principled way to pick the governing row without threading a blunder id into `/api/explain-move-llm`, which doesn't take one.
- **A client-only gate is theatre.** `/api/blunders/:id` is a public, no-auth permalink.
- **The invariant is worth keeping clean.** Spec-042 FR-001's "severity never gates an action" is sharp and shipped. "…except for anon" is the kind of conditional invariant that rots.
- **The leak is theoretical.** QA rated it minor and judged the funnel "MOTIVATING" with "no dead-ends." Red chips are visually salient; most anons click the blunder. QA observed the suboptimal case once, in a seeded test.
- **Blocking a deliberate click is hostile.** Denying the mistake a user actually asked about, in favour of an AuthModal, plausibly costs more conversion than a mildly-useful reveal earns.

**Rejected.**
- *Restrict to blunders*: two enforcement layers, a hot-path DB read, a spec amendment, and an ambiguous server lookup — to close an edge case.
- *Steer, don't restrict* (nudge before spending on a suboptimal): honors both goals, but it's new UI plus copy in two locales for the same edge case. Revisit only if data shows anons commonly spend the reveal on suboptimals.

**Reversal trigger.** Evidence from real usage that anons routinely spend the free reveal on suboptimal moves. Then prefer *steer* over *restrict*.

---

## D3 — Upgrade funnel wiring

**Problem.** Three gaps: `POST /api/stripe/portal` works but has **zero** frontend callers, so a paid user cannot manage or cancel in-app; there is no standalone upgrade entry outside hitting a specific paywall; and annual ($21.99/yr, ~39% below monthly) carries no savings framing. Settings never even reads `profile.tier`.

**Decision.**
1. One tier-aware **Subscription section** in Settings: free → "Upgrade to Pro" mounting the existing `UpgradeModal` (5th call site, identical props); paid → current plan + "Manage subscription" → the billing portal.
2. `createPortalSession` gains a **sanitized `returnPath`**, sharing `createCheckout`'s existing open-redirect guard, so the portal returns to `/settings` rather than `/`.
3. The annual toggle gains a **savings badge + per-month equivalent, derived from live `/api/stripe/config`**. Monthly stays the default selection.

**Rationale.**
- Leaving paid users unable to cancel in-app is a consumer-expectation problem, not a nicety — it's the strongest item in the group.
- Deriving the badge from live prices means it cannot drift from Stripe. A hardcoded "39%" is wrong the day pricing changes.
- Monthly stays default: leading with a $21.99 ask at someone's first paywall risks suppressing conversion. Show the annual advantage; don't force it.
- Reusing the existing `UpgradeModal` and the existing sanitizer keeps this additive — no new abstractions.

**Rejected.** *Portal only* (leaves upgrade undiscoverable); *upgrade only* (leaves paid users unable to cancel — the worst option); *qualitative "Best value"* with no math (asserts value without letting the user verify it).

**Consequences.** SettingsScreen becomes a **fourth** direct `tier` read. That strengthens the case for a future consolidation of the scattered tier checks — filed as an open issue, not fixed here.

---

## D4 — Free deep-reveal quota is 20/week

**Problem (found while planning, previously unlogged).** `server/index.js:532` and `:557` both hardcode `count >= 5`, while `auth.deepRevealGate` promises 20/week in **both** locales ("unlock 20 Deep Reveals per week" / "desbloquear 20 Revelaciones profundas por semana") and the anon plan states "free tier stays 20/week — never lower the signed-in quota." A free user is told 20 and gets 5.

**Decision.** **The copy is correct; the code is the bug.** Raise the limit to 20 and extract a single named constant. Confirmed with the owner: the 5 was a debug convenience that shipped.

**Rationale.** Honors what users were promised at sign-up and the anon plan's explicit constraint. The alternative — fixing the copy down to 5 — silently gives less to anyone who signed up on the promise of 20.

**Consequences.**
- Unblocks the new **remaining-reveals counter** request: a counter cannot honestly ship while the app counts down from 5 after promising 20. D4 must land before the counter.
- The limit is exposed on the profile response so the client never hardcodes it.
- `peekQuota` is read-only, so `deep_reveal_count` is **stale past the reset date**. Every reader — server gate and client counter — must normalize `now > resetAt ? 0 : count`. This logic is deliberately duplicated client-side (the client cannot import the server module); both sites carry a comment saying so, to stop a future reader "DRY-ing" them into a broken import.
- No migration: `deep_reveal_count` / `deep_reveal_reset_at` exist since `001`/`022` and are already in `USER_PROFILE_SELECT_COLUMNS`.

**New feature (same workstream).** After a reveal, free users see "N of 20 Deep Reveals left this week" + a Pro CTA. Paid users see neither (nothing to sell). Anon users see no counter — their one-free-reveal gate is a different mechanism and a "1 left" counter would misrepresent it. The existing 429 handler, which discards its body, is extended to surface `resetsAt` so an exhausted user learns when their quota returns instead of only being sold to.

---

## Verification note (applies to D1 and every localization item)

`i18nKeyParity` guards **key presence only**. It catches none of: hardcoded literals bypassing `t()`, lesson JSON (outside i18n entirely), or dialect breaks. Every localization change therefore requires **rendering the screen in Spanish and reading it**. A green test is not evidence here.

Spanish is Rioplatense voseo (`usá/tenés/podés/jugá/encontrá/sos/vos`), never tú-Spanish. Discs are `verde`/`gris`, never rojo/amarillo. Note `userPerspective: 'red'` means player 1 = **green**; `'yellow'` means player 2 = **gray** — a mistranslation here inverts a lesson's meaning.
