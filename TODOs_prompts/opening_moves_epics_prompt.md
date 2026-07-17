  # Brainstorm & scope: covering Connect Four OPENING THEORY across Lessons, Challenges, and the Reason engine

  You are scoping a body of product work in the repo at `/Users/elsonidoq/prog/cuatro_en_linea`.
  Six new knowledge-base entries about Connect Four **opening theory** (from James Dow Allen's
  book) were just authored and solver-verified. Your job is to turn that KB material into an
  **`epics.md`** file describing the work needed to surface openings in three product consumers:

  1. **Lessons** — teach opening theory to the player (there may be more than one lesson).
  2. **Challenges / puzzles** — interactive tasks. **Open question you must answer:** what would a
     challenge actually exercise here, and does it even make sense for openings?
  3. **Reason engine** — when a player is in the opening and deviates from a sound opening line,
     explain the resulting blunder *in terms of the opening* (name the opening / the principle broken).

  ## FIRST ACTION — non-negotiable

  Before doing anything else, invoke the **`superpowers:brainstorming`** skill and run the full
  brainstorming process. Do **not** jump to writing the epics file, do **not** write code, and do
  **not** pre-decide the scope. The three consumers each carry genuine open design questions
  (especially Challenges) — surface and resolve them through brainstorming, using `AskUserQuestion`
  for real decisions that are the user's to make (each with ≥2 concrete options and a recommendation).
  Only after the design is settled do you write `epics.md`.

  ## Mandatory reads (do these before brainstorming)

  **The source material you are productizing — the 6 new KB entries:**
  - `docs/knowledge-base/allen-opening-principles.md` (centrality, odd-row-threat quest, "I play where
    you play", B1/F1>E1, fifth-row economy)
  - `docs/knowledge-base/allen-opening-tables.md` (Ch. 9 result tables; Opening-Lottery sets;
    center = first-player win)
  - `docs/knowledge-base/allen-5-4-opening.md`, `allen-3-4-opening.md`,
    `allen-candlesticks-opening.md`, `allen-third-row-gambit.md` (named opening lines, each with
    solver-verified worked-example movestrings and false_positives)
  - `docs/knowledge-base/README.md` (KB schema: `short_summary` is the only client-facing field;
    `formal_predicate`, `worked_examples`, `false_positives` are the machine-usable payload)

  **Repo conventions & spec methodology:**
  - `CLAUDE.md` (project root) — coordinate convention (0-indexed), movestring/`visualize_board.sh`
    rules, "answer questions before editing", the two-destination rule (docs/architecture vs memory).
  - `docs/best_practices_spec_driven_development.md` — **especially the "Epic Sizing" section** (speckit
    sweet spot: 8+ tasks AND an unresolved design decision AND multiple subsystems; when to merge
    epics; red flags) and the "AI-friendly specs" section (outcome-oriented goals, explicit I/O
    contracts, "NOT included" sections, IF-THEN rules). Your epics must respect this sizing guidance.

  **Consumer #1 — Lessons (discover current state, do not assume):**
  - `docs/mvp/lesson-curriculum.md` — the existing lesson curriculum.
  - Look at how a lesson is structured today: i18n key namespace `lesson.<id>.slide.<n>.*`, tracked
    events `lesson_started` / `lesson_completed` (see `docs/mvp/epics.md` cross-cutting concerns).
  - Determine the lesson content model (slides? boards? movestrings?) before proposing opening lessons.

  **Consumer #2 — Challenges / puzzles (discover current state):**
  - `connect-four/server/categories.js` — `VALID_CATEGORIES`, `PAID_CATEGORIES`, `CATEGORY_ORDER`,
    `CATEGORY_NAMES` (single source of truth for puzzle categories) and its frontend mirror
    `src/lib/categories.js`.
  - `connect-four/server/candidate-generator.js` and `classifier.js` — how puzzle positions are
    generated and detected for a category.
  - The "8-file new-category wiring checklist" and "paid categories in two files" are documented in the
    project's auto-memory index (`.claude/projects/.../memory/MEMORY.md`) — read those memory entries
    before proposing a new category, because a missing file = silent failure.
  - Existing challenges are **recognition tasks** that never reveal the answer column. Note that several
    opening worked-examples are "position already won — convert", which may NOT make a good recognition
    puzzle, whereas `allen-third-row-gambit.md`'s `3265533353553111` (a UNIQUE winning move, E1/col 4,
    solver-confirmed) is a natural "find the only winning move" puzzle. Interrogate which KB examples
    are viable challenge seeds and which are not.

  **Consumer #3 — Reason engine (read the guardrails FIRST — it is heavily constrained):**
  - Read the four mandatory reason-engine docs in order, per `CLAUDE.md`:
    `docs/architecture/reason-INVARIANTS.md` (I0 = correctness over optimization; I12 = validate against
    full case-space), `reason-DECISIONS.md`, `reason-case-taxonomy.md`, `blunder-reason-evidence.md`.
  - `connect-four/server/scripts/reason_engine/` (engine code) and `connect-four/server/centerDominance.js`
    (existing opening-phase, no-structure "why the better move is stronger" reason — an "opening
    deviation" reason must relate to this, not duplicate it).
  - Key tension to resolve in brainstorming: a *deviation* from a named opening is not automatically a
    *blunder* (the position may still be winning/drawing). Decide precisely when an opening-deviation
    reason should fire (score-drop gated), what it asserts ("you left the <opening>; the sound plan was
    <X>"), and whether v1 should be narrow (e.g. only the documented `allen-3-4-opening` "delayed D4"
    trap, or only central-column deviations) to stay inside the invariants.

  **Format reference for the deliverable:**
  - `docs/mvp/epics.md` is the canonical example of this project's epics format (cross-cutting concerns
    block, then `### Epic N — Title` with **Scope**, dependencies, and NOT-included). Match its shape.
  - The tools that verify opening positions already exist and need no new code:
    `./visualize_board.sh <movestring>` and `connect-four/server/scripts/reason_engine/TOOLS/optimal_line.mjs`
    — use them to sanity-check any position you cite in an epic.

  ## Deliverable

  Write **`docs/mvp/opening-theory-epics.md`** containing **one or more epics**. Requirements:

  - **Each epic maps to a single spec and lists 3–5 user stories** (as "As a <role>, I want <capability>,
    so that <benefit>"), each with concrete, testable acceptance criteria.
  - **Right-size the epics** using the best-practices "Epic Sizing" section. If a consumer's work is too
    small to justify the speckit pipeline on its own, say so and either merge it with another epic or mark
    it "implement directly, skip speckit" with justification. Explicitly record your sizing verdict per
    epic (task-count estimate, unresolved-decision check, subsystems touched).
  - **The Challenges question must be answered head-on**, not deferred: state whether opening challenges
    make sense, and if so, exactly what the player does and which KB examples seed them. If some/all do
    not make sense, say so and cut them — a well-argued "not worth building" is a valid outcome.
  - **The final/lead epic must be fully spec-ready**: complete enough to hand straight to speckit
    `/specify` with no further discovery. That means it carries — per the best-practices doc — settled
    design decisions (with rationale), outcome-oriented goals, explicit data/API contracts (endpoint
    shapes, category slugs, KB fields consumed, i18n key namespaces), a "NOT included" section, and any
    IF-THEN business rules. Cite specific KB movestrings/fields and repo files so a fresh implementer
    needs no external context.
  - Include a short **cross-cutting concerns** preamble (analytics events, i18n key namespace, KB as
    to save solver calls") mirroring `docs/mvp/epics.md`.
  - Add a **decision log** capturing what you and the user settled during brainstorming and what was
    deliberately left out (and why).

  ## Guardrails

  - Brainstorm and scope only — produce the `epics.md`. Do NOT write feature code, migrations, classifier
    changes, or reason-engine changes.
    changes, or reason-engine changes.

  ## Deliverable

  Write **`docs/mvp/opening-theory-epics.md`** containing **one or more epics**. Requirements:

  - **Each epic maps to a single spec and lists 3–5 user stories** (as "As a <role>, I want <capability>,
    so that <benefit>"), each with concrete, testable acceptance criteria.
  - **Right-size the epics** using the best-practices "Epic Sizing" section. If a consumer's work is too
    small to justify the speckit pipeline on its own, say so and either merge it with another epic or mark
    it "implement directly, skip speckit" with justification. Explicitly record your sizing verdict per
    epic (task-count estimate, unresolved-decision check, subsystems touched).
  - **The Challenges question must be answered head-on**, not deferred: state whether opening challenges
    make sense, and if so, exactly what the player does and which KB examples seed them. If some/all do
    not make sense, say so and cut them — a well-argued "not worth building" is a valid outcome.
  - **The final/lead epic must be fully spec-ready**: complete enough to hand straight to speckit
    `/specify` with no further discovery. That means it carries — per the best-practices doc — settled
    design decisions (with rationale), outcome-oriented goals, explicit data/API contracts (endpoint
    shapes, category slugs, KB fields consumed, i18n key namespaces), a "NOT included" section, and any
    IF-THEN business rules. Cite specific KB movestrings/fields and repo files so a fresh implementer
    needs no external context.
  - Include a short **cross-cutting concerns** preamble (analytics events, i18n key namespace, KB as
    source of truth, "never reveal the answer column" for challenges, "never weaken the reason algorithm
    to save solver calls") mirroring `docs/mvp/epics.md`.
  - Add a **decision log** capturing what you and the user settled during brainstorming and what was
    deliberately left out (and why).

  ## Guardrails

  - Brainstorm and scope only — produce the `epics.md`. Do NOT write feature code, migrations, classifier
    changes, or reason-engine changes.
  - Respect the reason-engine invariants; do not propose anything that weakens algorithmic correctness to
    save solver calls, and flag if the opening-deviation reason cannot be done soundly in v1.
  - Never hand-construct or trust an OCR'd movestring — verify any position you cite with
    `./visualize_board.sh` or `optimal_line.mjs`.
  - Prefer one unifying mechanism over many special cases; if openings don't fit an existing consumer's
    model, say so explicitly rather than forcing them in.
  - End with a summary: the epics you created, their sizing verdicts, the Challenges decision, and the
    open questions (if any) that still need the user.
