# Connect Four Strategy Audit Plan

---

## Connect Four Strategy Audit Report

# Connect Four Strategy and Combinatorial Analysis: A Rigorous Source Validation Audit

## Executive Summary and Historical Context

The game of Connect Four, traditionally played on a vertical grid comprising seven columns and six rows, represents a mathematically solved combinatorial game of perfect information. Since its independent solution by Victor Allis and James D. Allen in October 1988, the theoretical understanding of the game's state space has bifurcated into two distinct analytical paradigms. The first paradigm is the canonical, game-theoretic "strong solution," which computationally evaluates every legal position in the state space to determine optimal play, drawing heavily on John Tromp's extensive database architecture and massive computational benchmark verifications. The second paradigm is the heuristic or "weak solution" approach, which seeks to compress the game's state space into human-readable strategic rules, relying on parity theory, topological invariants, and threat-space patterns to guarantee a first-player win without necessitating absolute computational omniscience.

The document currently under review, designated as a "strategy reference for Connect Four," attempts to synthesize these two disparate paradigms. It merges classical combinatorial proofs, such as Victor Allis's nine knowledge-based rules and James D. Allen's opening theory, with heavily abstracted, project-specific terminology designed to facilitate modern heuristic learning. Specifically, the document frequently utilizes nomenclature and steady-state conceptual models derived from the contemporary "WeakC4" project, an algorithmic endeavor aimed at creating a low-compute, search-free solution graph. The purpose of this exhaustive expert-level audit is to rigorously dissect every major concept, formula, and tactical claim within the reference document. The analysis validates these claims against canonical literature, modern solver databases, and verified theoretical frameworks, clearly delineating established mathematical theorems from overgeneralized heuristics and nonstandard, project-local terminology.

## Section 1 Audit: Board Fundamentals

The foundational parameters of a combinatorial game establish the physical and mathematical constraints of the state space. Section 1 of the reference document outlines the core dimensions, the unique gravity mechanics of the grid, and the perfect-play outcomes of the standard game.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 1. Board Fundamentals | Exactly 4,531,985,219,092 (~4.53 trillion) reachable positions exist. | Correct | The claim is mathematically precise. |  |
| 1. Board Fundamentals | Black wins if Red opens in column B or F (Black forces a win on or before move 42). Black wins if Red opens in A or G (move 40). | Correct | The exact ply-depth outcomes for edge and knight-file openings correctly reflect canonical 8-ply strong-solver datasets. |  |

The quantification of the Connect Four state space is a fundamental prerequisite for any rigorous combinatorial analysis. The figure of 4,531,985,219,092 reachable positions on a standard 7x6 board is entirely accurate. This precise integer was computationally verified by John Tromp and was previously established by researchers Stefan Edelkamp and Peter Kissmann through advanced symbolic classification and state-space compression techniques involving minimal perfect hashing. The document's inclusion of this metric demonstrates a correct grounding in established computational limits.

Furthermore, the document accurately reflects the counterintuitive nature of Connect Four opening theory. Novice players frequently assume that a perfect-play first player can force a draw regardless of the opening column. However, exhaustive strong solutions and 8-ply datasets prove that playing in the outermost columns concedes a mathematically forced win to the second player. According to canonical strong-solver analysis, a first-player opening in the center (Column D) yields a forced win on or before move 41. Openings in the adjacent columns (Columns C and E) yield a theoretical draw under perfect play. Conversely, playing in the far outer columns (Columns A and G, or 1 and 7) yields a forced loss for the first player on the 40th move, while the "knight-file" columns (Columns B and F, or 2 and 6) yield a forced loss on the 42nd move. The document captures these exact move-depth dynamics perfectly, indicating a strong reliance on John Tromp's foundational dataset architecture.

## Section 2 Audit: Parity Theory and Threat Interactions

Parity theory forms the central heuristic engine of Connect Four, dictating how the alternating turn structure interacts with the "gravity" mechanic of dropping discs. Because discs stack vertically, the sequence of play mathematically binds specific players to specific rows.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 2. Parity Theory | row_owner(c, move_number) = (move_number mod 2 == 1)? Red : Black | Correct | The mathematical formulation of row ownership is entirely accurate based on fundamental parity theory. |  |
| 2. Parity Theory | Endgame Parity Outcome Table (e.g., 1 Red, 1 Black: Draw; 0 Red, 2 Black: Black wins) | Overgeneralization | Outcomes based on net parity of unshared odd-row threats should be labeled as a baseline heuristic, subject to topological exceptions. |  |
| 2. Parity Theory | Threat Interaction Rules (T1–T7) and Victory Rules (V1–V5) | Project-Local Terminology | These rules must be explicitly identified as localized logic predicates developed for a weak-solver evaluation function, rather than universal mathematical theorems. |  |

The mathematical representation of row ownership presented in the document is entirely accurate. Because gravity dictates that a column fills sequentially from row 1 up to row 6, the player who plays first (typically denoted as Red or White) will mathematically be forced to take odd-numbered rows (1, 3, 5) if both players continuously play in the same column. Consequently, the second player (Black or Yellow) inevitably occupies the even-numbered rows (2, 4, 6). The modulo 2 algorithmic predicate successfully models this invariant property. This aligns perfectly with Victor Allis's definition of odd and even threats, which serves as the core mathematical invariant of Connect Four zugzwang control. Red fundamentally "owns" the odd rows, making any threat situated on an odd row a highly valuable asset, as the opponent can be mathematically forced to play directly beneath it, granting Red the winning square.

