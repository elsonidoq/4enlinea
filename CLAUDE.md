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

1. **Raw board** — compact view showing `X` / `O` / empty for each cell.
2. **Annotated board** — each cell is one of:
   - `X  1` / `O 42` — disc with the move number that placed it (odd move# = player 1, even = player 2). **`X` = player 1, rendered as a GREEN disc in-app; `O` = player 2, rendered as a GRAY disc.**
   - `<X>` / `<O>` — major threat (3 discs + 1 empty in a 4-window) that is **gravity-top / immediately playable** (the empty cell sits at the current column height).
   - `[X]` / `[O]` — major threat that is **not** yet gravity-reachable this turn.
   - `(x)` / `(o)` — minor threat (2 discs + 2 empty)
   - `[*]` / `(*)` — both players have a major/minor threat on that cell (`<*>` if gravity-top)
   - Threats are shown for **all** empty cells, including ones not yet reachable in one move.
3. **`ht` row** — disc count per column.
4. **`par` row** — empty-cell count per column with parity: `O` = odd, `E` = even (key for zugzwang reasoning). Note: this `O`/`E` is the parity marker, unrelated to the `O` player symbol.
5. **`scr` row** — c4solver score for each column (`--` = full column).
6. **Major threats list** — explicit enumeration of every `[X]`/`[O]`/`[*]` cell as `colC rowR (player)`, sorted by column then row; a `[GT]` suffix marks a gravity-top (immediately playable) threat.

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

## Player color aliases (there are only TWO players)

Different sources name the two players with different colors. They all reduce to **first player** vs **second player** — never let the color words fool you into thinking there are more than two players or into mixing them up:

| Player | Aliases across the project | Role |
|---|---|---|
| **First player (P1)** | `X` (visualize_board), **GREEN** (in-app), `'red'` (frontend `board[row][col]` code string), **Red** (Allen 2010), **White** (Allis 1988) | moves first; plays odd rounds → lands on **odd rows**; the aggressor ("I play where you play") |
| **Second player (P2)** | `O` (visualize_board), **GRAY** (in-app), `'yellow'` (frontend code string), **Black** (Allen 2010 *and* Allis 1988) | moves second; **even rows**; the Zugzwang controller |

Key traps: **Black = second player** in both Allen and Allis (Allen: "Red plays first; Black always plays second"). **White = first player** (Allis only). The frontend code strings `'red'`/`'yellow'` are just P1/P2 semantic labels — they render as GREEN/GRAY on screen, not red/yellow. When writing user-facing or coach text, refer to discs as **green/gray**, not red/yellow. The KB (`docs/knowledge-base/`) still contains mixed Red/Yellow/Green/Gray/White/Black wording; map every color word to P1/P2 via this table.

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

## Verifying any claim about this codebase

**Every false belief hides in a layer of representation.** Before believing a claim — yours, a doc's, or a subagent's — name the layer it came from and go down to where the truth lives: the **signature** not the doc comment, the **diff** not the agent's report, the **producer's real output** not your mental model of it, the **app's actual request** not a curl you hand-wrote, **all N instances** not a sample of 3, the **call sites** not the helper's tests, the **working tree** not the file list. See memory: feedback_verify_at_the_source_layer.md — it carries the worked evidence and the full table.

Two that bite hardest here:
- **A green test is not evidence.** If you authored the fixture, it tests your belief, not the code. It must exercise the production path with a real value and RED for the right reason.
- **"Already satisfied / no task needed" is the highest-risk claim in any plan.** It asserts something about existing code while doing the least checking. Read the code that allegedly satisfies it.

## Writing implementation plans

A plan is a set of **claims about this codebase**. Every claim needs a citation. Claims that were cited hold up; claims that were recalled do not. `writing-plans` demands complete code and no placeholders — that rule is right, but it pressures you to *author* specifics instead of *harvesting* them. Authored specifics that touch existing code are wrong by default.

**Harvest fixtures; never invent them.** Before putting a test fixture in a plan, produce one real value (`node -e`, `curl`, a `console.log`) and paste **that**. A hand-written fixture tests the plan's imagination, not the code — it goes green while the app breaks, and `test:fast` cannot catch it. If a fixture can't be harvested, label it `UNVERIFIED SKETCH — adapt` rather than letting it look authoritative.

**Quote, don't paraphrase.** Cite `file:line` **and paste the verbatim line**. Paraphrase is where staleness hides. If you can't paste it, you didn't read it.

**Read the signature, not the prose.** Doc comments and file headers go stale and actively lie. Prefer `export async function foo(text, opts = {})` over any comment describing it. Subagent exploration reports are **hypotheses**, not facts — a report that summarizes a doc comment inherits its lie.

**Open every negative claim.** "X doesn't exist", "Y has no Z", "the seam needs widening" — negative claims silently manufacture scope. Verify each one at source before a task depends on it.

**Read the boring config first.** `package.json` (`"type"`, test scripts), the test runner, import style, and existing validators/helpers — once, upfront, before writing any snippet. Grep for an existing helper before specifying a new one.

**Line numbers drift; symbol names don't.** Treat every line reference as approximate and locate by symbol name.

Worked example of all six failing at once: `docs/superpowers/plans/2026-07-16-qa-2026-07-15-remediation.md` (see its Global Constraints + the `CORRECTED`/`REVISED` boxes). See memory: feedback_verify_at_the_source_layer.md

## Paddle integration

When writing or modifying code that integrates with Paddle:

- Always check current Paddle documentation via the `paddle-docs` MCP server before suggesting code. The Paddle API and SDKs evolve frequently — do not rely on training data alone.
- Use the official Paddle SDK for the language in use:
  - Node.js → `@paddle/paddle-node-sdk`
  - Python → `paddle-python-sdk` (imports as `paddle_billing`)
  - Go → `github.com/PaddleHQ/paddle-go-sdk/v5`
  - PHP → `paddlehq/paddle-php-sdk`
- All development uses the sandbox environment. Sandbox API keys contain `_sdbx`; sandbox client-side tokens are prefixed with `test_`.
- Always verify webhook signatures before acting on the payload:
  - Node: `paddle.webhooks.unmarshal()`
  - Python: `Verifier().verify(request, secret)`
  - Go: `paddle.NewWebhookVerifier()` with `Middleware`
  - PHP: `(new Verifier())->verify($request, $secret)`
- For destructive account changes (updating prices, archiving products, canceling subscriptions), ask for explicit confirmation before calling the `paddle-sandbox` or `paddle-live` MCP server.
- Use `paddle-sandbox` by default. Only call `paddle-live` when the prompt explicitly mentions live, production, or real customer data.
- API keys and webhook secrets live in environment variables — never inline credentials into code.

