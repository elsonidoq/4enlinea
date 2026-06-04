# Deep Reveal — Implementation Epic Breakdown (Hardening + Coach Rebuild)

*This file defines the implementation epics for hardening and rebuilding the Connect
Four coach's **Deep Reveal** explanation feature. It does **not** ship Deep Reveal —
Deep Reveal already shipped across the three product surfaces in the main epic plan:
the Tier-2 panel and cache wiring in **Epic 2b** (Challenges), the Position Explorer
Deep Reveal in **Epic 3b**, and the Past Mistakes Deep Reveal in **Epic 3c** (see
[`epics.md`](./epics.md)). The interactive annotation/highlight UI on top of those
panels is **also already shipped** (verified in code below). What is NOT yet built is
the **integrity guarantee** (highlights are enforced honest server-side) and the
**rebuilt coach content** (what the coach actually says). These two epics close those
two gaps, in strict incremental order.*

## Source-of-truth product docs

- [`deep_reveal_product.md`](./deep_reveal_product.md) — **authoritative** product
  description for the interactive annotation/highlight layer. Defines the six
  **Annotation Integrity Principles P1–P6** and the **traceability table** mapping each
  principle to specific `llm_feedback` rows (these rows are the regression fixtures).
- [`coach_explanation_principles.md`](./coach_explanation_principles.md) —
  **authoritative** content-layer doc. Defines the **Type 1–4 explanation taxonomy**,
  the **group-of-4 + parity** mechanism, the **grounding contract** (the closed,
  pre-listed set of board locations the coach may reference), and the locked product
  decisions D1–D3.
- [`deep_reveal_improvements.md`](./deep_reveal_improvements.md) — **NON-BINDING
  engineering prior art.** Phase 1 (interactive highlights + board sync) is already
  shipped; trust the code over its current-state claims. Read its staleness banner.
- [`product_decisions.md`](./product_decisions.md) — settled decisions referenced
  below; **do not re-open them.**

## Settled decisions these epics consume (do not re-derive)

From [`product_decisions.md`](./product_decisions.md):

- **Deep Reveal access for anonymous users** — anonymous → no access ("Learn more"
  opens the AuthModal); authenticated free → 20/week (server-side counter, resets Mon
  00:00 UTC); Pro → unlimited. Enforced on `/api/explain-move-llm` (see Epic 7 in
  `epics.md`). These epics add **no new gating.**
- **Empty and error states (b)** — when a valid explanation cannot be produced, fall
  back to the **Tier 1 summary** + "Detailed explanation unavailable"; LLM timeout is
  **6 s**.
- **Prompt caching for Deep Reveal** — cache key `SHA256(movestring + ":" + col)`,
  stored in `explanation_cache.deep_reveal_json`, shared across users.
- **User flag for LLM explanation quality** — the in-app "Flag this explanation"
  action writes to the `llm_feedback` table.
- **i18n strategy** — English at launch; Spanish is an empty stub → MVP is
  English-only. All user-facing strings go through `t('key')`.

## Coordinate convention

All internal board coordinates are **0-indexed** (row 0 = bottom, col 0 = left). The
only translation boundaries are the frontend display layer and the c4solver wrapper.
The validation gate and all server-side reasoning in these epics operate on 0-indexed
coordinates. (Note: the existing zone-spec wire format in `annotatedText.js` is
1-indexed in the *text token* — e.g. `c4r3` means col 3, row 2 internally — and is
converted to 0-indexed at parse time. The server gate must apply the same conversion
before checking against the board; it must not introduce a second 1-indexed coordinate
system in server code.)

## Verified current state (cited file:line)

**Frontend — already shipped (do not rebuild):**

- `connect-four/src/lib/annotatedText.js` — parses `[zone:<spec>]…[/zone:<spec>]`
  markup (`parseAnnotatedText`), client-side drops unknown specs (`isValidSpec`,
  `annotatedText.js:38`), and `zoneToOverlays` silently drops out-of-bounds cells
  (`:133`, `:145`, `:165`). **This is the only validation today, and it is client-side,
  best-effort, and runs after the explanation is already cached.**