However, the document's presentation of the "Endgame Parity Outcome Table" introduces significant epistemological issues. The table presents a generalized, deterministic look-up matrix implying that endgame outcomes can be perfectly calculated merely by counting the net parity of unshared odd-row threats. This represents a severe overgeneralization. Threat resolution in Connect Four is highly topological. As noted in canonical analysis, an odd threat held by Red can indeed be neutralized by an opponent's odd threat in a way that forces a draw, but topological placement, the sequential order of available dead spaces, and column sharing dynamics can easily break this linear cancellation. For instance, if Red's odd threat sits in a column where Black holds a higher, latent even-row threat, the entire parity calculation shifts, rendering the simple net-counting table obsolete. The table functions adequately as a heuristic baseline for human players but fails as a mathematical proof.

Similarly, the inclusion of the "Threat Interaction Rules" (labeled T1 through T7) and "Victory Rules" (V1 through V5) represents a conflation of project-specific nomenclature with established theory. These alphanumeric designations do not exist in the canonical works of Allis or Allen. While they act as functional logical predicates—likely extracted from the source code of a lightweight engine or a modern weak-solver methodology—they are not established mathematical axioms. Furthermore, rule T7, which dictates that if Red and Black each hold one odd-row threat in different columns they cancel out to a draw, is demonstrably flawed in highly constrained boards. In actual play, one odd threat may be safely playable due to the exhaustion of other columns, while the opponent's odd threat remains unplayable due to immediate undercut risks. These predicates are internally consistent within a narrow search parameter but risk misleading readers into thinking they are infallible combinatorial laws.

## Section 3 Audit: Zugzwang Dynamics

Zugzwang is a foundational concept in combinatorial game theory, defining a state where a player is disadvantaged strictly by the obligation to make a move. In games without a "pass" option, maintaining control of Zugzwang is paramount. Victor Allis identified the manipulation of Zugzwang as the primary mechanism for solving the game of Connect Four.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 3. Zugzwang | "Connect Four zugzwang is permanent." | Overgeneralization | Zugzwang is heavily constrained but not permanent; it mathematically inverts if play enters a region that alters available space parity by an odd integer. |  |
| 3. Zugzwang | Dead-Space Parity Formula: (n+Sdead​)(mod2) | Nonstandard but Acceptable Heuristic | The formula mathematically works, but the term "Dead-Space" is a modern heuristic substitute for Allis's neutral square analysis. |  |

The reference document makes the bold claim that Connect Four zugzwang is "permanent." While Zugzwang is indeed highly "sticky" and persistent in Connect Four compared to the fluid positional shifts of Chess or Go, claiming it is permanently fixed ignores the specific mechanics of parity toggling detailed in early solver literature. Victor Allis's thesis meticulously details how certain rule implementations, specifically those where an odd number of extra squares become available during the resolution of a sequence, will mathematically shift the Zugzwang. If a player makes a forcing move that opens a previously forbidden topological segment containing an odd number of spaces, the mathematical burden of Zugzwang flips from one player to the other. Therefore, the assertion of permanence is a pedagogical simplification that fails under rigorous state-space analysis.

The document proceeds to introduce a "Dead-Space Parity Formula" to calculate turn priority. The term "Dead Space" is not standard in Allis's or Allen's literature, which typically refers to "useless threats" or "neutral zones". Nevertheless, the underlying mathematical logic of the formula is entirely sound. Connect Four operates within a finite, perfectly countable state space where every move strictly alternates. The turn indicator is mathematically a function of the number of pieces already played (n) plus the number of neutral plies remaining (Sdead​) before a critical threat cell must be engaged. Calculating this sum modulo 2 correctly and flawlessly determines whose turn it will be when the board is exhausted of neutral plays. This is a highly effective, nonstandard heuristic that is acceptable for advanced play, provided the reader understands that "dead space" is a contemporary abstraction.

## Section 4 Audit: Claimeven and Claimodd Paradigms

The control of vertical parity is encapsulated in the canonical "Claimeven" rule. The document attempts to expand this mathematical invariant into a broader language of claims, mixing canonical theory with modern algorithmic graph definitions.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 4. Claimeven | Black wins if Red has no unrefuted odd-row threat by matching Red's moves: whenever Red plays in a column, Black plays directly above them in the same column. | Correct | This is a flawless distillation of Victor Allis's canonical Claimeven theorem. |  |
| 4. Claimeven | Red's Variant: Claimodd. Red's equivalent response to an all-even board is to play "claimeven everywhere except claimodd in the center column (D)." | Misleading Terminology / Incorrect Attribution | "Claimodd" is a WeakC4 project-specific term for a steady-state node, not a canonical theorem equivalent to Allis's rules. |  |

The document's definition of "Claimeven" is impeccable. It perfectly reflects Victor Allis's foundational proof. By securing two vertically adjacent empty squares where the upper square is an even row, a player mathematically guarantees control of that specific vertical zone. Because the lower square of a Claimeven is odd-numbered, the total number of squares forbidden in that column is even. As a result, this strategic rule does not interfere with or influence the Zugzwang situation on the remainder of the board, allowing Black to maintain perfect parity control by simply matching Red's moves column-for-column.

However, the document's introduction of "Claimodd" as an equivalent "Variant" for Red is highly problematic from a theoretical standpoint. The document positions "Claimodd" alongside "Claimeven" as if it were a universally recognized, canonical rule established by early theorists. This is incorrect. "Claimodd" is a purely project-specific piece of terminology invented by the modern "WeakC4" project. The WeakC4 project is an endeavor to distill Connect Four into a highly compressed, search-free game graph using a "Steady-State Language" that balances upfront memorization with algorithmic execution. Within the WeakC4 documentation, steady-state indicators such as "Urgent (!)", "Miai (@)", and "Claimodd (|)" are used to annotate static cheat-sheet diagrams.

While "Claimodd" is internally consistent within the WeakC4 framework—functioning as a directive that allows Red to force a win by securing an odd-row threat in the center column—it does not exist in Allis's 1988 thesis, nor does it exist in James D. Allen's comprehensive writings. Furthermore, Allis's canonical rules operate primarily on empty spatial pairs and topological subsets, whereas "Claimodd" in the WeakC4 paradigm functions as an active, hard-coded directive on a specific cell array. Presenting it as a canonical sibling to Claimeven severely risks misleading readers into confusing modern heuristic scripting with established combinatorial proofs.

