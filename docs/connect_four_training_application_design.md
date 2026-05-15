# **Algorithmic Pedagogy and Tactical Theory in Connect Four: A Comprehensive Framework for Intelligent Training Systems**

## **Introduction to Perfect-Information Game Pedagogy**

Connect Four is a finite, zero-sum, perfect-information game. It belongs to the classification of adversarial connection games, specifically an m,n,k-game (7, 6, 4\) with restricted piece placement driven by gravity mechanics.1 The game space is vast, containing precisely 4,531,985,219,092 reachable board positions populated with zero to forty-two pieces.1 Despite this immense state space, the game was mathematically solved in 1988 through the independent efforts of James Dow Allen and Victor Allis.1 Their research proved that the first player (traditionally Red) can force a victory given perfect play, provided the initial token is placed in the central column. Conversely, if Red opens in the adjacent columns, the game resolves to a theoretical draw, and opening in the outermost columns hands the forced win to the second player (Black).4

However, the mathematical resolution of Connect Four does not equate to human mastery. The cognitive load required to navigate the trillions of permutations demands a reliance on strategic heuristics, pattern recognition, and deep tactical calculation.1 Contemporary perfect solvers, such as the widely adopted implementation by Pascal Pons, utilize the negamax algorithm enhanced with alpha-beta pruning, iterative deepening, and optimized transposition tables to evaluate any position instantaneously.6 These solvers output a raw numerical score indicating the side to win and the distance to the terminal state (Win-in-N semantics).7

The primary challenge in modern game-based learning applications is translating these raw algorithmic evaluations into human-comprehensible strategic concepts. A raw numerical score fails to explain the geometric, temporal, or logical reasons underlying an optimal move. The development of advanced tactical puzzle trainers, such as the proposed DecodeC4 application, bridges this gap. By algorithmically generating positions, evaluating them via perfect solvers, and semantically classifying them using hand-written predicate functions, the system exposes the underlying strategic motifs. This report provides an exhaustive, multi-dimensional analysis of Connect Four theory, focusing on zugzwang, parity, advanced tactical geometries, and the rigorous technical specifications required to operationalize these concepts within an AI-driven educational framework.

## **1\. The Mechanics and Manipulation of Zugzwang**

The concept of zugzwang represents the ultimate deciding factor in the vast majority of expert-level Connect Four endgames. A German term translating directly to "compulsion to move," zugzwang describes a state where a player is forced to make a move when they would strongly prefer to pass their turn, as any available legal move degrades their position.4

### **Connect Four Zugzwang vs. Chess Zugzwang**

Understanding zugzwang in Connect Four requires decoupling the concept from its traditional applications in chess. The fundamental differences are rooted in the physical mechanics of the respective games.

| Dynamic Feature | Chess Zugzwang | Connect Four Zugzwang |
| :---- | :---- | :---- |
| **Core Mechanism** | Spatial displacement. Pieces must abandon defensive posts or break blockades.9 | Temporal exhaustion and gravity. Players are forced to elevate columns, granting the opponent access to higher cells.3 |
| **State Reversibility** | Positions can sometimes oscillate or repeat, though the fifty-move rule limits this.9 | Strictly irreversible. Every token played permanently reduces the remaining state space and alters board topology. |
| **Mutual Zugzwang** | Reciprocal zugzwang occurs when whoever is to move loses.10 | Hardcoded into the game's depletion mechanism. The player who exhausts their safe tempo moves first steps into the trap.3 |
| **Piece Mobility** | Pieces can move across multiple axes, offering varied ways to pass a turn. | Tokens are immutable. The only choice is column selection, strictly governed by gravity.1 |

### **Move Obligation, Gravity, and Parity Interaction**

In Connect Four, gravity dictates that players cannot arbitrarily select the geometric coordinate of their move; they can only select the column. Consequently, every move permanently alters the topological structure of the board, granting access to the cell immediately above the newly placed token.1 Zugzwang occurs when all available columns contain "poisoned" cells at the next available vertical increment. If a player requires access to a cell on the fourth row to complete a connection, and that cell is currently floating above an empty third row, they cannot play in that column without first allowing the opponent to occupy the third row. If the opponent holds a winning threat on that third row, the player is paralyzed in that column.3

When this paralysis extends across the entire board, the player whose turn it is to move is in zugzwang. They are forced to elevate a column and deliver a winning cell to the opponent.12 This phenomenon emerges directly from the intersection of parity and threat timing. Because the board has an even number of rows, the strict alternation of turns guarantees that the first player will always have access to the odd rows, and the second player to the even rows, assuming neither is forced out of sequence.3 Zugzwang is the mechanism that enforces this mathematical reality.

### **Positional Inevitability and Precursor Patterns**

Zugzwang does not manifest spontaneously in the late endgame; its structural precursors are meticulously laid during the opening and middlegame phases. Forcing moves create positional inevitability. By executing threats that require an immediate defensive response, a player dictates where tokens are placed, molding the board architecture to ensure that the remaining empty cells form a mathematically inescapable trap.13

Several recognizable board structures generate this inevitability. The "Dead Column" is a structure where neither player possesses a direct threat, but both players refuse to play because doing so would give the opponent access to a higher, highly valuable cell. In many cases, this higher cell completes an odd-row threat for the first player.3 "Threat Stacking" occurs when one player has a threat on one row, and the opponent has a threat directly above it. The lower threat prevents the opponent from building the column, turning it into a time-bomb.3 A "Segmented Board" arises when the grid is functionally split into isolated vertical corridors, forcing players to trade moves in safe columns until one is forced to breach the contested zones.9

### **Offensive vs. Defensive Zugzwang**

Zugzwang manifests in two distinct strategic postures. Offensive zugzwang occurs when an attacker actively restricts the opponent's safe moves through continuous forcing sequences. The attacker plays a sequence of immediate threats, forcing the defender to block in specific columns, thereby deliberately exhausting the defender's safe tempo reserves.13 This active manipulation accelerates the game state toward the mathematical trap.

