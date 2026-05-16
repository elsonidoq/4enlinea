# Connect 4 Training Material Generation

---

## Connect 4 Expert Strategy Report

# Algebraic and Geometric Structural Logic for Automated Connect 4 Strategy Detection

The computational resolution of Connect 4 in 1988 established the game as a solved system, yet for human players and training application developers, the game remains a complex interplay of parity, structural formations, and mathematical zugzwang. The transformation of Connect 4 from a recreational connection game into a formal strategic discipline requires a nuanced understanding of how disk placements influence the endgame state long before the board is filled. This report provides an exhaustive analysis of the logical predicates and geometric structures necessary to implement an expert-level detection engine, specifically focusing on the 34 critical domains of strategy identification: zugzwang control, row parity, Victory by Continuous Forcing (\\text{VCF}), Victory by Continuous Threats (\\text{VCT}), the J-shape, the Figure-7 trap, sextuple threats, and the intricate mechanics of overcutting.

## Fundamental Board Geometry and Coordinate Systems

To implement detection logic, a training application must utilize a rigid coordinate system where columns are indexed (A,B,C,D,E,F,G) and rows are indexed (1,2,3,4,5,6) from bottom to top. The vertical nature of the grid introduces a gravity constraint: a cell (c,r) cannot be occupied unless all cells (c,r′) where r′<r are already filled. This physical property creates the mathematical basis for parity, as each move shifts the available row index for a given column.

### Computational Predicates for Piece Occupancy

The underlying detection logic relies on a bitboard or array representation of the state. For the purposes of strategic classification, the following logical expressions define the state of the board at any ply n:

- Occupied(c,r)⟺DiskAt(c,r)∈{Red,Black}
- Empty(c,r)⟺¬Occupied(c,r)
- LegalMove(c,r)⟺Empty(c,r)∧(r=1∨Occupied(c,r−1))

These predicates allow the system to identify potential threats. A threat is formally defined as an empty cell (c,r) which, if occupied by player P, completes a contiguous sequence of four disks of color P.

## The Mathematics of Row Parity and Terminal Ownership

Parity is the governing principle of Connect 4, dictates which player has the natural advantage in specific regions of the board. In a standard 42-cell game, the first player (\\text{Red}) places 21 disks, and the second player (\\text{Black}) places 21 disks. Because disks are dropped into vertical columns, the row index of each disk determines its "ownership" based on move order.

### Odd-Row versus Even-Row Ownership

The detection logic must categorize every cell based on its row index. In any column that is eventually filled to its maximum capacity of six rows, the disks will be distributed as follows:

| Row Index | Player Parity | Strategic Role |
| --- | --- | --- |
| r=1 | Odd (\text{Red}) | Initial Control |
| r=2 | Even (\text{Black}) | Secondary Defensive |
| r=3 | Odd (\text{Red}) | Primary Offensive |
| r=4 | Even (\text{Black}) | Secondary Offensive |
| r=5 | Odd (\text{Red}) | Critical Strategic |
| r=6 | Even (\text{Black}) | Terminal Defensive |

The mantra "Red likes odd numbers" reflects the reality that the first player owns the odd rows (1,3,5) in a completed column. Consequently, \\text{Red}'s strategic goal is to establish threats on odd rows, while \\text{Black}'s goal is to force the game to conclude on even rows. A training application identifies a "parity error" when a player attempts to build a threat on a row that naturally belongs to their opponent, unless it is a tactical sequence leading to an immediate win.

### The Claim-Even Strategy Logic

The \\text{Claim-Even} strategy is a formal algorithmic approach for the second player to ensure victory by controlling even-row parity. The logic for detection is:

1. **Parity Invariant**: Every column c∈{A..G} must have an even number of empty spaces.
2. **Responsive Move Logic**: If \\text{Red} plays at (c,r) where r is odd, \\text{Black} must play at (c,r+1) where r+1 is even.
3. **Threat Check**: \\text{Black} must verify that \\text{Red} has no un-undercut odd threats. An odd threat is a threat square at row r∈{1,3,5}.

