# Design Spec — Connect Four Opening Theory across Lessons, In‑Lesson Practice, and the Reason Engine

_Status: design (brainstormed 2026-07-04). Source material: the seven solver‑verified Allen opening KB entries (corrected 2026-07-04). Deliverable of the opening‑theory scoping work; supersedes the never‑written `docs/mvp/opening-theory-epics.md` (we went straight to a superpowers spec → plan because the work is design‑resolved and below the speckit "new‑epic" bar for the content half — see Decision D7)._

> **Reuse is a hard requirement, not a preference.** Every part below names the existing module it extends. Do not build a new module where an existing one takes a case, a field, or a JSON entry. The "Reuse map" (§10) is the checklist.

---

## 1. Context & goal

Six (now **seven**) KB entries document Connect Four opening theory, each with a `short_summary` (the only client‑facing field) and a machine‑usable payload (`formal_predicate`, solver‑verified `worked_examples`, `false_positives`):

- `allen-opening-principles` — centrality, odd‑row‑threat quest, "I play where you play", B1/F1 > E1, fifth‑row economy.
- `allen-opening-tables` — Ch. 9 result tables; centre = first‑player win.
- `allen-5-4-opening` — `333334444` (+ 5‑1 stem `3333341`).
- `allen-3-4-opening` — `3332222` (thin, difficult win).
- `allen-d3-d4-opening` — **new** 2026-07-04: first player owns 0‑indexed col 3 rows 2 & 3 (Allen D3, D4); easy win; premium "only one move to win" board `3332223362` (Diagram 231, unique col 1).
- `allen-candlesticks-opening` — `3333311115555` stem / `333331111555515` full; family (2‑col/3‑col/mirror); silhouette necessary‑but‑not‑sufficient.
- `allen-third-row-gambit` — `3265533353553111` (unique winning move col 4).

**Goal:** surface this material in the two product consumers where openings actually fit — **Lessons** (teach) and the **Reason engine** (explain opening blunders) — reusing existing infrastructure, and doing the reason‑engine work *soundly* (respecting `reason-INVARIANTS.md`) and *completely* (covered by the eval harness, graded by `grade-fv-sufficiency`, grounded in the production prompt, documented in the glossary).

**Challenges are deliberately cut** (Decision D1). Opening theory does not fit the recognition‑puzzle/category model: the flagship "won position" boards have the *losing* side to move (no column to find), and there is no generatable one‑move opening signal for a classifier. The two genuinely interactive boards are delivered inside Lessons instead.

---

## 2. Cross‑cutting concerns

- **KB is the single source of truth for strategy.** No strategic prose is authored outside the KB. Lessons render `short_summary`/worked‑example boards; the reason engine consumes `formal_predicate`/worked‑example movestrings. If a lesson or prompt needs a new strategic claim, it goes in a KB entry first.
- **Never reveal the answer column** for any interactive task (Socratic or in‑lesson drill) before the learner attempts it.
- **Never weaken the reason algorithm to save solver calls (Invariant I0).** Un‑skipping openings adds solver load; that is expected and acceptable. No budget heuristic may gate opening analysis.
- **Reason soundness bar (I0/I1/I2/I12):** every clause in an opening reason must be solver‑ or canon‑grounded; the LLM narrates, it does not reason; validate any new classification/stop rule against its full case‑space with a counterexample per case, through the production detector.
- **i18n:** lesson **body** text (coach messages, `infoProse`) is authored **inline in the JSON** (matching lessons 1–10; `ConceptScreen` renders it directly). Only the lesson **title** is i18n‑keyed (`lesson.<id>.title`, with the JSON `title` as `defaultValue`). No `lesson.<id>.slide.<n>.*` wiring exists or is added. English at launch; `es.json` untouched.
- **Analytics:** reuse existing events `lesson_started` / `lesson_completed` (fired by the lesson screens) and `puzzle_attempted` / `puzzle_solved_*` (in‑lesson drills reuse `ChallengeScreen`). No new events.
- **Documentation is a first‑class deliverable** (§9), not an afterthought — the glossary, the grader skill, the decisions log, and the evidence doc are all updated in‑scope.
- **Coordinates are 0‑indexed** everywhere except the two existing translation boundaries (frontend display, c4solver wrapper).