Defensive zugzwang occurs passively. A player constructs a robust defensive structure, typically relying on even-row parity and overlapping minor threats, and simply waits for the board to fill. The defending player calculates that the mathematics of the grid will eventually force the opponent to play a self-destructive move.3 Beginner players often misunderstand this, assuming that aggressive, center-focused attacks will always break a defensive structure, failing to realize that playing into the center prematurely can exhaust their own tempo reserves.

### **Zugzwang Control Techniques**

To effectively teach players how to manipulate zugzwang, an educational curriculum must break down the concept into actionable control techniques. Threat timing manipulation requires players to delay the activation of latent threats until the opponent's safe moves are entirely depleted.3 Tempo management involves treating safe empty cells as currency; a player must carefully count how many safe moves they possess versus how many the opponent possesses.

Sacrificial forcing moves are advanced tactics where a player drops a token into a column knowing it accomplishes no direct offensive goal, but it forces the opponent to respond in the same column, thereby flipping the turn order (the parity) for the remaining columns.3 Column exhaustion is the deliberate act of filling neutral columns to accelerate the onset of zugzwang. Threat-space restriction involves playing into columns that limit the opponent's future branching factor, forcing the game down a narrow corridor of deterministic moves.14 Converting parity advantages into forced outcomes requires maintaining the initiative so that the opponent is the first one forced to play into the critical, contested column.

### **Teaching Progression, Detection, and Validation**

Teaching zugzwang progressively requires starting with highly constrained board states. The curriculum should introduce "one-column endgames" where the entire board is full except for a single column, visually demonstrating how the turn order dictates the winner. Subsequent lessons should expand to two-column interactions, introducing the concept of tempo counting.

To detect zugzwang computationally, the AI coding agent must analyze the delta between the current board state and hypothetical alternative turn orders. A position exhibits zugzwang if the perfect solver returns a negative score for the player to move, but evaluating a hypothetical "null move" state (where the opponent is forced to move instead) returns a negative score for the opponent.7 This confirms that the obligation to move is the sole cause of the disadvantage.

To generate zugzwang-themed puzzles automatically, the pipeline should parse the game tree near the endgame (ply depths 25-35) and apply this null-move heuristic. When surfaced for human review, the validation dashboard must display the solver evaluations for all legal moves, proving that every choice leads to a reduction in the player's theoretical score.7 A puzzle truly demonstrates zugzwang only if all available moves accelerate the player's defeat.

## **2\. The Architecture of Parity**

Parity is the mathematical heart of Connect Four. Because the board consists of an even number of rows (six) and an odd number of columns (seven), the strict alternation of turns guarantees specific geometric outcomes based purely on turn order.3 Mastery of parity separates intermediate players from true experts.

### **Odd/Even Row Theory and Initiative**

The fundamental law of parity dictates that the first player (Red) will always have the exclusive right to be the first to play on an odd-numbered row (1, 3, or 5\) within any given column, assuming that neither player is forced to play elsewhere. Conversely, the second player (Black) holds the exclusive right to play on even-numbered rows (2, 4, 6).3 This creates a rigid strategic dichotomy. Red inherently seeks to establish threats on odd rows because Red can mathematically force access to them. Black seeks to establish threats on even rows.2 If Red establishes a horizontal or diagonal threat requiring a missing piece on row 3, and Black cannot immediately win elsewhere, Red is guaranteed to eventually capture that cell.

The relationship between parity and initiative is profound. The player possessing the initiative dictates which columns are played. If Red holds the initiative, Red can force Black to exhaust safe even-row cells, preserving Red's access to the critical odd-row cells required for victory. Odd threats matter because they represent unblockable paths to victory for the first player, provided the global tempo is maintained.3

### **Vertical Parity vs. Global Parity**

To fully operationalize parity in an educational system, the curriculum must distinguish between local column dynamics and board-wide state dynamics.

Vertical parity refers to the strict alternation of pieces within a single, isolated column.3 If a column is empty, Red plays row 1, Black plays row 2, Red plays row 3, etc. This local mechanic ensures that even-row threats directly above odd-row threats neutralize them, a concept known as "overcutting".3 Within a vacuum, vertical parity is unbreakable.

Global parity refers to the total number of empty cells remaining on the entire board, which dictates the macro-level tempo.3 Every time a token is played, the global tempo shifts. A player who maintains global parity control can dictate who is forced to break vertical parity in contested columns. If all neutral columns contain an even number of empty cells, whoever's turn it is will be forced to play first into a contested column, losing the vertical parity advantage in that specific location.

### **Endgame Parity Structures and Mutual Zugzwang Relationships**

In the endgame, parity interactions mathematically determine the victor. The classical relationships are immutable and form the basis of all endgame evaluation functions 4:

| Threat Configuration | Winner / Outcome | Mathematical Reasoning |
| :---- | :---- | :---- |
| Red has one odd threat, Black has none | Red Wins | Red dictates the global tempo and eventually claims the odd cell, as Black can never play an odd row first.4 |
| Black has one even threat, Red has none | Black Wins | Black utilizes even vertical parity to force Red into zugzwang, ensuring Black claims the winning cell.4 |
| Red has an odd threat, Black has an even threat | Red Wins | Red's odd threat forces an earlier temporal resolution, claiming the win before Black's higher even threat is physically reached.4 |
| Red has an even threat, Black has an odd threat | Draw | Red's even threat is practically useless due to parity rules, resulting in a defensive stalemate where neither can force a win.4 |
| Both players have odd threats in separate columns | Draw | The threats cancel each other out. Neither player can force the other to yield their respective column without losing.4 |

Red's overarching strategy can be summarized by the human heuristic: "Red likes odd numbers." To win, Red must create an odd number of odd-threated columns (typically one or three). If Red creates two odd-threated columns, Black uses the second one as a counterthreat to balance the tempo, resulting in a draw or a Black win.3

### **Parity Traps and Double Threats**

