# Knowledge Base Gap Report

Generated: 2026-05-19
Source documents reviewed:
- `docs/external_references/The_Complete_Book_Of_Connect_4_-_James_Dow_Allen.pdf` (Allen 2010, pp. 1–131)
- `docs/external_references/allis_connect4_thesis.pdf` (Allis 1988, pp. 1–91)
- `docs/external_references/allis_93_threat-space-search.pdf` (Allis 1993)
- `docs/external_references/allen_expert_play_summary.md`
- `docs/external_references/tromp_allen_expert_play.html` (Allen 1990)
- `docs/external_references/tromp_c4_resources.html`
- `docs/external_references/weakc4_explanation.html`
- `docs/external_references/wikipedia_connect_four.html`
- `docs/external_references/wikibooks_connect_four.html`

Total gaps found: 58 (17 high / 25 medium / 16 low)

This is the final merged report from Part 1 (web resources, P1-GAP-*) and Part 2 (PDFs, P2-GAP-*).
Duplicates have been merged; merged source IDs are listed under "Merged from" in each entry.

## Summary table

| ID | Type | Priority | Existing KB entry | Primary source |
|----|------|----------|-------------------|----------------|
| GAP-001 | missing_entry | high | none | Allen 2010, Ch. 1, pp. 2–4 |
| GAP-002 | missing_entry | high | none | Allen 2010, Ch. 1, pp. 2–4; Allen 1990 |
| GAP-003 | missing_entry | high | none | Allen 2010, Ch. 1, p. 3 |
| GAP-004 | missing_entry | high | allen-t1 (partial) | Allen 2010, Ch. 1, p. 3 |
| GAP-005 | missing_entry | high | none | Allen 2010, Ch. 4, p. 103–104 |
| GAP-006 | missing_entry | high | community-sextuple-threat (related), allen-j-configuration (partial) | Allen 2010, Ch. 4 & Ch. 7; Allen 1990; weakc4 |
| GAP-007 | missing_entry | high | none | Allen 2010, Ch. 7, pp. 118–119 |
| GAP-008 | missing_entry | high | allen-j-configuration (partial) | Allen 2010, Ch. 7 & Ch. 8 |
| GAP-009 | missing_entry | high | none | Allen 2010, Ch. 5, pp. 105–122 |
| GAP-010 | missing_entry | high | none | Allen 2010, Ch. 6, pp. 111–113 |
| GAP-011 | missing_field | high | allen-j-configuration | Allen 1990 |
| GAP-012 | missing_entry | high | none | Wikibooks |
| GAP-013 | missing_entry | high | none | Allis 1988, §5.3–§5.4 |
| GAP-014 | missing_entry | high | partial across allis-* | Allis 1988, §7.4; §7.1 |
| GAP-015 | missing_entry | high | none | Allis 1988, §8.2–§8.4 |
| GAP-016 | missing_entry | high | none | Allis 1993, §4 |
| GAP-017 | missing_entry | high | none | Allis 1993, §4 |
| GAP-018 | missing_entry | medium | allen-j-configuration (partial) | Allen 1990 |
| GAP-019 | missing_entry | medium | none | Allen 1990 |
| GAP-020 | incomplete_coverage | medium | allen-v1..v5 | Allen 1990 |
| GAP-021 | missing_entry | medium | none | Wikibooks |
| GAP-022 | missing_entry | medium | none | Wikibooks |
| GAP-023 | missing_field | medium | allen-t1..t7 | Allen 2010, Ch. 1 |
| GAP-024 | missing_entry | medium | none | Allen 2010, Ch. 1, pp. 3–4 |
| GAP-025 | missing_entry | medium | none | Allen 2010, Ch. 2, p. 10 |
| GAP-026 | missing_entry | medium | none | Allen 2010, Ch. 2, p. 9 |
| GAP-027 | missing_entry | medium | none | Allen 2010, Ch. 4, pp. 95–96 |
| GAP-028 | missing_entry | medium | partial in T-rule notes | Allen 2010, Ch. 4, pp. 93–95 |
| GAP-029 | incomplete_coverage | medium | allen-t2 | Allen 2010, Ch. 4, p. 97 |
| GAP-030 | incomplete_coverage | medium | allen-t1 | Allen 2010, Ch. 4, p. 94 |
| GAP-031 | missing_entry | medium | none | Allen 2010, Ch. 7, pp. 133–134 |
| GAP-032 | missing_entry | medium | none | Allen 2010, Ch. 7, pp. 115–116 |
| GAP-033 | missing_entry | medium | community-sextuple-threat (different) | Allen 2010, Ch. 7, pp. 119–122 |
| GAP-034 | missing_field | medium | allis-lowinverse | Allis 1988, §6.5 |
| GAP-035 | incomplete_coverage | medium | allis-* | Allis 1988, §6, §8.2 |
| GAP-036 | missing_entry | medium | none | Allis 1988, §7.1 |
| GAP-037 | missing_entry | medium | none | Allis 1988, §9.2 |
| GAP-038 | missing_entry | medium | none | Allis 1988, §10.1 |
| GAP-039 | incomplete_coverage | medium | allis-* | Allis 1988, §8.1 |
| GAP-040 | missing_entry | medium | none | Allis 1993, §4 |
| GAP-041 | missing_entry | medium | none | Allis 1993, §6 |
| GAP-042 | incomplete_coverage | medium | community-z-threat, community-ghost-threat | Allis 1993, §3–§4 |
| GAP-043 | missing_field | low | allen-j-configuration | Allen 1990 |
| GAP-044 | missing_entry | low | none | Allen 1990; Wikipedia |
| GAP-045 | missing_entry | low | none | weakc4 |
| GAP-046 | incomplete_coverage | low | derived-parity-formula | Wikibooks |
| GAP-047 | missing_entry | low | none | Allen 2010, Ch. 1, p. 4 |
| GAP-048 | missing_entry | low | none | Allen 2010, Ch. 2, p. 9 |
| GAP-049 | incomplete_coverage | low | allen-t1..t7 | Allen 2010, Ch. 4, p. 93 |
| GAP-050 | missing_field | low | allen-t3 | Allen 2010, Ch. 4, p. 97 |
| GAP-051 | missing_field | low | allen-v1..v5 | Allen 2010, Ch. 4, p. 100 |
| GAP-052 | missing_entry | low | none | Allen 2010, Ch. 3, pp. 101–104 |
| GAP-053 | incomplete_coverage | low | allis-highinverse | Allis 1988, §6.6 |
| GAP-054 | incomplete_coverage | low | allis-aftereven | Allis 1988, §6.4 |
| GAP-055 | missing_entry | low | none | Allis 1988, §12.5 |
| GAP-056 | missing_entry | low | none | Allis 1988, §11.2–§11.6 |
| GAP-057 | incomplete_coverage | low | allis-before | Allis 1988, §10.1 |
| GAP-058 | missing_entry | low | none | Allis 1993, §5–§6 |