---

## 3. Decision log (settled in brainstorming)

| # | Decision | Rationale |
|---|---|---|
| **D1** | **No opening Challenge category.** Cut. | Won‑position boards have the losing side to move (no answer to recognize); no generatable one‑move signal for a classifier; the 8‑file category wiring would hold ~2 hand boards. A well‑argued "not worth building." |
| **D2** | The two viable interactive boards live in **Lessons** (Socratic + in‑lesson drills), not a category. | The Socratic mechanism already provides a single‑position "pick the column, answer hidden" interaction with zero category infrastructure. |
| **D3** | **3–4 opening lessons**, including the named openings. | Matches the 1000–1500 Elo target; named lines taught as concept slides where they don't fit a single‑move interaction. |
| **D4** | Reason engine v1 = **sound slice only**: (a) opening‑centrality evidence (reuse `centerDominance` logic), (b) narrow **exact‑match** named‑opening label. **General causal "you left the &lt;opening&gt;" reason is DEFERRED as unsound.** | A deviation from a named line often isn't a blunder; attributing a score drop to "leaving the opening" is a causal claim the solver doesn't verify → violates I0/I2/I12. |
| **D5** | Opening reason is first‑class in the **feature‑vector engine** (`computeReason`), not only the coach path — so it is covered by `select_boards`, graded by `grade-fv-sufficiency`, and grounded in the production prompt. | The user's requirement: eval coverage + grader awareness + prompt grounding are part of "adding a reason case." |
| **D6** | **No `winning_move` predicate / no server‑checked drills.** The interactive "find the move" moment is delivered by the **Socratic** board (client‑side `correctCol`), one per lesson. | Server‑checked `confirmationChallenges` are DB‑puzzle‑backed (`/api/puzzles/:id/check` loads a `puzzles` row by id and switches `evaluatePredicate` on the stored category); with no opening challenge category (D1) there are no such rows, so a predicate + drill path would need DB/curation plumbing for no real gain. Socratic needs zero backend. _(Revised 2026-07-04 after tracing the check path; supersedes the earlier "add a `winning_move` predicate" plan.)_ |
| **D7** | Structure as **two workstreams** (A: Opening lessons; B: Reason engine) in one design doc. Part A is **content only** → **implement directly** (below the speckit bar); Part B is invariant‑heavy, multi‑surface → **its own speckit spec**. | Independent subsystems, very different risk profiles; the sizing rubric (`best_practices_spec_driven_development.md`) says split when risk/subsystems differ, and skip speckit for content‑only work. |
| **D8** | `select_boards.mjs` currently **skips openings** (`discMin: 12`). Un‑skipping (an opening harvest band) + registering opening predicates in `REASON_UNIVERSE` is in scope. | Without it, opening blunders never enter the eval set and the new reason is ungraded. |
| **D9** | **All prompt grounding is in scope** — `explainContext.js`, `llmCoachHelpers.js`, the grounded‑render / condition‑D `render_decision` path, and any `causalLinks.mjs` frame needed for the opening‑centrality case. | Requested explicitly; a feature‑vector field that never reaches a grounded prompt is inert. |

**Deliberately left out (with reason):** general named‑opening causal reason (D4, unsound v1); multi‑Socratic schema extension (use `confirmationChallenges` for multiple checkpoints); any change to the 5‑case taxonomy or two‑halves core; Spanish content; payments (Pro‑gating uses the existing lock modal).

---

## PART A — Opening Lessons (content only)

_Subsystem: lesson content only — JSON files on the existing model. Frontend and backend are **entirely reused; zero new server code, zero i18n wiring beyond the existing `lesson.<id>.title` key**. Sizing: content authoring, below the speckit bar → implement directly with a short task list. (In‑lesson server‑checked drills were dropped — see D6; the one interactive board per lesson is the client‑side Socratic.)_

**i18n reality (correction to §2):** lessons render slide text **inline from the JSON** (`ConceptScreen` passes `slide.coachMessages` straight to `CoachDialog`; `infoProse` is rendered as‑is). Only the lesson **title** goes through i18n (`t('lesson.<id>.title', { defaultValue: lesson.title })`, `ConceptScreen.jsx:110`). So opening‑lesson prose is authored inline in the JSON (matching lessons 1–10); there is no `lesson.<id>.slide.<n>.*` wiring to add.

