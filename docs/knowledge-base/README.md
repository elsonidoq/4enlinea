# Connect Four Strategy Knowledge Base

## What this KB is — and what it is not

This KB documents **complete strategic patterns**: what a tactic looks like when fully formed on the board and why it wins. It is the source of truth for strategic theory — formal predicates, worked examples, false positives, and known limitations all describe the *finished* configuration.

**This KB does not document puzzle generation or classifier logic.** The classifier (`connect-four/server/classifier.js`) implements a different, complementary predicate: it detects the *one-move-away* state — the position where playing `correct_col` will create the pattern. These two predicates are related but intentionally distinct. Read `classifier.js` and its header comment for that layer.

---

Machine-checkable entries for Connect Four strategic concepts (transformation rules, victory rules, tactical patterns, strategic constructions, and project-local heuristics). The primary consumer is Claude Code during implementation work — when building a trap detector, a pattern recognizer, or any module that reasons about strategic concepts, this directory is the source of truth.

Compared with `docs/connect-four-strategy-reference.md` (long-form prose reference), entries here are:

- **Atomic.** One concept per file, identified by a stable slug.
- **Citable.** Canonical entries carry a verbatim source quote at the page level.
- **Executable.** Each entry includes a `formal_predicate` an engineer can translate directly to code, and at least one `worked_examples` board position verified against `c4solver`.
- **Falsifiable.** Each entry lists `false_positives` (positions that look right but aren't) and `known_limitations`.

## Format

Markdown with YAML frontmatter. Frontmatter holds structured fields; the body holds prose-heavy fields (`statement`, `verbatim_quote`, `known_limitations`, `notes`). This split keeps frontmatter machine-parseable while letting prose stay readable.

## File layout

- `docs/knowledge-base/<id>.md` — one file per entry. `<id>` is the stable kebab-case slug used in cross-references.
- `docs/knowledge-base/README.md` — this file: schema, conventions, validation rules.
- `docs/connect-four-strategy-reference.md` — long-form prose. Each section that has a corresponding KB entry should link to it via `→ KB: [allen-t4](knowledge-base/allen-t4.md)`.
- `docs/knowledge-base/scripts/` — (future) validation script that parses frontmatter, re-runs solver checks, and flags entries whose `last_verified` date is older than the source PDF mtime.

## Current entries (as of 2026-07-03)

**Allen transformation rules (T1–T7):** allen-t1, allen-t2, allen-t3, allen-t4, allen-t5, allen-t6, allen-t7

**Allen victory rules (V1–V5):** allen-v1, allen-v2, allen-v3, allen-v4, allen-v5

**Allen tactical patterns:** allen-j-configuration

**Allen opening theory (Ch. 9, 12, 13):** allen-opening-principles, allen-opening-tables, allen-5-4-opening, allen-3-4-opening, allen-d3-d4-opening, allen-candlesticks-opening, allen-third-row-gambit

**Allis nine strategic rules:** allis-claimeven, allis-baseinverse, allis-vertical, allis-aftereven, allis-lowinverse, allis-highinverse, allis-baseclaim, allis-before, allis-specialbefore

**Project-local heuristics (community- / derived-):** community-z-threat, community-ghost-threat, community-parity-trap, community-figure-7, community-sextuple-threat, community-center-control, derived-parity-formula, derived-dead-space-parity, derived-lost-position, derived-parity-aligned-threat

**Status:** T1–T7 and V1–V5 have verbatim quotes and formal predicates. All nine Allis rules have verbatim quotes and formal predicates. All 7 project-local entries created 2026-05-17 with formal predicates; figure-7 has solver-verified worked examples; remaining entries have PENDING worked examples. T4 is the only template-quality entry (all fields complete, fully solver verified). (community-claimodd was removed 2026-06-17 — the implementation was based on an incorrect reading of the WeakC4 source.)

The **Allen opening-theory** entries (seven as of 2026-07-04) were added 2026-07-03 (from Allen 2010 Ch. 9/12/13), with `allen-d3-d4-opening` and a round of corrections added 2026-07-04. Each carries verbatim quotes and formal predicates.

**2026-07-04 corrections (all solver-verified):** (1) New entry `allen-d3-d4-opening` (Allen p.180-181) — the first player takes both central key cells D3+D4 (0-indexed col3 rows 2&3) early, a comparatively easy first-player win; primary example `3332223` (D4 as disk 7), premium "only one move to win" example `3332223362` (Diagram 231, unique move = 0-indexed col 1). (2) `allen-candlesticks-opening` — the previously-noted "full Diagram 236 line" is `333331111555515` (b5 then F5); the plausible-looking `333331111155555` (wrong fill order) is actually a SECOND-player win, now a false_positive — candlesticks is a family (2-column/3-column/mirror) and the winning silhouette is necessary but NOT sufficient (fill-order parity decides). (3) `allen-5-4-opening` — added the 5-1 stem `3333341` ("DdDdDeB", Allen p.177). (4) `allen-3-4-opening` — corrected a mislabeled false_positive: `3332223` (D4 as disk 7) is a WIN (the D3-D4 opening), not a blunder; the genuine late-D4 blunder is `333222266644203` (Diagram 225, playing D4 instead of the only winning move G4 -> draw). Worked examples verified against `c4solver` on 2026-07-03 via `visualize_board.sh` (single-position `scr` row) and `reason_engine/TOOLS/optimal_line.mjs` (plays both sides optimally to terminal and reports the winner). **All primary AND secondary examples are now solver-verified** — there are no remaining PENDING opening examples. Primary: allen-opening-principles (`333334444`, empty board), allen-opening-tables (empty board, `333334444`), allen-5-4-opening (`333334444`), allen-3-4-opening (`3332222`), allen-candlesticks-opening (`3333311115555`), allen-third-row-gambit (`3265533353553111` — solver confirms Allen's unique winning move E1/col 4 exactly). Secondary (variant/continuation) lines, verified via `optimal_line.mjs`: 5-1 opening (`333334140222212`), 3-4 Diagram 225 stem after 9.G2 (`333222266`), Candlesticks Diagram 237 (`33333111115`), Third-Row Gambit continuation after 17.E1 (`32655333535531114110`) — each solves to a First-Player win. allen-opening-tables intentionally does NOT transcribe the full Ch. 9 grid (OCR of the printed table is unreliable); it records solver-verified anchor results plus the cleanly-OCR'd Opening-Lottery sets and points to the book for the exhaustive grid. Not yet done: a per-ply *forced-line* checker (would confirm Allen's "N of M moves uniquely forced" prose by asserting move-uniqueness at each winner ply) — a ~40-line custom tool reusing the `optimal_line.mjs` scaffolding; the worked examples do not require it.

## Schema

Every entry MUST have every field. Use `null` (not omission) when a field genuinely does not apply, and explain in a `notes` block why.

### Frontmatter fields

| field | type | description |
|---|---|---|
| `id` | string (kebab-case) | Stable slug. Must match filename (`<id>.md`). Used as cross-reference target. Prefix conventions: `allen-` (Allen 2010), `allis-` (Allis 1988), `community-` (project-local heuristic), `derived-` (logical consequence of other entries). |
| `type` | enum | `transformation_rule` \| `victory_rule` \| `tactical_pattern` \| `strategic_rule` \| `heuristic` \| `definition` |
| `canonical` | bool | `true` iff the entry restates a rule from a peer-reviewed or otherwise canonical published source (Allis thesis, Allen 2010, Tromp's published material). `false` for project-local heuristics. **Downstream confidence in citing the entry depends on this flag — do not flip it without re-checking the source.** |
| `source.doc` | string | Document identifier (e.g., `allen_2010`, `allis_1988`, `tromp_c4_resources`, or `project:docs/...` for project-local). |
| `source.location` | string | Chapter/section/page (e.g., `Ch. 4, p. 98`). |
| `source.verbatim_quote` | string (multi-line) | **Exact** wording from the source, including any italics noted with `_..._`. Not paraphrased. If the source uses diagrams, describe them in a `notes:` field; do not summarize them into this field. |
| `short_summary` | string | 1-2 sentence plain-language definition of the concept. Shorter and simpler than `statement` — aimed at learners, not LLMs. Sent to the client in the `terms` map of `/api/explain-move-llm` responses. Only entries with a real `.md` file AND a populated `short_summary` are eligible to appear in KB term popups. `statement` is LLM-prompt-only (never sent to the client); `short_summary` is client-facing. Use YAML literal block scalar: `short_summary: \|`. |
| `statement` | string | One-paragraph restatement for LLM consumption. Keep declarative and unambiguous. Never sent to the client — `short_summary` serves that role. |
| `preconditions` | list[string] | Bulleted conditions that must hold for the rule to apply. Each bullet must be checkable from board state alone. |
| `formal_predicate` | string (multi-line pseudocode) | Pseudocode that a competent engineer can translate to JavaScript/Python/C++ without further interpretation. Reference board coordinates as `(col, row)` with `col ∈ A..G` and `row ∈ 1..6`. |
| `worked_examples` | list[object] | Each: `{movestring, description, expected_behavior, solver_verified: <date>, notes?}`. At least one entry required. `solver_verified` is the date the position was last cross-checked against `c4solver` output. |
| `false_positives` | list[object] | Each: `{movestring, why_not, notes?}`. Positions that match the naive predicate but do not actually satisfy the rule. At least one entry required for `tactical_pattern`, `heuristic`, and `transformation_rule` types. |
| `known_limitations` | list[string] | Conditions under which the rule fails, does not apply, or is superseded by another entry. For canonical rules, list the rule's scope boundaries (e.g., "only valid for major threats"). |
| `related` | list[string] | List of other entry `id`s with one-line relationship descriptions: `allen-t2: covers cross-parity case T4 does not`. |
| `last_verified` | date (YYYY-MM-DD) | Date the source quote and solver-verified examples were last re-checked. Stale entries are flagged by validation. |

### Body fields

After the frontmatter, the markdown body contains:

```markdown
## Verbatim source

> {{source.verbatim_quote rendered as a blockquote, plus any diagram description}}

## Notes

{{free-form prose: design tradeoffs, why_now, history of changes, links to PRs}}
```

The body is **not** parsed by tooling — it exists for human reviewers. Anything a downstream consumer needs must live in frontmatter.

## Cross-reference syntax

Use `[[allen-t4]]` (Obsidian-style) when one entry references another. The validation script will resolve these to relative markdown links and flag dangling references.

## Adding a new entry

1. Copy an existing entry as a template (start with `allen-t4.md` for canonical rules, `community-figure-7.md` for heuristics).
2. Fill every frontmatter field. No omissions.
3. Construct at least one worked example and at least one false positive. For tactical patterns, three of each is the recommended floor.
4. Run `./visualize_board.sh <movestring>` for each example; paste a one-line "expected_behavior" reflecting solver score / board outcome.
5. Update `last_verified` to today.
6. Add a backlink from `docs/connect-four-strategy-reference.md` to the new entry.
7. Submit for review. Bulk migration of pre-existing entries from `connect-four-strategy-reference.md` should go through the same checklist.

All new concepts — including project-local observations — must go through this schema. No prose-only additions to connect-four-strategy-reference.md without a corresponding KB entry.

## Validation (planned)

A future `scripts/validate-kb.mjs` will:

- Parse every entry's frontmatter and reject missing fields.
- Re-run `c4solver` against each `worked_examples.movestring` and compare with `expected_behavior`.
- Flag entries where `last_verified` is older than 90 days.
- Resolve `[[id]]` cross-references; flag dangling links.
- Verify the corresponding section in `connect-four-strategy-reference.md` carries a backlink.