A training app detects a successfully implemented \\text{Claim-Even} strategy when \\text{Black} responds to every \\text{Red} move in the same column, provided no \\text{Red} threats on odd rows exist that are not "undercut" by \\text{Black} threats on even rows beneath them.

## Zugzwang, Zuktfang, and Parity Control

Zugzwang, often termed "zuktfang" in technical search literature, refers to a position where a player is forced to move to their own detriment. In Connect 4, this state usually occurs in the endgame when all "neutral" cells have been filled, and a player is forced to play in a column that allows the opponent to claim a threat.

### Dead Space and Dead Columns

The computational detection of zugzwang begins with the identification of "Dead Space". Dead space is defined as the subset of cells on the board that will be played without directly resulting in a win for either player.

- **Dead Columns**: Columns with no existing threats and no potential to form threats are "dead". Since each column has an even number of cells (6), filling a dead column does not change the parity of the game.
- **Total Dead Space Parity**: The algorithm sums the number of disks already played (n) and the number of dead space squares remaining (Sdead​).
  - If (n+Sdead​)≡0(mod2), the first player (\\text{Red}) will be forced to make the next non-dead move.
  - If (n+Sdead​)≡1(mod2), the second player (\\text{Black}) will be forced.

### Classification of Threat Types (Z,0,#)

To provide implementation-oriented logic, threats are classified into three functional categories based on their relationship to zugzwang control:

| Symbol | Threat Category | Structural Definition |
| --- | --- | --- |
| Z | Zugzwang-Controlling | A threat square at (c,r) where the number of cells below it plus the threat itself is odd. |
| 0 | Non-Controlling | A threat square where the spaces required to reach it are even. |
| # | Terminal | A threat pair or a cell that both players can use to win immediately. |

A Z-threat allows a player to "toggle" the zugzwang control. By initiating the play in a Z-threated column, a player forces the opponent to respond, effectively passing the zugzwang back. In contrast, a 0-threat does not shift the burden of moving and can be strategically ignored unless it leads to a terminal state.

## Major and Minor Threats: Implementation Predicates

A training application must distinguish between threats that are available for immediate play (checks) and those that require prior disk placement (strategic threats).

### Major Threats

A major threat is a cell (c,r) that completes a four-in-a-row for player P, but which cannot be played immediately because (c,r−1) is empty.

MajorThreat(P,c,r)⟺CompletesLine(P,c,r)∧Empty(c,r)∧Empty(c,r−1)

The presence of a major threat creates a forbidden zone for the opponent. If \\text{Red} has a major threat at (D,5), \\text{Black} cannot play at (D,4) without losing the game on the subsequent ply.

### Minor Threats and Threat Pairs

A minor threat is one of two or more cells required to complete a four-in-a-row. Detecting minor threats is essential for predicting the emergence of major threats.

- **Minor Threat Pair**: Two empty cells (c1​,r1​) and (c2​,r2​) that both belong to a potential winning line.
- **Mixed Threat Pair**: A pair where one cell is on an odd row and the other is on an even row.
- **Adjacent Threat Pair**: Two major threats in the same column on neighboring rows (e.g., r=2 and r=3).

Detection logic for an adjacent threat pair is a high-priority feature, as these formations are usually terminal wins. If \\text{Red} occupies (c,r) and (c,r+1) as threats, \\text{Black} cannot block both.

## Advanced Strategic Formations

Instructional applications must go beyond simple line detection to recognize complex shapes that represent advanced strategic advantages.

### The J-Shape Predicate

The J-shape is a configuration of four \\text{Red} disks that form a geometric structure capable of creating a winning triple threat. The canonical coordinates for a J-shape are {D1,D3,E2,E3}.

J-Shape(Red)⟺Occupied(Red,D1)∧Occupied(Red,D3)∧Occupied(Red,E2)∧Occupied(Red,E3)

**Implementation Mechanism**: The J-shape works because it controls multiple odd rows. If play progresses up column G, \\text{Red} will eventually capture either G3 or G4. In both branches of the move tree, F3 becomes a major odd-row threat for \\text{Red}. A training app should detect this "J-shape potential" when D1,D3, and E2 are occupied, prompting the user to complete the formation at E3.

