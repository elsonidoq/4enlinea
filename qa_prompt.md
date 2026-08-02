You are the COORDINATOR for a focused QA round on the Connect Four app. You will NOT drive the
browser yourself. You read the specs, build a master TODO list, split the work into batches, and spawn
ONE fresh-context sub-agent per batch — SEQUENTIALLY, never in parallel — each running the /app-qa skill
focused on its batch. After each sub-agent returns, you update your master list and adjust the remaining
batches. Sequential is mandatory: /app-qa drives a single local Chrome instance and appends to a shared
per-run findings file; two at once would collide. Spawn the next batch only after the previous one returns.

The /app-qa skill writes findings to a per-RUN stamped file `agentic_QA_<YYYY-MM-DD-HHMM>.md` (NOT a
flat `agentic_QA.md`), so distinct QA runs never clash. Derive the stamp ONCE at the very start of this
coordinator run with `date +%Y-%m-%d-%H%M`, and reuse that exact filename for the whole run — every batch
sub-agent must append to the SAME stamped file (you pass the filename into each dispatch prompt). Do NOT
let sub-agents each derive their own stamp, or each batch would land in a different file.

The sections below (ENVIRONMENTS, GOTCHAS, BATCHES) are REFERENCE. The numbered PROCEDURE (STEP 1–4)
at the bottom is what you execute, and it points back to this reference.

──────────────────────────────────────────────────────────────────────────────
REFERENCE: ENVIRONMENTS & DATA RESET
Two environments are available; both can be wiped so any check that needs a clean context gets one.
  - LOCAL dev app — the primary target for /app-qa. Wipe the local DB with:
        ./reset_local_supabase.sh   &&   ./migrate.sh --env local
    NOTE: the local wipe ALSO deletes all puzzles and candidates. After a local wipe you MUST repopulate
    puzzles for Challenges before QAing them:
        ./connect-four/server/scripts/generate_all_candidates.mjs --count 10
    then APPROVE and REINDEX the generated candidates (via the /admin flow — admin routes are
    localhost-only outside production) or the puzzles will NOT appear in the app. A sub-agent that finds
    "no puzzles" must check whether generate → approve → reindex was completed, not report an empty app.
  - STAGING — the current code snapshot is deployed at https://staging.decodec4.xyz. Wipe the staging
    DB with:
        ./connect-four/server/scripts/reset-staging-db.js
    The staging wipe does NOT delete puzzles/candidates (intentional), so no regeneration is needed there.
  - Use STAGING for any check that can't be trusted in local dev: real cross-origin OAuth redirect
    round-trips, real Stripe checkout/webhook round-trips, a genuinely clean signed-out session, and
    deploy-time config/migrations. Route those to staging_checks.md or verify them directly on staging
    rather than marking them blocked.

REFERENCE: ENVIRONMENT GOTCHAS — pass these to every sub-agent
  - The local server (port 3001) has NO hot-reload; the /app-qa skill handles starting the app — follow
    the skill's setup. For viewport/responsive checks, use `emulate`; `resize_page` is broken.
  - LLM and TTS are LIVE: OPENAI_API_KEY is present in connect-four/server/.env. Do NOT hand-wave coach
    text, deep-reveal, or audio as untestable "because there's no key" — verify real output.
  - Spanish mode fails OPEN: new strings and LLM-generated fields can ship in ENGLISH silently while in
    Spanish. So English text appearing in Spanish mode is itself a finding — actively compare es vs en,
    don't assume localized-because-present.
  - Anonymous / free-deep-reveal / migration flows are device_uuid-keyed: to get a truly clean anon
    session, CLEAR IndexedDB (not just sign out). A DB wipe alone won't reset client-side anon identity.
  - Paid-tier checkout locally: Stripe webhooks only fire if `stripe listen` is running, else the account
    stays free after "paying" (/verify-session backstops it). Prefer verifying the real checkout
    round-trip on staging and log it in staging_checks.md.
  - The DEV board injector (Batch B) is also a TOOL other batches can use to seed a specific board or
    sparring position (panel / ?devBoard= / /game?devBoard=) when a flow needs a particular position.

