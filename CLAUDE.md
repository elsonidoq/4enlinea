<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
specs/030-server-mediated-data-access/plan.md
<!-- SPECKIT END -->

## Documentation index

- `docs/index.md` — all design, architecture, and product docs
- `specs/index.md` — all feature specs (001–008) with status and decisions
- `docs/knowledge-base/README.md` — strategy KB: schema, entry list, and how the KB relates to `classifier.js`

Read the relevant index before starting any task that touches architecture, data model, API contracts, or product decisions.

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

## Working with movestrings

When working with Connect Four movestrings: before reasoning about a position, writing a test, or making claims about board state, run `./visualize_board.sh <movestring>` from the project root to get an ASCII board. Never reason about a movestring blindly.

The script prints two boards followed by analysis rows:

1. **Raw board** — compact view showing `R` / `Y` / empty for each cell.
2. **Annotated board** — each cell is one of:
   - `R 1` / `Y42` — disc with the move number that placed it (odd move# = Red, even = Yellow)
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
  - Prefer fetching from the DB or using existing code for candidate generation to produce one that satisfies the required predicate.
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

## The knowledge-base
The knowledge base's goal is to provide expertise knowledge to a coding agent, structured in a AI friendly way, so that a coding agent has the right context to make expert based decisions

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
