# Zone + KB-term annotation tags in the grounded-render path

**Status:** design (brainstormed 2026-07-06). No production code written yet. This is the shared design
that folds the production explain engine's **highlightable zone tags** and **KB-term popups** into the
reason-engine grounded-render path (condition D), so that path can produce everything the frontend needs
and the production explain engine (`explainContext.js` / `annotationGate.js` / `zoneParser.js` /
`llmCoachHelpers.js` / `classifier.js` zone bits) can eventually be **deleted**.

**North star for every decision here:** *does this let us delete the production explain engine?* A
proposal that needs a transformation/sync step between the answerer and the frontend is weaker than one
that emits what the frontend consumes directly.

## 0. Context — the two systems and the gap

- **Production (system 1, to be deleted).** The LLM emits `[zone:alias]…[/zone:alias]` in prose;
  `expandZoneAliases` swaps aliases → real specs from a `zoneAliasMap` (`explainContext.js:327`);
  `validateAnnotation`/`P5strong` checks each spec against `allowedSet` (`index.js:1051`); the frontend
  `parseAnnotatedText` (`connect-four/src/lib/annotatedText.js:58`) parses **inline
  `[zone:spec]…[/zone:spec]` and `[term:kbId]…[/term:kbId]` markup embedded in the player-facing text**,
  assigns one color per distinct zone spec, and drives board overlays via `zoneToOverlays` (`:152`).
  Zone spec grammar (`isValidSpec`/`expandSpec`, server mirror `zoneParser.js`): `colN`, `cNrM`,
  `cells:…`, `windows:…`, `rowN`, `tg`.
- **Grounded-render (system 2, the keeper).** The answerer (`compute.mjs --condition D`) returns a
  structured object whose only player-facing field is `mechanism` (plain prose, register-contracted to
  contain **no** machine tokens), plus a flat `key_cells` list (`compute.mjs:212`). The render layer
  (`renderReasonModel.mjs` + `reasonBoardSelect.mjs` + `causalLinks.mjs`) already grounds the
  load-bearing cells and emits a `render_decision` object the `grade-fv-sufficiency` grader consumes as
  ground truth (G1–G6). It is currently an **offline experiment**, not wired to an endpoint.
- **The gap.** The frontend needs **inline markup with real specs, inside the text the player reads**,
  plus KB-term popups. The grounded path emits neither. This design adds both to condition D, keeping the
  reason-engine change discipline (`causalLinks.mjs`/render model = single source of truth consumed by the
  composer, the grader, and the board sampler in lockstep — see `reason-render-grounded-prompt.md` §3d/§3e).

## 1. Settled decisions (this brainstorm)

1. **Inline in `mechanism`.** Zone (and term) specs are inline `[zone:…]`/`[term:…]` markup **inside**
   `mechanism`, matching the frontend contract with **zero transformation step**. `key_cells` becomes
   **derived** from the expanded inline zone specs (single source of truth); the `/admin/fv-suff` overlay
   switches from `answer.key_cells` to the expanded specs.
2. **Aliases-only (zones).** The LLM may write **only offered alias handles** inside `[zone:…]`, never a
   raw cell. The render layer emits the alias set + `zoneAliasMap`; expansion + validation are
   server-side. This collapses the hallucination surface to **binding only** (which handle wraps which
   phrase) — the LLM cannot make a spec board-false.
