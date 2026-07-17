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
- **i18n:** lesson strings use `lesson.<id>.slide.<n>.*` (existing namespace); coach phrasing reuses the existing `coach.*` pools. English at launch; `es.json` untouched.
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
| **D4** | Reason engine v1 has **two grounded modes**: (a) **centrality** — for opening blunders that match no book line; (b) **named‑opening deviation** — when the moves so far are a **prefix** of a known opening line and the blundering player is the opening's beneficiary, explain the blunder as *leaving the book*: the opening's next move is the known winning continuation (solver‑verified best), the played move loses/draws (two‑halves‑grounded). **This is the primary intended use** (openings are *good moves*; the book names the correct move). **Out:** inventing an opening attribution for a **non‑matching** position (that is the only unsound claim). | Every clause is a lookup fact or a solver check; it is NOT the abstract "leaving the opening caused the loss" claim. Sound under I0/I2, with the four case‑space guards (see B1). |
| **D5** | Opening reason is first‑class in the **feature‑vector engine** (`computeReason`), not only the coach path — so it is covered by `select_boards`, graded by `grade-fv-sufficiency`, and grounded in the production prompt. | The user's requirement: eval coverage + grader awareness + prompt grounding are part of "adding a reason case." |
| **D6** | **In‑lesson recognition drills CUT** (revised 2026-07-04). No `winning_move` predicate, no `confirmationChallenges` for openings, no `/check` plumbing. Interactivity = one **client‑side Socratic** per lesson (empty→3, imitation, gambit→4 / D3‑D4→1). | `/api/puzzles/:id/check` requires a DB puzzle row (404s on self‑contained ids); drills would need a new inline‑eval path + frontend wiring for little value over Socratic. Keep Part A pure content. |
| **D7** | Structure as **two workstreams** (A: Lessons + Practice; B: Reason engine) in one design doc. Part A is content + one small predicate → **implement directly / one lean spec**; Part B is invariant‑heavy, multi‑surface → **its own speckit spec**. | Independent subsystems, very different risk profiles; the sizing rubric (`best_practices_spec_driven_development.md`) says split when risk/subsystems differ. |
| **D8** | `select_boards.mjs` currently **skips openings** (`discMin: 12`). Un‑skipping (an opening harvest band) + registering opening predicates in `REASON_UNIVERSE` is in scope. | Without it, opening blunders never enter the eval set and the new reason is ungraded. |
| **D9** | **All prompt grounding is in scope** — `explainContext.js`, `llmCoachHelpers.js`, the grounded‑render / condition‑D `render_decision` path, and any `causalLinks.mjs` frame needed for the opening‑centrality case. | Requested explicitly; a feature‑vector field that never reaches a grounded prompt is inert. |

**Deliberately left out (with reason):** opening attribution for **non‑matching** positions (D4 — the one genuinely unsound claim); **transposition** matching (matching by resulting position rather than move‑prefix) — a future enhancement; v1 uses mirror‑normalized prefix match; multi‑Socratic schema extension (use `confirmationChallenges` for multiple checkpoints); any change to the 5‑case taxonomy or two‑halves core; Spanish content; payments (Pro‑gating uses the existing lock modal).

---

## PART A — Opening Lessons

_Subsystem: lesson content only (JSON + i18n). All frontend/server reused; **no new code**. Sizing: pure content authoring → implement directly (skip speckit)._

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
- All user‑facing text is a `t('lesson.<id>.slide.<n>...')` key; no strategic claim appears that isn't traceable to a KB entry's `short_summary`/worked example.
- **IF** a lesson is Pro‑gated, **THEN** `free: false` and the saga map shows the existing lock → `UpgradeModal` (no new gating code).

_**Story A2 (in‑lesson recognition drills) was CUT** (Decision D6, revised 2026-07-04). Rationale: `/api/puzzles/:id/check` requires a DB puzzle row and 404s on self‑contained `inline-<moveString>` ids, so drills would need either a new inline‑evaluation server path + frontend wiring or DB‑seeded `winning_move` puzzles — plumbing that buys little over the Socratic checkpoints A1 already delivers. The interactive "find the move" moment lives in each lesson's single client‑side Socratic (A1); the reason engine (Part B) carries the substantive opening work._

---

## PART B — Opening‑aware Reason Engine

_Subsystems: feature‑vector engine (`reasonEngine.mjs`) + eval harness (`select_boards.mjs` + `renderUniverse.mjs`) + prompt/render layer (`explainContext.js`, `llmCoachHelpers.js`, `causalLinks.mjs`) + coach path (`centerDominance.js`) + docs (glossary, grader skill, decisions/evidence). Invariant‑governed. Sizing: multi‑surface, unresolved field‑shape decision, ~16+ tasks → **its own speckit spec.**_

