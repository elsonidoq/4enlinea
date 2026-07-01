## Documentation index

- `docs/index.md` — all design, architecture, and product docs
- `specs/index.md` — all feature specs (001–008) with status and decisions
- `docs/knowledge-base/README.md` — strategy KB: schema, entry list, and how the KB relates to `classifier.js`

Read the relevant index before starting any task that touches architecture, data model, API contracts, or product decisions.

## Where information lives: memory vs. docs/architecture

**`docs/architecture/`** is the authoritative, up-to-date source for project conventions, API contracts, data models, and architectural decisions. Read these docs before writing code; they reflect the current state of the system.

**Memory files** (auto-memory) are trigger-first **gotchas** — non-obvious traps, counterintuitive decisions, open bugs, and cross-system surprises that would not be apparent from reading the code and architecture docs alone. They are NOT a summary of the architecture docs. If a fact can be derived from reading the code or docs, it belongs in the docs, not in memory.

The two-destination rule:
- Architecture / conventions / API contracts → `docs/architecture/`
- Non-obvious traps, open bugs, behavioral surprises → memory

## Architecture docs — mandatory reads

Before touching **server code, API endpoints, data model, or frontend architecture**, read the relevant file(s) in `docs/architecture/`:

- `api-conventions.md` — before adding or changing any endpoint
- `server-conventions.md` — before touching `server/`
- `frontend-conventions.md` — before touching `src/`
- `data-model.md` — before changing schema, queries, or data shapes
- `db-schema.md` — before writing migrations or SQL
- `testing-conventions.md` — before writing tests
- `index-conventions.md` — before adding imports or changing module structure

Do not rely solely on memory summaries — those can be stale. Read the actual doc.

## Blunder-`reason` engine — mandatory reads

Before touching the blunder-`reason` feature-vector engine (anything under `connect-four/server/scripts/reason_engine/`, `toFeatureVector`'s reason field, or the case taxonomy), read **all four**, in order:

- `docs/architecture/reason-INVARIANTS.md` — the constitution: 13 non-negotiable principles (I0 = correctness over optimization; never weaken the algorithm to save solver calls; I12 = validate a classification/stop rule against its full case-space + a counterexample per case, through the production detector — not the motivating example).
- `docs/architecture/reason-DECISIONS.md` — append-only log of resolved decisions + rationale. Do not relitigate these.
- `docs/architecture/reason-case-taxonomy.md` — the authoritative `(bestScore, playedScore)` case taxonomy.
- `docs/architecture/blunder-reason-evidence.md` — the two-halves evidence engine, validated boards, implementation map.

The quarantined designs (`blunder-reason-field-epic.md`, `unified-blunder-reason-epic.md`, `feature-vector-reason-algorithm.md`, and the old `reason_audit/` SUPERSEDED cluster) were **deleted 2026-06-30**; ignore any lingering references to them in search or memory. The live engine is `connect-four/server/scripts/reason_engine/`. To prompt a fresh-context agent for this work, reuse `docs/architecture/reason-AGENT-PREAMBLE.md` verbatim rather than re-typing constraints.

## Working with movestrings

When working with Connect Four movestrings: before reasoning about a position, writing a test, or making claims about board state, run `./visualize_board.sh <movestring>` from the project root to get an ASCII board. Never reason about a movestring blindly.

The script prints two boards followed by analysis rows:

1. **Raw board** — compact view showing `R` / `Y` / empty for each cell.
2. **Annotated board** — each cell is one of:
   - `R 1` / `Y42` — disc with the move number that placed it (odd move# = player 1, even = player 2). `R`/`Y` are the historical internal token names: **`R` = player 1, rendered as a GREEN disc in-app; `Y` = player 2, rendered as a GRAY disc.** They are not red/yellow on screen.
   - `[R]` / `[Y]` — major threat (3 discs of that player + 1 empty in a 4-window)
   - `(r)` / `(y)` — minor threat (2 discs + 2 empty)
   - `[*]` / `(*)` — both players have a major/minor threat on that cell
   - Threats are shown for **all** empty cells, including ones not yet reachable in one move.
3. **`par` row** — empty-cell count per column with parity: `O` = odd, `E` = even (key for zugzwang reasoning).
4. **`scr` row** — c4solver score for each column (`--` = full column).
5. **Major threats list** — explicit enumeration of every `[R]`/`[Y]`/`[*]` cell as `colC rowR (player)`, sorted by column then row.

## When you need a concrete movestring
  - Never construct a movestring from random column placements.
  - Do not generate movestrings by hand unless it is a quick smoke test.
  - You can always create a script that uses the playGame function from gameSampling.js to generate a valid board with a specific property
  - Tests and the knowledge base are also good sources.
  - If none of the above works, ask the user before spending more time on it.


## Row/column coordinate convention

All internal coordinates are **0-indexed**: row 0 = bottom, row 5 = top; col 0 = leftmost. This is a project-wide invariant. The only two translation boundaries are:
- **Frontend display** — converts to 1-based for the user.
- **c4solver calls** — `c4solver-wrapper.js` translates internally; all callers pass 0-indexed values.

Never use 1-indexed coordinates in server code, tests, or specs.

## When Asked to Write a Prompt
If the user asks you to 'write a prompt' or 'draft a prompt' for use in another context, produce the prompt text directly. Do NOT begin solving the underlying problem yourself unless explicitly asked.

## Answering Questions
If the user asks a question, answer the question first before editing any files or running any tools.

## Knowledge base — mandatory reads

`docs/knowledge-base/` is the source of truth for Connect Four strategic theory. Each file contains a `formal_predicate`, `worked_examples`, and `false_positives` for one concept — read the relevant entry before acting, not after.

**Before implementing or modifying a pattern detector or classifier** for any named strategic concept (z-threat, figure-7, claimeven, baseinverse, aftereven, lowinverse, highinverse, parity, etc.): read `docs/knowledge-base/<slug>.md` for that concept. The `formal_predicate` is the spec; the `false_positives` are the test cases you must not break.

**Before writing or editing LLM prompts or explanation text** that describes a strategic pattern by name: read the KB entry to get accurate terminology and scope. Do not paraphrase from memory — KB entries carry verbatim source quotes for canonical rules.

**Before speccing or building a new puzzle category** based on a strategic concept: read the KB entry to understand the concept's preconditions and known limitations before committing to a detection approach.

**Before reasoning about the tactical significance of a board position**: if the position involves a named pattern (even informally), read the corresponding KB entry to confirm you are applying the predicate correctly.

The README at `docs/knowledge-base/README.md` lists all current entries by slug.

## Querying the database from Node.js

Always read memory `reference_supabase_connection.md` before writing any inline DB script. Key facts that are easy to get wrong:
- `.env` is at `connect-four/server/.env`, not the project root
- Must `cd connect-four` first so `require('@supabase/supabase-js')` resolves
- Service key var is `SUPABASE_SERVICE_ROLE_KEY` (not `SUPABASE_SERVICE_KEY`)
- Parse `.env` manually — `dotenv` is not reliably available in `node -e`

## Running tests
Use `npm run test:fast` (inside `connect-four/`) for all regular development and CI checks. It omits `candidate-generator.test.js`, which calls the real c4solver up to 400 times per test and frequently hangs for 10+ minutes due to solver IPC deadlock. Only run `npm test` when explicitly testing candidate generation.

## When writing specs for existing components
Before speccing props for any component that already exists in the codebase, read its current implementation and preserve the existing API wherever the change is not strictly required. See memory: feedback_spec_existing_apis.md