3. **Terms symmetric to zones.** KB-term popups use the **same** offered-only + inline-emission model:
   the render layer offers a **fired-term vocabulary**; the LLM wraps phrases with `[term:slug]…[/term:slug]`
   from that set only. No free-text phrase-scanning (which had false negatives on paraphrases like "two
   winning squares at once"). One mental model for both tag families.
4. **Single display board; per-alias truth board.** The player-facing coach shows **one** board (the
   decision board, like production). Every zone highlights on that board — including cells empty there
   (production already highlights empty threat cells). Each alias also carries a **truth board** (the
   board where its tactic is real — after-best / after-played / final line) that the grader uses for
   board-truth. UI shows one board; grading stays sound.
5. **Near-term boards source the aliases.** Aliases derive from the **near-term** threat-list tags
   (decision / after-best / after-played from `tagBoard`), plus the causal frame's denial/completing
   cell, plus **column aliases** (`bestCol`/`playedCol` → `colN`). The **projected-deep** board exposes
   **no** aliases — deep, currently-empty cells stay horizon prose, never a highlighted square (guards
   the eval-3 "present-threat" illusion, `reason-render-grounded-prompt.md` §3-A).
6. **Grader: one new G7 "annotation fidelity" (condition-D only), board-truth via G5.** Zones and terms
   share G7; zone board-truth is delegated to the existing G5 (threat-list fidelity, same `tagBoard`
   objects).
7. **Keep KB-term popups.** Deleting production must not drop the `[term:…]` feature.

## 2. Data model — the annotated `mechanism`

`mechanism` carries inline markup; the only tokens allowed are **offered handles/slugs**:

```
mechanism: "Column [zone:better-col]3[/zone:better-col] would have taken
            [zone:blocking-square]the square that finishes your opponent's
            [term:double_threat]two winning squares at once[/term:double_threat][/zone:blocking-square],
            which the move you played gives away."
```

- **Zone handles** → board highlights (via `zoneToOverlays`). Offered-only.
- **Term slugs** → KB popups (via `parseAnnotatedText` `terms`). Offered-only (offered = fired).
- `key_cells` = the expanded, de-duplicated cells of all emitted zone specs (derived, not LLM-authored).
- **No zonable/termable content** (e.g. L9 diffuse parity, "the culprit square isn't cleanly isolable"):
  the render layer offers few/no aliases, the LLM wraps nothing, and G7 passes vacuously — this preserves
  the old `key_cells: []` abstention channel.

**Register interaction.** The just-shipped register contract (`READING_KEY`, A5) says `mechanism` must be
plain prose with no machine tokens. Inline markup is machine tokens, so **the grader strips `[zone:…]`
and `[term:…]` before A5 / coach-voice checks** (exactly as production `checkP3` strips markup first —
memory `project_annotation_gate_and_zones.md`). The stripped `cleanText` is what the player actually
reads, so grading voice against it is also *more* correct. Because the LLM only ever writes handles (never
a raw `cNrM`), no coordinate ever appears in the visible prose after stripping — inline is what keeps the
register contract satisfiable.

## 3. Render-layer alias + term emission

Lives with the render step (`renderReasonModel.mjs`, helpers in `reasonBoardSelect.mjs`). Reuses the P2
tagger so "what's highlightable" == "what the model sees on the boards," and reuses production's
`cellsToZoneSpec` converter for spec strings.

### 3a. Zone aliases

One alias per **structural, board-true** near-term threat-list tag + the two move columns. **Only the
structural tags from `getMajorThreatCells` (`immediate` / `major` / `double`) become highlights; the
vector-named *overlay* tags (`figure_7` / `double_threat`, injected onto the decision board by
`reasonBoardSelect.mjs`'s `patternOpts`) are NOT offered as zone aliases** — those name a resource that
often completes deep, and highlighting a deep, currently-empty square is exactly the eval-3
"present-threat illusion" decision #5 forbids. A genuinely near-term fork still gets highlighted because
it appears as a structural `double` on the board where it is real; a *deep* fork gets no highlight and
stays horizon prose. Consequently **`truthBoard` = the first near-term board the structural tag appears
on, which is a board where the tactic is genuinely board-true** (structural tags come straight from
`getMajorThreatCells` on that board) — no separate re-sourcing needed. Each alias:

```js
{
  handle: "blocking-square",        // stable, human-readable; what the LLM references
  spec:   "c4r3",                   // real zone spec (cellsToZoneSpec / colN); for the frontend + key_cells
  role:   "the square your opponent took to complete their threat",  // plain-language; shown in the prompt
  truthBoard: "afterPlayed",        // board where this tactic is REAL (grader board-truth target)
  kbId:   "double_threat"           // optional — if this alias's tactic has a KB entry (piggyback popup, see 3c)
}
```

- **Spec kinds produced:** `cNrM` (single tag / completing / denial cell), `windows:`/`cells:` (a 4-window),
  `colN` (move-column aliases). `rowN`/`tg` are not produced by construction.
- **Invariant preserved:** *alias-in-map ↔ offered-in-prompt* (memory `project_zone_alias_must_match_prompt.md`)
  — every offered handle is both in `zoneAliasMap` and listed in the prompt's "Highlightable regions."

### 3b. Term vocabulary (symmetric to aliases)

The KB terms whose pattern **fired** for this case (from the fired tags / causal frame). Each:

```js
{ slug: "double_threat", kbId: "double_threat", canonicalPhrase: "double threat (two winning squares at once)",
  description: "two winning squares at once — the opponent can't block both" }
```

Offered = fired ⇒ the LLM can never wrap an unfired term, which automatically preserves the production
invariant *"no KB term inject without its pattern firing"* (memory `project_explain_system.md`).
**`canonicalPhrase` is imported verbatim from `causalLinks.mjs`'s `TAG_PHRASE`** (single source of truth,
no local copy) — only the extra one-line `description` and `kbId` are local. **The vocabulary is
restricted to the four slugs that have a resolvable KB entry** — `immediate_threat`, `double_threat`,
`figure_7`, `claimeven` (they map through `PATTERN_KB` to KB files: `community-immediate-threat`,
`community-double-threat`, `community-figure-7`, `allis-claimeven`). `conditional_swindle` is **NOT** a
term (it has no KB entry — a `[term:conditional_swindle]` popup would render empty); it stays a prose
phrase only.

### 3c. Term ↔ zone relationship

Terms are **independent** of zones (the reason we chose symmetry over piggyback): a term may be wrapped on
a phrase with **no** cell to highlight ("keep the more [term:claimeven]central[/term:...] lines"). An alias
*may* also carry a `kbId` — if the LLM both highlights a tactic and names it, the term can nest inside the
zone. See the nesting edge in §6.

### 3d. `render_decision.zones` — grader ground truth

`buildRenderDecision` gains a `zones` element (consumed verbatim by the grader; never re-derived, per the
G1–G6 "consume, don't re-derive" rule):

```json
"zones": {
  "aliases": [ { "handle":"blocking-square","spec":"c4r3","role":"…","truthBoard":"afterPlayed","kbId":"double_threat" }, … ],
  "terms":   [ { "slug":"double_threat","kbId":"double_threat","canonicalPhrase":"double threat" }, … ]
}
```

## 4. Prompt changes (`assembleGroundedPrompt`)

Two new sections, before the TASK:

- **"# Highlightable regions"** — each offered zone handle → its `role` + which board it refers to, with:
  *"To highlight a phrase, wrap it `[zone:<handle>]…[/zone:<handle>]` using a handle from this list
  verbatim. Never write a raw square."*
- **"# KB terms you may name"** — each offered term slug → its `canonicalPhrase`/`description`, with:
  *"When you use one of these ideas, wrap the words with `[term:<slug>]…[/term:<slug>]`. Only these slugs;
  only when you actually use the idea."*
- The existing `READING_KEY` "no raw coordinates / no field names in `mechanism`" clause stays — now
  enforced *by construction* for cells (the LLM only has handles).

## 5. Post-processing pipeline (`compute.mjs`, condition D, after the LLM call)

The LLM returns JSON; `mechanism` contains inline `[zone:handle]` / `[term:slug]`. Then, in order:

1. `normalizeZoneTags` + `normalizeTermTags` — repair backreference / `col`-vs-`column` malformation
   (reuse/mirror production `normalizeZoneTags`).
2. **Validate against offered set** — drop/flag any `[zone:handle]` whose handle ∉ `zoneAliasMap`, any
   `[term:slug]` whose slug ∉ offered terms. This trivial gate **replaces** production's
   `allowedSet`/`P5strong` machinery entirely (the offered map *is* the allowedSet, and it is small +
   exact).
3. `expandZoneAliases` — handle → real spec via `zoneAliasMap`.
4. **Derive `key_cells`** from the expanded specs (de-duplicated).
5. Write the answer line + `render_decision.zones` ground truth.

## 6. Frontend (deletion-wiring, downstream of this design)

The offline experiment + grader need only §2–§5. To actually retire production and serve the grounded
`mechanism` to the coach UI:

- **One board.** The coach shows the single decision board; all zones highlight on it. `parseAnnotatedText`
  already returns `{cleanText, zones, terms}` and `zoneToOverlays` already maps specs → overlays — reused
  as-is.
- **Nesting edge (must resolve before shipping to the UI).** If a `[term:…]` sits inside a `[zone:…]`
  span, `parseAnnotatedText`'s non-greedy regex may not parse nested tags. Resolve by a prompt
  instruction "don't overlap a highlight and a term on the same words,"

## 7. Grader — G7 "annotation fidelity" (condition D only)

Additive to A1–A5 + G1–G6, scored per `(id, condition D)` run, consuming `render_decision.zones` as
ground truth:

- **G7a — zone binding (LLM-attributable):** every emitted `[zone:handle]` was **offered**; each handle
  wraps a phrase whose meaning matches its `role`; nothing over-wrapped (no zone on a non-highlightable
  phrase). Board-truth of the alias's spec is delegated to **G5** (checked on the alias's `truthBoard`,
  not the displayed decision board).
