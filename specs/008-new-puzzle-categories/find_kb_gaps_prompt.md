# Prompt: Find Gaps in the Connect Four Strategy Knowledge Base

You are the **coordinator** for a gap-analysis task. Your job is to identify strategic concepts
present in the external reference documents but missing from (or underspecified in) the project's
knowledge base, then write all findings to `knowledge-base-gaps.md`.

---

## Context

The project maintains a strategy knowledge base at `docs/knowledge-base/`. Each entry is a
markdown file with YAML frontmatter (schema described in `docs/knowledge-base/README.md`).

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
2. **Missing field** — an existing KB entry lacks a required field (verbatim_quote, formal_predicate,
   worked_examples, false_positives) that the source can supply.
3. **Incomplete coverage** — an existing KB entry covers only part of what the source says
   (e.g., T3 says "also applies to minor threats" but the KB entry's formal_predicate only handles
   major threats).

Do NOT flag:
- Items already in the "Known gaps" list above.
- Worked-example gaps for community- or derived- entries (those require solver work, not source reading).
- Superficial wording differences between KB statement and source prose.

---

## Your workflow

### Step 1 — Read the KB index

Read `docs/knowledge-base/README.md` and all existing KB files so you have the current inventory
in context before delegating.

### Step 2 — Spawn sub-agents

Spawn the following sub-agents **in parallel**. Each sub-agent must:
1. Read its assigned source material (listed below).
2. Read the relevant existing KB entries.
3. Return a structured list of gaps in this format:

```
GAP: <gap-id>
Type: missing_entry | missing_field | incomplete_coverage
Source: <doc name + page/section>
Existing KB entry (if any): <id or "none">
Description: <one paragraph — what the source says, what the KB says or lacks, why it matters>
Priority: high | medium | low
  (high = named rule/pattern/theorem the KB claims to cover but is wrong or missing;
   medium = secondary concept or nuance;
   low = cosmetic or tangential)
```

Return ONLY gaps; do not summarize what is already correct.

---

### Sub-agent assignments

**Agent A — Allen Book chapters 1–20 (pages 1–20)**
File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 1–20
Focus: introductory definitions, notation, minor/major threat definitions, any rules stated.

**Agent B — Allen Book chapters (pages 21–40)**
File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 21–40
Focus: zugzwang, parity, early transformation rule candidates.

**Agent C — Allen Book (pages 41–70)**
File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 41–70
Focus: Transformation Rules T1–T7 (the primary chapter). Cross-check every T-rule in this
range against the KB. Pay special attention to minor-threat variants, stated exceptions, and
T5/T6/T7 edge cases.

**Agent D — Allen Book (pages 71–100)**
File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 71–100
Focus: Victory rules V1–V5, any derived corollaries Allen names, and the J Configuration.
Cross-check allen-v1 through allen-v5 and allen-j-configuration.

**Agent E — Allen Book (pages 101–131)**
File: `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf`
Pages: 101–131
Focus: Opening theory (Joseki), endgame problems, any additional named patterns or rules.

**Agent F — Allis 1988 thesis (pages 1–45)**
File: `docs/external_references/allis_connect4_thesis.pdf`
Pages: 1–45
Focus: All nine strategic rules (Claimeven, Baseinverse, Vertical, Aftereven, Lowinverse,
Highinverse, Baseclaim, Before, Specialbefore) — their formal definitions, preconditions,
and any worked examples given. Cross-check against all nine allis-* KB entries.

**Agent G — Allis 1988 thesis (pages 46–91)**
File: `docs/external_references/allis_connect4_thesis.pdf`
Pages: 46–91
Focus: Threat-space search algorithm, any additional strategic constructions beyond the nine
rules, parity analysis, and theorem statements. Note any named theorems or lemmas that
the KB does not capture.

**Agent H — Allis 1993 threat-space search paper**
File: `docs/external_references/allis_93_threat-space-search.pdf`
Focus: Any rules, patterns, or theorems stated in this paper that are NOT already captured
in the Allis thesis KB entries. Ignore content that is a strict subset of Agent G's coverage.

**Agent I — Allen Expert Play + Tromp resources (HTML files)**
Files:
- `docs/external_references/allen_expert_play_summary.md`
- `docs/external_references/tromp_allen_expert_play.html`
- `docs/external_references/tromp_c4_resources.html`
- `docs/external_references/weakc4_explanation.html`
Focus: Named strategies, patterns, or theorems in these web resources not already in the KB.
The summary is a distillation — prefer the HTML for verbatim quotes. Note any concept that
appears in these resources but is absent from both the KB and the Allen/Allis PDFs.

**Agent J — Wikipedia + Wikibooks**
Files:
- `docs/external_references/wikipedia_connect_four.html`
- `docs/external_references/wikibooks_connect_four.html`
Focus: Named rules or strategy concepts cited as standard in the community. Only flag as a
gap if the concept is (a) named, (b) distinct from existing KB entries, and (c) described
in enough detail to write a KB entry.

### Step 3 — Collect and deduplicate

After all sub-agents return, collect their gap lists. Deduplicate across agents (same rule
reported by multiple agents → merge into one entry; keep the richest description and all
source citations). Re-assign gap IDs sequentially: GAP-001, GAP-002, …

Sort by priority (high first), then by source document alphabetically within each priority tier.

### Step 4 — Write `knowledge-base-gaps.md`

Write the final consolidated file to `knowledge-base-gaps.md` in the project root using
this exact structure:

```markdown
# Knowledge Base Gap Report

Generated: <date>
Source documents reviewed: <count>
Total gaps found: <count> (<N> high / <N> medium / <N> low)

## Summary table

| ID | Type | Priority | Existing KB entry | Source |
|----|------|----------|-------------------|--------|
| GAP-001 | missing_entry | high | none | Allen 2010 p. 42 |
| … | … | … | … | … |

## Gap details

### GAP-001 — <short title>

**Type:** missing_entry  
**Priority:** high  
**Source:** Allen 2010, p. 42 (Ch. 3, "Minor Threats")  
**Existing KB entry:** none  

<description paragraph>

---

### GAP-002 — …
```

Do not include a "what is correct" section — only gaps.

---

## Constraints for all agents

- Read source PDFs using the `Read` tool with the `pages` parameter (required for PDFs; max 20 pages per call). Do not attempt to read a PDF without specifying pages.
- When reading HTML files, use the `Read` tool directly on the `.html` file path.
- Cross-reference KB entries by reading the actual `.md` files in `docs/knowledge-base/`, not by relying on memory.
- Do not invent gaps. Every gap must be grounded in a specific page, section, or paragraph of the source.
- Do not flag formatting or stylistic differences as gaps.