### Story A1 — Opening‑theory lessons

**As a** 1000–1500 Elo learner, **I want** lessons that teach how to open, **so that** I start games on winning/ sound lines instead of guessing.

Built entirely on the **existing lesson model** (`connect-four/server/lessonLoader.js`, JSON files in `connect-four/lessons/`, `GET /api/lessons` + `/api/lessons/:id`, screens `ConceptScreen`/`SocraticScreen`/`ChallengeScreen`, saga map). No infra changes.

Lessons (final titles TBD in authoring):

1. **`lesson-NN-opening-centre` — "Own the Centre."** Centrality + the Table headline ("the centre is the only first move that wins; edges don't") + a light odd‑row‑threat quest. `userPerspective: "red"` (first player). **Socratic:** empty board → `correctCol: 3`. KB: `allen-opening-principles`, `allen-opening-tables`.
2. **`lesson-NN-opening-imitate` — "I Play Where You Play."** Imitative play via the Candlesticks / 5‑4 lines (concept slides show the won stacks). **Socratic:** an early position where playing directly on top of the opponent's last disc is the answer. KB: `allen-candlesticks-opening`, `allen-5-4-opening`, `allen-opening-principles`.
3. **`lesson-NN-opening-named` — "Sharp Openings" (Pro‑gated, mirroring lessons 8–11).** 5‑4 / Candlesticks central wins + the D3‑D4 easy win as concept slides. **Socratic:** the "only one move to win" board — the gambit `3265533353553111` → `correctCol: 4`, or the D3‑D4 Diagram 231 `3332223362` → `correctCol: 1`. KB: `allen-third-row-gambit`, `allen-d3-d4-opening`, `allen-5-4-opening`.
4. _(Optional)_ Fold the **3‑4 delayed‑D4 trap** into lesson 3 as a **reading‑only** concept slide (its payoff board has the losing side to move → no interaction). KB: `allen-3-4-opening` (`3332222`; the genuine late‑D4 blunder `333222266644203`).

**Acceptance criteria**

- Each new `lesson-NN-*.json` **passes `validateLesson`** (`lessonLoader.js`): `boardSpec` arrays are exactly 7 elements; `socratic` is an object or `null`; `confirmationCategory` string‑or‑`null`; `confirmationCount` integer ≥ 0.
- `GET /api/lessons` lists the new lessons in saga order; `GET /api/lessons/:id` returns full JSON.
- Every `boardSpec` is **derived from a KB‑verified movestring** at authoring time (movestring → 7 column strings of `g`/`d`), not hand‑built. Deep boards (gambit 16 plies, D3‑D4 10 plies) are converted, not typed.
- Every Socratic `correctCol` equals the **solver‑verified** winning column from the KB (`3` empty, `4` gambit, `1` D3‑D4). `SocraticScreen` evaluates client‑side (`col === socratic.correctCol`, `SocraticScreen.jsx:78`) — no server call, no answer revealed before attempt.
- Reading‑only lessons set `socratic: null` **and** `confirmationCategory: null` (the Lesson‑4 "Odd Rows" pattern).
- Slide text (coach messages, `infoProse`) is authored **inline in the JSON** (only the `title` is i18n‑keyed); no strategic claim appears that isn't traceable to a KB entry's `short_summary`/worked example.
- **IF** a lesson is Pro‑gated, **THEN** `free: false` and the saga map shows the existing lock → `UpgradeModal` (no new gating code).

### Story A2 — In‑lesson interactive checkpoint (Socratic; drills DROPPED)

**As a** learner reading an opening lesson, **I want** one interactive "find the move" checkpoint, **so that** I confirm I recognize the idea, not just read it.

**Delivered by the existing Socratic board, folded into each lesson in Story A1 — no new code.** `SocraticScreen` evaluates the answer client‑side (`col === socratic.correctCol`, `SocraticScreen.jsx:78`); the board comes from the lesson JSON `socratic.boardSpec`. Each lesson carries **one** Socratic with a KB‑verified `correctCol` (empty→`3`, imitation→X, gambit `3265533353553111`→`4`, D3‑D4 `3332223362`→`1`).