- **G7b — term binding (LLM-attributable):** every emitted `[term:slug]` was **offered** (i.e. fired);
  the wrapped phrase genuinely denotes that KB concept.
- **A5 strips both tag types** before coach-voice grading (§2).

**Triage attribution:**

| Finding | Bucket |
|---|---|
| Handle/slug not offered, or bound to a semantically wrong phrase, or over-wrapped | `prompt_confusion` |
| A cell/tactic the case needed but the render layer never offered as an alias | `missing_info` (or `render_bug` if it *should* have been offered) |
| An **offered** alias whose spec is board-false on its `truthBoard` | `render_bug` (surfaced by G5) |

**Grader guidance to add to `grade-fv-sufficiency/SKILL.md`:** the "Render decision — GROUND TRUTH" block
gains the `zones` object; the sub-agent template gains G7a/G7b; A5's "strip markup first" step is made
explicit for `[zone:…]`/`[term:…]`; the output schema's `per_run` gains `G7` (condition D only) and the
counterexample `axis` enum gains `G7`.

## 8. Coverage (`renderUniverse.mjs`) — the bounded `select_boards` touch

**Validated constraint:** this adds **no new reason-engine case and no new harvested board** — zone/term
tags reproject cells the render layer already grounds (threat-list tags, `completingCell`, columns), all
of which trace to fields the existing `REASON_UNIVERSE` already covers via `link_*`/`board_*`. So
`select_boards.mjs`'s **board harvest is untouched**.