- `connect-four/src/components/AnnotatedExplanation.jsx`,
  `connect-four/src/components/AnnotatedText.jsx` — render the annotated text with
  tappable/hoverable spans.
- `connect-four/src/components/Board.jsx` — supports the `zhCells` prop (`:95`) and
  renders the `zh` overlay (`zhSvg`, `:121–158`, mounted `:176`).
- Three surfaces thread `zhCells`: `connect-four/src/screens/ChallengeScreen.jsx`,
  `connect-four/src/screens/ExplorerScreen.jsx`,
  `connect-four/src/screens/MistakeDetailScreen.jsx` (verified via `rg -l zhCells`).

**Server — explain endpoint and cache (the gate's insertion point):**

- `POST /api/explain-move-llm` handler: `connect-four/server/index.js:719`. Auth
  required (`:720`, 401); free-tier weekly quota (`:762`, 429); cache read on
  `position_hash = SHA256(movestring + ":" + col)` **before** quota decrement
  (`:744–759`); on miss it builds the prompt (`buildExplainContext`, `:609`/`:770`),
  calls the LLM (`callLLM`, `server/llmCoachHelpers.js:139`), runs
  `injectDefaultActiveZone` (`:596`/`:780`), and **writes to the cache and returns with
  NO validation in between** (`:782–790`). **This `injectDefaultActiveZone` →
  cache-write → `res.json` span (index.js:780–790) is exactly where the validate-then-
  cache gate goes.**
- Cache shape, **confirmed in code**: `deep_reveal_json = { explanation, prompt }`
  (write at `index.js:786`; read at `:752–756`). Documented as `jsonb` in
  `docs/architecture/data-model.md:38` and `docs/architecture/db-schema.md:177–185`.
  (Note: a separate Tier-1 one-liner path also writes the same table at
  `index.js:436–439`; that is the older `/api/explain-move` path, not the Deep Reveal
  `/api/explain-move-llm` path — do not conflate them.)
- Flag write: `POST /api/llm-feedback` (`index.js:803`) writes the `llm_feedback` row.

**Server — the simulation leaf-data prerequisite:**

- `connect-four/server/explainSimulate.js` — `collectLeaves` (`:190`) returns
  `patterns: null` at won/draw leaves (`:205`); the winning group-of-4 that completed
  the win is **discarded**. `summarize`/aggregation only counts `wonByPerspective` /
  `wonByOpponent` / `draws` as scalars (`:271–343`); no per-group completion data
  exists. This confirms `coach_explanation_principles.md` ("Required simulation
  change") — Epic B must change this.

---

## Epic order (incremental — hard requirement)

1. **Epic A — Deep Reveal Annotation Integrity** — fully implementable and shippable on
   its own, on top of the already-shipped Deep Reveal (Epics 2b/3b/3c). It hardens the
   *existing* coach output; it does **not** depend on Epic B.
2. **Epic B — Coach Explanation Rebuild** — depends on Epic A. It rebuilds *what the
   coach says* and produces the **closed allowed-location set** that upgrades Epic A's
   P5 gate from board-only to the full/strong form.

**The P5 seam (state explicitly):** P5 has two strengths.
- The **board-only part** — "don't highlight occupied cells, lines through the user's
  own disc, or out-of-bounds cells" — is checkable against the actual board alone, with
  no knowledge of what the coach *intended* to say. **→ Epic A** enforces this.
- The **strong part** — "highlight only locations the explanation is *allowed* to
  reference" — requires the closed allowed-set that the content layer
  (`coach_explanation_principles.md`, "the grounding contract") produces. That set does
  not exist until Epic B. **→ Epic B upgrades P5** by feeding its allowed-set into the
  Epic A gate, which then enforces "highlighted ⊆ allowed-set" in addition to the
  board-only checks.

Dependency direction is one-way: **A does not need B; B needs A.** Epic A ships and
removes the worst bugs before Epic B begins.

---

### Epic A — Deep Reveal Annotation Integrity

A hardening epic over the already-shipped Deep Reveal UI (Epics 2b/3b/3c). The
highlight rendering exists; this epic guarantees the highlights are **honest**,
enforced **server-side** so that nothing invalid is ever cached or shown — moving the
guarantee from the current client-side best-effort drop
(`annotatedText.js`) to a server-side validate-then-cache gate that satisfies P4
("nothing invalid reaches the user").

**Scope:**

*Server-side validate-then-cache gate (the core deliverable):*

- A new validation step inserted into `POST /api/explain-move-llm`
  (`connect-four/server/index.js:780–790`), running **after** `callLLM` /
  `injectDefaultActiveZone` and **before** the `explanation_cache` write and the
  `res.json` response. The gate parses the LLM output's `[zone:…]` annotations (reuse
  the parse logic from `annotatedText.js` — extract a shared module or port it
  server-side) and validates every highlighted reference against the **actual board**
  (reconstructed from `movestring` via the existing `Board` class, already imported at
  the top of `index.js`; `colHeights`/occupancy are available there).
- The gate enforces, against the board, principles **P1, P2, P3, P4, and the board-only
  part of P5** (full statements in `deep_reveal_product.md`):
  - **P5 (board-only):** For each zone spec in the explanation, expand it to the
    set of board cells it references:
    - `col\d+`          → all 6 cells in that column (rows 0–5)
    - `c\d+r\d+`        → that single cell (both col and row are 1-indexed in wire;
                           subtract 1 from each: `c4r3` → col=3, row=2 internally)
    - `cells:c1r1,...`  → the listed cells (same -1 conversion each)
    - `row\d+`          → all 7 cells in that row
    - `tg`              → always passes (entire board; out-of-bounds check is vacuous)

    Then check every **4-window** (horizontal, vertical, or diagonal) that
    contains **at least one** of the referenced cells. A 4-window is **blocked**
    if it contains at least one disc of each color (can never be completed by
    either player). Disc color in the zone spec is irrelevant to the blocked-window check — only board occupancy matters. A zone **fails** the P5 board-only check if **every**
    4-window containing any of its referenced cells is blocked.

    A zone referencing partially-occupied cells where at least one candidate
    4-window is still live **passes** — an occupied disc can legitimately appear
    in a live group. Occupation alone is not grounds for rejection.

    Out-of-bounds cells (col < 0 or > 6, row < 0 or > 5 in 0-indexed coords)
    always fail regardless of 4-window status.

    **Fixtures caught here:**
    - `e86eeac9` (`cells:c2r1,c2r2`): both cells are occupied (Grey and Green);
      every 4-window through them contains both colors → blocked → rejected. ✓
    - `8d83947e` (`cells:c4r3,c5r2,c6r1`): the diagonal through a Green disc;
      every 4-window that includes c5r2 (a Green disc in a line the Grey coach
      claims) contains both colors → blocked → rejected. ✓
    - `403a21c9` (non-existent threat, geometrically valid): NOT caught here —
      the 4-window is live. Deferred to the strong-form P5 in Epic B.
  - **P2 (text ↔ highlight agreement):** P2 is enforced primarily at *generation
    time* via the grounding contract: the model composes prose only over
    pre-labeled locations, so text–highlight divergence is rare by construction.
    At gate time the check is narrow and mechanical: for each zone whose spec names
    a specific column (e.g. `col4`), scan the prose *inside that zone's tags* for
    an explicit reference to a **different** column number. Use the regex
    `col(?:umn)?\s*([1-7])` (case-insensitive); if any captured group does not
    match the spec's column **number as written in the wire format** (both are 1-indexed: `col4`
    spec vs "column 4" in prose — compare the numeric digit directly), reject and retry. Full NLP prose parsing is out of
    scope — the grounding contract is the primary guard against subtler mismatches.
  - **P1 (no dangling affordance):** a span that resolves to zero board cells is not
    presented as interactive; a purely conceptual explanation with no spatial
    references renders as plain text with no affordances.
  - **P3 (perceivable vocabulary):** Scan the *entire* explanation string (not
    just zone content) against three blocklists. Any match → reject and retry.

    **Disc-notation blocklist** (word-boundary, case-insensitive):
    `\bR\b`, `\bY\b`
    (the diagram letters from ASCII board output; word boundaries prevent
    false-positives on "row," "year," etc.)

    **Player-name blocklist** (whole word, case-insensitive):
    `\bRed\b`, `\bYellow\b`, `\bBlack\b`

    **Engine-jargon blocklist** (phrase, case-insensitive):
    `forced win`, `leaf position`, `the solver`, `forced_win`, `the simulation`,
    `your score`, `the score is`, `patterns in data`

    *(Note: the bare word "score" is not blocked — "scoring a win" is legitimate.
    Only the engine-specific phrases above are blocked.)*
  - **P6 (natural-language references):** For each zone, verify the *visible text
    inside the zone tags* does not contain a raw coordinate token. Specifically,
    the inner text must not match `\bc\d+r\d+\b` or `\bcol\d+\b` as a bare token.

    Examples:
    - `[zone:c4r3]c4r3[/zone:c4r3]` → **FAIL** (raw token exposed to user)
    - `[zone:c4r3]the cell on row 3[/zone:c4r3]` → **PASS**
    - `[zone:col4]col4[/zone:col4]` → **FAIL**
    - `[zone:col4]the fourth column[/zone:col4]` → **PASS**
  - **P4 (umbrella):** a violation of any of the above is **corrected before the user
    can read it**, never hidden after the fact.