REFERENCE: BATCHES (each becomes one sequential sub-agent; hand each the listed specs' criteria as an explicit checklist)

  BATCH A — Onboarding, first-run & home/CTAs
    - spec 048-onboarding-experience (first-run flow, routing, store flag)
    - spec 043-global-ui-ux-polish (Board, TopBar, PastGamesListScreen, HomeScreen, AuthModal; persistent
      logo, logged-out CTA, accessibility quick wins)
    - docs/superpowers/specs/2026-07-13-onboarding-followups-design.md
    - docs/superpowers/specs/2026-07-13-onboarding-mission-screen-design.md
    - Tier states: anonymous and free signed-in. (For a true first-run, wipe local DB + clear IndexedDB.)

  BATCH B — Puzzles / Challenges: correctness, scoring & dev tools
    - spec 044-puzzle-generation-correctness (every category with a classifier judges correctness by
      running that classifier on the resulting position, not correctCol; generation quality)
    - spec 049 — the puzzle scoring-by-pattern half (/api/evaluate-move, predicates, ChallengeScreen)
    - docs/superpowers/specs/2026-07-13-dev-board-injector-design.md (panel / ?devBoard= /
      /game?devBoard=; verify it works AND is not inappropriately exposed in a prod-like build)
    - PRECONDITION: Challenges need puzzles. If the local DB was wiped, run generate_all_candidates.mjs
      --count 10 then approve + reindex before QAing this batch.

  BATCH C — Past games, mistake review & deep reveal
    - spec 041-past-games-data-integrity (blunder unique-index now includes user_id, reachable coach
      queue, unified mistake counts across /api/stats, /api/puzzles/counts, /api/coach/queue, past-games)
    - spec 042-mistake-review-unification (MistakeDetailScreen / ReviewScreen / DeepReveal(SplitReveal);
      "mistakes" = blunders + suboptimal applied consistently; deep-reveal overhaul)
    - docs/superpowers/specs/2026-07-13-anon-free-deep-reveal-design.md (device_uuid-keyed anon free
      deep-reveal gates; QA both signed-out and signed-in — clear IndexedDB for the clean-anon case;
      verify gating + entry points)

  BATCH D — Lessons, coach & audio
    - spec 046-lessons-progression-audio-polish (SagaScreen progression, lesson TTS in CoachDialog,
      ConceptScreen/Board polish, tier-lock upgrade CTA)
    - docs/superpowers/specs/2026-07-14-coach-creation-pattern-transition-design.md (coach commentary
      fires on absent→present transition for double_threat / forced_win)
    - docs/superpowers/specs/2026-07-14-spanish-audio-and-deep-reveal-i18n-design.md (Spanish deep-reveal
      TEXT and AUDIO; switching language surfaces localized content — audio/LLM are live, verify for real)

  BATCH E — Account: session, checkout, upgrade & tier
    - spec 045-account-session-checkout (long-lived remember-me + silent refresh; paid checkout via
      PaymentProcessor/Stripe; UpgradeModal; tier state). Verify UI/flow locally; verify the real Stripe
      checkout/webhook round-trip on staging (or note it needs `stripe listen` locally) and log to
      staging_checks.md.
    - Also verify the Lessons tier-lock upgrade CTA (from Batch D) actually reaches this checkout.

  BATCH F — Spanish localization sweep & hardening-regression check
    - spec 049 — the Spanish (Argentinian Rioplatense voseo) localization half: switch the app to
      Spanish, check key parity, NO silent English fallback (compare es vs en), voseo used
      (encontrá/tenés/sos/vos).
    - spec 047-platform-hardening-cost-observability — mostly server-side; verify nothing user-facing
      regressed (headers, gates, deploy config). Some hardening is only real on staging — verify there
      and log to staging_checks.md.

──────────────────────────────────────────────────────────────────────────────
PROCEDURE — execute these four steps in order.

STEP 1 — BUILD THE MASTER TODO LIST (before spawning anything)
Read polish_epic.md, the spec.md for each of specs 041–049 (under specs/), and each superpowers design
spec named in REFERENCE: BATCHES. Build an explicit written master TODO list (use your task/todo tool)
with ONE item per concrete, testable change or acceptance criterion — not one per spec. Every acceptance
criterion you find, plus one product-gap-review item per major flow, must be its own entry. This master
list is your source of truth; nothing gets dropped.

STEP 2 — ASSIGN EACH TODO ITEM TO A BATCH
Group the master TODO items into the batches in REFERENCE: BATCHES (grouped by flow proximity so each
sub-agent's browser session stays coherent). Adjust membership if your reading reveals a better grouping,
but keep every master TODO item assigned to exactly one batch.

STEP 3 — FOR EACH BATCH, SPAWN A FRESH SUB-AGENT (one at a time, sequentially)
Before spawning anything, derive the run stamp ONCE (`date +%Y-%m-%d-%H%M`) and fix the findings filename
for the whole run: `agentic_QA_<stamp>.md`. Pass that exact filename into every batch's dispatch prompt.
Spawn a fresh general-purpose sub-agent (clean context — NOT a fork) with a self-contained prompt that
includes the batch's checklist plus the ENVIRONMENTS + GOTCHAS reference, and tells it to:
  - Invoke /app-qa --focus "<the batch's focus block, including its explicit checklist of TODO items>".
  - Build its OWN local TODO list from that checklist and work it top to bottom in a real browser,
    marking each item implemented / partial / missing-or-broken with exact screen + repro steps.
  - Do the product-gap review for its flows: could a real user discover this? complete it? know what's
    next? Flag dead-end/missing CTAs, orphaned upgrade paths, empty states with no action, confusing UX —
    even when nothing is technically broken.
  - Append ALL findings to the run's stamped findings file `agentic_QA_<stamp>.md` (the exact filename you
    pass it — NOT a flat agentic_QA.md) per the skill's format (severity + suspected code location). The
    first batch creates the file; later batches append to that same file.
  - Defer anything not confirmable in local dev to staging_checks.md WITH A REASON, or verify it directly
    on https://staging.decodec4.xyz, instead of marking it done or blocked.
  - RETURN a concise summary: which checklist items passed / failed / were deferred, plus product gaps.
After each sub-agent returns: mark those master TODO items done (or deferred), skim its entries in the
run's stamped findings file, and feed any newly-discovered regressions or cross-cutting concerns into
later batches.

STEP 4 — FINAL AGGREGATION
Confirm every master TODO item is checked off or explicitly deferred (an unchecked item = incomplete
sweep). Do a short cross-cutting product-gap pass over the whole app's coherence (navigation, upgrade
funnel end-to-end, first-run → paid journey) and log gaps that only appear across flows. Produce a final
summary to the user: coverage vs. the master list, findings by severity, the top product gaps, and what
was deferred to staging_checks.md.

NOTE: Also pick up any docs/superpowers/specs/2026-07-15-*.md file if one exists by the time you read
(none exist as of writing) and assign it to the most relevant batch. Every sub-agent must be fresh-context
(not a fork); the only shared state between batches is the run's stamped findings file
`agentic_QA_<stamp>.md`, staging_checks.md, and your master TODO list.
