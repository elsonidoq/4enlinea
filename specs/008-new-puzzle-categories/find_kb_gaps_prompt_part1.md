# Prompt: Find KB Gaps — Part 1 (Web Resources)

You are the **coordinator** for the first phase of a knowledge-base gap-analysis task.
Your job is to identify strategic concepts present in the web-based external references that are
missing from (or underspecified in) the project's Connect Four strategy knowledge base, then
write all findings to `knowledge-base-gaps-part1.md`.

A second coordinator prompt (Part 2) will handle the PDF sources and produce the final merged
`knowledge-base-gaps.md`.

---

## Context

The project maintains a strategy knowledge base at `docs/knowledge-base/`. Each entry is a
markdown file with YAML frontmatter. The schema is described in `docs/knowledge-base/README.md`.

Current KB entries:

- **Allen transformation rules:** allen-t1 through allen-t7
- **Allen victory rules:** allen-v1 through allen-v5
- **Allen tactical patterns:** allen-j-configuration
- **Allis strategic rules:** allis-claimeven, allis-baseinverse, allis-vertical, allis-aftereven,
  allis-lowinverse, allis-highinverse, allis-baseclaim, allis-before, allis-specialbefore
- **Project-local heuristics:** community-z-threat, community-ghost-threat,
  community-parity-trap, community-claimodd, community-figure-7, community-sextuple-threat,
  derived-parity-formula, derived-dead-space-parity

Known gaps already documented (do NOT re-report these):

- `allis-baseclaim` and `allis-specialbefore`: worked_examples still PENDING
- Most community- and derived- entries: worked_examples still PENDING
- `community-sextuple-threat` and `community-parity-trap`: worked_examples still PENDING

A gap is one of:
1. **Missing entry** — a named rule, pattern, or concept in the source that has no KB file.
2. **Missing field** — an existing KB entry lacks a required field (verbatim_quote,
   formal_predicate, worked_examples, false_positives) that the source can supply.
3. **Incomplete coverage** — an existing KB entry covers only part of what the source says
   (e.g., T3 says "also applies to minor threats" but the KB entry's formal_predicate only
   handles major threats).

Do NOT flag:
- Items already in the "Known gaps" list above.
- Worked-example gaps for community- or derived- entries (those require solver work, not reading).
- Superficial wording differences between KB statement and source prose.

---

## Your workflow

### Step 1 — Read the KB

Read `docs/knowledge-base/README.md` and the existing KB files so you have the full current
inventory before delegating.

### Step 2 — Spawn sub-agents in parallel

Spawn the following three sub-agents **simultaneously**. Each must:
1. Read its assigned source files.
2. Read any relevant KB entry files referenced.
3. Return a structured gap list using the format below.

Return ONLY gaps; do not summarize what is already correctly covered.

#### Gap format

```
GAP: <temporary label, e.g. A-1, B-1>
Type: missing_entry | missing_field | incomplete_coverage
Source: <file name + section/heading>
Existing KB entry (if any): <id or "none">
Description: <one paragraph — what the source says, what the KB says or lacks, why it matters>
Priority: high | medium | low
  (high = named rule/pattern/theorem KB claims to cover but is wrong/missing;
   medium = secondary concept or nuance;
   low = cosmetic or tangential)
```

---

#### Agent I — Allen Expert Play + Tromp resources

Files to read (use the `Read` tool on the file paths directly):
- `docs/external_references/allen_expert_play_summary.md`
- `docs/external_references/tromp_allen_expert_play.html`
- `docs/external_references/tromp_c4_resources.html`
- `docs/external_references/weakc4_explanation.html`

Focus: Named strategies, rules, or patterns that appear in these sources but are absent from
the KB. The summary is a distillation — prefer the HTML files for verbatim quotes when they
conflict. Note any concept that is described in enough detail to write a KB entry.

#### Agent J — Wikipedia + Wikibooks

Files to read:
- `docs/external_references/wikipedia_connect_four.html`
- `docs/external_references/wikibooks_connect_four.html`

Focus: Named rules or strategy concepts described as standard in the community. Only flag as
a gap if the concept is (a) named, (b) distinct from all existing KB entries, and (c) described
in enough detail to write a KB entry.

---

### Step 3 — Collect, deduplicate, and write output

After both sub-agents return:

1. Merge their gap lists. If the same concept is flagged by both agents, merge into one entry
   (keep the richest description; list both sources).
2. Assign sequential IDs: P1-GAP-001, P1-GAP-002, …
3. Sort by priority (high first), then alphabetically by source file within each tier.
4. Write `knowledge-base-gaps-part1.md` to the project root.

---

## Output format for `knowledge-base-gaps-part1.md`

```markdown
# Knowledge Base Gap Report — Part 1 (Web Resources)

Generated: <date>
Sources reviewed: allen_expert_play_summary.md, tromp_allen_expert_play.html,
  tromp_c4_resources.html, weakc4_explanation.html, wikipedia_connect_four.html,
  wikibooks_connect_four.html
Total gaps found: <N> (<N> high / <N> medium / <N> low)

## Summary table

| ID | Type | Priority | Existing KB entry | Source |
|----|------|----------|-------------------|--------|
| P1-GAP-001 | … | … | … | … |

## Gap details

### P1-GAP-001 — <short title>

**Type:** …  
**Priority:** …  
**Source:** <file name, section/heading>  
**Existing KB entry:** <id or none>  

<description paragraph>

---
```

Do not include a section describing what is already correct — only gaps.

---

## Constraints

- When spawning sub-agents via the Agent tool, set model: "sonnet" so sub-agents run on Sonnet instead of inheriting the coordinator's Opus model.
- Read HTML files with the `Read` tool on the file path directly (they are local files).
- Cross-reference KB entries by reading the actual `.md` files in `docs/knowledge-base/`.
- Do not invent gaps. Every gap must be grounded in a specific section or heading of the source file.
- Do not flag formatting or stylistic differences as gaps.