## Section 5 Audit: Threat Taxonomy

The classification of threats is essential for evaluating game states. The document categorizes threats along five orthogonal axes: Structural, Playability, Topological, Zugzwang, and Undercut.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 5. Threat Taxonomy | Classification of threats into "Z-Threat, 0-Threat, or #-Threat." | Nonstandard Terminology | The taxonomy relies on contemporary heuristic shorthand. Canonical literature categorizes threats as Major, Minor, Odd, Even, and Mixed. |  |

The standard nomenclature for Connect Four threat analysis was largely established by James D. Allen in his foundational text, *Expert Play in Connect-Four* (1990). Allen categorizes threats rigorously as Major, Minor, Odd, Even, and Mixed. A "Minor Threat" is defined as one of two empty cells in a half-completed Four-in-a-Row, while an "Odd Threat" is a major or minor threat resting on an odd parity row.

The reference document completely abandons this canonical taxonomy in favor of "Z-Threat" (Zugzwang threat), "0-Threat", and "#-Threat". This syntax appears to be derived from modern algorithmic shorthand used in weak-solver engines. While the concept of a "#-Threat" accurately describes what Allen terms a "Double Threat" (where two options exist to create a line of four and the opponent can only block one) , the use of the octothorpe symbol is entirely nonstandard. Similarly, defining a threat by the integer parity of empty cells beneath it (Z-Threat vs 0-Threat) is a logical evolution of Allis's parity laws but lacks any basis in formal published literature. The document's taxonomy is analytically useful and internally consistent, but it must be explicitly identified as a synthetic, modern classification system rather than traditional combinatorial nomenclature.

## Section 6 Audit: Undercutting and Overcutting Mechanisms

The concepts of undercutting and overcutting govern the vertical relationships of threats residing within the same geometric column. Because Connect Four operates strictly on gravity, spatial superiority is heavily dictated by the Y-axis.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 6. Undercutting and Overcutting | Formal Undercutting Predicate: Row(Thigh​)>Row(Tlow​) within the same column cancels the upper threat. | Correct | The logical predicate perfectly describes the mechanical reality of gravity-based threat neutralization. |  |

The logical predicate presented for Undercutting is mathematically flawless. Because the game board forces discs to stack from the bottom up, any threat positioned at a higher row index than an opponent's threat in the identical column is completely neutralized in a sequential forced-play scenario. The mechanism is unavoidable: the opponent will simply connect their four-in-a-row on the lower cell, terminating the game state before the higher cell can ever become legally playable. The document's formalization of this concept into a strict boolean predicate (Column(Thigh​)=Column(Tlow​)∧Row(Thigh​)>Row(Tlow​)∧Color(Thigh​)=Color(Tlow​)) is an excellent example of translating physical game rules into computable topological laws.

## Section 7 Audit: Tactical Patterns

Recognizing fixed geometric shapes that mathematically guarantee multiple unblockable threats is a cornerstone of heuristic play. The document cites two specific geometric patterns.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 7. Tactical Patterns | J Configuration (J-Shape): A cluster of four discs generating a triple minor threat (canonical cells: D1, D3, E2, E3). | Correct / Canonical | The J-Shape is a well-documented canonical tactical motif from James D. Allen's literature. |  |
| 7. Tactical Patterns | Figure-7: Five discs forming the shape of a "7", generating two threats on adjacent rows in the same column. | Nonstandard Terminology | Geometrically sound, but the specific name "Figure-7" is an unverified heuristic descriptor lacking academic precedent. | [Unverified Claim] |

The "J Configuration" or "J-Shape" is a canonical tactical motif deeply explored in James D. Allen's *Expert Play in Connect-Four*. It describes a highly specific, asymmetrical arrangement of stones that yields a robust triple threat. By occupying the canonical cells (D1, D3, E2, E3), a player establishes a structural foundation that usually aims for a horizontal completion on row 3, paired with diverging diagonal completions on adjacent columns. The document accurately maps these spatial coordinates and correctly identifies the primary failure conditions for the pattern, namely overcutting by an opponent or running out of board space on the grid's edge.

Conversely, the "Figure-7" configuration is nonstandard terminology. While forming a geometric "7" (three diagonal discs and three horizontal discs sharing a hinge) is indeed a highly effective way to create two threats on vertically adjacent rows in the same column—resulting in an unavoidable terminal pair—the specific name "Figure-7" does not exist in canonical game theory literature. It is an arbitrary, visual heuristic. In strict combinatorial terms, it merely represents the simultaneous construction of a horizontal and a diagonal ray that converge on the same column at row index r and r+1. While the mathematical outcome of the shape is accurate, presenting the colloquial name as formal theory is misleading.

## Section 8 Audit: Threat-Space Search and Algorithmic Adaptations

The document applies specific algorithmic search definitions to describe the calculation of tactical combinations.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 8. Threat-Space Search | VCF (Victory by Continuous Fours) and VCT (Victory by Continuous Threats) subset definitions. | Nonstandard but Acceptable Heuristic | VCF and VCT are terminological transplants from the game of Gomoku, valid but historically alien to Connect Four literature. |  |

The terms VCF (Victory by Continuous Fours) and VCT (Victory by Continuous Threats) are standard, foundational algorithmic concepts in the m,n,k-games of Gomoku and Renju. They are not native to early Connect Four literature, which traditionally favored Shannon C-type strategies or Conspiracy Number searches, as famously implemented in Victor Allis's VICTOR program. However, because Connect Four is essentially a gravity-constrained variant of a 4-in-a-row alignment game, applying VCF and VCT terminology to describe Threat-Space Search (TSS) is mathematically valid and has become increasingly common in modern engine development. The subset relation presented in the document (VCF⊂VCT⊂TSS) is mathematically precise. A VCF requires every attacking node to be a checking move, a VCT broadens this to include latent major threats, and TSS encompasses the entire tree of threat-generating nodes. The document correctly applies this logic, though it should explicitly acknowledge its origin in Gomoku theory.