**Server‑checked multi‑position drills are cut (D6).** `confirmationChallenges` are DB‑puzzle‑backed (`/api/puzzles/:id/check` loads a `puzzles` row by id and switches `evaluatePredicate` on the stored category); openings have no such rows and no category. A `winning_move` predicate would only serve that DB‑backed path, so it adds no value here and is **not built**. Opening lessons set `confirmationCategory: null` and `confirmationChallenges` absent (the Lesson‑4 reading‑only shape), relying on the Socratic for interactivity.

---

## PART B — Opening‑aware Reason Engine

_Subsystems: feature‑vector engine (`reasonEngine.mjs`) + eval harness (`select_boards.mjs` + `renderUniverse.mjs`) + prompt/render layer (`explainContext.js`, `llmCoachHelpers.js`, `causalLinks.mjs`) + coach path (`centerDominance.js`) + docs (glossary, grader skill, decisions/evidence). Invariant‑governed. Sizing: multi‑surface, unresolved field‑shape decision, ~16+ tasks → **its own speckit spec.**_

> **Read before implementing (per `CLAUDE.md`):** `reason-INVARIANTS.md` (I0, I2, I8, I9, I12), `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`. This part must not relitigate the 5‑case taxonomy or the two‑halves engine.

### Story B1 — Opening‑centrality evidence in the feature vector

**As a** player reviewing a blunder I made in the opening, **I want** the structured reason to carry the honest, board‑findable "why the better move is stronger" for early positions, **so that** the coach explains it in opening terms instead of falling back to generic filler or fabricating a tactic.

The two‑halves engine already handles opening blunders by *case* (an edge first move is a `win_to_draw`; the two halves exhibit the winning line from centre vs. the drawn line). The gap is the **no‑tactical‑structure** opening board, where the honest reason is geometric (centrality / number of winning lines), which the current lost‑resource/opponent‑punishment fields don't express — exactly the case `centerDominance.js` was written for in the coach path.

**Scope**

- Add a **first‑class opening‑centrality evidence field** to `computeReason`'s output (surface B), populated when `board_state === 'opening'` (`REASON_CONFIG.openingMaxDiscs`, currently 15) **and** the two‑halves engine finds no tactical resource to ground on. **Reuse `detectCenterDominance({ movestring, playedCol, bestCol })` verbatim** as the computation (Decision D4/D-new); do not re‑derive centrality. The field is geometric and board‑findable → satisfies I2 (no fabrication).
- **Optional Tier‑2:** a narrow **named‑opening label** field, set **only** when the pre‑move `movestring` exactly matches a KB opening line (up to mirror) — a lookup against the KB worked‑example movestrings (`333334444`, `3332222`, `3332223362`/`3332223`, `3333311115555`/`333331111555515`, `3265533353553111`, `3333341`). The label is context only (`"5-4 opening"`); the causal "why it lost" still comes from the grounded two halves. A lookup match is a fact, not an inference → I2‑safe.
- **DEFERRED (explicitly not built):** any general "you deviated from opening &lt;X&gt;, the plan was &lt;Y&gt;" causal reason for non‑matching positions. Recorded as unsound in v1 (I0/I2/I12); a `reason-DECISIONS.md` entry states the boundary.

**Contracts**

- New field named in the glossary (exact shape resolved in `/plan`; proposed) : `openingContext: { centrality: { bestCol, playedCol, betterHasMoreLines: true, text }, namedOpening?: { id: "allen-5-4-opening", line: "333334444" } }`. Present only on opening, no‑structure boards (pruned otherwise, per the glossary absence contract).
- `toNarratorVector` / `pruneVector` keep the scalar/text (drop empty). The raw per‑column `scores` stays stripped (D21).

**Acceptance criteria**