---

## Gap details

### GAP-001 — "Check" definition

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 1, pp. 2–4, "Rules and Terminology"
**Existing KB entry:** none
**Merged from:** P2 A-1

Allen defines "check" as "a cell available for immediate play whose occupation would complete four-in-row for one of the players." This is Allen's canonical name for what the strategy reference calls "Major Direct threat." Several downstream KB entries (allen-t1, allen-v3, allen-j-configuration) reference "check" or "Major Direct" without a canonical KB anchor. A `definition`-type entry with verbatim quote, formal predicate `playable_cell AND completes_four_in_row`, false_positives (e.g., a four-completing cell that is not immediately playable), and at least one worked example would close the foundational vocabulary gap.

---

### GAP-002 — Major / Minor / Strategic / Mixed threat taxonomy

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 1, pp. 2–3 "Rules and Terminology"; Allen 1990 (tromp_allen_expert_play.html) "Threat Analysis"
**Existing KB entry:** none
**Merged from:** P1-GAP-001, P2 A-2

Allen 2010 (pp. 2–3) and Allen 1990 (Threat Analysis section) both define the three-tier threat taxonomy used throughout the KB but neither tier has a `definition`-type KB entry. A "major threat" is three aligned discs + one empty cell needed for four-in-row. A "strategic threat" is an important threat that is not a check (the cell under it is empty). A "minor threat" is one of two cells needed to convert two aligned discs to four-in-row (a 2-disc + 2-empty four-window). Allen 1990 adds "Mixed Threat" — a pair with one cell on an odd row and one on an even row in the same column. The V-rule and T-rule entries reference these terms without defining them; a formal entry per tier (with verbatim quote, formal predicate, and worked examples distinguishing the tiers) would close the self-referential vocabulary gap.

---

### GAP-003 — Row parity definition

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 1, p. 3, "Rules and Terminology"
**Existing KB entry:** none
**Merged from:** P2 A-4

Allen formally defines row parity on p. 3: "A threat is called an odd-row threat or an even-row threat if it is on, respectively, an odd row (either the third or fifth row) or even row (either the second, fourth, or sixth row); this attribute is called the threat's row parity. Remember that it is the empty cell needed to complete four-in-row that determines the threat's row parity." Every allen-t* and allen-v* entry depends on this foundational definition, but no KB entry encodes (a) the verbatim definition, (b) the critical note that parity is determined by the empty cell (not disc positions), or (c) the enumeration of odd vs. even rows.

---

### GAP-004 — Adjacent threat pair definition (cross-column case)

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 1, p. 3 and Ch. 1, p. 5 Diagram 6
**Existing KB entry:** allen-t1 (covers same-column case only)
**Merged from:** P2 A-3, P2 B-1

Allen defines "adjacent threat pair" as "two major threats of the same color in neighboring rows" — explicitly *not* restricted to the same column. Allen also notes parenthetically "the word adjacent always refers to neighboring rows, not neighboring columns." The KB's allen-t1 covers the same-column sub-case (immediate win), but the broader cross-column adjacent-pair concept (basis for many mate-in-N tactical sequences throughout Allen's Ch. 2 problem set) has no entry. A `definition`-type entry capturing the general concept (and a separate `tactical_pattern` entry for the cross-column case) would close the gap.

---

### GAP-005 — Six minor-threat rules (Allen p. 103–104)

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 4, pp. 103–104, "Minor Threats" subsection
**Existing KB entry:** none
**Merged from:** P2 C-3

Allen presents six distinct named facts about minor threats at the end of Chapter 4 in the same labelled style as T1–T7: (1) "Major threats 'overcut' minor threats"; (2) "Black's isolated minor even-row threats will be fulfilled"; (3) "A mixed threat pair on a diagonal undercuts a major threat"; (4) "Three minor odd-row threats in separate columns are equivalent to one major odd-row threat"; (5) "An even-row threat can sometimes serve as a third threat"; (6) "Sometimes a 'triple threat' is comprised of four threats." None has a KB entry. Rule (4) is directly analogous to T7 but for minor threats; its absence creates a gap in any detector reasoning about minor-threat zugzwang. allen-j-configuration touches (6) implicitly but does not encode (1)–(5).

---

### GAP-006 — Triple Threat (Triple Odd-Row and Triple Mixed variants)

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 4 p. 103 (item 4–5) and Ch. 7 pp. 116–118; Allen 1990 "Threat Analysis"/Game 3; weakc4_explanation.html "Steady-State Language"
**Existing KB entry:** community-sextuple-threat (references triple threats but does not define them); allen-j-configuration (one instance of triple-mixed)
**Merged from:** P1-GAP-006, P2 D-1, P2 E-4

Allen names two variants of triple threat as first-class strategic concepts: (1) "Triple Odd-Row Threat" — three minor odd-row threats in separate columns, equivalent to one major odd-row threat; (2) "Triple Mixed Threat" — two minor odd-row threats plus one or more even-row threats in a T3-qualifying column. Allen states a triple threat can sometimes comprise four threats (when two same-column odd-row minor threats are linked). Allen 1990 uses "triple-odd threat configuration" in Game 3 and weakc4 explicitly says "positions which use the 'triple-odds' strategy ... Triple-odds requires global knowledge." The J Configuration is one instance of a triple mixed threat; the more general concept (and the equivalence rule "three minor odd-row threats in separate columns = one major odd-row threat") has no KB entry.

---

### GAP-007 — Winning Quadruple Threat

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 7, pp. 118–119, Diagrams 66 / 96 / 97 / 110; glossary p. 237
**Existing KB entry:** none (community-sextuple-threat is a different concept)
**Merged from:** P2 D-2, P2 E-5

Allen defines "Winning Quadruple Threat" as a specific configuration of four minor threats collectively equivalent to either (1) two major odd-row threats or (2) an adjacent major threat pair. The mechanism is that capturing any one of the quadruple's cells either gives Red an adjacent major threat pair (T1-winning) or promotes the remaining threats to a triple threat. Glossary: "A particular configuration of four threats equivalent to either (1) two major odd-row threats or (2) an adjacent major threat pair." Cannot be countered by a single Black odd-row counterthreat — unlike an ordinary triple threat. No KB entry.

---

### GAP-008 — J-Configuration variants: Capped J, Overcut J Shape, Future J Shape, J-Shape Races

**Type:** missing_entry
**Priority:** high
**Source:** Allen 1990 "Capped J Configuration" (tromp html); Allen 2010 pp. 132–138 "J-Shape Races" and Ch. 8 J Shape section; glossary p. 236
**Existing KB entry:** allen-j-configuration (does not cover any of the four variants)
**Merged from:** P1-GAP-004, P2 D-3

