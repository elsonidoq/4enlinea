# Implementation Plan: Audio Verification & TTS Management

**Branch**: `worktree-epic-5-audio-verification-tts` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/051-audio-verification-tts/spec.md`

## Summary

This epic closes out a mostly-shipped audio pipeline rather than building one. Concretely:
(1) **prove** — via automated tests, never inspection — that the 15-lesson, 2-language audio corpus a
parallel session already generated is complete, non-orphaned, and narrates correctly, including the
Socratic exercise flow; (2) **build** the one real gap, a "Lessons" section on the existing
`/admin/audio` page, backed by one new read-only endpoint that reuses the production
`collectMessages()` walker (never a hand-listed field set) plus one small extension to the existing
per-lesson generate-audio endpoint for single-message regeneration; (3) **fix** three narrow,
independent correctness bugs (an unwarned regenerate-over-approved action, a cross-locale cache
clobber, an empty-movestring 400); (4) **thread** locale through the one blunder-one-liner code path
that still lacks it; and (5) **close off** the actual mechanism that let ~217 English coach clips go
stale silently — by changing `ttsProvider.js`'s shared entry point so a caller can supply only text +
language, making "forgot to pass voice config" a thrown error instead of a silent unstyled clip — and
only then regenerate the stale fleet through the existing, no-new-tooling `generate-all scope:'all'`
endpoint.

Research (`research.md`) resolved 11 concrete design questions against the real source, all cited
`file:line`. The signature decision for FR-026 (§R1/R2) is the one piece of genuine design judgment
in this plan — see "Key decisions" below and the Handoff context at the end.

**Post-review corrections (applied after an independent critique found the plan's citations were
correct but its consequences were not fully traced):** (1) the FR-026 signature change breaks an
existing green test (`tests/unit/lessonAudio.test.js`) and the diagnostic log line it depends on —
both now have explicit tasks below and in `research.md` R1/R1a; (2) the FR-029 regression test as
originally contracted required monkey-patching a static ESM import, which this codebase cannot do —
the contract now specifies an exported pure `resolveSynthesisConfig(lang)` instead (see
`contracts/tts-provider-contract.md`); (3) US4's implementation was retargeted at `composeExplanation`
without confirming any frontend caller reaches it — a discovery task now precedes US4's implementation
tasks (see "Key decisions" and `research.md` R7); (4) the preview-sandbox escape hatch
(`synthesizeRaw`/`synthesizeStreamRaw`) is hardened to still refuse legacy TTS models, and the
"single synthesis path" guarantee is now stated precisely as "exactly one path that can **ship** a
clip" everywhere it appears, since `synthesizeRaw` remains a second path that can *synthesize* (but,
by design, never *ship*) a clip.

## Technical Context

**Language/Version**: Node.js (ESM `.js`/`.mjs` server, ESM+JSX React frontend) — matches
`connect-four/`'s existing stack throughout; no new language or runtime.
**Primary Dependencies**: None added. Uses only what's already imported: `server/ttsProvider.js`
(OpenAI TTS REST, via native `fetch`), `server/lessonAudio.js`, `server/ttsConfig.mjs`,
`@testing-library/react` + jsdom (already present, per `testing-conventions.md`'s `test:dom`).
**Storage**: Supabase Postgres (`explanation_cache` table, unchanged schema — migration 059 already
in place); lesson JSON files on disk (`connect-four/lessons/*.json`, unchanged shape); flat-file TTS
registries (`server/tts-registry.json`/`.es.json`, unchanged shape).
**Testing**: `node:test` (pure, via `npm test`/`npm run test:fast`) + jsdom/RTL DOM tests (via
`npm run test:dom`) — no new framework, per `docs/architecture/testing-conventions.md`.
**Target Platform**: Existing Node/Express server + Vite-built React SPA, local dev only for the
generation/regeneration work in this epic (per the spec's own "Generation environment" Assumption —
no remote/cloud execution path, `OPENAI_API_KEY` is local-only).
**Project Type**: Web application (existing `connect-four/server` + `connect-four/src` structure) —
this epic adds no new top-level project.
**Performance Goals**: No new latency requirement beyond the constitution's existing budgets (TTS
synthesis is already an out-of-band admin/CLI operation, not a hot user-facing path, except deep-reveal
TTS which the constitution already bounds — unaffected by this epic's signature change, which is
resolution-location only, not new work per request).
**Constraints**: `test:fast` must stay green (excluding the two pre-existing, unrelated ENOENT
failures documented in the Handoff context this plan inherited); the shared 120 req/min per-IP rate
limiter must not be tripped by FR-031's new CLI tool; lesson audio must stay registry-free (FR-009).
**Scale/Scope**: 15 lessons × 2 languages (207 messages / 414 audio fields / 348 mp3s, per the epic's
harvested baseline), ~217 English coach clips to regenerate, 3 independent bugfixes, 1 locale-threading
change, 1 signature change with 5 call-site migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below.*

- **I. Explanation Engine as Single Source of Truth** — PASS, conditionally. FR-019/020 (blunder
  one-liner locale) was originally scoped to `composeExplanation`, but verification found its sole
  caller (`POST /api/explain-move`) has **no frontend caller** — the app only calls
  `/api/explain-move-llm` (see `research.md` R7 and Key decisions below). A discovery task now
  precedes implementation to confirm which producer actually serves the learner-visible one-liner
  before any locale parameter is added anywhere; whichever producer that turns out to be, it remains
  a single explanation-producing path — no conflict either way.
- **II. Code Quality & Simplicity** — PASS. The FR-026 signature split (`synthesize`/`synthesizeRaw`)
  is the minimum needed to preserve the preview sandbox's genuinely-different requirement (arbitrary
  experimental params) while making the production path's config omission a type error; it is not a
  speculative abstraction — it's replacing 5 duplicated `readTtsConfig`+`buildTtsInstructions` call
  sites with one. No defensive handling is added beyond the two explicit "refuse" requirements
  (FR-028) and the lang-validation throw (both are real system-boundary/spec-mandated checks, not
  speculative).
- **III. Testing Standards** — PASS, with two things to watch. First, FR-001's coverage test and
  FR-002's prune-parity test do not touch the solver, so no solver-mock concern applies. FR-018's
  three correctness-fix regression tests need the "Pure Function Extraction" pattern
  (`testing-conventions.md`) since none of the three bugs live in an already-extracted pure function
  today (the OI-26 cleanup handler in particular is inline in the Express route — Phase 1 design must
  decide whether to extract it, see Complexity Tracking below). Second — found by the "who else binds
  to this shape?" sweep (see Key decisions below) — FR-026/027's signature change breaks an existing
  green test's injected stub (`tests/unit/lessonAudio.test.js`), and FR-029's contracted test sketch
  required module-mocking this repo has never used and cannot do against a static ESM import (`grep
  -ran "mock.module" tests/ server/` → zero hits). Both now have concrete, implementable designs (see
  Key decisions and `contracts/tts-provider-contract.md`) rather than being deferred to
  implementation time. Any new test file this epic adds MUST be registered in **both** the `test` and
  `test:fast` entries in `package.json` — both scripts enumerate test files explicitly (verified:
  `package.json:16-17`), so a file added to neither list runs in neither suite and its "regression
  test" claim (FR-018, FR-029) is unverifiable.
- **IV. UX Consistency & Progressive Disclosure** — PASS. FR-015's warning is additive UI, not a new
  disclosure pattern; FR-008's Lessons section reuses the existing coach-audio page's visual language
  (status badges, inline player) per FR-013.
- **V. Performance Requirements** — PASS. No change to any latency-bounded path; TTS admin/CLI
  operations are explicitly out of the constitution's real-time budgets.
- **VI. Implementation & Debugging Methodology** — PASS, and directly honored: every fix in this plan
  (§R1–R11 in `research.md`) is grounded in a pasted, verified code snippet, not a theoretical
  description — per "Reproduce before theorizing" and "Make load-bearing assumptions explicit."
- **VII. Software Design Philosophy** — PASS. "Errors MUST NOT pass silently" is the literal
  motivation for FR-026's redesign (a missing `lang` argument becomes a thrown error, not a silent
  `alloy`/no-instructions fallback).
- **VIII. Documentation as First-Class Deliverable** — gate items below.

**Principle VIII — Documentation (MUST check before planning)**:
- [x] Existing architecture docs were read before this plan was drafted: `api-conventions.md`,
  `server-conventions.md` (grepped for audio/TTS sections), `frontend-conventions.md` (same),
  `testing-conventions.md` (read in full), `index-conventions.md` (read in full, confirmed
  irrelevant to this epic beyond the general 0-indexing convention — no coordinate data touched
  here), `coach-audio-conventions.md` (read in full), `lesson-editor.md` (read in full).
- [x] Undocumented conventions discovered during review: none found undocumented — the codebase's
  TTS/lesson-audio conventions are unusually well-documented already (this epic's own source epic
  brief cites the exact files). The one genuinely new decision this plan makes (the
  `synthesize`/`synthesizeRaw` split) is captured in `research.md` R1 and must be written into
  `coach-audio-conventions.md` and/or a new `docs/architecture/tts-provider-conventions.md` as a
  **tasks.md documentation task** — see Project Structure below.
- [x] tasks.md (generated by `/speckit-tasks`, not this plan) will include explicit documentation
  tasks for: (a) the `synthesize`/`synthesizeRaw` split and the two-layer legacy-model refusal,
  **stated precisely as "exactly one path that can ship a clip" (not "exactly one path" —
  `synthesizeRaw` is a second path that can *synthesize*, it is scoped by never writing a file/
  registry/manifest row, not by being unable to run)** (new doc content, home TBD — recommend
  extending `coach-audio-conventions.md` since it already owns "Registry and manifest" TTS
  conventions, or a new sibling file if that one is getting long); (b) the new
  `GET /api/admin/lessons/:id/audio-status` endpoint and the `locator` extension to
  `generate-audio`, in `docs/architecture/api-conventions.md` (FR-014 also requires the
  `lesson-editor.md` Lessons-section documentation specifically); (c) the `generate-lesson-audio.mjs`
  CLI, likely alongside the existing `generate-tts.js` documentation; (d) the
  `resolveSynthesisConfig(lang)` export and why it exists (test-seam design, not a speculative
  abstraction — see Key decisions below and `contracts/tts-provider-contract.md`).

## Project Structure

### Documentation (this feature)

```text
specs/051-audio-verification-tts/
├── plan.md              # this file
├── research.md          # Phase 0 — 11 resolved design decisions, all file:line cited
├── data-model.md         # Phase 1 — no schema changes; documents the derived (non-persisted) lesson-audio-status shape
├── quickstart.md         # Phase 1 — manual + automated verification commands
├── contracts/
│   ├── tts-provider-contract.md              # synthesize/synthesizeRaw signature contract
│   └── admin-lesson-audio-endpoints.md       # new + changed admin endpoints
└── tasks.md              # Phase 2 output — generated by /speckit-tasks, NOT this command
```

### Source Code (repository root)

This is the existing `connect-four/` web application (Node/Express server + Vite/React frontend,
already in the repo) — no new top-level structure. Concrete files this epic touches:

```text
connect-four/
├── server/
│   ├── ttsProvider.js          # CHANGED — synthesize/synthesizeStream split (FR-026/027/028);
│   │                             #   exports pure resolveSynthesisConfig(lang) that synthesize()
│   │                             #   delegates to (FR-029 test seam, no monkey-patching — see
│   │                             #   contracts/tts-provider-contract.md); logs resolved
│   │                             #   voice/speed/model/instructionsChars once per call (replaces the
│   │                             #   log line generateLessonAudio loses when config resolution moves here)
│   ├── ttsConfig.mjs            # CHANGED — VALID_TTS_MODELS shrinks to 1 entry (FR-028)
│   ├── lessonAudio.js           # CHANGED — generateLessonAudio gains optional `locator` filter (FR-011);
│   │                             #   synthesize(text, lang) call site updated (FR-026) — the injectable
│   │                             #   `synthesize` param itself is UNCHANGED in shape (still swappable for
│   │                             #   a test stub), only its call signature changes
│   ├── index.js                 # CHANGED — 5 call sites migrated to new synthesize() signature;
│   │                             #   new GET /api/admin/lessons/:id/audio-status route (FR-008);
│   │                             #   POST /api/admin/lessons/:id/generate-audio gains `locator` body field;
│   │                             #   GET /api/user/tts/deep-reveal movestring check fixed (FR-017);
│   │                             #   POST /api/admin/tts/cleanup locale-scoped update (FR-016);
│   │                             #   composeExplanation() gains `locale` param + call site update
│   │                             #   (FR-019/020) — IF discovery (US4, see Key decisions) confirms
│   │                             #   composeExplanation is the live path; otherwise this line's target
│   │                             #   is whatever discovery finds instead
│   ├── ttsProvider.test.js       # NEW — FR-029 synthesis-seam regression test, drives
│   │                             #   resolveSynthesisConfig(lang) directly; sets a fake
│   │                             #   OPENAI_API_KEY; reads outgoing request body via `await request.text()`
│   └── explanationCacheCleanup.test.js  # NEW (or wherever the extracted pure function lands) — FR-016 regression test
├── scripts/
│   ├── generate-tts.js           # CHANGED — one-line fix, synthesize(value, lang) (FR-027)
│   └── generate-lesson-audio.mjs # NEW — FR-031 paced CLI
├── src/
│   └── pages/AdminAudioPage.jsx  # CHANGED — new Lessons section (FR-008–012); TTS_MODELS shrinks (FR-028);
│                                  #   handleGenerate gains approved-clip warning (FR-015)
├── tests/
│   ├── lessons/lessonAudioCoverage.test.js  # NEW — FR-001/FR-002
│   ├── dom/SocraticNarration.dom.test.jsx   # NEW — FR-004
│   ├── unit/deepRevealMovestring.test.js     # NEW (or colocated) — FR-017/FR-018
│   ├── dom/AdminAudioPageWarning.dom.test.jsx  # NEW — FR-015/FR-018
│   └── unit/lessonAudio.test.js               # CHANGED (existing, currently green) — `makeStubSynthesize`
│                                                #   and the "passes TTS instructions/voice/speed/model
│                                                #   opts to synthesize (not called bare)" test (currently
│                                                #   at :23-27/:323-332) rewritten to the new `(text, lang)`
│                                                #   stub contract: assert the stub receives a valid
│                                                #   'en'/'es' string, and that a bare one-argument call is
│                                                #   impossible. MUST be registered in both `test` and
│                                                #   `test:fast` in package.json (already is — verify it
│                                                #   stays listed after the rewrite, do not accidentally
│                                                #   drop it while editing)
└── docs/architecture/
    ├── api-conventions.md         # DOC UPDATE — new/changed endpoints (FR-014-adjacent, VIII gate)
    ├── coach-audio-conventions.md # DOC UPDATE — synthesize/synthesizeRaw split; state the guarantee as
    │                              #   "exactly one path that can ship a clip", not "exactly one path"
    └── lesson-editor.md           # DOC UPDATE — Lessons admin section (FR-014, explicit requirement)
```

**Discovery task (US4, precedes all FR-019/020 implementation tasks)**: trace, in the running app,
which server response actually populates the one-liner a learner reads (start from
`DeepRevealPane.jsx` and the mistake-review chip) and capture a real network request as evidence — not
a code-reading argument. `research.md` R7 documents what is already verified from source (no frontend
caller of `/api/explain-move`, `composeExplanation`'s sole caller); the discovery task's job is to
confirm or overturn that against the live app, and its outcome determines which function FR-019/020
actually change. If discovery finds no code path renders a one-liner today, US4 is re-scoped/deferred
and OI-28 is closed with a dated UPDATE naming exactly what was found, per the closeout convention —
it is not implemented against dead code.

**Lint task (Decision 1 hardening)**: a grep-based check (`grep -a`, per this repo's non-UTF-8-locale
grep trap) asserting no file other than the preview endpoint's module imports `synthesizeRaw`/
`synthesizeStreamRaw` from `ttsProvider.js` — home TBD, either folded into `ttsProvider.test.js`'s
assertion 6 (already specified in `contracts/tts-provider-contract.md`) or a standalone script; either
way it must run in `npm run test:fast`.

**Structure Decision**: No new project/package. Every change lands inside the existing
`connect-four/` app, following its existing `server/` (pure-function-extraction-tested),
`src/` (RTL/jsdom-tested), `scripts/` (CLI), `tests/` (category-directory) layout — this is a
brownfield hardening + one small feature (Lessons admin section) epic, not new architecture.

## Complexity Tracking

> Filled because real trade-offs need explicit justification: the `synthesize`/`synthesizeRaw` split
> (a form of "why two functions instead of one"), the OI-26 cleanup handler's testability, and two
> post-review hardening decisions (the `synthesizeRaw` legacy-model refusal, and the exported
> `resolveSynthesisConfig` test seam).

| Decision | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Two-tier `synthesize`/`synthesizeRaw` API in `ttsProvider.js` instead of one `synthesize(text, lang)` for all 6 callers | The preview sandbox (`POST /api/admin/audio/preview`) has a **documented, pre-existing** requirement to synthesize with **arbitrary experimental** voice/model/speed params the owner is actively tuning — collapsing it into a lang-only signature would delete that capability, which is out of this epic's scope (not named in any FR) | A single `synthesize(text, lang)` for all 6 callers — rejected because it silently regresses the preview sandbox, a feature this epic does not touch and has no mandate to change; see `research.md` R1 for the full citation trail |
| `synthesizeRaw` still refuses legacy `tts-1`/`tts-1-hd` models (Decision 1 hardening), instead of leaving it fully unrestricted | Legacy-model use is the specific defect (OI-32) that caused the original drift; there is no reason the preview sandbox should audition a model the production path can never ship, and an unrestricted `synthesizeRaw` would let the sandbox itself become a second bypass of FR-028 | Leaving `synthesizeRaw` fully unrestricted (the plan's original proposal) — rejected because it makes the "single synthesis path" guarantee false for the model dimension specifically, even though the sandbox never ships a file |
| Exported pure `resolveSynthesisConfig(lang)` in `ttsProvider.js`, rather than a test-only monkey-patch of `readTtsConfig` or a third `_readTtsConfig` parameter on `synthesize` | FR-029's contract requires an automated test asserting legacy-model refusal; this repo has never used module mocking (`grep -ran "mock.module" tests/ server/` → zero hits) and `readTtsConfig` would be a static ESM import inside `ttsProvider.js`, which cannot be monkey-patched | A test-only third parameter on `synthesize` itself — rejected because it adds test-only surface to the production signature, which is exactly what FR-026 is trying to eliminate (the "omission must be inexpressible" requirement) |
| Extracting the `POST /api/admin/tts/cleanup` update logic into a pure, injectable-Supabase-stub function before fixing OI-26 | `testing-conventions.md`'s "Pure Function Extraction Pattern" is this codebase's only established way to unit-test Express route logic (no supertest harness, no exported `app`) — the fix needs a regression test per FR-018, and the route handler today has no seam to test through | Testing the fix only via manual `curl` — rejected because FR-018 explicitly requires an **automated** regression test per fix that fails against pre-fix behavior |

## Key decisions

Decisions made or corrected after an independent critique of this plan traced consequences the
original citations didn't (full detail: `research.md` R1/R2/R7, `contracts/tts-provider-contract.md`,
`contracts/admin-lesson-audio-endpoints.md`):

1. **FR-026/027 signature change breaks an existing green test.** `generateLessonAudio`'s injectable
   `synthesize` seam (`server/lessonAudio.js:164`) is exercised by
   `tests/unit/lessonAudio.test.js:23-27,323-332`, which asserts today's `(text, opts)` stub contract.
   That test must be rewritten to the new `(text, lang)` contract as part of this epic's own work, not
   left to break and be discovered as a regression. The diagnostic log line `generateLessonAudio`
   currently emits (`voice=… speed=… model=… instructionsChars=…`) moves into `ttsProvider.js`, logged
   once per call from the new `synthesize`/`resolveSynthesisConfig` — it is not dropped.
2. **FR-029's regression test needs a real seam, not a monkey-patch.** `ttsProvider.js` exports a pure
   `resolveSynthesisConfig(lang)` that `synthesize` delegates to; the test drives it directly and
   asserts the legacy-model refusal there. The test must also set a fake `OPENAI_API_KEY` (`
   buildTtsRequest` throws without one) and read the outgoing request body via `await request.text()`
   (it is a stream, not a plain object).
3. **US4's target is not yet confirmed live.** `composeExplanation`/`POST /api/explain-move` has no
   verified frontend caller — `research.md` R7 found the app only calls `/api/explain-move-llm`, whose
   `one_liner` field is written as `''`. A discovery task, driven by a captured network request (not a
   code-reading argument), precedes FR-019/020's implementation and determines their actual target. If
   discovery finds nothing renders a one-liner today, US4 is re-scoped/deferred and OI-28 is closed with
   a dated UPDATE rather than shipped against dead code. SC-008 is tied to whatever discovery finds, not
   presumptively to `composeExplanation`.
4. **The preview sandbox keeps its escape hatch, hardened.** `synthesizeRaw`/`synthesizeStreamRaw`
   remain the single documented exception (for `POST /api/admin/audio/preview` only), but must still
   refuse legacy `tts-1`/`tts-1-hd` models via the same allow-list check as the production path. A
   grep-based lint (`grep -a`) asserts no other file imports `synthesizeRaw`/`synthesizeStreamRaw`. The
   guarantee is stated everywhere as **"exactly one path that can ship a clip"**, not "exactly one
   path" — `synthesizeRaw` is a real second path that can synthesize audio; it is scoped out of the
   guarantee by never writing a file, registry entry, or manifest row, not by being non-functional.
5. **"Who else binds to this shape?" sweep.** Every signature this plan changes was re-checked against
   its tests and callers' callers, not just the function being edited. This turned up items 1 and 2
   above (both were already-cited facts whose test/caller consequences had not been traced) and
   confirmed no further hidden bindings: `synthesizeStream`'s only caller (`GET
   /api/user/tts/deep-reveal`) has no test asserting its old `opts` shape (`grep -a` across
   `tests/`/`server/` for a `synthesizeStream` stub or mock found none), and `generate-tts.js`'s
   `synthesizeAndWrite` has no test binding to `synthesize(value)`'s current no-lang call either — so
   neither needed an additional migration task beyond what `research.md` R1/R3 already specify.

## Progress Tracking

- [x] Phase 0: research.md generated, all NEEDS CLARIFICATION resolved (none remained — this is a
  brownfield epic against fully-documented existing code)
- [x] Phase 1: data-model.md, contracts/, quickstart.md generated
- [ ] Phase 1: agent context update — **skipped**: no `<!-- SPECKIT START -->`/`<!-- SPECKIT END -->`
  markers exist in this repo's `CLAUDE.md` (verified: `grep -n "SPECKIT START\|SPECKIT END"
  CLAUDE.md` → no output). Nothing to update; flagged here rather than silently skipped.
- [ ] Phase 2: tasks.md — NOT generated by this command; run `/speckit-tasks` next
- [x] Post-Phase-1 Constitution re-check: no new violations introduced by the design in
  `research.md`/`contracts/` — the four Complexity Tracking entries above are the only trade-offs, and
  all are justified against real, cited constraints rather than convenience.

## Post-Phase-1 Constitution Re-Check

Re-reading the finished `contracts/` against the constitution: FR-026's `synthesize`/`synthesizeRaw`
split still satisfies Principle II (no speculative abstraction — the split is load-bearing per the
Complexity Tracking table) and Principle VII ("Errors MUST NOT pass silently" is the literal design
goal of the lang-validation throw). The post-review hardening (`synthesizeRaw` refusing legacy models,
`resolveSynthesisConfig` as an exported pure seam) adds no new abstraction beyond what FR-028/FR-029
already required — it makes an already-mandated guarantee actually testable and actually complete,
which is Principle VI's "reproduce before theorizing" and Principle VII's "errors must not pass
silently" applied one layer deeper (to the sandbox path and to the test itself), not a new violation.
No new gate failures. Proceed to `/speckit-tasks`.

## Handoff context (for `/speckit-tasks` and implementation)

- **This plan was reviewed once** (an independent critique traced this plan's citations against their
  tests and callers' callers, not just the cited lines themselves) and corrected in place — see the
  "Post-review corrections" note in Summary and "Key decisions" above for the full list. Do not
  re-litigate those five items; they are settled. Everything else in `research.md` was spot-checked
  and held up as originally written.
- **Sequencing is still load-bearing and untouched by the corrections**: FR-026/FR-027 (single
  synthesis path) MUST land before FR-022 (bulk regeneration of ~217 stale English clips) — spelled
  out in FR-022's own "Sequencing constraint" text and repeated in this plan's Summary. None of the
  corrections above change that ordering; if anything, `resolveSynthesisConfig` and the
  `synthesizeRaw` hardening make FR-026/027 slightly larger, which only strengthens the case for
  finishing them first.
- **US4 (blunder one-liner locale) is the one story whose implementation tasks cannot be written
  concretely yet** — its first task MUST be the discovery task in `research.md` R7, and `/speckit-tasks`
  should generate FR-019/020's implementation tasks as explicitly depending on that discovery's
  outcome (three named branches, see R7), not as a fixed `composeExplanation` edit. This is the one
  place in this epic where "write complete code, no placeholders" (per `writing-plans`) is
  deliberately not yet possible — the plan documents why rather than fabricating a target.
  Do not let `/speckit-tasks` flatten this into a single confident task list entry.
- **Fragile/worth-scrutinizing areas for the next agent**: (1) whether the preview endpoint's route
  handler module is cleanly groupable for the `synthesizeRaw` import-lint (i.e., is it one file or
  spread across helpers? — verify at implementation time rather than assuming `server/index.js` is the
  only file that legitimately imports it); (2) whether `resolveSynthesisConfig`'s error messages need
  to exactly match `synthesize`'s today (the contract assumes "same shape," verify no test asserts a
  narrower message string); (3) the FR-016 (OI-26) pure-function-extraction decision in Complexity
  Tracking is still unresolved as to *where* the extracted function lives — that's an implementation
  decision, not a planning gap, but flag it early so the regression test isn't written against code
  that later moves.
- **Not re-verified in this pass** (per the answers file's "Confirmed correct — leave alone" list):
  sequencing honoring, prune-test non-destructiveness (R10), registry-free compliance, walker-derived
  coverage test design, `test:fast` usage in quickstart, the skipped SpecKit agent-context step, and
  the six-call-site migration table's accuracy. Do not re-check these; re-checking them was the
  reviewer's own explicit instruction not to do.
