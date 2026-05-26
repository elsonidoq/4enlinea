# Prompt: Find KB Gaps — Part 2 (PDFs) + Final Merge

You are the **coordinator** for the second and final phase of a knowledge-base gap-analysis task.
Your job is to:
1. Identify strategic concepts present in the PDF external references that are missing from (or
   underspecified in) the project's Connect Four strategy knowledge base.
2. Read the Part 1 output (`knowledge-base-gaps-part1.md`) produced by the previous coordinator.
3. Merge everything into the final `knowledge-base-gaps.md`.

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

### Step 1 — Read the KB and Part 1 output

Read in parallel:
- `docs/knowledge-base/README.md` and all existing KB files in `docs/knowledge-base/`
- `knowledge-base-gaps-part1.md` (Part 1 coordinator output; will be used during final merge)

### Step 2 — Spawn PDF sub-agents in parallel

Spawn the following sub-agents **simultaneously**. Each must:
1. Read its assigned PDF page range using the `Read` tool with the `pages` parameter
   (required for PDFs; max 20 pages per call; use multiple calls if the range exceeds 20 pages).
2. Read the relevant existing KB entry files.
3. Return a structured gap list using the format below.

Return ONLY gaps; do not summarize what is already correctly covered.

#### Gap format

```
GAP: <temporary label, e.g. A-1, B-1>
Type: missing_entry | missing_field | incomplete_coverage
Source: <doc name + page range + section/chapter name>
Existing KB entry (if any): <id or "none">
Description: <one paragraph — what the source says, what the KB says or lacks, why it matters>
Priority: high | medium | low
  (high = named rule/pattern/theorem KB claims to cover but is wrong/missing;
   medium = secondary concept or nuance;
   low = cosmetic or tangential)
```

---

#### Agent A — Allen Book pages 1–20

File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 1–20
Focus: Introductory definitions, notation conventions, definitions of minor vs. major threats,
any named concepts or rules stated in these pages. Cross-check against KB entries that
describe these foundational concepts.

#### Agent B — Allen Book pages 21–40

File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 21–40
Focus: Zugzwang, parity concepts, early strategic principles. Note any named rules,
theorems, or patterns stated in this range.

#### Agent C — Allen Book pages 41–70

File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 41–70
Focus: **This is the primary Transformation Rules chapter.** Cross-check every T-rule
(T1–T7) in this range against the corresponding allen-t* KB entries. Pay close attention to:
- Minor-threat variants explicitly stated by Allen.
- Exceptions, boundary conditions, or interaction ordering rules Allen spells out.
- Any T-rule not currently in the KB (T8+, or sub-cases Allen names separately).

#### Agent D — Allen Book pages 71–100

File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 71–100
Focus: **Victory rules V1–V5 and the J Configuration.** Cross-check allen-v1 through
allen-v5 and allen-j-configuration against what Allen states in this range. Note corollaries
or named sub-cases Allen derives that are not captured in the KB.

#### Agent E — Allen Book pages 101–131

File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 101–131
Focus: Opening theory (Joseki), endgame problems, named tactical patterns or rules in the
final chapters. Flag any named concept that could become a KB entry.

#### Agent F — Allis 1988 thesis pages 1–45

File: `docs/external_references/allis_connect4_thesis.pdf`
Pages: 1–45
Focus: **All nine Allis strategic rules** — their formal definitions, exact preconditions,
and any worked examples given in the thesis. Cross-check against all nine allis-* KB entries.
Pay attention to rule ordering dependencies (e.g., which rules must be checked before others)
and any sub-cases Allis names within a single rule.

#### Agent G — Allis 1988 thesis pages 46–91

File: `docs/external_references/allis_connect4_thesis.pdf`
Pages: 46–91
Focus: Threat-space search algorithm, named theorems and lemmas, any strategic constructions
beyond the nine rules, and parity analysis. Note any theorem or construction the KB does not
capture.

#### Agent H — Allis 1993 threat-space search paper

File: `docs/external_references/allis_93_threat-space-search.pdf`
Focus: Rules, patterns, or theorems in this paper that are NOT already captured in the Allis
thesis KB entries. Ignore content that is a strict subset of what Agent G covers. This paper
may extend or refine the thesis; focus on differences.

---

### Step 3 — Collect and deduplicate PDF gaps

After all PDF sub-agents return:
1. Merge all gap lists.
2. Deduplicate: if the same concept is reported by multiple agents, merge into one entry
   (keep the richest description; list all page references).
3. Assign sequential IDs: P2-GAP-001, P2-GAP-002, …

### Step 4 — Merge with Part 1 and write final output

Read `knowledge-base-gaps-part1.md`. Combine the Part 1 gaps (P1-GAP-*) with the PDF gaps
(P2-GAP-*) into a single deduplicated list:
- If a Part 1 gap and a Part 2 gap describe the same concept, merge them under a final GAP-* ID
  and list all sources.
- Otherwise, retain both under their final GAP-* IDs.

Assign final sequential IDs: GAP-001, GAP-002, …
Sort by priority (high first), then alphabetically by primary source document within each tier.

Write the final `knowledge-base-gaps.md` to the project root.

---

## Output format for `knowledge-base-gaps.md`

```markdown
# Knowledge Base Gap Report

Generated: <date>
Source documents reviewed: <list all 9 source files>
Total gaps found: <N> (<N> high / <N> medium / <N> low)

## Summary table

| ID | Type | Priority | Existing KB entry | Source |
|----|------|----------|-------------------|--------|
| GAP-001 | … | … | … | … |
| … | … | … | … | … |

## Gap details

### GAP-001 — <short title>

**Type:** missing_entry | missing_field | incomplete_coverage  
**Priority:** high | medium | low  
**Source:** <doc name, page/section>  
**Existing KB entry:** <id or none>  

<description paragraph>

---

### GAP-002 — …
```

Do not include a section describing what is already correct — only gaps.

---

## Constraints

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
- Read PDFs with the `Read` tool and the `pages` parameter (required; max 20 pages per call).
  If an agent's range exceeds 20 pages, make multiple sequential Read calls.
- Read HTML/markdown files with the `Read` tool on the file path directly.
- Cross-reference KB entries by reading the actual `.md` files in `docs/knowledge-base/`.
- Do not invent gaps. Every gap must be grounded in a specific page and section of the source.
- Do not flag formatting or stylistic differences as gaps.