Common parity traps occur when beginners mistake a double threat (two simultaneous paths to victory) for a guaranteed win, failing to calculate the row parity. A double threat is only fatal if the opponent cannot block both. However, if one of the threats lies on an even row for Red, it is a "ghost threat." Black simply ignores it, knowing Red can never mathematically claim it, and blocks the valid odd-row threat instead.

Parity heavily influences opening strategy. The center column (Column D) is the most valuable real estate on the board because it participates in the maximum number of potential horizontal and diagonal alignments. Controlling the central odd rows (D1, D3, D5) is the primary objective for Red, while Black attempts to neutralize this by claiming the central even rows (D2, D4, D6) or forcing Red to play off-center.1

### **Implementation Guidance for AI Detection and Visualization**

To detect parity dominance computationally, the AI system must rely on advanced bitboard masking techniques.17 The predicate logic for detecting a parity-based win requires mapping all latent threats against the current global tempo.

**Predicate Logic for Parity Detection:**

1. Isolate the bitboard\_mask representing all empty cells.  
2. Generate a bitmask of all major threats (cells that immediately complete a four-in-a-row) for both players using bitwise shift algorithms.17  
3. Filter out "useless" threats. An even-row threat directly above an opponent's odd-row threat is masked out as useless.3  
4. Calculate the row index of all remaining valid threats.  
5. If Player 1 (Red) holds an odd number of valid threats where row\_index % 2\!= 0, and Player 2 holds no valid even-row threats, return True for Parity\_Advantage\_P1.

For learners, visual teaching methods are highly effective. The UI should highlight the odd rows (1, 3, 5\) with a subtle red overlay and the even rows (2, 4, 6\) with a subtle black overlay during "Parity Vision" tactical drills.

Suggested puzzle archetypes should include "Tempo Counting" drills, where the user is presented with a board and must calculate whether playing into a neutral column preserves or flips the global parity. The difficulty progression should move from simple single-column parity assessments to complex boards requiring the evaluation of intersecting diagonal parity traps. Automatic explanation generation must explicitly reference the row numbers, outputting strings such as, *"Playing in Column B flips the global tempo. Because your winning threat is on an even row (Row 4), you must force your opponent to play the odd rows first. This move guarantees that outcome."*

## **3\. Additional High-Impact Connect Four Techniques**

Beyond the foundational mechanics of parity and zugzwang, a comprehensive training curriculum must cover advanced geometric patterns and tactical combinations. Victor Allis identified nine primary strategic rules that govern optimal play, which serve as an excellent taxonomy for middle-to-advanced puzzle generation.4 Furthermore, geometric threat stacking and Threat-Space Search heuristics provide actionable frameworks for human players.

### **Victor Allis's Knowledge-Based Strategic Rules**

Victor Allis's 1988 thesis codified human heuristics into rigorous formal logic.4 These rules focus on controlling specific groups of squares and forcing the opponent's compliance. An AI training agent must possess predicate functions capable of detecting these exact scenarios to generate highly specific instructional puzzles.

| Strategic Rule | Conceptual Definition | Tactical and Pedagogical Implication |
| :---- | :---- | :---- |
| **Claimeven** | A player controlling zugzwang can guarantee access to all even squares in a column by letting the opponent play all empty odd squares.5 | Used defensively by Black. Puzzles should require the user to actively avoid playing a column, proving that patience guarantees the even-row win. |
| **Baseinverse** | A player cannot play two directly playable squares in a single turn.4 | The foundation of the double threat. Puzzles highlight two disconnected, immediate winning cells, demonstrating that the opponent cannot block both. |
| **Vertical** | Playing a token makes the cell directly above it immediately playable.4 | Teaches vertical dependency. Puzzles must require the user to recognize that building a column hands the cell above to the enemy. |
| **Aftereven** | A side-effect of Claimeven. If a player completes a group using cells guaranteed by Claimeven, they will eventually finish the group.4 | Allows the computation of guaranteed future connections. Puzzles teach long-term pattern recognition, visualizing connections through empty space. |
| **Lowinverse** | Based on the opponent playing all empty odd squares, guaranteeing access to lower even squares.4 | A specialized parity tactic. Puzzles train the user to identify which even squares are mathematically secure without needing immediate occupation. |
| **Highinverse** | Guarantees access to higher even squares based on the opponent's forced play.4 | Similar to Lowinverse, but applied to rows 4 and 6\. Focuses on late-endgame column exhaustion. |
| **Baseclaim** | A synthesis of base rules guaranteeing a claim on specific intersecting cells.19 | Teaches intersection control. Puzzles require finding the single cell that bridges two separate latent alignments. |
| **Before** | A playable square in another column must be played before a specific sequence resolves.4 | Teaches prerequisite sequencing. Puzzles require a specific setup move in a safe column before launching an attack. |
| **Specialbefore** | All empty squares of a specific group must not lie in the upper row, requiring precise sequence manipulation.4 | Advanced sequencing. Puzzles focus on denying the opponent access to row 6 by forcing them to play elsewhere. |

### **Threat-Space Search and Victory by Continuous Forcing (VCF)**

Threat-Space Search (TSS) is an algorithmic optimization originally designed for games like Gomoku and Connect Four, focusing entirely on attacking play and forcing moves.13 In human pedagogy, this translates to the VCF sequence (Victory by Continuous Forcing).

A VCF occurs when a player executes a multi-move sequence where every single move is a direct threat (check), forcing the opponent to block.13 Because the opponent is continuously reacting to imminent defeat, they have no tempo to initiate their own attacks or stabilize their defense. Human players recognize this by looking for intersecting latent alignments. If placing a piece creates a three-in-a-row horizontally, and the opponent's forced block subsequently acts as a base for a vertical three-in-a-row, a VCF chain is initiated.

Computational detection of VCF requires the AI agent to perform a specialized depth-first search that exclusively explores branches where the move generates an immediate threat.14 If a path to victory exists composed entirely of these forcing nodes, the system classifies it as a VCF puzzle. The UI teaching mechanism should visually map the sequence, showing ghostly tokens appearing one after another, demonstrating the inescapable chain of logic. Difficulty progresses by increasing the ply-depth of the forced sequence.