- **On validation failure:** re-call the LLM once (1 retry, same prompt). If still
  invalid after the retry:

  1. **Show Tier-1:** Read the `explanation_cache` row for this `position_hash`
     where `deep_reveal_json` has the Tier-1 shape
     `{ patternTag, fullText, continuationLine, boardAnnotation }` (written by
     the `/api/explain-move` endpoint — verify the current `deep_reveal_json` shape at the Tier-1 cache write in `index.js` before implementing). Return `fullText` as the
     explanation. If no such row exists, return the static string
     `"Detailed explanation unavailable."` No zone annotations; plain text only.

  2. **Log the failure** by inserting a row into a `deep_reveal_failures` table
     (create via migration if it does not exist) with columns:
     `id` (uuid), `position_hash` (text), `movestring` (text), `col` (int),
     `endpoint` (text, value `'/api/explain-move-llm'`), `llm_prompt` (text),
     `raw_llm_output` (text), `failure_reason` (text — which principle(s) failed,
     e.g. `'P3:player_name'`), `created_at` (timestamptz). This table is for
     offline analysis to improve the explanation engine; it is never read by the
     app at runtime.

  3. **Do not cache** the invalid output. If Tier-1 fallback is returned,
     `explanation_cache` receives no Tier-2 write for this position. Future
     requests retry the LLM. (Consistency note: re-opens of the same position
     may vary until a valid Tier-2 response is produced and cached. This is
     intentional — caching a fallback would permanently degrade the position.)

