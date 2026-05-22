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

## Current entries (as of 2026-05-17)

**Allen transformation rules (T1–T7):** allen-t1, allen-t2, allen-t3, allen-t4, allen-t5, allen-t6, allen-t7

**Allen victory rules (V1–V5):** allen-v1, allen-v2, allen-v3, allen-v4, allen-v5

**Allen tactical patterns:** allen-j-configuration

**Allis nine strategic rules:** allis-claimeven, allis-baseinverse, allis-vertical, allis-aftereven, allis-lowinverse, allis-highinverse, allis-baseclaim, allis-before, allis-specialbefore

**Project-local heuristics (community- / derived-):** community-z-threat, community-ghost-threat, community-parity-trap, community-claimodd, community-figure-7, community-sextuple-threat, derived-parity-formula, derived-dead-space-parity

**Status:** T1–T7 and V1–V5 have verbatim quotes and formal predicates. All nine Allis rules have verbatim quotes and formal predicates. All 8 project-local entries created 2026-05-17 with formal predicates; figure-7 and claimodd have solver-verified worked examples; remaining entries have PENDING worked examples. T4 is the only template-quality entry (all fields complete, fully solver verified).

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
| `statement` | string | One-paragraph restatement for LLM consumption. Keep declarative and unambiguous. |
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