## Section 9 Audit: Canonical Opening Theory

Because the center columns provide the maximum number of intersecting horizontal and diagonal planes, securing early central dominance is critical. Opening theory operates on exact ply-depth calculations to secure tempo.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 9. Opening Theory | The 5-4 Opening and the 3-4 Opening force perfect-play wins. | Correct / Canonical | These are the most thoroughly documented, mathematically proven human-playable openings in Connect Four theory. |  |

The terminology surrounding the "5-4 Opening" and the "3-4 Opening" is completely accurate and represents the most canonical aspect of human-executable Connect Four strategy. Coined by James D. Allen, these sequences are referred to as "Joseki" (expert, forced openings). The 5-4 Opening refers to an aggressive, pre-calculated vertical stacking maneuver in the center column (D) and the adjacent column (E). Allen mathematically proved that this specific opening requires uniquely forced responses from the second player; any deviation by either player instantly hands the winning mathematical advantage to the opponent. The 3-4 Opening is an equally canonical, deeply researched variation designed to introduce earlier diagonal threats by delaying the commitment to the fifth row. The document's inclusion of these concepts ensures a strong tether to verified historical analysis.

## Section 10 Audit: Victor Allis's Nine Strategic Rules

The final section of the reference document summarizes the engine logic developed by Victor Allis in his 1988 master's thesis, which successfully solved the game using a pure knowledge-based approach before brute-force computation was viable.

| Section Reference | Exact Claim or Concept | Classification | Corrected or Clarified Version | Supporting Sources |
| --- | --- | --- | --- | --- |
| 10. Allis's Nine Rules | Listing the 9 rules and dividing them into "Claimeven Family" and "Parity Control Family". | Correct | The structural grouping is logically sound and accurately reflects the VICTOR program's subroutines. |  |
| 10. Allis's Nine Rules | Lowinverse and Highinverse mathematical definitions. | Ambiguous / Lacking Detail | The document glosses over the profound parity inversion mathematics required to understand these rules. |  |

The document accurately lists all nine rules embedded into the original VICTOR program: Claimeven, Baseinverse, Vertical, Aftereven, Lowinverse, Highinverse, Baseclaim, Before, and Specialbefore. The categorization of these rules into a "Claimeven Family" (rules dependent on bounding empty topological squares) and a "Parity Control Family" is a useful and theoretically sound structural grouping that aids human comprehension.

However, the document's brief summary introduces significant ambiguity by failing to explain the actual mechanism of the *Lowinverse* and *Highinverse* rules. To ensure a nuanced understanding, it is critical to elaborate on the mathematical elegance of these rules. The Lowinverse rule operates on the absolute mathematical principle that the sum of two odd numbers is always even. Normally, the controller of the Zugzwang will be forced to play the lowest even square of a column containing an odd number of empty squares. If, however, two columns exist with an odd number of empty squares, the total empty squares across both columns is an even number. This topological reality uniquely forces the opponent to initiate play in one of the columns, thereby surrendering the critical upper odd square to the player controlling the Zugzwang. The Highinverse rule expands this exact parity logic vertically to include the two even squares situated directly above the odd squares. While the document's listing is not factually incorrect, its failure to explain the parity inversion mechanism renders the rules incomprehensible to a reader attempting to understand the underlying combinatorics.

## Synthesis: Canonical vs. Project-Specific Concepts

To prevent the epistemological conflation of proven combinatorial mathematics with modern heuristic shorthands, the following rigid delineation is established based on the findings of this audit. The reference document aggressively mixes these two categories.

| Concept Category | Specific Terms and Rules | Origin and Status |
| --- | --- | --- |
| Canonical Theory | Strong/Weak Solutions, 4.53 Trillion State Space, Row Ownership (Odd/Even), Zugzwang, Undercutting | Established mathematics (Allis, Allen, Tromp). Universally verified and computationally backed. |
| Canonical Rules | Claimeven, Baseinverse, Vertical, Aftereven, Lowinverse, Highinverse, Baseclaim, Before, Specialbefore | Proven theorems embedded in the VICTOR engine (Allis, 1988). |
| Canonical Openings/Tactics | 5-4 Opening, 3-4 Opening, J-Shape | Documented extensively in Expert Play in Connect-Four (Allen, 1990). |
| Project-Specific Terminology | Claimodd, Steady-State Indicators (!, @, +, =), T1-T7 Threat Rules, V1-V5 Victory Rules | Derived from modern algorithmic frameworks (e.g., WeakC4). Internally consistent but not universally established. |
| Unverified / Custom Notation | Z-Threat, 0-Threat, #-Threat, Figure-7 shape | Synthetic visual descriptors and boolean tags absent from canonical literature. |
| Algorithmic Adaptations | VCF (Victory by Continuous Fours), VCT | Transplanted from Gomoku search-space methodologies. |

## Confidence Assessment and Unverified Claims

**Overall Confidence Assessment: High.** The analytical conclusions drawn in this report are backed by rigorously cross-referencing three distinct eras of Connect Four mathematical analysis: Victor Allis's foundational knowledge-based topological proofs (1988), James D. Allen's combinatorial expert-play analyses (1990), and John Tromp's exhaustive brute-force strong solutions and 8-ply dataset generation (1995-2015).

The mathematical and theoretical backbone of the provided reference document is sound. It accurately utilizes the logic of row ownership, parity shifting, and undercut matrices to evaluate complex game trees. Its inclusion of Allen's 5-4 and 3-4 openings successfully bridges the gap between raw algorithmic computation and human-playable strategies.