### **Geometric Tactical Patterns: J-Shapes, Double Threats, and Sextuple Threats**

The specific dimensions of the Connect Four grid naturally generate recurring geometric patterns that intermediate and advanced players must commit to memory.

**The J-Shape** The J-shape is a specific clustering of pieces, typically occupying D1, D3, E2, and E3 (or its mirror equivalent).3 This structure resembles the letter 'J' and mathematically guarantees a triple minor threat. Because the geometry forces the opponent into awkward blocking configurations, the J-Shape routinely and reliably converts into a major odd-row threat. Novice mistakes often involve attempting to block the J-shape directly, rather than initiating a counter-attack on the opposite flank. AI puzzle generation should use regex-style pattern matching against the 2D bitboard representation to isolate games where the user must complete the final piece of the J-shape.20

**Double Threats and the Figure-7 Trap** Creating two simultaneous, independent paths to victory exploits the Baseinverse rule. The opponent can only drop one token per turn, rendering them incapable of blocking both vectors.4 The most famous instantiation is the "Figure-7 Trap," where three pieces form a diagonal line, and the top piece simultaneously serves as the anchor for a three-piece horizontal line.2 The AI agent can detect this by searching for states where two distinct winning alignments intersect at a single empty cell, and the placement of a token in that cell drops the solver score to an immediate win-in-1.18

**The Sextuple Threat** A highly advanced configuration where six distinct minor threats overlap in a dense cluster, typically spanning columns E, F, and G.3 While perceptually overwhelming to a human player, it functions mathematically equivalent to a single, unstoppable triple threat. Experts exploit this by building redundant win conditions; if the opponent blocks one, three others immediately activate. Puzzle generation for sextuple threats requires deep perfect-play analysis, filtering for positions where the branching factor of winning moves suddenly explodes.

### **Undercutting and Overcutting Threats**

These techniques dictate vertical dominance and cell ownership within a single column.3

**Undercutting:** Player A establishes a latent threat on row 4\. Player B responds by establishing a threat on row 3 of the exact same column. Player A's threat is now "undercut" and functionally dead. Player A can never trigger their win, because placing a piece on row 2 to build the column would hand Player B the immediate win on row 3\.3

**Overcutting:** Player A possesses a minor threat on row 3\. Player B plays a major threat on row 4\. Player A's threat is negated because building the column would hand Player B the win.

Understanding the hierarchy of undercutting is essential for defensive resource identification. The UX should feature a "Column Hierarchy" visualization mode. When a player requests a hint, arrows pointing downward (undercutting) or upward (overcutting) should overlay the board, explicitly demonstrating why a seemingly powerful three-in-a-row is actually a "dead" or "useless" threat.5 Puzzles must test the user's ability to identify the lowest valid threat in a column, ignoring the visual noise of higher, deactivated alignments.

## **4\. Technical Guidance for the AI Coding Agent**

To successfully implement these pedagogical frameworks into the DecodeC4 application, the AI coding agent must architect a robust backend capable of rapid board evaluation, bitboard manipulation, semantic classification, and seamless solver integration.

### **Bitboard Data Structures and Bitwise Predicates**

The most performant methodology for representing a Connect Four board is utilizing a 64-bit unsigned integer bitboard system (specifically utilizing 49 bits for a standard 7x6 board).17 Each of the seven columns is allocated 7 bits (6 rows for active play, plus one top buffer bit to detect overflow and separate columns mathematically).

Two distinct bitboards are maintained to represent the game state:

1. bitboard\_player: Represents the locations of the current player's tokens.18  
2. bitboard\_mask: Represents all occupied cells on the board by both players.17

To detect alignments, tactical motifs, and parity states without iterating over expensive multi-dimensional arrays, the agent must implement optimized bitwise shift operations. A four-in-a-row is detected by shifting the player's bitboard along the four axes and performing bitwise AND operations.17

| Axis of Alignment | Bitwise Shift Value | Predicate Implementation Logic |
| :---- | :---- | :---- |
| **Vertical** | Shift by 1 | y \= board & (board \>\> 1); if (y & (y \>\> 2)) return true; 17 |
| **Horizontal** | Shift by 7 | y \= board & (board \>\> 7); if (y & (y \>\> 14)) return true; 17 |
| **Diagonal 1 (Right)** | Shift by 6 | y \= board & (board \>\> 6); if (y & (y \>\> 12)) return true; 17 |
| **Diagonal 2 (Left)** | Shift by 8 | y \= board & (board \>\> 8); if (y & (y \>\> 16)) return true; 17 |

Advanced concepts like J-shapes and Threat Stacking are detected by combining these base shifts to identify intersecting patterns of bits.20

### **Solver Integration and Win-in-N Semantics**

The puzzle generation and validation pipeline requires the integration of a perfect solver, heavily adapted from Pascal Pons' highly optimized C++ implementation.6 The solver must utilize the negamax algorithm, heavily augmented with alpha-beta pruning, iterative deepening, and a transposition table to cache previously evaluated states.6

The solver's score output must be tightly coupled to "Win-in-N" semantics to accurately categorize puzzle difficulty and tactical urgency. The standard scoring convention dictates:

* **Score ![][image1]:** The current player can force a win. The value is mathematically calculated as ![][image2].7 A higher positive score translates to a faster, more immediate win.  
* **Score ![][image3]:** The current player will lose against optimal play. The magnitude indicates how long they can delay the loss.  
* **Score ![][image4]:** The game is a theoretical draw with perfect play.

By parsing these scores, the AI agent can determine the exact ply-depth of the forced win. A puzzle classified as "Creating a double threat" (Level 3\) should feature a position where ![][image5] jumps from ![][image6] to a positive integer after the correct move, indicating the sudden creation of a forced win that did not previously exist.8

### **Position Filtering Pipelines and Puzzle Uniqueness**