- On an opening blunder with no tactical structure (e.g. an early off‑centre move that drops `win → draw`), the vector carries a non‑empty `openingContext.centrality` whose `bestCol`/`playedCol` match the decision board and whose claim ("the better column sits in more four‑in‑a‑row lines") is board‑verifiable.
- `namedOpening` is present **iff** the movestring exactly matches a KB line (mirror‑normalized); absent otherwise. Tested with a matching board and a near‑miss.
- **No** invariant weakened: no field asserts a line that doesn't complete under optimal defence; centrality is the only ungated geometric claim and it is board‑findable.
- **I12 validation:** a deliberate counterexample per opening sub‑case (win_to_draw off‑centre; win_to_lose; a matched named line; an unmatched opening) run through the **production** `computeReason`, not a hand proxy.

### Story B2 — Opening coverage in the eval harness

**As** the maintainer of the reason eval, **I want** opening boards and the new opening predicates in the coverage universe, **so that** the opening reason is actually exercised and gradeable (today it is invisible).

**Scope**

- `select_boards.mjs`: the `fixture` strategy skips openings (`CFG.discMin: 12`, `// skip opening theory`) and the `coverage` strategy harvests from mid/late self‑play. Add an **opening harvest band** (e.g. a low‑disc pass, discs ~1–15 matching `openingMaxDiscs`) so opening blunders enter both sets. This is additive — the existing mid‑game bands are unchanged.
- Register the new opening predicates in **`REASON_UNIVERSE`** (e.g. `reason_opening_centrality`, `reason_opening_named_line`). Per the harness contract (`select_boards.mjs:269–275`), **any predicate the engine emits must be listed**, or it is flagged a bug — so the engine's new opening emissions and this list must match. Partition into `REQUIRED` vs `PROVISIONAL` empirically (named‑opening matches are rare → likely `PROVISIONAL`).
- If the render layer emits an opening frame, union its predicate into `RENDER_UNIVERSE` / `RENDER_REQUIRED` (`renderUniverse.mjs`), per spec §3e (the coverage set spans engine axes AND render axes).
- Update `select_boards.mjs` `--help` / header to document the opening band (per the project rule that scripts ship meaningful `--help`).

**Acceptance criteria**

- `node server/scripts/select_boards.mjs --strategy coverage` harvests ≥ `--target` boards for each new opening predicate (or the predicate is justified `PROVISIONAL` with the observed rarity noted, matching the existing calibration comment style).
- No engine‑emitted opening predicate is missing from `REASON_UNIVERSE` (the built‑in "unlisted predicate = bug" check passes).
- The opening band does not regress the mid‑game/closing harvest (existing predicates still fill within budget).
- The harvest is bounded (respects the coverage sampler rare‑fill trap: an unreachable REQUIRED predicate must not cause a full‑budget solver burn — keep named‑opening `PROVISIONAL`).

### Story B3 — Grade & document the opening cases

**As** the reason grader, **I want** the glossary and the `grade-fv-sufficiency` skill to know the opening fields, **so that** opening cases grade on A1–A4 without spurious `vector_error`.

**Scope**

- **`docs/architecture/feature-vector-glossary.md`:** add an "opening context" section defining `openingContext.centrality` (geometric claim, how to verify: the better column lies in strictly more four‑in‑a‑row windows) and `openingContext.namedOpening` (a KB‑line lookup label, **not** a causal claim). State the absence contract (present only on opening no‑structure boards).
- **`.claude/skills/grade-fv-sufficiency/SKILL.md`:** teach the grader how to verify an opening case — a centrality claim is checked by counting winning lines through `bestCol` vs `playedCol` on the board (via `visualize_board.sh`), **not** by expecting a `finalMovestring` tactical line; a `namedOpening` label is checked by matching the movestring, and must **not** be graded as a causal claim (a label that says "5‑4 opening" is not a fabricated mechanism). Add the opening fields to the vector‑field list the skill enumerates so `unsure_about` attributions can name them.
- The grader's board‑observation and triage machinery (A1–A4, `vector_error`/`missing_info`/`prompt_confusion`) is otherwise reused unchanged.

**Acceptance criteria**

- A batch of opening cases run through `compute.mjs --llm` and graded by `grade-fv-sufficiency` produces A1–A4 verdicts with **no false `vector_error`** attributable to the grader not knowing the opening fields (i.e. a correct centrality claim is not mis‑flagged as a missing tactical line).
- The glossary documents every new field; the skill's field enumeration includes them.