Four named derivative J-shape concepts are absent from `allen-j-configuration`: (1) **Capped J** — Black plays a horizontal threat at row 4 that blocks F3, turning the position into a column-race (Allen 1990 explicit diagram with move-level examples); (2) **Overcut J Shape** — Red J shape with three Black disks above it that negate Red's triple threat (Allen 2010 glossary; Diagrams 104–106); (3) **Future J Shape** — Red disk configuration such as B1-C2-D3-D1-E2 with E3 empty, convertible to a J shape on demand (glossary; Diagram 113); (4) **J-Shape Race logic** — the column-race between Red converting to a major threat vs. Black installing the overcutting disk. Current KB mentions overcutting in `known_limitations` only as a one-line failure mode and does not capture the named patterns or the race dynamic.

---

### GAP-009 — Undercutting Threats (Allen Chapter 5)

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 5, pp. 105–122
**Existing KB entry:** none
**Merged from:** P2 E-2

Allen devotes an entire chapter to the named concept of "undercutting": a threat in the same column immediately under an opponent's threat that renders the upper threat nearly worthless. Sub-forms: major undercutting major; diagonal minor-threat pair undercutting a major odd-row threat; "diagonal undercutting diagonal undercut" (a chain where each player has a diagonal that undercuts the opponent's); first-row check that destroys a second-row threat. T2 covers one sub-case; no entry covers the general concept with formal predicate, preconditions, or worked/false-positive examples. This is prerequisite for understanding Ch. 7's "Mixed Diagonal Undercutting Threat" (GAP-032).

---

### GAP-010 — Counterthreats (Allen Chapter 6)

**Type:** missing_entry
**Priority:** high
**Source:** Allen 2010, Ch. 6, pp. 111–113; glossary p. 237
**Existing KB entry:** none
**Merged from:** P2 D-4, P2 E-3