### The Figure-7 Trap Predicate

The Figure-7 trap is an expert-level fork where a diagonal alignment intersects a horizontal alignment at a single cell. It is visually identified as a "7" shape.

**Structural Requirements**:

1. **Diagonal Component**: Three pieces in a diagonal line, e.g., {(c,r),(c+1,r+1),(c+2,r+2)}.
2. **Horizontal Component**: The top piece of the diagonal is also part of a three-piece horizontal line, e.g., {(c+2,r+2),(c+3,r+2),(c+4,r+2)}.

Fig-7(P,x,y)⟺Pieces(P,{(x,y),(x+1,y+1),(x+2,y+2)})∧Pieces(P,{(x+2,y+2),(x+3,y+2),(x+4,y+2)})

The intersection point (x+2,y+2) creates a dual-threat environment that is extremely difficult to block. If executed in the center of the board, it often circumvents standard parity defenses.

### The Sextuple Threat Configuration

A sextuple threat is an extremely high-level formation defined by Allen, involving six distinct threats that collectively guarantee a win. It typically appears on the right side of the board in columns E,F, and G.

**Canonical Components of a Red Sextuple Threat**:

- Major Threats: {F3,F4}.
- Minor Threats: {E4,E3,G3,G5}.

The detection logic for this configuration must evaluate the outcomes of column F.

- If \\text{Red} gets F3, the configuration {E4,E3,G3} forms a winning triple threat.
- If \\text{Red} gets F4, the configuration {E4,E3,G5} forms a winning triple threat.

Because \\text{Red} is guaranteed to get either F3 or F4 once the column is played out, the sextuple threat is mathematically equivalent to a winning major odd-row threat.

## Interaction of Stacked Threats: Overcutting and Undercutting

Threats in the same column interact based on their row height and parity. A robust detection engine must resolve these interactions to accurately evaluate the board's "true score".

### Undercutting Logic

Undercutting occurs when a player's threat is neutralized by an opponent's threat located directly below it in the same column.

Undercut(Tupper​,Tlower​)⟺Column(Tupper​)=Column(Tlower​)∧Row(Tupper​)>Row(Tlower​)∧Color(Tupper​)=Color(Tlower​)

If \\text{Red} has an odd-row threat at C5 and \\text{Black} has a threat at c4, \\text{Red}'s threat is useless. \\text{Red} can only play at C5 if someone plays at C4, but if anyone plays at C4, \\text{Black} wins immediately.

### Overcutting Logic

Overcutting is a more subtle mechanic where a major threat neutralizes an opponent's minor threat located below it.

Overcut(Tmajor​,tminor​)⟺Row(Tmajor​)>Row(tminor​)∧Color(Tmajor​)=Color(tminor​)

While undercutting renders the upper threat worthless, overcutting renders the lower threat nearly worthless. This is because the player with the major threat can force the column to be played out to their advantage before the minor threat can be completed.

### Transformation Rules for Column Analysis

Allen proposed a set of seven transformation rules (T1 through T7) to simplify the board state by resolving stacked threats.

| Rule | Functional Mechanism | Strategic Implication |
| --- | --- | --- |
| T1 | Adjacent major threats win. | Ends search; terminal state. |
| T2 | Threats undercut opposite row parity. | Neutralizes upper threat. |
| T3 | r=2 and r=5 threats together control zugzwang twice. | Equivalent to two odd-row threats. |
| T4 | Same parity threats (e.g., r=3,5) have no effect on each other. | Both remain active. |
| T5 | r=3 and r=6 threats are independent. | No undercutting occurred. |
| T6 | Isolated \text{Red} even-row threats are worthless. | Disregarded by detection logic. |
| T7 | \text{Red} and \text{Black} odd-row threats in separate columns cancel each other. | Leads to a drawn position. |

## Search Algorithms: TSS, VCF, and VCT

Beyond static positional detection, an expert training app must utilize dynamic search algorithms to illustrate winning sequences to the user.