### Story B4 — Ground the opening reason in the production prompt

**As a** player, **I want** the deep‑reveal explanation of an opening blunder to be grounded (centrality; and, when the board is a known line, the opening's name) and never fabricated, **so that** the coaching teaches real opening principles.

**Scope (reuse the existing grounding wiring)**

- **`explainContext.js`:** `detectCenterDominance` is already called at `explainContext.js:954` and its `## Why the better move is stronger` section is gated to no‑lookahead/no‑threat‑row openings (`explainContext.js:957`). Feed the **same** opening‑centrality evidence (the shared `centerDominance` computation) into `prompt_data` (it already sets `centerDominance` in `prompt_data`, line ~1051) and, when present, the `namedOpening` label. **Single source:** the coach path (surface A) and the feature vector (surface B) consume one `centerDominance` computation — do not duplicate (Decision D-reuse).
- **`llmCoachHelpers.js`:** the `centerDominanceSection` is already pushed into the prompt and referenced by the instruction (`llmCoachHelpers.js:692, 835`). Extend that instruction minimally so a present `namedOpening` label may be stated as context, and reaffirm the anti‑fabrication rule (do not invent a tactic; the centrality reason is the grounded one). Respect existing grounding traps: no KB term injects without its pattern firing (`project_kb_major_minor_threat_not_always_include`), name the player explicitly (`feedback_llm_perspective_bug`).
- **Grounded‑render / condition‑D path:** if the render layer needs a causal frame for the opening‑centrality case, add/adjust the minimal `causalLinks.mjs` (L1–L9) frame and its `covers`/`guardrail`, and ensure a `render_decision` is emitted for opening cases (so condition‑D grading G1–G6 has ground truth). If the existing "why the better move is stronger" frame already covers centrality, reuse it and add nothing.

**Acceptance criteria**

- For an opening blunder, the production deep‑reveal grounds on centrality (and states the opening name only when the board is an exact KB line); it contains no fabricated tactic and no vaguer substitute for the centrality reason.
- The coach path and the feature vector derive centrality from **one** `centerDominance` call (verified by code path, not duplicated logic).
- Condition‑D `render_decision` is emitted for opening cases; `judge`/grader can consume it as ground truth (no re‑derivation).
- Existing non‑opening deep‑reveal behaviour is unchanged (the opening section stays gated to opening + no‑structure boards).

---

## 4. Consolidated data / API contracts

- **Lesson JSON:** unchanged schema (`lessonLoader.js`). New lesson files only; each carries one `socratic: { boardSpec, correctCol }` (client‑side eval); reading‑only lessons set `socratic: null`. No `confirmationChallenges`, no new predicate.
- **Feature vector:** additive `openingContext: { centrality:{bestCol,playedCol,…,text}, namedOpening?:{id,line} }` (exact shape finalized in `/plan`), pruned on non‑opening/structured boards.
- **Eval harness:** `REASON_UNIVERSE += ['reason_opening_centrality','reason_opening_named_line']` (names provisional), opening harvest band in `select_boards.mjs`; render predicates unioned into `renderUniverse.mjs` if a frame is added.
- **i18n:** only `lesson.<id>.title` (existing); lesson body text is inline JSON. Reuse `coach.*` pools for the reason‑engine coach path.
- **KB fields consumed:** `short_summary` (client, lessons), worked‑example `movestring` + `false_positives` (predicate/label lookup, reason engine), `formal_predicate` (author reference).

---

## 5. NOT included

- **No opening Challenge category** — no change to `categories.js` / `src/lib/categories.js`, no `candidate-generator.js` / `classifier.js` detector, no `challengeSets.js` entry, no 8‑file wiring.
- **No `winning_move` predicate / no server‑checked in‑lesson drills** — dropped (D6); interactivity is the client‑side Socratic.
- **No general causal named‑opening reason** — deferred as unsound (D4).
- **No taxonomy / two‑halves core change** — the 5‑case engine and its gate are untouched; opening work is additive evidence + coverage + grounding.
- **No multi‑Socratic schema change** — one Socratic per lesson is sufficient for the interactive checkpoint.
- **No Spanish content**, **no payments** (Pro‑gating uses the existing lock modal), **no new analytics events**.
- **No `winSamples` re‑enable** (opening/mid‑game win distributions stay disabled, `REASON_CONFIG.enableWinSamples: false`).

---

## 6. Documentation deliverables (in‑scope, first‑class)

1. `docs/architecture/feature-vector-glossary.md` — new "opening context" fields (B3).
2. `.claude/skills/grade-fv-sufficiency/SKILL.md` — opening‑case grading guidance + field enumeration (B3).
3. `docs/architecture/reason-DECISIONS.md` — a new **D‑entry** recording the opening‑reason sound slice (centrality + exact‑match label) and the **deferral** of the general causal reason, with rationale.
4. `docs/architecture/blunder-reason-evidence.md` — an "opening evidence" subsection + the validated opening boards (the KB movestrings above).
5. `docs/mvp/lesson-curriculum.md` — add the 3–4 opening lessons to the curriculum.
6. `connect-four/server/scripts/select_boards.mjs` — `--help`/header documents the opening harvest band.
7. KB entries — **already updated 2026-07-04** (7 entries; corrections logged in `docs/knowledge-base/README.md`).

---

## 7. Open questions / risks (resolve in `/plan`)

- **Feature‑vector `openingContext` field shape** — final field names/nesting; how it coexists with the realized/denied route and per‑case shapes (glossary §3a).
- **Causal frame** — does opening‑centrality reuse an existing "why the better move is stronger" frame, or need a new `causalLinks.mjs` L‑frame? Prefer reuse (I9 Occam).
- **Un‑skipping openings may surface engine soundness gaps** on the very earliest boards (ply 0–2). Bound the opening band sensibly and validate per I12; a degenerate ply‑0 "blunder" may need a `NotABlunder`/guard.
- **Pro‑gating** — recommend "Own the Centre" + "I Play Where You Play" free, "Sharp Openings" Pro (mirrors lessons 8–11). Product confirm.
- **Named‑opening label value** — is Tier‑2 worth the matcher, given it fires only on exact KB lines? Cheap and sound; recommend include but it can be cut without affecting B1's centrality core.

---

## 8. Phasing & dependencies

- **Part A** (opening lessons, content only) is independent of Part B and can ship first — pure authoring on already‑built infra, no server code.
- **Part B** (reason engine) depends on the corrected KB (done) and is gated on the reason‑engine invariant reads. Its stories are ordered **B1 → B2 → B3 → B4** (evidence field → coverage → grade/doc → prompt grounding); B4's grounding is only meaningful once B1's field exists and B2/B3 make it gradeable.

---

## 9. Reuse map (checklist — do not rebuild)

| Need | Reuse |
|---|---|
| Lesson model, loading, validation | `lessonLoader.js`, `connect-four/lessons/*.json`, `GET /api/lessons(/:id)` |
| Concept / Socratic / drill screens | `ConceptScreen.jsx`, `SocraticScreen.jsx` (client‑side `correctCol`), `ChallengeScreen.jsx` `lessonMode` |
| Board display | `boardSpec` (7‑element display encoding), existing overlays |
| Interactive checkpoint eval | `SocraticScreen` client‑side `col === socratic.correctCol` (no server call, no predicate) |
| Centrality computation | `centerDominance.js` `detectCenterDominance` — shared by coach path AND feature vector |
| Reason evidence engine | `reasonEngine.mjs` `computeReason`, 5‑case taxonomy, two‑halves — additive field only |
| Detectors as evidence (I8) | `classifier.js` (`classifyPattern`, `detectDoubleThreat`, z‑threat, odd‑even, …) |
| Eval harness | `select_boards.mjs` (add band + predicates), `renderUniverse.mjs` |
| Answerer + grading | `compute.mjs --llm`, `toNarratorVector`, `grade-fv-sufficiency` skill, `feature-vector-glossary.md` |
| Prompt grounding | `explainContext.js` (`centerDominanceSection`, `prompt_data`), `llmCoachHelpers.js`, `causalLinks.mjs`, condition‑D `render_decision` |
| Strategy source of truth | the 7 `docs/knowledge-base/allen-*opening*.md` entries |
| Pro‑gating, lock UX | existing `UpgradeModal` / saga lock |