> **Read before implementing (per `CLAUDE.md`):** `reason-INVARIANTS.md` (I0, I2, I8, I9, I12), `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`. This part must not relitigate the 5‑case taxonomy or the two‑halves engine.

### Story B1 — Opening evidence in the feature vector (named‑opening deviation + centrality)

**As a** player who blundered in the opening, **I want** the reason to tell me I left a known opening and what the book move was (or, if I'm off‑book, why the better move is more central), **so that** I learn the opening principle I broke — not generic filler and not a fabricated tactic.

**The primary mode — named‑opening deviation (Decision D4).** Openings are *good moves*; the book names the correct move. When the moves so far are a **prefix** of a known opening line and the player is the opening's beneficiary, the opening's next move is the known winning continuation. The reason engine emits this provenance so the explanation is: *"You were following the &lt;5‑4 opening&gt;, a known winning plan. The book move is D5 (col 3), which keeps the win. You played col 0, which &lt;two‑halves: loses/draws&gt;."* Every clause is a lookup fact or solver check.

**Scope**

- **Named‑opening evidence field** on `computeReason` output. Match the pre‑move `movestring` (mirror‑normalized) against the KB opening lines — the worked‑example movestrings of `allen-5-4-opening` (`333334444`, 5‑1 `3333341`), `allen-3-4-opening` (`3332222`), `allen-d3-d4-opening` (`3332223`, `3332223362`), `allen-candlesticks-opening` (`3333311115555`, `333331111555515`), `allen-third-row-gambit` (`3265533353553111`), plus the empty‑board centre result from `allen-opening-tables`. Build the line index from the KB entries (KB = source of truth), not a hardcoded copy. When matched, the field carries `{ id, matchedPrefixLen, bookNextCol, family }`.
- **Four case‑space guards (I12) — all required to fire the named reason:**
  1. **Prefix match, mirror‑normalized.** The moves so far equal a KB line's first *k* plies (or its reflection about col 3). A partial‑then‑diverged history does **not** match.
  2. **Beneficiary‑side only.** Fire only when the blundering player is the side the opening is a plan for (first player, for every Allen opening here). Never attribute a deviation to the side the opening leaves lost.
  3. **Book‑move‑is‑best.** Solver‑verify `bookNextCol` is a best/winning move at this node before asserting it. If it is not the *unique* best, state it "keeps the win" without claiming uniqueness.
  4. **Unique disambiguation.** Set `id` to a **specific** opening only when the prefix identifies it uniquely among the KB lines; while several lines share the prefix (`3333…` → 5‑4 / 5‑1 / 6‑1 / candlesticks), set `family` (`"central-column opening"`) and leave `id` null. When even the family is ambiguous, fall through to centrality.
- **Fallback mode — centrality (unchanged from openings that match no book line).** Add a **first‑class opening‑centrality evidence field**, populated when `board_state === 'opening'` (`REASON_CONFIG.openingMaxDiscs`, currently 15), the named‑opening match does not fire, **and** the two‑halves engine finds no tactical resource. **Reuse `detectCenterDominance({ movestring, playedCol, bestCol })` verbatim** — do not re‑derive centrality. Geometric, board‑findable → I2‑safe.

**Contracts**

- New field (exact shape resolved in `/plan`; proposed): `openingContext: { namedOpening?: { id, family, matchedPrefixLen, bookNextCol }, centrality?: { bestCol, playedCol, betterHasMoreLines: true, text } }`. `namedOpening` and `centrality` are mutually exclusive per the guards; both pruned when absent (glossary absence contract). Raw per‑column `scores` stay stripped (D21) — `bookNextCol`'s "is‑best" is verified at compute time, not leaked.
- The named reason **composes with the two halves**: `namedOpening` supplies the *provenance of the correct move*; the `lostResource`/`opponentPunishment` halves supply *why the played move loses*. The named field never replaces the two‑halves loss grounding.

**Acceptance criteria**

- On a blunder whose history is a unique‑prefix of a KB opening, played by the beneficiary, with the book move solver‑confirmed best: `openingContext.namedOpening` carries the right `id`, `bookNextCol` (= the KB line's next ply), and `matchedPrefixLen`; `bookNextCol` equals the engine's `bestCol`.
- On a shared‑prefix history (`3333`): `id` is null, `family` = `"central-column opening"` (not a wrong specific name).
- On the losing side, or when the book move is **not** best at this node, `namedOpening` does **not** fire (guard 2/3) — verified by counterexample.
- Off‑book opening blunder: `centrality` fires instead, `bestCol`/`playedCol` board‑verifiable; the two are never both present.
- **No** invariant weakened: no asserted line fails under optimal defence; `bookNextCol`‑is‑best is solver‑verified; centrality is the only ungated geometric claim.
- **I12 validation:** a deliberate counterexample per branch — unique‑prefix beneficiary blunder; shared‑prefix (family); losing‑side (no fire); book‑move‑not‑best (no fire); off‑book centrality; mirror‑reflected line — each run through the **production** `computeReason`, not a hand proxy.

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

**As a** player, **I want** the deep‑reveal explanation of an opening blunder to say I left a known opening and what the book move was (or, off‑book, why the better move is more central), grounded and never fabricated, **so that** the coaching teaches the real opening principle.

**Scope (reuse the existing grounding wiring)**

- **`explainContext.js`:** `detectCenterDominance` is already called at `explainContext.js:954` and its `## Why the better move is stronger` section is gated to no‑lookahead/no‑threat‑row openings (`explainContext.js:957`). Feed the **shared** `centerDominance` computation into `prompt_data` (it already sets `centerDominance`, line ~1051) **and** the new `openingContext` (both `namedOpening` and `centrality`). **Single source:** coach path (surface A) and feature vector (surface B) consume one `centerDominance` computation — do not duplicate (Decision D-reuse).
- **`llmCoachHelpers.js`:** the `centerDominanceSection` is already pushed into the prompt and referenced by the instruction (`llmCoachHelpers.js:692, 835`). When `openingContext.namedOpening` fires, the section states the **deviation reason** — *you were following the &lt;opening&gt; (a known winning plan); the book move is &lt;bookNextCol&gt;, which keeps the win; you played &lt;playedCol&gt;, which loses* — with the *why it loses* clause taken from the two halves, not invented. When only `centrality` fires, state the centrality reason as today. Reaffirm anti‑fabrication (do not invent a tactic); respect existing grounding traps: no KB term injects without its pattern firing (`project_kb_major_minor_threat_not_always_include`), name the player explicitly (`feedback_llm_perspective_bug`), the opening name is asserted only when `namedOpening.id` is non‑null (family‑only → say "a central‑column opening", never a specific name).
- **Grounded‑render / condition‑D path:** if the render layer needs a causal frame for the opening‑centrality case, add/adjust the minimal `causalLinks.mjs` (L1–L9) frame and its `covers`/`guardrail`, and ensure a `render_decision` is emitted for opening cases (so condition‑D grading G1–G6 has ground truth). If the existing "why the better move is stronger" frame already covers centrality, reuse it and add nothing.

**Acceptance criteria**

- For an opening blunder, the production deep‑reveal grounds on centrality (and states the opening name only when the board is an exact KB line); it contains no fabricated tactic and no vaguer substitute for the centrality reason.
- The coach path and the feature vector derive centrality from **one** `centerDominance` call (verified by code path, not duplicated logic).
- Condition‑D `render_decision` is emitted for opening cases; `judge`/grader can consume it as ground truth (no re‑derivation).
- Existing non‑opening deep‑reveal behaviour is unchanged (the opening section stays gated to opening + no‑structure boards).

---

## 4. Consolidated data / API contracts

- **Lesson JSON:** unchanged schema (`lessonLoader.js`). New lesson files; each with one client‑side `socratic` (`{ goalPrompt, boardSpec, correctCol }`), `confirmationCategory: null`, `confirmationCount: 0`. No `winning_move` predicate (drills cut, D6).
- **Feature vector:** additive `openingContext: { centrality:{bestCol,playedCol,…,text}, namedOpening?:{id,line} }` (exact shape finalized in `/plan`), pruned on non‑opening/structured boards.
- **Eval harness:** `REASON_UNIVERSE += ['reason_opening_centrality','reason_opening_named_line']` (names provisional), opening harvest band in `select_boards.mjs`; render predicates unioned into `renderUniverse.mjs` if a frame is added.
- **i18n:** `lesson.<id>.slide.<n>.*` (new keys); reuse `coach.*` pools.
- **KB fields consumed:** `short_summary` (client, lessons), worked‑example `movestring` + `false_positives` (predicate/label lookup, reason engine), `formal_predicate` (author reference).

---

## 5. NOT included

- **No opening Challenge category** — no change to `categories.js` / `src/lib/categories.js`, no `candidate-generator.js` / `classifier.js` detector, no `challengeSets.js` entry, no 8‑file wiring.
- **No in‑lesson recognition drills / no `winning_move` predicate / no `/check` changes** (D6, cut) — lesson interactivity is the single client‑side Socratic per lesson.
- **No general causal named‑opening reason** — deferred as unsound (D4).
- **No taxonomy / two‑halves core change** — the 5‑case engine and its gate are untouched; opening work is additive evidence + coverage + grounding.
- **No multi‑Socratic schema change** — multiple checkpoints use `confirmationChallenges[]`.
- **No Spanish content**, **no payments** (Pro‑gating uses the existing lock modal), **no new analytics events**.
- **No `winSamples` re‑enable** (opening/mid‑game win distributions stay disabled, `REASON_CONFIG.enableWinSamples: false`).

---

## 6. Documentation deliverables (in‑scope, first‑class)

1. `docs/architecture/feature-vector-glossary.md` — new "opening context" fields (B3).
2. `.claude/skills/grade-fv-sufficiency/SKILL.md` — opening‑case grading guidance + field enumeration (B3).
3. `docs/architecture/reason-DECISIONS.md` — a new **D‑entry** recording the two‑mode opening reason (named‑opening deviation via mirror‑normalized prefix match + centrality fallback), the four case‑space guards, and the exact boundary of what stays out (non‑matching attribution; transposition), with rationale.
4. `docs/architecture/blunder-reason-evidence.md` — an "opening evidence" subsection + the validated opening boards (the KB movestrings above).
5. `docs/mvp/lesson-curriculum.md` — add the 3–4 opening lessons to the curriculum.
6. `connect-four/server/scripts/select_boards.mjs` — `--help`/header documents the opening harvest band.
7. KB entries — **already updated 2026-07-04** (7 entries; corrections logged in `docs/knowledge-base/README.md`).

---

## 7. Open questions / risks (resolve in `/plan`)

- **Feature‑vector `openingContext` field shape** — final field names/nesting; how `namedOpening` (provenance) and the two halves (loss grounding) compose in the vector and in the render decision.
- **KB line index** — how the named‑opening matcher builds its prefix index from the KB entries (parse worked‑example `movestring`s at load, mirror‑normalize). Book moves are the *beneficiary's* plies only — confirm the beneficiary side per opening from the KB (all first‑player here).
- **Disambiguation threshold** — the exact rule for "prefix uniquely identifies a specific opening" vs "name the family". Likely: specific `id` only once the prefix diverges from all other KB lines; else `family`.
- **Causal frame** — does the named‑opening‑deviation reason reuse an existing "why the better move is stronger" frame, or need a new `causalLinks.mjs` L‑frame carrying the book‑move provenance? Prefer reuse (I9 Occam).
- **Un‑skipping openings may surface engine soundness gaps** on the very earliest boards (ply 0–2). Bound the opening band sensibly and validate per I12; a degenerate ply‑0 "blunder" may need a `NotABlunder`/guard.
- **Transposition (future, out of v1)** — matching by resulting position rather than move‑prefix would catch openings reached by a different order (the KB notes candlesticks transpose). v1 uses mirror‑normalized prefix; position‑matching is a later enhancement.
- **Pro‑gating** — recommend "Own the Centre" + "I Play Where You Play" free, "Sharp Openings" Pro (mirrors lessons 8–11). Product confirm.

---

## 8. Phasing & dependencies

- **Part A** (opening lessons) is independent of Part B and can ship first — it is pure content on already‑built infra (no new code).
- **Part B** (reason engine) depends on the corrected KB (done) and is gated on the reason‑engine invariant reads. Its stories are ordered **B1 → B2 → B3 → B4** (evidence field → coverage → grade/doc → prompt grounding); B4's grounding is only meaningful once B1's field exists and B2/B3 make it gradeable.

---

## 9. Reuse map (checklist — do not rebuild)

| Need | Reuse |
|---|---|
| Lesson model, loading, validation | `lessonLoader.js`, `connect-four/lessons/*.json`, `GET /api/lessons(/:id)` |
| Concept / Socratic / drill screens | `ConceptScreen.jsx`, `SocraticScreen.jsx` (client‑side `correctCol`), `ChallengeScreen.jsx` `lessonMode` |
| Board display | `boardSpec` (7‑element display encoding), existing overlays |
| movestring → boardSpec (authoring) | `boardToSpec(parseMovestring(movestring))` (`src/lib/movestring.js`) |
| Centrality computation | `centerDominance.js` `detectCenterDominance` — shared by coach path AND feature vector |
| Reason evidence engine | `reasonEngine.mjs` `computeReason`, 5‑case taxonomy, two‑halves — additive field only |
| Detectors as evidence (I8) | `classifier.js` (`classifyPattern`, `detectDoubleThreat`, z‑threat, odd‑even, …) |
| Eval harness | `select_boards.mjs` (add band + predicates), `renderUniverse.mjs` |
| Answerer + grading | `compute.mjs --llm`, `toNarratorVector`, `grade-fv-sufficiency` skill, `feature-vector-glossary.md` |
| Prompt grounding | `explainContext.js` (`centerDominanceSection`, `prompt_data`), `llmCoachHelpers.js`, `causalLinks.mjs`, condition‑D `render_decision` |
| Strategy source of truth | the 7 `docs/knowledge-base/allen-*opening*.md` entries |
| Pro‑gating, lock UX | existing `UpgradeModal` / saga lock |