However, explicitly identifying unverified claims is a critical mandate of this audit. The document's usage of the term "Figure-7" to describe a multi-threat tactical motif cannot be externally verified in any academic or verified strategy database. Furthermore, the explicit mapping of "Claimodd" as a direct, canonical counter-theorem to "Claimeven" is a verifiable misattribution, as the term originates entirely from the contemporary WeakC4 project's steady-state language. The deterministic "Endgame Parity Outcome Table" is explicitly unverified as an infallible rule, as it fails to account for severe topological edge cases where linear parity cancellation breaks down under forced Zugzwang toggles.

## Final Summary of Categorized Issues

| Issue Classification | Count | Associated Concepts in Document |
| --- | --- | --- |
| Correct / Canonical | 6 | State Space Limit, Row Ownership Parity, Claimeven theorem, Undercutting logic, J Configuration, 5-4 / 3-4 Openings. |
| Factual Error | 0 | No strict mathematical falsehoods were identified in the document's core algorithmic formulas. |
| Overgeneralization | 3 | Permanency of Zugzwang, Endgame Parity Outcome Table determinism, T1-T7 Threat Interaction Rules. |
| Misleading Terminology | 1 | Presentation of "Claimodd" as an equivalent, canonical rule to Allis's theorems. |
| Ambiguous / Lacking Detail | 1 | The mechanical explanation of the Lowinverse and Highinverse parity inversions. |
| Nonstandard but Acceptable | 2 | Dead-Space Parity Formula, VCF/VCT algorithmic adaptations. |
| Unverified / Custom Notation | 3 | Z-Threat, 0-Threat, #-Threat definitions, Figure-7 geometric descriptor. |

By meticulously separating the foundational mathematics from modern heuristic abstractions, this audit validates the document as a highly effective operational manual, provided the localized terminology is understood not as academic canon, but as a modern, project-specific pedagogical overlay designed to compress the vast combinatorial state space into manageable human logic.

### Sources