Allen formally defines "counterthreat" as a Black odd-row threat in a column separate from Red's odd-row threat that neutralizes Red's zugzwang advantage. He distinguishes counterthreat (leads to a draw) from undercutting (can lead to a Black win) and describes the scenario where Black builds both to win. Allen provides a full worked game showing correct and incorrect counterthreat strategies. Strategic logic: if Black builds one odd-row counterthreat → draw; if Black builds two (including one in Red's column) → win; if Black builds only even-row threats → loses. The concept interacts directly with V3 but has no KB entry.

---

### GAP-011 — allen-j-configuration worked_examples / false_positives still PENDING

**Type:** missing_field
**Priority:** high
**Source:** Allen 1990 (tromp_allen_expert_play.html) — Example J Game 1/2/3
**Existing KB entry:** allen-j-configuration
**Merged from:** P1-GAP-002

The allen-j-configuration entry has `solver_verified: PENDING` for its primary worked example and `movestring: PENDING` for two of three false_positives. Allen 1990 provides three complete Example J Games (Game 1: `D1 d2 D3 d4 D5 d6 E1 c1 C2 c3 E2 c4 E3 e4 G1 f1 G2`; Games 2 and 3 with similar listings). Each can be converted to a numeric movestring and solver-verified. Per the README, the entry cannot reach template-quality until at least one worked example has a confirmed movestring.

---

### GAP-012 — Even-row / odd-row attack framework

**Type:** missing_entry
**Priority:** high
**Source:** wikibooks_connect_four.html — "Theory-based strategy for 7x6 board"
**Existing KB entry:** none
**Merged from:** P1-GAP-003

Wikibooks names and formally defines the even-row attack / odd-row attack dichotomy as the core strategic framework for 7×6: Red needs an uncontested odd-row attack (or an odd count of shared odd-row attacks) to win; Black needs an even-row attack (or the right combination of odd-row attacks) to win; a draw results when both have one unshared odd-row attack each. This is the high-level framing from which the V-rules derive but is presented as a named concept in its own right. The V-rules document individual cases but no entry provides the unified framing or the win/draw/loss table.

---

### GAP-013 — Combination of Rules (meta-rules)

**Type:** missing_entry
**Priority:** high
**Source:** Allis 1988, §5.3 "Combination of Rules" and §5.4 "General Usage of Rules"
**Existing KB entry:** none
**Merged from:** P2 F-4

Two key meta-rules about applying the nine Allis strategies are missing: (1) two rules cannot be applied simultaneously if their sets of squares are not disjoint — illustrated with Baseinverse + Claimeven sharing a square, creating a conflict (each rule requires the controller to respond differently to the same opponent move); (2) the full framework works only when rules are applied by the controller of Zugzwang; if all groups can be covered by a valid non-conflicting combination, the Zugzwang precondition is self-fulfilling. These section-5 meta-rules are never stated as a standalone KB entry; implementers building a rule combinator have no single authoritative source.

---

### GAP-014 — Nine-rule combination compatibility matrix + even-square-count principle

**Type:** missing_entry
**Priority:** high
**Source:** Allis 1988, §7.1 (even-square-count principle), §7.4 (9×9 compatibility matrix)
**Existing KB entry:** partial information scattered across allis-* `known_limitations`
**Merged from:** P2 F-7, P2 G-1

Chapter 7 provides a unified framework for which Allis-rule pairs are combinable: (a) §7.1's underlying principle ("two rules can be combined if the number of squares coming available after one rule is filled in, is even") and (b) §7.4's full 9×9 compatibility matrix with four constraint codes (1 = sets disjoint; 2 = no Claimeven below the inverse; 3 = column-wise disjoint or equal; 4 = sets disjoint AND inverse columns disjoint or equal). No KB entry contains the full matrix or the four-code legend as a structured field. Individual entries (allis-lowinverse, allis-before) reference single codes; implementers must manually piece the matrix together. A dedicated `allis-combination-constraints` entry — or a structured `combination_constraints` table field on each rule — would close the gap.

---

### GAP-015 — Allis White-strategy "Threat Combinations"

**Type:** missing_entry
**Priority:** high
**Source:** Allis 1988, §8.2 "Strategic Rules for White", §8.4 "Threat Combinations in General"
**Existing KB entry:** none (community-z-threat is related but distinct)
**Merged from:** P2 F-3, P2 G-2

Chapter 8 defines a freestanding strategic concept — the "threat combination" — distinct from the nine rules but governing how White gains and uses Zugzwang control. Precise definition (§8.4): two groups each filled with two men, one needing two odd squares and the second sharing one of those odd squares while also needing an even square directly above or below the second odd square. Two sub-cases ("even above odd" and "odd above even") each yield an enumeration of what White can claim (six numbered claims for even-above, four for odd-above). community-z-threat covers a related parity concept but not Allis's precise threat-combination definition. The threat-combination governs when White can apply the nine rules at all — a prerequisite for any White-wins analysis.

---

### GAP-016 — TSS formal definitions (gain / cost / rest / dependency / conflict)

**Type:** missing_entry
**Priority:** high
**Source:** Allis 1993, §4 "Threat-space search", definitions 1–6
**Existing KB entry:** none
**Merged from:** P2 H-1

Allis 1993 defines six formal TSS concepts that have no KB entry: (1) gain square — square played by the attacker in a threat; (2) cost squares — squares played by the defender in response; (3) rest squares — threat's empty squares other than the gain square; (4) dependency — threat A depends on threat B if a rest square of A is the gain square of B; (5) dependency tree — rooted at a threat, children are dependent threats; (6) conflict between dependency trees — two trees conflict if any gain square of one is a cost square of the other, or two cost squares coincide. These are the foundational vocabulary for any forced-sequence (VCF/VCT) detector. None exist in the KB, making it impossible for an implementer to build a correct forced-sequence search from KB alone.

---

### GAP-017 — TSS search principles

**Type:** missing_entry
**Priority:** high
**Source:** Allis 1993, §4 "Threat-space search"
**Existing KB entry:** none
**Merged from:** P2 H-2

Allis states two core TSS principles: (1) a threat A independent of threat B may not appear as a node in the search tree of B; (2) the search tree contains only attacker threats — defensive counterplay is verified separately after a candidate winning sequence is found. These two principles are what make TSS tractable (reducing millions of nodes to dozens). The strategy reference describes TSS only at the level of "restricts expansion to threat-generating moves" without encoding the independence/non-appearance invariant or the attacker-only/verify-later split.

---

### GAP-018 — Capped J Configuration (concrete tactical sub-case)

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 1990 (tromp_allen_expert_play.html) — "Capped J Configuration"
**Existing KB entry:** allen-j-configuration (one-line mention in `known_limitations`)
**Merged from:** P1-GAP-004

Note: This entry is the concrete tactical sub-case for the broader J-shape race situation captured in GAP-008. Allen 1990 explicitly names and diagrams Capped J as a distinct named situation: Black places a horizontal threat at row 4 that blocks Red from playing F3, capping the J and turning the position into a column-race. Current KB gives no formal predicate for when the cap is present, no worked example of a capped-J position, and no analysis of the resulting G-column race dynamic. The 1990 source has a named diagram with move-level examples for this sub-case specifically. Could be implemented either as a separate `allen-capped-j-configuration` entry or as a richly-specified sub-section/worked-example inside the GAP-008 family.

---

### GAP-019 — "Two Stones in the Second Row" positional strategy

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 1990 (tromp_allen_expert_play.html) — Game 2
**Existing KB entry:** none
**Merged from:** P1-GAP-005

Allen names "Two Stones in the Second Row" as Black's primary positional strategy (Game 2 is entirely devoted to it). Concept: Black getting two stones on row 2 in different columns guarantees a long-term endgame win via horizontal completion on row 2, because column-filling parity assigns even rows to Black. Allen states: "The 'Two Stones in the Second Row' are of value only to the Second_Player" and generalizes "the threats can actually be on any even row if there is no odd-row Eques threat underneath them." Distinct from claimeven (procedural call-and-response) and V4 (abstract V-rule); the "two stones" frame is the opening/mid-game construction heuristic for achieving V4-winning positions.

---

### GAP-020 — V-rule multi-column count table and "lowermost threat dominates" rule

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allen 1990 (tromp_allen_expert_play.html) — Threat Analysis, "In more detail" subsection
**Existing KB entry:** allen-v1, allen-v2, allen-v3, allen-v4, allen-v5
**Merged from:** P1-GAP-007

Allen 1990 contains a two-step summary procedure and an extended table for all column-count combinations: "With two such columns, either player needs threats in both of them to win. Eques has the advantage with one or three such columns; Knott has the advantage with four. When both players have two Odd Major Threats Knott wins if the threats occupy two columns, Eques if three, the game is Drawn with the threats on four separate columns." Plus: "If one threat is Odd and the other Even, the lowermost threat dominates." V1–V5 encode this atomically but no entry surfaces the full multi-column count matrix or the "lowermost threat dominates" mixed-column rule as a single accessible summary.

---

### GAP-021 — Shared vs. unshared attacks

**Type:** missing_entry
**Priority:** medium
**Source:** wikibooks_connect_four.html — "Theory-based strategy for 7x6 board"
**Existing KB entry:** none
**Merged from:** P1-GAP-008

Wikibooks explicitly names and formally defines shared vs. unshared attacks. A "shared" attack is a critical space both players want (a mutual column where both have threats); an "unshared" attack is one in a column the opponent cannot contest. Win conditions: Red needs one more unshared odd-row attack than Black, or an odd number of shared ones; Black needs one more unshared odd-row attack than Red, or an even-row attack. This taxonomy underpins the win-condition table in GAP-012 but has no KB entry of its own.

---

### GAP-022 — Critical-space parity (Wikibooks formulation)

**Type:** missing_entry
**Priority:** medium
**Source:** wikibooks_connect_four.html — "Theory" section
**Existing KB entry:** none
**Merged from:** P1-GAP-009

Wikibooks formally defines critical space as a named concept: a cell that both players want to occupy and neither wants to play under. Precise rules for who gets the critical space based on row parity (even-row → Black; odd-row → Red) generalize to multiple critical spaces with explicit counting rules (even # of odd-row critical spaces → Black gets alternating ones; odd # → Red gets the first). More formal and distinct from project-local community-z-threat and derived-parity-formula (which operationalize related but different concepts — Z-Threat = parity of empty cells to threat, not the abstract "who gets the cell"). A KB entry would document this named theoretical framework.

---

### GAP-023 — T-rule entries missing cross-reference to threat-tier definition

**Type:** missing_field
**Priority:** medium
**Source:** Allen 2010, Ch. 1, p. 3 — definition of major vs. minor threat
**Existing KB entry:** allen-t4 (and several others)
**Merged from:** P2 A-8

Allen's formal definition of major threat vs. minor threat is a prerequisite cited throughout T4, T1, T2, T3, allen-j-configuration etc. The allen-t4 `known_limitations` says "Applies only to major threats. Allen explicitly notes (Ch. 4 p. 97)…" but provides only a Ch. 4 reference rather than the Ch. 1 verbatim definition. No `definition`-type entry for `major-threat` or `minor-threat` exists. As a result, each T-rule's `formal_predicate` implicitly assumes the definition without pointing to a definition entry. Once GAP-002 is created, every T-rule `related` list should be updated to cross-reference it.

---

### GAP-024 — Mixed threat pair (Allen Ch. 1 definition)

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 1, pp. 3–4 "Rules and Terminology"
**Existing KB entry:** none (allen-t2 covers the same-column cross-parity case but not the definition)
**Merged from:** P2 A-5, P2 B-5

Allen defines "mixed threat pair" on p. 4 as "a minor threat pair where the two threat cells have different row parities" (one odd, one even). Distinct from a major threat (single cell) and from a same-parity minor threat pair. Mixed threat pair is the precondition for T2 (undercutting) and several Ch. 7 minor-threat rules that act differently on mixed vs. same-parity pairs. No entry defines mixed threat pair as a first-class term.

---

### GAP-025 — Push-up play

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 2, p. 10, "Tactical Ideas"; pp. 126–127, 139; glossary p. 236
**Existing KB entry:** none
**Merged from:** P2 A-7, P2 B-2, P2 D-6

Allen defines "push-up play" as a tactic in which a player occupies cells such as C1-C2-C3 to ensure his or her capture of C5: "Black 'pushed' in one column with b1-b2-b3, forcing a B4 reply, and then seized b5; such a maneuver is called a push-up play." Recurs throughout Ch. 2 and Chs. 7–8 (Diagrams 84–89, 124–125, 151) with specific strategic uses: destroying an opponent's push-up opportunity is key defensive technique; failing to block it while defending a J-shape is a common error; push-up is the mechanism for promoting minor threats to major threats by marching up a column. No KB entry.

---

### GAP-026 — Tactical sequence / forcing combination / "mate"

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 2, p. 9, "Tactical Ideas"; problem set pp. 16–40
**Existing KB entry:** none
**Merged from:** P2 B-3

Allen defines: "A sequence of forcing moves is called a tactical sequence, or forcing combination." Plus "mate" as Allen's term (borrowed from chess) for completing four-in-row. This is the structural backbone of Ch. 2's problem set — every "mate in N" problem is an instance. Foundational vocabulary missing from the KB; downstream code generating puzzle explanations using Allen's terminology needs this.

---

### GAP-027 — General Principle G6 (same-parity cross-player threats → not a draw)

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 4, pp. 95–96 "General Principles"
**Existing KB entry:** none
**Merged from:** P2 C-1

Allen explicitly names G6: "When a column has major threats of both players, with the same row parity, the game will not end in a draw. Obviously, there cannot be a draw if both players have a major threat at F3. If one player has a threat at F3 and the other at F5, a draw is theoretically possible, but only if one player makes an illogical blunder." G6 has no KB entry and is referenced nowhere despite being a named principle that informs V5 (draw) — a column with a same-parity cross-player threat pair structurally rules out draws. G1–G5 are referenced from existing entries; G6 alone is entirely absent.

---

### GAP-028 — General Principles G1–G5 as standalone entries

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 4, pp. 93–95 "General Principles" (G1, G2, G3, G4, G5)
**Existing KB entry:** none (referenced in prose notes inside T-rules; `[[allen-g4]]` is a dangling cross-reference in allen-t1.md)
**Merged from:** P2 C-2, P2 E-1

G1 ("In the final column, Black gets even-row cells and Red gets odd-row cells"), G2 ("Red's odd-row threat has priority over a Black even-row threat in a separate column"), G3 ("Red likes odd numbers"), G4 ("Adjacent major threats win"), G5 ("Second- and fifth-row threats work together") are canonical Allen named General Principles. They are referenced in prose notes inside T-rule entries (T7 → G3; T1 → G4; T3 → G5) but lack their own `id`, `formal_predicate`, `preconditions`, or `worked_examples`. G4 is explicitly linked as `[[allen-g4]]` in allen-t1.md — a dangling cross-reference the validation script would flag. Standalone `allen-g1` … `allen-g5` entries would resolve this and make the principles citable.

---

### GAP-029 — T2 sub-case 3 asymmetry not explicit in known_limitations

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allen 2010, Ch. 4, p. 97, "T2" sub-case 3
**Existing KB entry:** allen-t2
**Merged from:** P2 C-4

The allen-t2 entry correctly records T2's three sub-cases and notes in the body that sub-case 3 ("Red odd at r, Black even at r+1") is restricted to the immediately-adjacent row. However, `known_limitations` does not call out the directional asymmetry explicitly: sub-cases 1 and 2 (even-row threat below any odd-row threat) apply at ANY height separation above the lower threat, whereas sub-case 3 requires the even-row cell to be IMMEDIATELY above (r+1 only). The `formal_predicate` correctly handles this with an adjacency guard, but `known_limitations` omits the asymmetry as an explicit warning, and no `false_positive` demonstrates the sub-case-3 non-adjacent error case (the second `false_positive` is PENDING).

---

### GAP-030 — T1 cross-player race condition

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allen 2010, Ch. 4, p. 94, "G4 race condition"
**Existing KB entry:** allen-t1
**Merged from:** P2 C-5

Allen's G4 discussion explicitly states: "Sometimes one player will have adjacent threats on one side of the board while the other player has adjacent threats on the other side. This leads to a race; whoever plays up to his or her threats first wins." allen-t1 covers same-player adjacent pairs as unconditional wins but does not document the cross-player race scenario — where both players hold adjacent pairs in different columns and the outcome depends on move order, not structural dominance. The `known_limitations` says T1 "fires before T2–T7" but does not address simultaneous T1 triggering in different columns by different players. The race condition requires comparing reachability depths across columns and is not covered.

---

### GAP-031 — Overcutting Threat (standalone canonical mechanism)

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 7, pp. 133–134 (Diagram 104–105); glossary p. 236
**Existing KB entry:** none (allen-j-configuration mentions overcutting only in `known_limitations`)
**Merged from:** P2 D-5

Allen defines "Overcutting Threat" in the glossary as "A threat that neutralizes an enemy threat immediately below it. Normally the overcutting threat will be a major threat, and the threat under it will be a minor threat." Distinct from undercutting; canonical example is the "Overcut J Shape" (covered in GAP-008) where Black's major even-row threat above Red's minor odd-row threat negates the minor threat. KB covers undercutting implicitly (via T2 and J `known_limitations`) but no entry formalizes the overcutting mechanism and its preconditions. Load-bearing for J-shape detection.

---

### GAP-032 — Mixed Diagonal Undercutting Threat

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 7, pp. 115–116 (Diagram 60)
**Existing KB entry:** none (undercutting concept also absent — see GAP-009)
**Merged from:** P2 E-6

Allen names "Mixed Diagonal Undercutting Threat" as one of the six categories of strategic minor threat. Definition: a pair of minor threats on a diagonal (one odd-row, one even-row) that together undercut an opponent's major odd-row threat even though neither threat alone has offensive value. Distinct from a single-disk undercut and from a major undercutting threat. A common endgame motif relevant for puzzle-category detection; no KB entry.

---

### GAP-033 — Allen "Sextuple Threat" (canonical, distinct from project-local)

**Type:** missing_entry
**Priority:** medium
**Source:** Allen 2010, Ch. 7, p. 115 taxonomy list and pp. 119–122 (Diagrams 53–54, 67–68)
**Existing KB entry:** community-sextuple-threat (project-local; different definition)
**Merged from:** P2 E-7

Allen defines "sextuple threat" as six minor threats on the right side of the board equivalent to a triple threat, where playing up a specific column forces Red into one of two resulting triple threats. This is a canonical named pattern in Allen Ch. 7 with specific right-side geometry (Diagram 67). The project-local `community-sextuple-threat` entry defines a different geometry (J-Configuration + Figure-7 combination). A new canonical entry `allen-sextuple-threat` is needed; cross-link from `community-sextuple-threat` to clarify the two are different.

---

### GAP-034 — Lowinverse: lower squares need not be playable

**Type:** missing_field
**Priority:** medium
**Source:** Allis 1988, §6.5 "Lowinverse"
**Existing KB entry:** allis-lowinverse
**Merged from:** P2 F-1

The thesis explicitly states: "It is not necessary for the lower squares of the Lowinverse to be playable." Non-obvious, implementation-relevant fact: a Lowinverse applies even when the lower squares are not the bottommost empty cells in their columns. The KB `known_limitations` captures the parallel statement about upper squares but not this one about lower squares. Omission could cause an implementer to assume both lower squares must be directly playable, producing false negatives.

---

### GAP-035 — White's odd-threat column excluded from rule-application scope

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allis 1988, §6 (p. 36) and §8.2 "Strategic Rules for White"
**Existing KB entry:** all nine allis-* entries
**Merged from:** P2 F-5

Allis specifies in §8.2 that "White can only apply the rules on squares which are not in the column of his odd threat." This operational constraint appears only partially (allis-claimeven's `known_limitations` references "§5.4") but is not encoded as a formal precondition in any entry. KB entries currently treat "controller of Zugzwang applies this rule" as a hard precondition without distinguishing the Black-applies and White-applies-with-odd-threat sub-cases.

---

### GAP-036 — Even-square-count rule (standalone)

**Type:** missing_entry
**Priority:** medium
**Source:** Allis 1988, §7.1 "Dependence of Zugzwang"
**Existing KB entry:** none
**Merged from:** P2 G-3

Section 7.1 states the combinability criterion as a standalone theorem: "two rules can be combined if the number of squares coming available after one rule is filled in, is even." This even-square-count criterion is the mechanistic justification for why certain combinations of Claimeven, Lowinverse and other rules preserve or destroy Zugzwang control. Distinct from the §7.4 matrix in GAP-014 (which lists outcomes); this is the underlying principle an implementation would use to verify a proposed combination programmatically. Currently only as prose in allis-claimeven and allis-lowinverse.

---

### GAP-037 — VICTOR evaluation algorithm (independent-set formulation)

**Type:** missing_entry
**Priority:** medium
**Source:** Allis 1988, §9.2 "VICTOR Evaluation Algorithm"
**Existing KB entry:** none
**Merged from:** P2 G-4

Section 9.2 defines the evaluation algorithm as a graph problem: solutions (rule instances) are nodes; two nodes are connected if they cannot be combined (per §7.4 matrix); problems (opponent's potential groups) are a second node set. The algorithm searches for an independent set in the solution graph whose neighborhood covers all problem nodes. Explicitly stated as a backtracking search guided by a "most-difficult-node first" heuristic. Algorithmic construction (not a strategic rule) but it is the canonical reference for how VICTOR determines whether a position is solved.

---

### GAP-038 — Black's universal drawing strategy on boards with ≤6 columns

**Type:** missing_entry
**Priority:** medium
**Source:** Allis 1988, §10.1 + Appendix B
**Existing KB entry:** none
**Merged from:** P2 G-5

Section 10.1 establishes: on any board with at most 6 columns and an even number of rows, Black can always guarantee at least a draw regardless of White's opening. Proof uses a specific template: eight Before instances (2-row-pair pattern covering all four cross-board column groups), a Baseinverse on the two innermost bottom squares, and Claimevens on the four outer columns' top row-pair. Board-height-independent and extensible to 7×(2n) boards after non-center opening moves. Named strategic theorem in the thesis with no KB entry.

---

### GAP-039 — Self-correcting Zugzwang precondition for Black

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allis 1988, §8.1 "Strategic Rules for Black"
**Existing KB entry:** all nine allis-* entries
**Merged from:** P2 G-8

Counter-intuitive corollary in §8.1: Black does not need to verify Zugzwang control before applying the strategic rules. If Black lacks Zugzwang control, the rules will simply fail to cover all White groups and return no result — no incorrect conclusion is drawn. The algorithm is self-correcting. Currently every Allis rule entry lists "controller of Zugzwang applies this rule" as a hard precondition, which is correct but incomplete: implementors who literally implement the precondition add an expensive pre-check that the thesis explicitly says is unnecessary. The `known_limitations` or `preconditions` of each Allis rule should note this property.

---

### GAP-040 — TSS gain-square combination procedure

**Type:** missing_entry
**Priority:** medium
**Source:** Allis 1993, §4 "Threat-space search"
**Existing KB entry:** none
**Merged from:** P2 H-3

When no single dependent-threat chain reaches a win, TSS uses a gain-square combination step: pairs of independent nodes whose gain squares lie on the same line and close enough to form a new threat are linked, and a fresh sub-tree is grown from the combined ancestor. This combination step is what allows TSS to find wins where no single chain is sufficient; the mechanism behind multi-threat zugzwang setups (community-z-threat, community-sextuple-threat). Condition: dependency trees must not conflict (GAP-016 definition 6). No KB entry.

---

### GAP-041 — TSS null-move heuristic for hidden threats

**Type:** missing_entry
**Priority:** medium
**Source:** Allis 1993, §6 "Victoria's architecture"
**Existing KB entry:** none
**Merged from:** P2 H-4

Null-move heuristic for reducing branching factor when the attacker has no immediate threat: a move is considered a "hidden threat" if, after a null move by the opponent, the attacker can find a winning TSS sequence. Only moves qualifying as hidden threats are expanded. Distinct from zugzwang or the nine Allis rules — a search-time filtering technique applicable to any Connect Four forced-win detector. Strategy reference does not cover it; no KB entry. An implementer building a forced-sequence solver would need this to avoid exponential blowup on positions where the attacker must make preparatory (non-immediately-threatening) moves.

---

### GAP-042 — Winning threat sequence vs. winning threat tree

**Type:** incomplete_coverage
**Priority:** medium
**Source:** Allis 1993, §3.1 "Definitions and threat sequences" and §4
**Existing KB entry:** community-z-threat, community-ghost-threat (indirectly related)
**Merged from:** P2 H-6

Allis introduces "winning threat sequence" and "winning threat tree" as distinct concepts: a sequence is a single variation independent of defensive moves; a tree is needed when the defender has multiple responses. The defender's "inessential fours" (threats that do not refute the attack) are explicitly excluded from the tree. Attacker/sequence vs. attacker/tree distinction is absent from the KB; community-z-threat addresses one consequence (parity-based zugzwang) but does not capture the general framework, or pruning rules for inessential defender threats. Particularly relevant to the forced_win puzzle category being implemented.

---

### GAP-043 — allen-j-configuration missing Allen 1990 source verbatim and FP/SP framing

**Type:** missing_field
**Priority:** low
**Source:** Allen 1990 (tromp_allen_expert_play.html) — Introduction, Game 2
**Existing KB entry:** allen-j-configuration
**Merged from:** P1-GAP-010

The entry's `statement` says the J Configuration is Red's pattern that "wins in zugzwang analysis" but does not include the broader first-player vs. second-player strategic asymmetry that Allen uses to frame the J: first player (Red) wants odd-row threats and the J is the canonical pattern; second player (Black) plays positional strategy ("Two Stones in the Second Row" — see GAP-019). Allen 1990 introduces this asymmetry before introducing the J. The KB entry records a verbatim_quote from the 2010 book but no second `source` entry for the 1990 document; no worked example from the 1990 source diagrams.

---

### GAP-044 — Opening theory: Allen Joseki + Wikipedia column-value table

**Type:** missing_entry
**Priority:** low
**Source:** Allen 1990 — "Joseki" section; wikipedia_connect_four.html — "Mathematical solution"
**Existing KB entry:** none
**Merged from:** P1-GAP-011

Allen 1990 contains a full 26-variation opening tree ("Joseki") with game-theoretic labels (X wins, O wins, drawn). Wikipedia gives the higher-level column-value table: first player wins from col 4, draws from cols 3 or 5, loses from cols 1, 2, 6, 7 (move-depth scores: loss on move 40 for col 1/7, move 42 for col 2/6). The opening-book layer of strategic knowledge — distinct artifact from abstract T/V rules and pattern entries, never referenced in the KB.

---

### GAP-045 — WeakC4 Steady-State Language

**Type:** missing_entry
**Priority:** low
**Source:** weakc4_explanation.html — Steady-State Language and Claimeven sections
**Existing KB entry:** none
**Merged from:** P1-GAP-012

The WeakC4 source defines a formal "Steady-State Language" for expressing Connect Four endgame "simple tricks": a priority-ordered annotation system with symbols `!`, `@`, `|`, `+`, `=`, `-` applied to board cells. Priority order: win move → block → `!` urgent → `@` miai (if exactly one) → claimodd/claimeven → `+` → `=` → `-`. Named, formal, published system distinct from Allis rules and Allen T/V rules — 2swap's contribution, explicitly linked from Tromp's resources. Neither the language, its symbols, nor its priority order appear in the KB; the weak vs. strong solution distinction is also new to the KB.

---

### GAP-046 — derived-parity-formula missing Red/Black strategic role prescriptions

**Type:** incomplete_coverage
**Priority:** low
**Source:** wikibooks_connect_four.html — "Theory-based strategy for 7x6 board"
**Existing KB entry:** derived-parity-formula
**Merged from:** P1-GAP-013

The entry covers the formula for row ownership (odd row = Red, even row = Yellow) but not Wikibooks' explicit named strategic prescriptions: Red plays offense (seeks odd-row attacks, prevents Black's even-row attacks and even threats below Red's odd threats); Black plays defense (blocks Red's odd-row attacks, then seeks an even-row attack); Black should be content to earn a draw because Red has the structural advantage. Source provides actionable named prescriptions ("Red's strategy is to play offense," "Black's strategy is primarily to defend") that the existing entry does not cover.

---

### GAP-047 — Double / triple / septuple check

**Type:** missing_entry
**Priority:** low
**Source:** Allen 2010, Ch. 1, p. 4 (double); Diagram 8 p. 6 (triple); Diagram 9 p. 7 (septuple, citing Tromp)
**Existing KB entry:** none
**Merged from:** P2 A-6, P2 B-4

Allen defines "double check" (p. 4) as "a pair of checks for the same player." Triple check and septuple check are extensions of the same definition. Double check is the minimal winning terminal configuration in expert play (every won game ends in at least double check; a single check can be blocked); distinction between double/triple/septuple is relevant to puzzle categorization (mate-in-1 problems require finding the move that creates double check). allen-t1 notes adjacent pairs lead to a double check but does not define the term.

---

### GAP-048 — "Value of opponent's reply" tactical principle

**Type:** missing_entry
**Priority:** low
**Source:** Allen 2010, Ch. 2, p. 9 "Tactical Ideas"
**Existing KB entry:** none (community-ghost-threat and community-parity-trap touch tangentially)
**Merged from:** P2 B-6

Allen introduces a tactical principle: when selecting a move, prefer a move whose best response by the opponent is in a remote or weak cell (e.g., playing C5 so Black responds at c6, which is useless). Several Ch. 2 problem hints ("Play where Red wants to play") are direct applications. Allen also: "even better than a move that gives up no strong cell for the opponent is one that forces the opponent to waste a move." Allen's informal statement of tempo/zugzwang at the micro-tactical level; not captured in any existing entry.

---

### GAP-049 — Ch. 4 framework scope limitations not consolidated

**Type:** incomplete_coverage
**Priority:** low
**Source:** Allen 2010, p. 93, "The rules in this chapter are not complete"
**Existing KB entry:** allen-t1 … allen-t7
**Merged from:** P2 C-6

Allen explicitly states the T1–T7 / V1–V5 framework does not cover: (a) complicated configurations of minor threats, (b) columns with three or more major threats, (c) tactical interactions between columns. These scope boundaries are scattered across individual `known_limitations` (allen-t4 notes "only major threats"; allen-t6 notes T1/T3 exceptions) but no single entry enumerates all three together. An implementer applying T1–T7 without reading all seven entries could miss one. A consolidated `allen-ch4-scope` entry — or adding all three limitations to every relevant T-rule — would close the gap.

---

### GAP-050 — T3 minor-threat variant lacks false_positive and operational boundary

**Type:** missing_field
**Priority:** low
**Source:** Allen 2010, Ch. 4, p. 97, "T3" — minor-threat parenthetical
**Existing KB entry:** allen-t3
**Merged from:** P2 C-7

Allen parenthetically states "(This important rule also applies to minor threats.)" for T3. The entry includes a `t3_pairs_minor` pseudocode block, but `false_positives` has no entry exercising the minor-threat variant (both are PENDING). More critically, `known_limitations` does not document what "minor threat" means operationally in the T3 context (whether a 2-in-a-row row-2+row-5 partial is sufficient, or the minor threat must be on the relevant empty cell), leaving the boundary between major and minor variants ambiguous.

---

### GAP-051 — Five fundamental column types after T-rule simplification

**Type:** missing_field
**Priority:** low
**Source:** Allen 2010, Ch. 4, pp. 100–102 "Victory Rules" preamble
**Existing KB entry:** allen-v1, allen-v2, allen-v3, allen-v4, allen-v5
**Merged from:** P2 D-7

Allen defines the five fundamental column types remaining after T1–T7 simplification (p. 100): (1) Red odd-row threat only, (2) Black odd-row threat only, (3) both players have odd-row threats, (4) Black even-row threat, (5) no threat. Allen: "you will have a simplified system with only five types of column." None of the V-rule KB entries reference this enumeration. The `preconditions` fields in V1–V5 each say "T1–T7 have been applied" without encoding the allowed column types post-simplification. A `definition`-type entry for "simplified column types" (or adding the enumeration as a `formal_predicate` block in V1) would make the T→V pipeline fully machine-checkable.

---

### GAP-052 — Threat type value hierarchy and diagonal-quality heuristics

**Type:** missing_entry
**Priority:** low
**Source:** Allen 2010, Ch. 3, pp. 101–104 "Relative Values of Threat Types"
**Existing KB entry:** none
**Merged from:** P2 E-8

Allen articulates a formal hierarchy for threat quality: for Red, odd-row horizontal > diagonal > even-row horizontal; for Black, all types roughly equal. Also: threats lower on the board are better (a major threat on row 2–3 undercuts anything above it in the column); central-column diagonals are stronger than edge-pointing diagonals (e.g., A1-B2-C3-D4 is much better than D1-C2-B3-A4). Heuristic/strategic guidelines (not transformation rules) with clear preconditions and false positives (a sixth-row horizontal can still win). No KB entry formalizes these as a `strategic_rule` or `heuristic`, making them unavailable to puzzle-category or difficulty-scoring implementations.

---

### GAP-053 — Highinverse: Baseinverse-like side-effect mechanism

**Type:** incomplete_coverage
**Priority:** low
**Source:** Allis 1988, §6.6 "Highinverse"
**Existing KB entry:** allis-highinverse
**Merged from:** P2 F-2

Allis describes an additional Baseinverse-like side effect of Highinverse: after one column's lower square is played (e.g., White plays col-A lower), Black responds col-A middle, then "col-A upper" and "col-B lower" become simultaneously relevant — "Black gets one of c4 and d2, because d2 is directly playable." This yields cross-column Baseinverse pairs between the lower square of one column and the upper-even square of the other. The KB's `formal_predicate` and `statement` reproduce the formal definition (solutions 4a/4b), but the explanatory mechanism — that this conditional solution arises because the lower square of the other column becomes directly playable — is absent.

---

### GAP-054 — Aftereven: groups requiring squares in only ONE Aftereven column are NOT refuted

**Type:** incomplete_coverage
**Priority:** low
**Source:** Allis 1988, §6.4 "Aftereven" (diagram 6.5)
**Existing KB entry:** allis-aftereven
**Merged from:** P2 F-6

Thesis illustrates the multi-column Aftereven case and explicitly states groups are only refuted if they have squares in ALL Aftereven columns above the empty squares. The KB `formal_predicate` correctly encodes this ("all Aftereven columns"), but neither `statement` nor `known_limitations` flags the important inverse: a group that requires squares above the Aftereven level in only ONE of several Aftereven columns is NOT refuted. The thesis calls this out explicitly ("c3-f3, for instance, is not solved by this Aftereven"). Common implementer mistake; belongs in `known_limitations`.

---

### GAP-055 — Indifferent men (position equivalence lemma)

**Type:** missing_entry
**Priority:** low
**Source:** Allis 1988, §12.5
**Existing KB entry:** none
**Merged from:** P2 G-6

Section 12.5 defines "indifferent men" as pieces that can no longer become part of any winning group. Two positions with the same set of indifferent men and identical non-indifferent squares have the same game-theoretical value. Enables significant search-table compression: positions can be normalised by replacing indifferent men with a neutral token, increasing cache hit rates. Combinatorial lemma about position equivalence, not a strategic rule, but a formally stated theorem with explicit proof. Relevant to any implementation building a position hash or transposition table.

---

### GAP-056 — Conspiracy-number search and three-level search architecture

**Type:** missing_entry
**Priority:** low
**Source:** Allis 1988, §11.2–§11.6
**Existing KB entry:** none
**Merged from:** P2 G-7

Sections 11.2–11.6 introduce conspiracy-number search as an automated method for resolving positions that the knowledge-based evaluator cannot classify. Each node carries two conspiracy numbers; expansion priority follows the minimum. §11.5 introduces the oracle-guided variant. §11.6 names the complete three-level search: (1) knowledge-based, (2) conspiracy-number search, (3) depth-first search guided by conspiracy numbers. Algorithmic constructions beyond the nine rules, forming the complete VICTOR search architecture.

---

### GAP-057 — allis-before missing the 6×6 empty-board worked example

**Type:** incomplete_coverage
**Priority:** low
**Source:** Allis 1988, §10.1 "VICTOR finding rules for the 6×6 empty board"
**Existing KB entry:** allis-before
**Merged from:** P2 G-9

§10.1 shows a concrete example of VICTOR's output for an empty 6×6 board: six Before instances, one Baseinverse, four Claimevens. The allis-before entry notes that Before was "the most impactful rule addition" and enabled drawing strategies on boards with ≤6 columns, but `worked_examples` does not include any empty-board or opening-position example showing Before in a complete rule combination. All existing worked examples are mid-game tactical positions. The empty-6×6-board example would demonstrate Before's role as the load-bearing rule in the full coverage proof.

---

### GAP-058 — Proof-number search

**Type:** missing_entry
**Priority:** low
**Source:** Allis 1993, §5 "Results" and §6 "Victoria's architecture"
**Existing KB entry:** none
**Merged from:** P2 H-5

Proof-number search as the fallback when TSS fails to find a winning line (which happens in some positions due to TSS's incomplete nature). TSS + proof-number search is what allowed Allis to solve Go-Moku completely; by analogy it is the architecture used in strong Connect Four solvers. Proof-number search assigns to each node a proof number (minimum subtrees needed to prove win) and disproof number (minimum subtrees needed to prove loss/draw), selecting for expansion the node with smallest proof number. An implementer building a complete Connect Four solver (not just a heuristic) needs this.

---