### Threat-Space Search (TSS)

\\text{TSS} is a specialized algorithm that reduces the branching factor of the game tree by considering only "threat-relevant" moves.

1. **Attacker Search**: The algorithm first searches for a sequence of moves for the attacker where the defender's responses are all "forced" (blocking immediate checks).
2. **Node Expansion**: If a double-threat is found, where one move creates two winning lines, the node is expanded to verify if the defender has any refutation.
3. **Efficiency**: \\text{TSS} allows for the identification of winning sequences between 5 and 20 ply in length, mimicking the "feeling" of human experts who focus only on favorable sections of the board.

### Victory by Continuous Forcing (\text{VCF})

\\text{VCF} is the subset of \\text{TSS} where every move by the attacker is an immediate check.
**Logic for Training App**: When the app detects a \\text{VCF} state, it should notify the user that "Mate in X" is available through direct threats.

### Victory by Continuous Threats (\text{VCT})

\\text{VCT} is a broader category where the attacker creates strategic threats (major threats) that are not yet immediate checks. The defender is forced to respond to the *potential* of the threat, often leading to a zugzwang state.

## Opening Theory and Canonical Move Sequences

Instructional logic must recognize standard openings and flag deviations as blunders (?) or critical blunders (??).

### The 5-4 and 3-4 Openings

- **5-4 Opening**: Begins with five disks in column D (D1,d2,D3,d4,D5) followed by four in column E (e1,E2,e3,E4).
- **3-4 Opening**: A variation where \\text{Red} delays the capture of D5, allowing for more diagonal variety.

A training application must calculate the "true result" of these openings. If both players play perfectly, \\text{Red} wins. However, if \\text{Red} plays 5C1?? instead of D5, the app should immediately notify the user that the game state has flipped to a \\text{Black} win.

### The Candlesticks Opening

The Candlesticks opening is characterized by a move sequence that leads to two or three separated columns, resembling candles on a holder.
**Canonical Logic**: \\text{Red} wins this opening by establishing a triple threat through zugzwang control. If \\text{Black} allows \\text{Red} to occupy the third row in two separate columns (e.g., B3 and F3), and \\text{Red} also has an even-row threat at D2, \\text{Red} has achieved a triple mixed threat.

### The Third-Row Gambit

In this opening, \\text{Black} willingly yields the third row to \\text{Red} to secure fifth-row dominance.
**Detection Predicate**:
Occupied(Red,F3)∧Occupied(Red,G3)∧Occupied(Black,C5)∧Occupied(Black,B5).

The training logic must evaluate if \\text{Black}'s counterthreat at C5 is sufficient to neutralize \\text{Red}'s initiative. This involves the application of \\text{Victory Rules V1-V5}:

- **V1**: \\text{Red} wins with three major odd-row threats in separate columns.
- **V2**: \\text{Black} wins with two odd-row threats in separate columns.
- **V3**: \\text{Red} wins with one odd-row threat if \\text{Black} has no counter.
- **V4**: \\text{Black} wins with an even-row threat if \\text{Red} has no odd-row threats.
- **V5**: Otherwise, the game is a draw.

## Instructional Implementation for Strategy Detection

To assist users in learning these concepts, the detection engine must generate instructional feedback based on the strategic structures identified.

### Detection Logic Workflow

1. **Parity Scan**: Identify all existing threats and categorize them as odd-row or even-row.
2. **Structural Recognition**: Check for J-shapes, Figure-7s, and Sextuple formations using the predicates defined above.
3. **Interaction Resolution**: Apply transformation rules (T1−T7) to determine which threats are active and which are undercut.
4. **Zugzwang Calculation**: Determine who has zugzwang control based on Dead Space parity.
5. **Heuristic Evaluation**: Assign values to the board. \\text{Allis}'s engine (\\text{VICTOR}) used 69 potential winning lines, ignoring those where both players had disks.

### Example: Detecting the Figure-7 Trap in Real-Time