**But** per §3e ("every render selection/pruning decision is catalog-driven + sampler-covered +
grader-aware"), the offered-alias/term set is a new render-*selection* decision and gets coverage
**predicates** (this is the precise, bounded sense in which the change touches `select_boards`'s
*universe*, not its harvest):

- `zone_speckind_{cell,window,col}` — each produced spec-kind exercised ≥1. (This replaces a freetext
  `zone_role_<role>` predicate — roles are free-text sentences and make poor, unbounded predicate keys;
  spec-kind is the bounded, meaningful axis.)
- `term_emitted` — ≥1 case offers (and can exercise) a KB term.
- `zones_no_tactical` — ≥1 case where only the two move-column aliases are offered and **no** tactical
  (cell/window) highlight exists (the render-side abstention: a deep/L9 case with no near-term threat to
  highlight). This replaces the design's earlier `zones_absent` — that predicate can never fire because
  the move-column aliases are **always** offered, so "zero aliases" is unreachable.

**Note on the LLM-side abstention channel.** Whether the *model* chooses to wrap nothing (leaving
`key_cells: []`) is a **per-answer** property, not a per-board one, so it is **not** a board-coverage
predicate — it is exercised by the answerer/grader, not the sampler. The coverage universe only asserts
the *render* offered the right shapes.

Keep the `discovered ⊆ REASON_UNIVERSE` guard; rare predicates get the existing bounded directed
rare-fill (never hand-built boards — `playGame` with a property filter; memories
`feedback_no_random_boards`, `feedback_reproduce_fv_case_from_coverage`).

## 9. What deleting the production explain engine still needs (tracked, out of scope here)

Per the end-goal guardrail, capabilities production has that this design must eventually cover to allow
deletion:

1. **`[term:kbId]` popups — COVERED** by §3b/§3c (symmetric term tags).
2. **Zone specs / aliases / `col` highlights — COVERED** (§3a: `cNrM`, `windows:`/`cells:`, `colN`).
3. **Annotation gate / `allowedSet` / `P5strong` — RETIRED** by §5 step 2 (offered map = allowedSet; the
   gate shrinks to "handle ∈ offered set"). This is a *simplification*, but the old machinery must be
   consciously removed, not just bypassed.
4. **Multi-board rendering — N/A** by decision #4 (single display board).
5. **Retry/repair loop** (production retries the LLM call on validation failure, `index.js:1051-1060`).
   The offline experiment grades-and-fails; a production endpoint would add a validate+repair step — but
   with offered-only validation this is trivial (drop unknown handles) rather than production's
   `allowedSet` re-derivation.

## 10. Change-discipline checklist (per reason-engine memory)

Because `causalLinks.mjs` / the render model are one source of truth consumed by composer + grader +
sampler, this change is **not "done"** until all three know about it:

- [ ] Render layer emits `zoneAliasMap` + term vocabulary + `render_decision.zones`, and the prompt lists
      "Highlightable regions" + "KB terms."
- [ ] `compute.mjs` post-processing (normalize → validate-offered → expand → derive `key_cells`).
- [ ] `grade-fv-sufficiency/SKILL.md` gains G7a/G7b, the `zones` ground-truth block, explicit
      strip-before-A5, and the `G7` schema/axis entries.
- [ ] `renderUniverse.mjs` gains the §8 predicates + the coverage test asserts them; `discovered ⊆
      universe` guard intact.
- [ ] Tests/fixtures updated in lockstep (the frozen corpus render + coverage test).