- **Cache invariant:** only a fully-valid explanation is ever written to
  `explanation_cache.deep_reveal_json`. This makes the shared, cross-user cache a cache
  of *honest* explanations.
- **Quota accounting:** The user's weekly Deep Reveal quota unit is decremented
  **only when a valid Tier-2 explanation is delivered to the user.** Internal
  retries are transparent to the quota counter. If the final result is a Tier-1
  fallback, the quota unit is **not** consumed. Implementation: the existing
  quota decrement (near the weekly-count increment in `index.js` — search for the 429 rate-limit check block) must be moved to *after* the validation gate
  confirms a valid explanation; it must not run on a cache miss before validation
  completes.

*Regression harness (first-class deliverable / part of definition-of-done):*

- A test harness that replays every `llm_feedback` row listed in the traceability table
  of `deep_reveal_product.md` (by `id` + `movestring`) through the rebuilt validate-
  then-cache path and asserts the path no longer surfaces an invalid explanation for
  it. The P1/P2/P3 (board-only) and board-only-P5 rows must pass under Epic A alone.
  (Rows whose correctness depends on the closed allowed-set — the strong P5 / non-
  existent-threat fixture `403a21c9…` — may remain partially covered until Epic B; mark
  them as such, but the blocked-group fixtures `e86eeac9…` (parity threat on filled
  cells) and `8d83947e…` (threat group containing the user's own disc) **must** pass in
  Epic A — both are caught by the board-only blocked-group check.)

  **How Epic A and Epic B relate to the occupied-cell fixtures:**
  Epic A catches `e86eeac9` and `8d83947e` at the *gate*: both zone specs expand
  to cells where every candidate 4-window is blocked, so the board-only P5 check
  rejects the output. Epic B makes them *structurally impossible to generate*: the
  grounding contract never lists occupied cells as future-line members in the
  allowed-set, so the model cannot compose prose that references them. These
  layers are complementary — Epic A is the safety net, Epic B is structural
  prevention. Both epics list both fixtures in their definitions of done.

- This harness is the measurable success criterion (`deep_reveal_product.md`, *Success
  criteria*): a drop in `llm_feedback` rows of the traceability-table types.

**Data / API contracts touched:**

- `POST /api/explain-move-llm` (`index.js:719`): response shape **unchanged**
  (`{ explanation, prompt, cached? }`); the gate is internal. The fallback case returns
  the same shape with the Tier-1 fallback `explanation`.
- `explanation_cache.deep_reveal_json` = `{ explanation, prompt }` (confirmed
  `index.js:786`): shape **unchanged**; the gate only governs *whether* a write happens.
- `llm_feedback`: read-only consumer (the harness queries fixture rows); the flag write
  path (`POST /api/llm-feedback`, `index.js:803`) is unchanged.

**Reuse (do not rebuild):**

- The zone parse + spec→cell resolution already exist client-side in
  `connect-four/src/lib/annotatedText.js` (`parseAnnotatedText` `:54`, `isValidSpec`
  `:38`, `zoneToOverlays` `:128`). Extract/port this into a shared module the server
  gate can import, rather than writing a second parser. **The validation moves from
  client (`zoneToOverlays` dropping cells, `:133`/`:145`/`:165`) to server; keep the
  client parse for rendering only.**
- Board reconstruction + occupancy: the `Board` class already imported in
  `index.js` (used at `:736`, `colHeights` at `:741`); reuse for board-only P5 checks.
- Win-line geometry for the "line through own disc" check: reuse existing board /
  threat utilities (`getMajorThreatCells`, `checkWin`) rather than re-deriving 4-windows.

**NOT included:**

- TTS / read-aloud (deferred post-MVP per `deep_reveal_product.md` *Deferred*).
- The coach **content** rebuild — the Type 1–4 taxonomy, group-of-4 mechanism, and
  prompt construction are **Epic B**. Epic A validates whatever the *current* prompt
  produces; it does not change the prompt.
- The **full/strong form of P5** ("highlight only locations the explanation is allowed
  to reference"). Epic A enforces only the board-checkable part of P5; the closed
  allowed-set does not exist until Epic B (see the P5 seam above).
- New gating / quota changes (owned by Epic 7 in `epics.md`).

**Estimated spec:** 130–150 lines. **Estimated tasks:** 11–14.

**Depends on:** the shipped Deep Reveal from Epics 2b / 3b / 3c (panel, cache wiring,
the three surfaces) and Epic 7 (quota/auth on `/api/explain-move-llm`). No dependency
on Epic B.

---

### Epic B — Coach Explanation Rebuild

Rebuild **what the coach says**, per
[`coach_explanation_principles.md`](./coach_explanation_principles.md). Today the coach
runs a single always-Type-2 prompt that forces a "concrete threats" narrative even on
quiet positions, causing it to invent board facts (the documented root cause of
fixtures `e86eeac9…` and `8d83947e…`). This epic replaces the prompt-construction
pipeline with the evidence-driven taxonomy and the grounding contract, and produces the
closed allowed-location set that upgrades Epic A's P5 gate to its strong form.

**Scope:**

*Simulation leaf-data change (prerequisite — schedule early):*

- Change `connect-four/server/explainSimulate.js` `collectLeaves` (`:190`) so that at a
  **won leaf** it records the **specific 4-cell winning group** and its owner instead of
  returning `patterns: null` (`:205`). Aggregate **group completion frequency across
  continuations**, keyed by the canonical 4-cell group, and surface the top A-vs-B
  delta groups (with occupants + parity) to the context builder. At a **draw leaf**,
  record every **major threat group** present on the board (each
  4-window with 3 discs of one color and 1 empty cell) as
  `{ cells, winner: 'player'|'opponent', type: 'draw_threat' }`. Aggregate into a
  separate `draw_freq` counter (= N_draw_leaves_where_this_group_appeared /
  total_leaves), tracked alongside `completed_freq`. Both frequencies enter the
  context block per the M2 format in `coach_explanation_principles.md`.
  **Rationale:** blunders often convert winning continuations to draws, not losses;
  without draw-leaf records the branch-A vs branch-B frequency comparison misses
  groups the coached player was still building toward in those near-wins (see M1 in
  `coach_explanation_principles.md` for the full argument).
  This is a focused leaf-handling + aggregation change; it does not restructure the search
  (`coach_explanation_principles.md`, "Required simulation change").

*Type 1–4 explanation taxonomy (evidence-driven selection):*

- Implement the deterministic stage/evidence classifier (Type 1 immediate / Type 2
  tactical / Type 3 parity-structural / Type 4 development) and the eval-gap bucketing
  (small / moderate / large), per the prompt-construction algorithm in
  `coach_explanation_principles.md`. The selection step is the missing piece — the
  current prompt is effectively always-Type-2.
  For **Type 2 detection** (step 1b of the prompt-construction algorithm), the
  critical position is the board after move A + opponent's optimal reply.
  `buildExplainContext` already computes this as `opponentResponseMovestring` via
  `getOpponentResponseMs` — **reuse it directly. Do not add new solver calls.**
  For the **named-scaffold check** (Figure-7 / J-config) in step 1b, apply the
  existing pattern detectors (`allen-j-configuration`, `community-figure-7` — see
  `docs/knowledge-base/README.md`) to the *critical-position* board, not the
  current board. Wire the detectors to the `opponentResponseMovestring` board.
- Apply the locked decisions **D1 (honest about margin), D2 (concrete-eligible only at
  ≥2 player discs in a group), D3 (eval gap drives tone, not stage)** from that doc.

*Group-of-4 + parity mechanism:*

- The empirical layer (which group matters — from the new simulation aggregation) plus
  the KB parity layer (why a sparse group already matters — `allen-v1`/`allen-v3` for
  Red odd rows, `allen-v2`/`allen-v4` for Yellow even rows) per the "Core mechanism"
  and "KB leverage map" sections.

*Grounding contract → closed allowed-location set:*

- Build the context block that pre-lists every mentionable cell with its occupant
  (`empty`/`Green`/`Grey`), every mentionable group of 4 with cells/occupants/key
  completing cell/parity/winning-parity flag, and the CONCRETE-ELIGIBLE vs
  ABSTRACT-ONLY flag (D2). The model composes prose **only** over this closed set. This
  set **is** the closed allowed-location set the P5 strong form consumes.
- New / replaced prompt templates (Role / Players / grounding contract / tone / task)
  per type, with the Type 4 template verbatim from `coach_explanation_principles.md`.

*Strong-form P5 (upgrades Epic A's gate):*

- Extend the Epic A validate-then-cache gate so that, in addition to the board-only
  checks, it rejects any highlight whose location is **not in the closed allowed-set**
  the context builder produced for that explanation. The context builder returns the
  closed allowed-set alongside the prompt as `{ prompt, allowedSet }` where
  `allowedSet` is a flat array of `{ cells: string[], zoneSpec: string }` entries
  (one per mentionable group).

  At gate time, for each zone spec in the LLM output:
  1. Expand the spec to a cell set using the same parse logic as `zoneToOverlays`
     (apply the -1 coordinate conversion: `c4r3` → col 3, row 2).
  2. Check that every cell in the expanded set appears in **at least one** entry
     in `allowedSet`.

  Coverage by zone type:
  - `col4`: passes if any `allowedSet` entry contains a cell in col 3 (0-indexed).
  - `c4r3`: passes if any `allowedSet` entry contains the cell at col=3, row=2.
  - `cells:c4r3,c5r3,…`: passes if all listed cells appear across allowed entries.
  - `tg` (entire board): **always fails** strong-P5 — the rebuilt coach never emits
    `tg`; if it appears, reject unconditionally.
  - `row\d+`: passes if any allowed entry contains a cell in that row.
- Extend the regression harness (from Epic A) to cover the strong-P5 / non-existent-
  threat fixture `403a21c9…` and re-assert the occupied-cell (`e86eeac9…`) and own-disc
  (`8d83947e…`) fixtures now fail *structurally* (the cells are never in the allowed-set
  / never `empty`), not just at the gate.

**Data / API contracts touched:**

- `POST /api/explain-move-llm` (`index.js:719`): response shape **unchanged**; the
  rebuild is internal to `buildExplainContext` (`:609`) and the prompt it returns. The
  context builder now also returns the **closed allowed-set** for the gate to consume
  (internal contract between `buildExplainContext` and the Epic A gate).
- `explainSimulate.js`: leaf/aggregation **output shape changes** (won leaves now carry
  the winning group; aggregation exposes per-group completion frequency). Internal to
  the simulation layer; no HTTP contract change.
- `explanation_cache.deep_reveal_json` = `{ explanation, prompt }`: shape unchanged.
- KB: read-only consumer of `allen-v1`–`v4`, `derived-parity-formula`,
  `community-claimodd`, `allis-claimeven`, `community-z-threat`, and (Type 2)
  `allen-j-configuration` / `community-figure-7`. Respect the **explicit non-use** list
  (`t1`–`t7`, `parity-trap`, `ghost-threat`, `overcut`, `sextuple-threat`, `baseclaim`,
  `before`, `specialbefore` must not be invoked on sparse boards).

**Reuse (do not rebuild):**

- `buildExplainContext` (`index.js:609`) and `callLLM` (`server/llmCoachHelpers.js:139`)
  — the rebuild replaces the *contents* of the context/prompt construction, not the
  endpoint plumbing or the LLM call wrapper.
- The Epic A validate-then-cache gate — Epic B **extends** it with the allowed-set
  check; it does not add a second gate.
- The existing `explainSimulate.js` search structure — only leaf handling +
  aggregation change.
- The `Board` class threat/parity utilities (`getMajorThreatCells`, `par`-row
  computation) for evidence extraction.

**DELETE — do not preserve as "existing functionality":**

- `computeDeltaTable` (`server/index.js`) — the classifier-tag diff; replaced by
  group-frequency comparison from the new simulation aggregation.
- `claimevenNarration`, `zThreatNarration`, `figure7Narration`,
  `jShapeNarration` — pre-built narration strings injected into the old prompt;
  replaced by the grounding-contract context block.
- The KB-section generation code that produces those narration strings.

These must be **removed**, not left dormant. Preserving them alongside the new
code produces a hybrid that still emits the old always-Type-2 classifier tags.

**NOT included:**

- TTS / read-aloud (deferred).
- Pattern-name vocabulary in output, gap-bucket / ≥2-disc threshold tuning, and full
  Type 3 grounding depth — all explicitly **out of scope / open questions** in
  `coach_explanation_principles.md`; ship the Type 4 mechanism first, validate against
  flagged feedback, then tune.
- Any change to gating, the three frontend surfaces, or the rendering layer.

**Estimated spec:** 180–210 lines. **Estimated tasks:** 16–20.

**Depends on:** **Epic A** (the integrity gate this epic plugs its closed allowed-set
into; Epic A must be shipped first). Also the shipped Deep Reveal (Epics 2b/3b/3c) and
the KB entries listed above.