Algorithmically extracting pedagogically useful puzzles from 4.5 trillion game states requires an intelligent, multi-stage filtering pipeline. Purely random sampling produces chaotic, unnatural boards that humans cannot parse effectively.22

**The Puzzle Generation Pipeline:**

1. **State Generation:** Utilize a Monte Carlo Tree Search (MCTS) employing Upper Confidence Bounds for Trees (UCT), alongside a library of human-played opening books, to generate plausible, naturalistic middlegame and endgame states.21  
2. **Solver Evaluation:** Pass the generated state to the perfect solver. Reject any state where ![][image7] (immediate wins taking less than 2 moves, which are deemed too trivial for advanced training) or where ![][image8] (meaningless draws).  
3. **Uniqueness and "Only Move" Check:** A high-quality instructional puzzle must possess exactly *one* winning move.3 The pipeline evaluates all legal moves (up to 7 columns). If multiple columns return a winning score, the puzzle is rejected as ambiguous and pedagogically confusing.  
4. **Predicate Classification:** The validated state is passed through a suite of hand-written boolean functions (is\_zugzwang(), has\_vcf(), is\_parity\_trap()). The first predicate to return True assigns the tactical motif tag to the puzzle, determining its curriculum placement.

### **Automatic Explanation Generation and Classification Confidence**

To fulfill the educational mandate of the DecodeC4 application, the AI agent must dynamically generate natural language explanations explaining *why* the optimal move is correct, translating bitboard logic into semantic meaning. This is achieved by linking the predicate logic to a dynamic string template engine.

For example, if the is\_parity\_trap() predicate triggers, the system inspects the bitboard to isolate the specific cell coordinates. The hint generation engine outputs: *"Playing in Column D preserves your control of the global tempo. Notice how your opponent has an even-row threat on Column B. By playing here, you force them to eventually fill Column B, neutralizing their own threat through vertical overcutting."*

Classification confidence is determined by whether the state requires shallow search (detectable via immediate bitboard masks, such as a double threat) or deep perfect-play analysis (such as a 12-ply VCF sequence). Shallow searches yield higher classification confidence, while deep searches require rigorous human oversight to ensure the label matches the human cognitive experience.

## **5\. Human Testing, Validation, and Analytics Guidance**

Despite the mathematical perfection of the underlying solver, rigorous human oversight is mandatory to ensure instructional quality, visual clarity, and pedagogical alignment.24 A human-in-the-loop review workflow guarantees that algorithmically generated puzzles map accurately to human cognitive patterns and learning heuristics.

### **Verification Workflows and Edge Case Mitigation**

The admin dashboard provided to human reviewers must be comprehensive. It must display the board state, the optimal move, the automatically assigned tactical classification tag, and the solver evaluation matrix for all 7 columns.

**Human Verification Steps:**

1. **Visual Clarity and Naturalism:** Does the board look like a real game between competent players, or is it an absurd, structurally impossible tower of alternating pieces? If absurd, the developer must tune the MCTS temperature parameters to encourage more natural clustering.  
2. **Conceptual Alignment:** If a puzzle is tagged as "Avoiding forbidden columns," the human reviewer must manually verify that the incorrect moves truly result in handing the opponent an immediate win via gravity, and that the optimal move effectively dodges this trap.  
3. **False-Positive Mitigation:** Solvers lack human aesthetics. Sometimes the solver chooses a move not because it is a brilliant tactical sacrifice, but simply because it delays an mathematically inevitable loss by two extra plies. The pipeline must filter out these false positives. Puzzles must strictly be generated from positions where the user has a forced, proactive win (![][image9]).

### **Metrics for Learner Progression and Retention**

To evaluate the educational quality of the application and determine whether a puzzle effectively teaches the intended concept, the system must track specific learning analytics.25

* **Time-to-Solve (TTS):** Measures cognitive load and pattern recognition speed. A steady decrease in TTS for specific categories (e.g., Level 2 blocking puzzles) indicates true pattern mastery.  
* **Hint Utilization Rate:** If a specific puzzle archetype (e.g., J-shapes or Claimeven) experiences an 80%+ hint request rate, the curriculum sequencing is likely too steep. The progression system must automatically inject intermediate "scaffolding" puzzles to bridge the cognitive gap.27  
* **Error Categorization and Remediation:** The application must track exactly which incorrect columns users click. If users consistently click columns that trigger an opponent's undercutting threat, the analytics engine identifies a systemic deficiency in the user's vertical parity comprehension. The progression system then automatically serves remedial "Undercutting" drills, creating a personalized, adaptive learning loop that ensures true mastery of Connect Four tactics.

#### **Works cited**