When a player places a disk at (B,2) with (A,1) already occupied, the app identifies a "Potential Diagonal". If the player then attempts to play (D,3) while (C,3) is empty, the app recognizes the first two components of a Figure-7. The training message should read: "Strategic Alert: You are building a Figure-7 trap. If you capture (C,3), you will create an intersecting horizontal threat on the third row, which is an odd-row win for Red".

## Conclusion

The implementation of detection logic for a Connect 4 training application rests on the formalization of row parity and structural geometry. By utilizing LaTeX-formulated predicates for formations such as the J-shape ({D1,D3,E2,E3}) and the Figure-7 trap (diagonal-horizontal intersection), developers can create a system that accurately identifies expert-level play. The integration of \\text{Threat-Space Search} and \\text{zugzwang} parity calculations (Z,0,#) provides a pathway for students to move beyond naive disk placement toward a master-level understanding of the game's underlying mathematical invariants. Ultimately, the strategic depth of Connect 4 is found not in the simple connection of four disks, but in the sophisticated manipulation of row ownership and the forced move sequences that define the endgame.

### Sources

- [ocw.mit.edu](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202_MITES_268S10_ses5_slides.pdf) — Connect Four - MIT OpenCourseWare
- [blogs.cornell.edu](https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/) — Solving Connect Four with Game Theory - Cornell blogs
- [asingleneuron.wordpress.com](https://asingleneuron.wordpress.com/2012/08/04/connect-four/) — Connect Four - A Single Neuron - WordPress.com
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/#:~:text=Galli's%20preferred%20fork%20is%20known,a%20three%2Dpiece%20horizontal%20line.)
- [youtube.com](https://www.youtube.com/watch?v=uY5_juNHqyo) — Threat Analysis | Connect 4 Strategy
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/) — How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It
- [youtube.com](https://www.youtube.com/watch?v=mNj6Z5CbUB0&t=3s) — Claimeven - Connect 4 Strategy
- [preprints.org](https://www.preprints.org/manuscript/202601.2416) — Connect-4 AI: A Comprehensive Taxonomy and Critical Review of Methods and Metrics
- [scirp.org](https://www.scirp.org/pdf/JILSA_2019030615385424.pdf) — Research on Different Heuristics for Minimax Algorithm Insight from Connect-4 Game - Scirp.org.
- [researchgate.net](https://www.researchgate.net/publication/220437214_Two-Stage_Monte_Carlo_Tree_Search_for_Connect6) — Two-Stage Monte Carlo Tree Search for Connect6 | Request PDF - ResearchGate
- [researchgate.net](https://www.researchgate.net/publication/2252447_Go-Moku_and_Threat-Space_Search) — (PDF) Go-Moku and Threat-Space Search - ResearchGate
- [cs.hku.hk](https://www.cs.hku.hk/images/Content/fyp-2122-final/final_WongKaNgai.pdf) — [MakerLab Project] Pick and Place Game App for 3D Printed Robotic Arm
- [usenix.org](https://www.usenix.org/system/files/usenixsecurity25-ayzenshteyn.pdf) — Cloak, Honey, Trap: Proactive Defenses Against LLM Agents - USENIX
- [cdn.ima.org.uk](https://cdn.ima.org.uk/wp/wp-content/uploads/2012/01/Connect-4.docx) — Connect 4 - IMA
- [trane.com](https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/equipment/ductless/variable-refrigerant-volume/VRF-SVX040E-EN_06012017.pdf) — VRF-SVX040E-EN | Trane
- [youtube.com](https://www.youtube.com/watch?v=nFsOhW2P5S4) — Connect four how to win - YouTube
- [se.copernicus.org](https://se.copernicus.org/articles/10/2015/2019/se-10-2015-2019.pdf) — Actors, actions, and uncertainties: optimizing decision-making based on 3-D structural geological models
- [petsymposium.org](https://petsymposium.org/popets/2025/popets-2025-0105.pdf) — Panopticon: The Design and Evaluation of a Game that Teaches Data Science Students Designing Privacy
- [scirp.org](https://www.scirp.org/journal/paperinformation?paperid=90972) — Research on Different Heuristics for Minimax Algorithm Insight from Connect-4 Game
- [cs.hku.hk](https://www.cs.hku.hk/images/Content/fyp-2122-final/final_WanTsunWai.pdf) — Final Report [MakerLab Project] Pick and Place Game App for 3D Printed Robotic Arm - HKU Department of Computer Science
- [userpilot.com](https://userpilot.com/blog/product-owner-salary/) — What is a Product Manager? The Honest Guide I Wish I Had - Userpilot
- [userguiding.com](https://userguiding.com/blog/product-parity) — Product Parity - strategies for standout differentiation - UserGuiding
- [getbeamer.com](https://www.getbeamer.com/blog/feature-parity-in-saas) — Feature Parity in SaaS: What It Is, Why It Matters, and How to Avoid the Feature Trap
- [productlogz.com](https://www.productlogz.com/blog/understanding-feature-parity-in-saas) — Understanding Feature Parity in SaaS: Avoid the Parity Trap - ProductLogz
- [clickup.com](https://clickup.com/blog/feature-parity/) — How to Avoid the Feature Parity Trap in Software Development - ClickUp
- [researchgate.net](https://www.researchgate.net/profile/Sunita-Ho/2) — Sunita P Ho MS, Mech. Engr.; Ph.D. Biomat. Bioengr. Professor at University of California, San Francisco - ResearchGate
- [researchgate.net](https://www.researchgate.net/publication/353208344_Towards_solving_the_7-in-a-row_game) — Towards solving the 7-in-a-row game - ResearchGate
- [ftp.math.utah.edu](https://ftp.math.utah.edu/pub/tex/bib/tcs2000.pdf) — A Bibliography of Publications in Theoretical Computer Science: 2000–2004 - Index of files in /
- [llr.in2p3.fr](https://llr.in2p3.fr/IMG/pdf/thesis_postfinal_filipovic.pdf) — Thèse Nicolas Filipovic - Laboratoire Leprince Ringuet
- [cerncourier.com](https://cerncourier.com/wp-content/uploads/2024/12/CERNCourier2024NovDec-digitaledition.pdf) — CERN Courier
- [researchgate.net](https://www.researchgate.net/publication/358530518_Defects_and_Reliability_of_GaN-Based_LEDs_Review_and_Perspectives) — Defects and Reliability of GaN‐Based LEDs: Review and Perspectives - ResearchGate
- [kar.kent.ac.uk](https://kar.kent.ac.uk/64318/1/Petrovskii%202014.pdf) — Multiscale Approach to Pest Insect Monitoring: Random Walks, Pattern Formation, Synchronization, and Networks
- [researchgate.net](https://www.researchgate.net/publication/237007967_Monitoring_gradual_ecosystem_change_using_Landsat_time_series_analyses_Case_studies_in_selected_forest_and_rangeland_ecosystems) — Monitoring gradual ecosystem change using Landsat time series analyses: Case studies in selected forest and rangeland ecosystems | Request PDF - ResearchGate
- [bonndoc.ulb.uni-bonn.de](https://bonndoc.ulb.uni-bonn.de/xmlui/bitstream/handle/20.500.11811/13868/8719.pdf?sequence=2&isAllowed=y) — Essays in Applied Microeconomics - bonndoc
- [eprints.soton.ac.uk](https://eprints.soton.ac.uk/476178/2/gt-v28-n5-p08-p.pdf) — Embedding surfaces in 4–manifolds - ePrints Soton - University of Southampton
- [iris.unime.it](https://iris.unime.it/retrieve/a22741dc-0562-4982-a0d6-9e10c68db133/Tesi_dottorato_Saidi.pdf) — Analytical and Numerical Approaches for Light Scattering by Nanostructured Materials - IRIS Unime
- [bitsavers.informatik.uni-stuttgart.de](http://bitsavers.informatik.uni-stuttgart.de/pdf/ibm/7040/A22-6741-1_Operators_Guide_for_IBM_7040-7044_Systems.pdf) — Systems Reference Library
- [ftpmirror.your.org](http://ftpmirror.your.org/pub/misc/bitsavers/pdf/wang/vs/cp3/742-0881-6_VS100_Computer_System_19860915.pdf) — vs-100 computer system - Your.Org
- [pcjs.org](https://www.pcjs.org/documents/books/mspl13/msdos/encyclopedia/section2/) — The MS-DOS Encyclopedia: Section II: Programming in the MS-DOS Environment | PCjs Machines

### Sources used in the report

- [ocw.mit.edu](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202_MITES_268S10_ses5_slides.pdf) — Connect Four - MIT OpenCourseWare
- [blogs.cornell.edu](https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/) — Solving Connect Four with Game Theory - Cornell blogs
- [asingleneuron.wordpress.com](https://asingleneuron.wordpress.com/2012/08/04/connect-four/) — Connect Four - A Single Neuron - WordPress.com
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/#:~:text=Galli's%20preferred%20fork%20is%20known,a%20three%2Dpiece%20horizontal%20line.)
- [youtube.com](https://www.youtube.com/watch?v=uY5_juNHqyo) — Threat Analysis | Connect 4 Strategy
- [rd.com](https://www.rd.com/article/how-to-win-connect-4/) — How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It
- [youtube.com](https://www.youtube.com/watch?v=mNj6Z5CbUB0&t=3s) — Claimeven - Connect 4 Strategy
- [preprints.org](https://www.preprints.org/manuscript/202601.2416) — Connect-4 AI: A Comprehensive Taxonomy and Critical Review of Methods and Metrics
- [scirp.org](https://www.scirp.org/pdf/JILSA_2019030615385424.pdf) — Research on Different Heuristics for Minimax Algorithm Insight from Connect-4 Game - Scirp.org.
- [researchgate.net](https://www.researchgate.net/publication/220437214_Two-Stage_Monte_Carlo_Tree_Search_for_Connect6) — Two-Stage Monte Carlo Tree Search for Connect6 | Request PDF - ResearchGate
- [researchgate.net](https://www.researchgate.net/publication/2252447_Go-Moku_and_Threat-Space_Search) — (PDF) Go-Moku and Threat-Space Search - ResearchGate
- [cs.hku.hk](https://www.cs.hku.hk/images/Content/fyp-2122-final/final_WongKaNgai.pdf) — [MakerLab Project] Pick and Place Game App for 3D Printed Robotic Arm

### Sources read but not used

- [usenix.org](https://www.usenix.org/system/files/usenixsecurity25-ayzenshteyn.pdf) — Cloak, Honey, Trap: Proactive Defenses Against LLM Agents - USENIX
- [cdn.ima.org.uk](https://cdn.ima.org.uk/wp/wp-content/uploads/2012/01/Connect-4.docx) — Connect 4 - IMA
- [trane.com](https://www.trane.com/content/dam/Trane/Commercial/global/products-systems/equipment/ductless/variable-refrigerant-volume/VRF-SVX040E-EN_06012017.pdf) — VRF-SVX040E-EN | Trane
- [youtube.com](https://www.youtube.com/watch?v=nFsOhW2P5S4) — Connect four how to win - YouTube
- [se.copernicus.org](https://se.copernicus.org/articles/10/2015/2019/se-10-2015-2019.pdf) — Actors, actions, and uncertainties: optimizing decision-making based on 3-D structural geological models
- [petsymposium.org](https://petsymposium.org/popets/2025/popets-2025-0105.pdf) — Panopticon: The Design and Evaluation of a Game that Teaches Data Science Students Designing Privacy
- [scirp.org](https://www.scirp.org/journal/paperinformation?paperid=90972) — Research on Different Heuristics for Minimax Algorithm Insight from Connect-4 Game
- [cs.hku.hk](https://www.cs.hku.hk/images/Content/fyp-2122-final/final_WanTsunWai.pdf) — Final Report [MakerLab Project] Pick and Place Game App for 3D Printed Robotic Arm - HKU Department of Computer Science
- [userpilot.com](https://userpilot.com/blog/product-owner-salary/) — What is a Product Manager? The Honest Guide I Wish I Had - Userpilot
- [userguiding.com](https://userguiding.com/blog/product-parity) — Product Parity - strategies for standout differentiation - UserGuiding
- [getbeamer.com](https://www.getbeamer.com/blog/feature-parity-in-saas) — Feature Parity in SaaS: What It Is, Why It Matters, and How to Avoid the Feature Trap
- [productlogz.com](https://www.productlogz.com/blog/understanding-feature-parity-in-saas) — Understanding Feature Parity in SaaS: Avoid the Parity Trap - ProductLogz
- [clickup.com](https://clickup.com/blog/feature-parity/) — How to Avoid the Feature Parity Trap in Software Development - ClickUp
- [researchgate.net](https://www.researchgate.net/profile/Sunita-Ho/2) — Sunita P Ho MS, Mech. Engr.; Ph.D. Biomat. Bioengr. Professor at University of California, San Francisco - ResearchGate
- [researchgate.net](https://www.researchgate.net/publication/353208344_Towards_solving_the_7-in-a-row_game) — Towards solving the 7-in-a-row game - ResearchGate
- [ftp.math.utah.edu](https://ftp.math.utah.edu/pub/tex/bib/tcs2000.pdf) — A Bibliography of Publications in Theoretical Computer Science: 2000–2004 - Index of files in /
- [llr.in2p3.fr](https://llr.in2p3.fr/IMG/pdf/thesis_postfinal_filipovic.pdf) — Thèse Nicolas Filipovic - Laboratoire Leprince Ringuet
- [cerncourier.com](https://cerncourier.com/wp-content/uploads/2024/12/CERNCourier2024NovDec-digitaledition.pdf) — CERN Courier
- [researchgate.net](https://www.researchgate.net/publication/358530518_Defects_and_Reliability_of_GaN-Based_LEDs_Review_and_Perspectives) — Defects and Reliability of GaN‐Based LEDs: Review and Perspectives - ResearchGate
- [kar.kent.ac.uk](https://kar.kent.ac.uk/64318/1/Petrovskii%202014.pdf) — Multiscale Approach to Pest Insect Monitoring: Random Walks, Pattern Formation, Synchronization, and Networks
- [researchgate.net](https://www.researchgate.net/publication/237007967_Monitoring_gradual_ecosystem_change_using_Landsat_time_series_analyses_Case_studies_in_selected_forest_and_rangeland_ecosystems) — Monitoring gradual ecosystem change using Landsat time series analyses: Case studies in selected forest and rangeland ecosystems | Request PDF - ResearchGate
- [bonndoc.ulb.uni-bonn.de](https://bonndoc.ulb.uni-bonn.de/xmlui/bitstream/handle/20.500.11811/13868/8719.pdf?sequence=2&isAllowed=y) — Essays in Applied Microeconomics - bonndoc
- [eprints.soton.ac.uk](https://eprints.soton.ac.uk/476178/2/gt-v28-n5-p08-p.pdf) — Embedding surfaces in 4–manifolds - ePrints Soton - University of Southampton
- [iris.unime.it](https://iris.unime.it/retrieve/a22741dc-0562-4982-a0d6-9e10c68db133/Tesi_dottorato_Saidi.pdf) — Analytical and Numerical Approaches for Light Scattering by Nanostructured Materials - IRIS Unime
- [bitsavers.informatik.uni-stuttgart.de](http://bitsavers.informatik.uni-stuttgart.de/pdf/ibm/7040/A22-6741-1_Operators_Guide_for_IBM_7040-7044_Systems.pdf) — Systems Reference Library
- [ftpmirror.your.org](http://ftpmirror.your.org/pub/misc/bitsavers/pdf/wang/vs/cp3/742-0881-6_VS100_Computer_System_19860915.pdf) — vs-100 computer system - Your.Org
- [pcjs.org](https://www.pcjs.org/documents/books/mspl13/msdos/encyclopedia/section2/) — The MS-DOS Encyclopedia: Section II: Programming in the MS-DOS Environment | PCjs Machines

---