- [en.wikipedia.org](https://en.wikipedia.org/wiki/Connect_Four) — Connect Four - Wikipedia
- [tromp.github.io](https://tromp.github.io/c4/c4.html) — John's Connect Four Playground - John Tromp
- [oeis.org](https://oeis.org/A212693) — A212693 - OEIS
- [blogs.cornell.edu](https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/) — Solving Connect Four with Game Theory - Cornell blogs
- [ztoz.blog](https://ztoz.blog/posts/connect4-ply-dataset/) — Connect Four Ply Dataset | ℤ→ℤ
- [archive.ics.uci.edu](https://archive.ics.uci.edu/ml/datasets/connect-4) — Connect-4 - UCI Machine Learning Repository
- [2swap.github.io](https://2swap.github.io/WeakC4/explanation/) — WeakC4, or Distilling an Emergent Object - GitHub Pages
- [asingleneuron.wordpress.com](https://asingleneuron.wordpress.com/2012/08/04/connect-four/) — Connect Four - A Single Neuron - WordPress.com
- [web.mit.edu](https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf) — Connect Four - MIT
- [scribd.com](https://www.scribd.com/document/549351485/Connect-4-research-paper) — Connect 4 Research Paper | PDF | Matrix (Mathematics) | Linear Algebra - Scribd
- [tromp.github.io](https://tromp.github.io/c4/connect4_thesis.pdf) — A Knowledge-based Approach of Connect-Four - John Tromp
- [web.mit.edu](https://web.mit.edu/sp.268/www/connectfour.pdf) — Intro to A.I. Topics - MIT
- [tromp.github.io](https://tromp.github.io/c4.html) — Expert Play in Connect-Four - John Tromp
- [papergames.io](https://papergames.io/docs/game-guides/connect4/advanced-guide/) — Connect 4 Advanced Guide | papergames.io
- [wernermaes.files.wordpress.com](https://wernermaes.files.wordpress.com/2009/10/connect4.pdf) — A Knowledge-based Approach of Connect-Four
- [myemail.constantcontact.com](https://myemail.constantcontact.com/subject.html?soid=1101182625238&aid=V6yW91V5oXE) — The latest news for you - Constant Contact
- [github.com](https://github.com/dsanmart/connect4) — GitHub - dsanmart/connect4: Knowledge-based backtracking algorithm to win the game of connect 4. This work is based on the master thesis "A Knowledge-based Approach of Connect-Four" from Victor Allis back in 1988.
- [platform.claude.com](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — Skill authoring best practices - Claude API Docs
- [anthropic.com](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — Equipping agents for the real world with Agent Skills - Anthropic
- [app.daily.dev](https://app.daily.dev/posts/weakc4-v4wffz9rn) — WeakC4 | daily.dev
- [11011110.github.io](https://11011110.github.io/blog/2025/09/15/linkage.html) — Linkage - 11011110
- [mathstodon.xyz](https://mathstodon.xyz/@robinhouston/115130490419839034) — robinhouston: "Here's the written version, if…" - Mathstodon.xyz
- [feed.podbean.com](https://feed.podbean.com/automated-daily/feed.xml) — The Automated Daily - Podbean
- [hn.algolia.com](https://hn.algolia.com/?query=Optimal%20Strategy%20for%20Connect%204&type=story&dateRange=all&sort=byDate&storyText=false&prefix&page=0) — All | Search powered by Algolia
- [feeds.transistor.fm](https://feeds.transistor.fm/hacker-news-highlights) — Hacker News Highlights - Transistor
- [ocw.mit.edu](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202_MITES_268S10_ses5_slides.pdf) — Connect Four - MIT OpenCourseWare
- [arxiv.org](https://arxiv.org/html/2410.05551v2) — Misère Connect Four is Solved - arXiv
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/) — How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It
- [elakaioutdoor.com](https://elakaioutdoor.com/blogs/lifestyle/the-history-of-connect-4-from-its-inception-to-becoming-a-classic) — The History of Connect 4: From Its Inception to Becoming a Classic - Elakai Outdoor
- [en.wikipedia.org](https://en.wikipedia.org/wiki/Tic-tac-toe) — Tic-tac-toe - Wikipedia
- [reddit.com](https://www.reddit.com/r/dataisbeautiful/comments/8sybmo/i_played_tictactoe_with_200_people_data_of_their/) — I Played Tic-Tac-Toe with 200 people, data of their first move [OC] : r/dataisbeautiful - Reddit
- [blog.gamesolver.org](http://blog.gamesolver.org/solving-connect-four/01-introduction/) — Part 1 – Introduction - Solving Connect 4: how to build a perfect AI
- [arxiv.org](https://arxiv.org/html/2410.05551v1) — Misère Connect Four is Solved - arXiv
- [drops.dagstuhl.de](https://drops.dagstuhl.de/storage/00lipics/lipics-vol291-fun2024/LIPIcs.FUN.2024.2/LIPIcs.FUN.2024.2.pdf) — Poset Positional Games - DROPS
- [stackoverflow.com](https://stackoverflow.com/questions/20773606/minimax-algorithm-for-connect-4) — Minimax algorithm for connect 4 - artificial intelligence - Stack Overflow
- [saveitforparts.com](https://saveitforparts.com/wp-content/uploads/2009/11/connectk_agents.pdf) — Analysis of Computational Agents for Connect-k Games. - Saveitforparts
- [cardgamedatabase.fandom.com](https://cardgamedatabase.fandom.com/wiki/Connect_Four) — Connect Four | Card Game Database Wiki | Fandom
- [gergely.imreh.net](https://gergely.imreh.net/blog/2019/02/how-not-to-start-with-machine-learning/) — How not to start with machine learning - ClickedyClick - Gergely Imreh
- [microsoft.com](https://www.microsoft.com/en-us/wdsi/threats/malware-encyclopedia-description?Name=Behavior:Win32/DefendNot.Z&ThreatID=2147952475) — Behavior:Win32/DefendNot.Z threat description - Microsoft Security Intelligence
- [deezer.com](https://www.deezer.com/en/track/2950439) — JAŸ-Z - Threat - Deezer
- [music.youtube.com](https://music.youtube.com/search?q=+JAY%2DZ+Threat) — YouTube Music
- [music.youtube.com](https://music.youtube.com/search?q=JAY%2DZ+THREATS) — YouTube Music
- [stackoverflow.com](https://stackoverflow.com/questions/10985000/how-should-i-design-a-good-evaluation-function-for-connect-4) — How should I design a good evaluation function for Connect 4? - Stack Overflow
- [youtube.com](https://www.youtube.com/watch?v=ncqBsdo54sQ) — Threat Pairs - Connect 4 Strategy - YouTube
- [fr.scribd.com](https://fr.scribd.com/document/399715690/SIMATIC-S7-300-FM-350-2-Counter-Module-Terminal-Assignment-of-the-Front-Connector) — FM 350-2 Counter Module Connector Guide | PDF | Computer Hardware - Scribd
- [ebay.com](https://www.ebay.com/itm/136813807938) — 84" Bi-Fold Sliding Barn Door Hardware Kit for 4 Doors - Quiet Black Track | eBay
- [ebay.com](https://www.ebay.com/itm/325744314438) — Top Mount Roller Bifold Sliding Barn Door Hardware Kit Black Flat Track Modern | eBay
- [figshare.swinburne.edu.au](https://figshare.swinburne.edu.au/ndownloader/files/47646913) — Tensile behaviour and energy absorption of thin-walled tubes with origami patterns - Swinburne figshare
- [inventwithpython.com](https://inventwithpython.com/makinggames.pdf) — Making Games with Python & Pygame
- [pubs.acs.org](https://pubs.acs.org/doi/10.1021/cg501327u) — Substituent Effects of Isophthalate Derivatives on the Construction of Zinc(II) Coordination Polymers Incorporating Flexible Bis(imidazolyl) Ligands | Crystal Growth & Design - ACS Publications
- [fabpedigree.com](https://fabpedigree.com/james/connect4.htm) — Connect Four
- [reddit.com](https://www.reddit.com/r/AnarchyChess/comments/174alas/day_1_connect_4_move_yellow_first/) — Day 1: connect 4 move (yellow first) : r/AnarchyChess - Reddit
- [cdn.serc.carleton.edu](https://cdn.serc.carleton.edu/files/introgeo/games/examples/blank_game_template.pptx) — Connect Four
- [reddit.com](https://www.reddit.com/r/chess/comments/1fv2eo5/how_would_you_evaluate_this_position_if_you_were/) — How would you evaluate this position. If you were white how would you try to fight back? GTE : r/chess - Reddit
- [astramodel.cz](https://www.astramodel.cz/manualy/hangar9/hangar9_cessna_182.pdf) — Hangar 9 Cessna 182 Skylane 1.50 ARF - Astramodel.cz
- [scribd.com](https://www.scribd.com/document/491135568/2011-Sno-Pro-500-Service-Manual) — 2011 Sno Pro 500 Service Manual | PDF | Turbocharger | Gasoline - Scribd
- [scribd.com](https://www.scribd.com/doc/250942829/2013-Arctic-Cat-Snowmobile-Service-Manual) — 2013 Arctic Cat Snowmobile Service Manual | PDF | Piston | Internal Combustion Engine
- [cs.brandeis.edu](https://www.cs.brandeis.edu/~storer/JimPuzzles/GAMES/NineMensMorris/INFO/GasserArticle.pdf) — Solving Nine Men's Morris
- [boardgames.stackexchange.com](https://boardgames.stackexchange.com/questions/61123/optimal-strategy-for-4-in-a-row-on-5-by-5-board-with-random-setup-and-a-transfer) — Optimal strategy for 4-in-a-row on 5-by-5 board with random setup and a transfer
- [reddit.com](https://www.reddit.com/r/baduk/comments/ow6082/the_value_of_each_opening_move/) — The value of each opening move : r/baduk - Reddit
- [blog.supa.so](https://blog.supa.so/2025/03/26/evaluating-llms-reasoning-ability-a-connect-4-showdown/) — Evaluating LLMs' Reasoning Ability: A Connect 4 Showdown – We SUPA AI Blog
- [thetoyinsider.com](https://thetoyinsider.com/connect-4-twist-and-turn-review/) — Winning Moves Adds a New Twist to a Classic Game - The Toy Insider
- [reddit.com](https://www.reddit.com/r/todayilearned/comments/1j1jn1/til_connect_four_is_a_solved_game_the_first/) — TIL Connect Four is a solved game. The first player can always win. : r/todayilearned

### Sources used in the report

- [en.wikipedia.org](https://en.wikipedia.org/wiki/Connect_Four) — Connect Four - Wikipedia
- [tromp.github.io](https://tromp.github.io/c4/c4.html) — John's Connect Four Playground - John Tromp
- [oeis.org](https://oeis.org/A212693) — A212693 - OEIS
- [blogs.cornell.edu](https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/) — Solving Connect Four with Game Theory - Cornell blogs
- [ztoz.blog](https://ztoz.blog/posts/connect4-ply-dataset/) — Connect Four Ply Dataset | ℤ→ℤ
- [archive.ics.uci.edu](https://archive.ics.uci.edu/ml/datasets/connect-4) — Connect-4 - UCI Machine Learning Repository
- [2swap.github.io](https://2swap.github.io/WeakC4/explanation/) — WeakC4, or Distilling an Emergent Object - GitHub Pages
- [asingleneuron.wordpress.com](https://asingleneuron.wordpress.com/2012/08/04/connect-four/) — Connect Four - A Single Neuron - WordPress.com
- [web.mit.edu](https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf) — Connect Four - MIT
- [scribd.com](https://www.scribd.com/document/549351485/Connect-4-research-paper) — Connect 4 Research Paper | PDF | Matrix (Mathematics) | Linear Algebra - Scribd
- [tromp.github.io](https://tromp.github.io/c4/connect4_thesis.pdf) — A Knowledge-based Approach of Connect-Four - John Tromp
- [web.mit.edu](https://web.mit.edu/sp.268/www/connectfour.pdf) — Intro to A.I. Topics - MIT
- [tromp.github.io](https://tromp.github.io/c4.html) — Expert Play in Connect-Four - John Tromp
- [papergames.io](https://papergames.io/docs/game-guides/connect4/advanced-guide/) — Connect 4 Advanced Guide | papergames.io
- [wernermaes.files.wordpress.com](https://wernermaes.files.wordpress.com/2009/10/connect4.pdf) — A Knowledge-based Approach of Connect-Four
- [myemail.constantcontact.com](https://myemail.constantcontact.com/subject.html?soid=1101182625238&aid=V6yW91V5oXE) — The latest news for you - Constant Contact
- [github.com](https://github.com/dsanmart/connect4) — GitHub - dsanmart/connect4: Knowledge-based backtracking algorithm to win the game of connect 4. This work is based on the master thesis "A Knowledge-based Approach of Connect-Four" from Victor Allis back in 1988.

### Sources read but not used

- [platform.claude.com](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — Skill authoring best practices - Claude API Docs
- [anthropic.com](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — Equipping agents for the real world with Agent Skills - Anthropic
- [app.daily.dev](https://app.daily.dev/posts/weakc4-v4wffz9rn) — WeakC4 | daily.dev
- [11011110.github.io](https://11011110.github.io/blog/2025/09/15/linkage.html) — Linkage - 11011110
- [mathstodon.xyz](https://mathstodon.xyz/@robinhouston/115130490419839034) — robinhouston: "Here's the written version, if…" - Mathstodon.xyz
- [feed.podbean.com](https://feed.podbean.com/automated-daily/feed.xml) — The Automated Daily - Podbean
- [hn.algolia.com](https://hn.algolia.com/?query=Optimal%20Strategy%20for%20Connect%204&type=story&dateRange=all&sort=byDate&storyText=false&prefix&page=0) — All | Search powered by Algolia
- [feeds.transistor.fm](https://feeds.transistor.fm/hacker-news-highlights) — Hacker News Highlights - Transistor
- [ocw.mit.edu](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202_MITES_268S10_ses5_slides.pdf) — Connect Four - MIT OpenCourseWare
- [arxiv.org](https://arxiv.org/html/2410.05551v2) — Misère Connect Four is Solved - arXiv
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/) — How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It
- [elakaioutdoor.com](https://elakaioutdoor.com/blogs/lifestyle/the-history-of-connect-4-from-its-inception-to-becoming-a-classic) — The History of Connect 4: From Its Inception to Becoming a Classic - Elakai Outdoor
- [en.wikipedia.org](https://en.wikipedia.org/wiki/Tic-tac-toe) — Tic-tac-toe - Wikipedia
- [reddit.com](https://www.reddit.com/r/dataisbeautiful/comments/8sybmo/i_played_tictactoe_with_200_people_data_of_their/) — I Played Tic-Tac-Toe with 200 people, data of their first move [OC] : r/dataisbeautiful - Reddit
- [blog.gamesolver.org](http://blog.gamesolver.org/solving-connect-four/01-introduction/) — Part 1 – Introduction - Solving Connect 4: how to build a perfect AI
- [arxiv.org](https://arxiv.org/html/2410.05551v1) — Misère Connect Four is Solved - arXiv
- [drops.dagstuhl.de](https://drops.dagstuhl.de/storage/00lipics/lipics-vol291-fun2024/LIPIcs.FUN.2024.2/LIPIcs.FUN.2024.2.pdf) — Poset Positional Games - DROPS
- [stackoverflow.com](https://stackoverflow.com/questions/20773606/minimax-algorithm-for-connect-4) — Minimax algorithm for connect 4 - artificial intelligence - Stack Overflow
- [saveitforparts.com](https://saveitforparts.com/wp-content/uploads/2009/11/connectk_agents.pdf) — Analysis of Computational Agents for Connect-k Games. - Saveitforparts
- [cardgamedatabase.fandom.com](https://cardgamedatabase.fandom.com/wiki/Connect_Four) — Connect Four | Card Game Database Wiki | Fandom
- [gergely.imreh.net](https://gergely.imreh.net/blog/2019/02/how-not-to-start-with-machine-learning/) — How not to start with machine learning - ClickedyClick - Gergely Imreh
- [microsoft.com](https://www.microsoft.com/en-us/wdsi/threats/malware-encyclopedia-description?Name=Behavior:Win32/DefendNot.Z&ThreatID=2147952475) — Behavior:Win32/DefendNot.Z threat description - Microsoft Security Intelligence
- [deezer.com](https://www.deezer.com/en/track/2950439) — JAŸ-Z - Threat - Deezer
- [music.youtube.com](https://music.youtube.com/search?q=+JAY%2DZ+Threat) — YouTube Music
- [music.youtube.com](https://music.youtube.com/search?q=JAY%2DZ+THREATS) — YouTube Music
- [stackoverflow.com](https://stackoverflow.com/questions/10985000/how-should-i-design-a-good-evaluation-function-for-connect-4) — How should I design a good evaluation function for Connect 4? - Stack Overflow
- [youtube.com](https://www.youtube.com/watch?v=ncqBsdo54sQ) — Threat Pairs - Connect 4 Strategy - YouTube
- [fr.scribd.com](https://fr.scribd.com/document/399715690/SIMATIC-S7-300-FM-350-2-Counter-Module-Terminal-Assignment-of-the-Front-Connector) — FM 350-2 Counter Module Connector Guide | PDF | Computer Hardware - Scribd
- [ebay.com](https://www.ebay.com/itm/136813807938) — 84" Bi-Fold Sliding Barn Door Hardware Kit for 4 Doors - Quiet Black Track | eBay
- [ebay.com](https://www.ebay.com/itm/325744314438) — Top Mount Roller Bifold Sliding Barn Door Hardware Kit Black Flat Track Modern | eBay
- [figshare.swinburne.edu.au](https://figshare.swinburne.edu.au/ndownloader/files/47646913) — Tensile behaviour and energy absorption of thin-walled tubes with origami patterns - Swinburne figshare
- [inventwithpython.com](https://inventwithpython.com/makinggames.pdf) — Making Games with Python & Pygame
- [pubs.acs.org](https://pubs.acs.org/doi/10.1021/cg501327u) — Substituent Effects of Isophthalate Derivatives on the Construction of Zinc(II) Coordination Polymers Incorporating Flexible Bis(imidazolyl) Ligands | Crystal Growth & Design - ACS Publications
- [fabpedigree.com](https://fabpedigree.com/james/connect4.htm) — Connect Four
- [reddit.com](https://www.reddit.com/r/AnarchyChess/comments/174alas/day_1_connect_4_move_yellow_first/) — Day 1: connect 4 move (yellow first) : r/AnarchyChess - Reddit
- [cdn.serc.carleton.edu](https://cdn.serc.carleton.edu/files/introgeo/games/examples/blank_game_template.pptx) — Connect Four
- [reddit.com](https://www.reddit.com/r/chess/comments/1fv2eo5/how_would_you_evaluate_this_position_if_you_were/) — How would you evaluate this position. If you were white how would you try to fight back? GTE : r/chess - Reddit
- [astramodel.cz](https://www.astramodel.cz/manualy/hangar9/hangar9_cessna_182.pdf) — Hangar 9 Cessna 182 Skylane 1.50 ARF - Astramodel.cz
- [scribd.com](https://www.scribd.com/document/491135568/2011-Sno-Pro-500-Service-Manual) — 2011 Sno Pro 500 Service Manual | PDF | Turbocharger | Gasoline - Scribd
- [scribd.com](https://www.scribd.com/doc/250942829/2013-Arctic-Cat-Snowmobile-Service-Manual) — 2013 Arctic Cat Snowmobile Service Manual | PDF | Piston | Internal Combustion Engine
- [cs.brandeis.edu](https://www.cs.brandeis.edu/~storer/JimPuzzles/GAMES/NineMensMorris/INFO/GasserArticle.pdf) — Solving Nine Men's Morris
- [boardgames.stackexchange.com](https://boardgames.stackexchange.com/questions/61123/optimal-strategy-for-4-in-a-row-on-5-by-5-board-with-random-setup-and-a-transfer) — Optimal strategy for 4-in-a-row on 5-by-5 board with random setup and a transfer
- [reddit.com](https://www.reddit.com/r/baduk/comments/ow6082/the_value_of_each_opening_move/) — The value of each opening move : r/baduk - Reddit
- [blog.supa.so](https://blog.supa.so/2025/03/26/evaluating-llms-reasoning-ability-a-connect-4-showdown/) — Evaluating LLMs' Reasoning Ability: A Connect 4 Showdown – We SUPA AI Blog
- [thetoyinsider.com](https://thetoyinsider.com/connect-4-twist-and-turn-review/) — Winning Moves Adds a New Twist to a Classic Game - The Toy Insider
- [reddit.com](https://www.reddit.com/r/todayilearned/comments/1j1jn1/til_connect_four_is_a_solved_game_the_first/) — TIL Connect Four is a solved game. The first player can always win. : r/todayilearned

---