1. Connect Four \- Wikipedia, accessed May 13, 2026, [https://en.wikipedia.org/wiki/Connect\_Four](https://en.wikipedia.org/wiki/Connect_Four)  
2. How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It, accessed May 13, 2026, [https://www.rd.com/article/how-to-win-connect-4/](https://www.rd.com/article/how-to-win-connect-4/)  
3. \_OceanofPDF.com\_The\_Complete\_Book\_Of\_Connect\_4\_-\_James\_Dow\_Allen.pdf  
4. Connect Four \- MIT, accessed May 13, 2026, [https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf](https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf)  
5. Intro to A.I. Topics \- MIT, accessed May 13, 2026, [https://web.mit.edu/sp.268/www/connectfour.pdf](https://web.mit.edu/sp.268/www/connectfour.pdf)  
6. Solving Connect 4: how to build a perfect AI, accessed May 13, 2026, [http://blog.gamesolver.org/](http://blog.gamesolver.org/)  
7. Solver.cpp \- PascalPons/connect4 \- GitHub, accessed May 13, 2026, [https://github.com/PascalPons/connect4/blob/master/Solver.cpp](https://github.com/PascalPons/connect4/blob/master/Solver.cpp)  
8. Negamax implementation of a perfect Connect 4 solver \- GitHub, accessed May 13, 2026, [https://github.com/lhorrell99/connect-4-solver](https://github.com/lhorrell99/connect-4-solver)  
9. Games people play | plus.maths.org, accessed May 13, 2026, [https://plus.maths.org/games-people-play](https://plus.maths.org/games-people-play)  
10. Zugzwang: Meaning, Examples & Interactive Games \- ChessWorld.net, accessed May 13, 2026, [https://www.chessworld.net/zugzwang-chess.asp](https://www.chessworld.net/zugzwang-chess.asp)  
11. Zugzwang in Chess: Practice & Replay \- ChessWorld.net, accessed May 13, 2026, [https://www.chessworld.net/chessclubs/openingguide/oppositionandzugzwang.asp](https://www.chessworld.net/chessclubs/openingguide/oppositionandzugzwang.asp)  
12. A Knowledge-based Approach of Connect-Four, accessed May 13, 2026, [https://wernermaes.files.wordpress.com/2009/10/connect4.pdf](https://wernermaes.files.wordpress.com/2009/10/connect4.pdf)  
13. Win Gomoku with Threat Space Search | Baeldung on Computer Science, accessed May 13, 2026, [https://www.baeldung.com/cs/gomoku-threat-space-search](https://www.baeldung.com/cs/gomoku-threat-space-search)  
14. (PDF) Go-Moku and Threat-Space Search \- ResearchGate, accessed May 13, 2026, [https://www.researchgate.net/publication/2252447\_Go-Moku\_and\_Threat-Space\_Search](https://www.researchgate.net/publication/2252447_Go-Moku_and_Threat-Space_Search)  
15. Connect 4 Solver, accessed May 13, 2026, [https://connect4.gamesolver.org/](https://connect4.gamesolver.org/)  
16. Connect Four \- A Single Neuron \- WordPress.com, accessed May 13, 2026, [https://asingleneuron.wordpress.com/2012/08/04/connect-four/](https://asingleneuron.wordpress.com/2012/08/04/connect-four/)  
17. Part 6 – Bitboard \- Solving Connect 4: how to build a perfect AI, accessed May 13, 2026, [http://blog.gamesolver.org/solving-connect-four/06-bitboard/](http://blog.gamesolver.org/solving-connect-four/06-bitboard/)  
18. The Wondrous World of Connect Four Bit Boards \- Jorrit Dorrestijn, accessed May 13, 2026, [https://jorrid.com/posts/the-wondrous-world-of-connect-four-bit-boards/](https://jorrid.com/posts/the-wondrous-world-of-connect-four-bit-boards/)  
19. Connect 4 Research Paper | PDF | Matrix (Mathematics) | Linear Algebra \- Scribd, accessed May 13, 2026, [https://www.scribd.com/document/549351485/Connect-4-research-paper](https://www.scribd.com/document/549351485/Connect-4-research-paper)  
20. Connect Four Bitboard \- c++ \- Stack Overflow, accessed May 13, 2026, [https://stackoverflow.com/questions/13327748/connect-four-bitboard](https://stackoverflow.com/questions/13327748/connect-four-bitboard)  
21. connect-four-ai: A high-performance, perfect Connect Four solver : r/rust \- Reddit, accessed May 13, 2026, [https://www.reddit.com/r/rust/comments/1nn0buv/connectfourai\_a\_highperformance\_perfect\_connect/](https://www.reddit.com/r/rust/comments/1nn0buv/connectfourai_a_highperformance_perfect_connect/)  
22. Deep Learning Meets Board Games: Creating a Connect 4 AI Using CNNs and ViTs, accessed May 13, 2026, [https://medium.com/advanced-machine-learning/deep-learning-meets-board-games-creating-a-connect-4-ai-using-cnns-and-vits-89c8cdab0041](https://medium.com/advanced-machine-learning/deep-learning-meets-board-games-creating-a-connect-4-ai-using-cnns-and-vits-89c8cdab0041)  
23. Connect 4: Principles and Techniques, accessed May 13, 2026, [https://web.stanford.edu/class/archive/cs/cs221/cs221.1192/2018/restricted/posters/yuex/poster.pdf](https://web.stanford.edu/class/archive/cs/cs221/cs221.1192/2018/restricted/posters/yuex/poster.pdf)  
24. Connect-4 AI: A Comprehensive Taxonomy and Critical Review of Methods and Metrics, accessed May 13, 2026, [https://www.preprints.org/manuscript/202601.2416](https://www.preprints.org/manuscript/202601.2416)  
25. Full article: Learning analytics for online game-Based learning: a systematic literature review, accessed May 13, 2026, [https://www.tandfonline.com/doi/full/10.1080/0144929X.2023.2255301](https://www.tandfonline.com/doi/full/10.1080/0144929X.2023.2255301)  
26. Serious Game Analytics by Design: Feature Generation and Selection Using Game Telemetry and Game Metrics \- ERIC, accessed May 13, 2026, [https://files.eric.ed.gov/fulltext/EJ1387197.pdf](https://files.eric.ed.gov/fulltext/EJ1387197.pdf)  
27. Instructional Strategy: Connect 4 Thinking \- lead4ward, accessed May 13, 2026, [https://lead4ward.com/strategy-connect4-thinking/](https://lead4ward.com/strategy-connect4-thinking/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAYCAYAAAC8/X7cAAABlklEQVR4Xu2WzytEURTHvylFyWKKWCkLJRt/gJSSjUhZW9hgJYkSiqWSPdlMyZKNsrS0s1CUFDaSKUWs5Oc5c+eZ+8477/V+jEm6n/o20/d73znnzvTue4DD8Wt0kLZIQ5Y3Z33/s9SSPknbpEZSL+mLtEx6sdZVkz7SBcwcuyILwIt6pAnjL0qzCszC/KAeUzCzqOQRHrLP/04UbdKoANy3U/HWhFeEg6gNxOGYdE2ql0EKRqD3fYXu/2xgQwYpOCA9k1plkIAj6IPeQPexjvImPG36ViSHr38ndcsgBk/QBz2H7heZRnATl74V6ViFqTUo/Ci8/pJT6H6AfoQXScskTL0xGSjcQe99BsUflUaJHSiLM8APRq63IAOFsHvgCsIfJs3YhsU89CJJmYCpMy6DCJag9w6cQiekfduw+EC2G3kFptmADGLC1+YUj085n8FqsE1iD+lfH/g96o3UJYOE3MMcmx4tMLP6Hqq3pBqUj63H0mfeWhMX3jTXaZZBBh5IBdIhzFzt/rhyNJHqpOlwOBz/l28/xWokEN6D+wAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAYCAYAAAC8/X7cAAABmElEQVR4Xu2WzysFURTHv5ENsrDB1kJZ+A+kxJaUtb2VJDb4A5SsbEjplSxZUJSF/0B+REnJgkQpZCU/z3nnXe6cOTPPG+Oh5lOf3ut7bveeO/fNzAMyMn6MFnKe7PGyUe/7n6WKfCUXyDqyg3wjJ8kHb1w56SSPIX0sq1oIHtSuQ0g+rsMyMAK5oI5BSC8mOUQXOefTSYsuHUTA67Ya2ZTK8nAhbgNpwD9FnqtbFwz6YK/7CDv/2MCMLqTAIvlMtulCDNuwGz2DnWMan5twzgVGlM4W5OZv0oUvcAe70SPYeZ4hhDdxEhhRnErygLwga1StFNz6mn3YeQj+nUZNYlENaXoPsonvcgl77UMYeb8OCizBGBxBPeTYN3UhIVH3wClU3ksO+4HHGOxJ4nAnsUtWqFopTMBeO/QU2iFX/cDjBclvZG6e5z6HbCoJ3CifrM7WdcDW+iGxgvT+PqyR92SDLhThCvLYdDRCeg28VPm4+Wq5x9Zt4TPnjUmLWfIJ4bdrHDfkNbkB6as5WP4dBnSQkZGR8f94B4fWaoKwn52ZAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAYCAYAAAC8/X7cAAABU0lEQVR4Xu2Wv0oDQRCHfwh2YmFlLSKIryCCYKsIvoSViGijPoAY7BNCJCKW2giWvoGFoCCC2IgoCApWFv6ZvcmaudnZgIJ7FvvBR8Jv525nL+xegEzmzxgjG+SsyFbF939LP/lBNslBcor8JDfJV1GXkmnyCtzHgRoLcEWTOgTn6zpMwAr4gXoWwb2YtBEfdLn7dVLj5h03si2VFbiBXgtIzTzsed9g598L2NEDFXEKu9Fb2Dlq6C7CWy9VpOUFdqOXsPOCJYSLuC5VxNnv4R54j+2SLfApN1pcFcfPrzmHnQfMIH6TFNzDnvsCRr6ggw7u6QXFiYjtgRuofI5cloFgDfZNLLZ/6ARfFmUD9tzBKXRGHslA8I5qN7JrdMjIjnXgHJAhcYjq/j54HsDHpmcY3GvppXpH9qF7bD13PtuipkqeyEfyBNzXSHk4k8lkMr/kC+PaZr9UP7TFAAAAAElFTkSuQmCC>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAAYCAYAAAAh8HdUAAAAqklEQVR4XmNgGLJADYhnArEvklgJEhsFsALxPyCeDcR8QGwHxP+BuAaIPyOpQwEgBTboggwQ8Sp0QRBYwACRxAZA4iBXYACQBD5NWAFMUy+6BD7QzYDQCMMzUFTgAHkMmBpvoaggAFwY8PuTIRhdAAoWM+DQ5AfEBeiCUFDKgEPTWSBehy4IBX8ZcAQGzN08aOJrGfAknSdAzATEHxggmt9D6QVIakbBwAEAIrItoSGpzDcAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAqklEQVR4XmNgGFqAG4h3AfF/ID4NxIyo0hAgzQBRwAnlC0P5THAVUPAViFeiiZ0B4h9oYmDdYWhiVVBxOLCDCtggCwJBPFRcCCZQABUwgglAQShU3Bwm0AQV0IMJQEEgVDwaJhAEFTCGCUAByM0gcX2YgBZUwBkmAAVpUHF2ZEGQQA6yABBMgIqjgG9AfA1N7B0Q30cTY2BhQLU+CsrHCUDWnQDiYHSJYQUA4f4lJK6jxZYAAAAASUVORK5CYII=>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAAAYCAYAAAAWPrhgAAADvElEQVR4Xu2Z6atNURjGHxkyZchURNeQIYUiM/cgSZIkQ4YyFil/gChSfED5IhL5IJTkiyIpKUkZikxJcvlkKInMwvvctdY973n32veec+7RObd7fvVkr+fd++y133etvfa6gCpVqpSG4daoUln8tUaETqKDoo2izt4blg1XFJNEs63ZkmmqQK9EdXAzbZTojWgnmr6uXExG+Qs0CC5nzNFDUbecaBbm8ZPoq2iDiTXQWKI/iC5ZE+6aL9asEKYgvwJ1hXuG0zbQTJaIbqn2S7h8LVIeeSK6qtqPRDdVu4G0Ag1BeuyyaLs1K4SpyK9AAY7ut3BJbWNixcCcLY14Ope8Zyy39HrEzBgXkR47L2pnzQphGgorUIDP8xRuxHc0sUKwxSDvvcclgtz3bQu94zEzBmcJYy9soAk4lS+I1tmAZ7zonGi3DQinRGP9cX/RWdGAbDiHVXC/M8b401FcgTTXRR9FfYyfD1tEK4z3Ay6XYS2KFZFE/YTh6YvsBUG3kf4amA93zizfPiy6lw2jH1yciSVMLNvtffuX/5ceB8chuHXC9o9FpBcKeV20uCEKzEDzCxTgAGFyh9pAgdjE23Yg6icMxTjRT+QWKXb+XDifXy8Btu/445Do2my4Hnp1cJ/uR5R31x9/8+1AmNUaLsp7VXsmSlcgcgPuFVUsHKjs8wjlpeUx6ieMFPiqCT8w2sTovTPeYHUcvTGyPmcT1wAWmO2w19K0hYvxgUkX0Q64Impq0fwCcVY/Ez0XdTCxQugF1+eJxm8qHwnTcsAaHk51nr9aebw5vYXK0zCRjO+zATj/j2of816M/XCxo6I9orWIFzKD4gvELygONM6a5sKlgP0daANIKQRS/IQBt0DGCDflXxYCJ7yXxla4eE/js+P0NymPbTsjAtfQ+H0CGRReoBq4+3LNKRXsKwdngBvRsJZ9RvxZ6PFLMmFqOBOsFziJ5AZ1DdLP50zLIB7nINCzh/C82Ncd4ess9jtkjjrOIP8CcY1lHzg7S8l3JLchj9XxMsSfhR6/chOmhgs0vZXGD19pXAss9Ecaj3+FmOePGV+vYnzd0dNfhL2919gehHFuoAO8nvepUV4G+RWIM3ibNUvAa7h+xqRhe7Nqh1d4AmuG9hV/HL7heeM0uGf5jWxHuD/RcNEN05ralRN1LEeyL5bucCM+/M6Z3HA9GeRXoP+FLoiVhssEPW5dHsDNuugWxl7Y0smgvAUqOa25QAsKUNlozQXi/x3lq7LRmgvUIphgjSpVqlRp2fwDV8QMTEWQyAAAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFQAAAAYCAYAAABk8drWAAACoklEQVR4Xu2XS4iOURjHH+RW7kpCFGUjZU8UdmIzFEWJLGw0io1LWZhGREQukfmYWSmyko37TtmwQkyJ1TSuRe7+/znnzPuc5z2v+WbzfYvv/OrfvM//OfO+533ec/tEMplMZoCF0AVorfL2qOtMnYyG/kAXoUnQcugvdAD6otq1MsehH1A/tMzkSrB4qUb091mzBfkEHVbxN+iIiiNq4gqXgj5HbyuzSsr1mZbwBmGiKlnltxKc5qk60NtsTRIKyjViOOyGrkJLbcKzEboGbTD+EuiEFCN/m1RPnzHQfugUNMXkGgVr89Oa4vyn1iTHpChq0PmoRUyPuA1sqo/7JD4VbBF3jwU+Pgn98tcs0CNovW/DtWiWuKLaUfAWegFN9jHzzVh++NzP1pSi/0l2SbmofBnLbYlffJOP1/h4u48t9LZC93y803tzVF4/7zv0VcXkmfx/lE6EuivEmXQF6oIuQ5fEnWjqgX17b00p6jQkqyXdmCOFHouvmaGumb+l4gD9m9BBH7/2XmCcug4fZaaPZ0N3oYeDLRoL+/LRmuJ8ztSINmt4+FVtQVko62kOictPMD7PtfQ7lcf4voo14WOeFncODqO/WbAvnDEW+i+1sQ5q14Zir5SLF160Cq6lqTynF/1RymO8QsWaoZ5TxVjo6DBVD1X9oXdOG0+gG9pQ/JbyxvRK0jcm88WNuFSe3gMVc/dPtQtwNFTlx1ujAZyVcn9GeC/aJEPl7RS9Lumfm/wlZW/MjYAe18Dp/pojJfAc6lUx4eZi76Phscrm50pxUmgG7M8iFT+WxM7PY8lIcQsu/+GD/1tTbSw7xLXhYkx1xGlZLMWHolbG6QFYmDPWNHDdDPfg0YTHqmYyT1xf7kBvoHdxOpPJZDKZTCZTB/8Aer7CkSeZMgYAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFQAAAAYCAYAAABk8drWAAAC40lEQVR4Xu2XS6hNURjH/8irvJWE3KJMpMyJwoiYoChKpJiIYuJRBkSJiDxicMNAioxk4p3JLRMmHqHExPuR5/X6/netdfe3v7323eecewa461f/zv7+3zr7rP3t9TpAIpFIdDBJdEw0X3kb1XWiRvqKfomOi4aIZoh+i7aKPqp2PZm9ou+i16LpJleAxYs1or/Zmj2Q96IdKv4i2q3iHK1whYtBn6P3X2GuNZrAbBTrMyLidcJEWbLM/1uZLPqJLkZPA3Cax+pAb5k1SSgo14h62CA6KZpmE54lorOixcafKtqHbOSvRHkB+om2iA6IhplcV7TATcszNtEArE27NeH8O9Yke5AVNehorkWe03Ab2HAfv0T+VLAc7h4Tfbxf9MNfs0A3RYt8Gz70GLii2lHwTPRANNTHzNe7/PC7L0S3RL1Mrlb4ux+siaz/UdahWFQ+jOUS8g++1MfzfLzKxxZ6K0RXfbzWe+NUXv/eN9FnFZO7qG+Uavgi7oueiAaYXBXs2xtrIqtTJXMQb8y3TY/F14xS18xfVHGA/gXRNh8/9l5AP2R4KaN9PFZ0RXSjs0X34H1eIRv5VbAv76wJ53Om5lhoDc8pFAvKQllPsx0uP8j4PNfS36U8xtdUrAkv8yDcOTiM/mbBdfUrstlRBfvCGWOh/1AbC0TrtaHYhGLxwoOWwbU0lj8B5/dRHuOZKtZU/U6jXIc7lPPIUw9l/aF3RBu3Ree1oeDRw25MjxC/MZkAN+JieXp8mAB3/1i7AEdDWX6gNSrg2nkPbn3mhtgIh1HsDzc4erlNMlTeTtFziP/d5D8pe+PB3uMaONJf91f5sBFouLnY+2h4rLL58chOCrUQdnf9IrsD+8MzbqANkZ2fx5LecAsuv/DWf7aqNpbVcG24GFM782lMQfaiqFn5dAcszCFrGrhuhnvwaMJjVS1wI/sEd7RrJi1wfbkseip6nk//v6yxRiKRSCQSiUTj/AG6C8aBv/o10gAAAABJRU5ErkJggg==>