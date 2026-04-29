# **Strategic Taxonomy and Tactical Analysis of Optimal Connect Four Systems**

The game of Connect Four, traditionally played on a ![][image1] vertical grid, represents a significant milestone in combinatorial game theory. Formally defined as a zero-sum, perfect-information, deterministic game, it was weakly solved in 1988 independently by James Dow Allen and Victor Allis.1 Their research established that the first player, typically designated as White, can force a win on or before the 41st move by initiating play in the central column.4 Despite this theoretical solution, the practical complexity of the game remains high, with approximately ![][image2] possible board positions, necessitating a sophisticated understanding of tactical patterns and positional strategy for both human and artificial intelligence agents.4

## **Theoretical Foundations of Parity and Zugzwang**

The strategic architecture of Connect Four is built upon the dual pillars of row parity and Zugzwang. These concepts dictate the flow of the game and determine which player has the mathematical advantage as the board reaches higher densities.

### **Parity Concepts in the ![][image1] Grid**

Parity is the fundamental mathematical relationship between the number of discs played and the resulting ownership of specific rows. In a standard board where columns are filled to completion, White occupies all odd-numbered squares in a column (rows 1, 3, and 5), while Black occupies all even-numbered squares (rows 2, 4, and 6).6

The strategic purpose of parity control is to ensure that critical threats are placed on rows naturally controlled by the player. White seeks to create threats on odd rows, while Black seeks to create threats on even rows.7 This relationship is powerful because, in a game that reaches the endgame where columns are systematically filled, the player who controls the parity of a column can often force the opponent to play into a square that grants the controller a win.6

The preconditions for parity-based dominance include the absence of immediate tactical wins and the progression of the game toward a state where column filling becomes forced. Board configurations where parity is most evident are those with "game-ending spaces"—squares that provide a four-in-a-row to either player.10 Variation in parity occurs when the total number of moves in other columns is odd or even, potentially shifting the expected ownership of a square. For example, if Column ![][image3] has one disc and all other columns are empty, the next move in Column ![][image3] will be the third move of the game, an odd move.6

Offensive responses to parity involve building "odd threats" for White and "even threats" for Black. Defensively, a player must avoid placing a disc in a square that allows the opponent to play immediately above them in a row they control.8 Detection logic for parity involves tracking the current move count ![][image4]. The next row ![][image5] available in column ![][image6] will be occupied by White if ![][image7] and by Black if ![][image8].12 A solver validates parity rules by evaluating the game-theoretical value of positions where one player has an "unnatural" threat (e.g., White with an even-row threat); the solver typically shows these are useless unless a Zugzwang can be established.9

| Parity Metric | White (First Player) | Black (Second Player) |
| :---- | :---- | :---- |
| Natural Rows | 1, 3, 5 | 2, 4, 6 |
| Optimal Threat Row | 3 or 5 | 2 or 4 |
| Game Move Indices | 1, 3, 5... | 2, 4, 6... |
| Endgame Objective | Odd Row Dominance | Even Row Dominance |

### **Zugzwang: The Compulsion to Move**

Zugzwang refers to a situation where a player is forced to move when any move results in a disadvantage or a direct loss.9 In Connect Four, this occurs when the only remaining legal moves are in columns that support an opponent's threat on the row immediately above the next available space.6

The strategic purpose of controlling Zugzwang is to dictate the order of endgame moves, ensuring that the opponent must eventually play into a column that triggers a win for the controller.6 The power of Zugzwang lies in its deterministic nature; once all "safe" squares are exhausted, the outcome is mathematically fixed.15

Preconditions for Zugzwang include a nearly full board or a board partitioned by columns that both players are afraid to enter. Typical board configurations involve columns containing a threat for Player A at Row ![][image9], while the current height is at Row ![][image10]. If all other columns are filled, Player B must play at Row ![][image11], allowing Player A to play at Row ![][image9] and win.6 Variations include "mutual Zugzwang," where both players have threats in different columns and are waiting for the other to break the stalemate.8

Offensive play involves "tempo-burning" moves in neutral columns to force the opponent's hand. Defensive play focuses on maintaining "safe" moves in columns where no threats exist.10 Detection logic identifies columns where the square ![][image12] is a threat for player ![][image13] and square ![][image14] is empty. If the number of empty squares not matching this condition is zero for the current player, they are in Zugzwang.17 Solvers refine these rules by identifying deep Zugzwang patterns that may not be apparent for 10-15 moves.3

## **Taxonomic Review of Allis’s Strategic Rules**

Victor Allis proposed a set of nine rules that allow a player to maintain control of Zugzwang and ensure a draw or win. These rules are essential for rule-based detectors in an educational context.1

### **Claimeven**

Claimeven is defined as the ability of the Zugzwang controller to secure all empty even squares in a column that are not currently playable.9 This is powerful because it allows the second player (Black) to guarantee wins on Row 2 or 4 by ensuring they always have the "last word" in those columns.6

The preconditions require two empty squares, ![][image14] and ![][image12], where ![][image12] is even and the column has no existing threats that would be triggered prematurely. Typical board configurations show columns where the bottom few rows are filled, leaving a stack of empty squares starting at an odd row.9 A variation is the "multi-column Claimeven," where the controller manages even rows across several columns simultaneously.

Offensive response involves building the setup early in the mid-game. Defensive response for White involves "undercutting" the even square by creating an odd-row threat in the same column.8 Detection logic identifies columns where the set of empty squares ![][image15] has a maximum even row ![][image16] such that all ![][image17] are also in ![][image15]. Rule-based detectors must flag these as potential territory for the Zugzwang controller.9

| Rule Component | Requirement |
| :---- | :---- |
| Player | Controller of Zugzwang (usually Black) |
| Vertical Structure | Two squares directly above each other |
| Parity | Upper square must be even |
| Status | Both squares must be empty |
| Outcome | Controller gets the even square |

### **Basinverse**

The Basinverse rule is based on the limitation that a player can only occupy one directly playable square per turn.9 It is used to force a win by presenting the opponent with two simultaneous threats that both require immediate blocking.9

Preconditions include the existence of at least two columns where the next available square is a threat for the same player. This appears in configurations where a player has built two horizontal or diagonal "three-in-a-rows" that are both "open" at the bottom.9 Variations include a "split Basinverse" where the threats are in non-adjacent columns.

Offensive use is for creating "forks." Defensive response is to block one threat and hope the other does not lead to a forced sequence elsewhere.10 Detection logic counts the number of directly playable threats for player ![][image18]. If ![][image19], Basinverse is active.20 Solvers validate this by showing that even if the opponent blocks one, the resulting game state remains a win for ![][image18].3

### **Vertical**

The Vertical rule recognizes that playing a disc makes the square directly above it playable for the opponent.9 Its purpose is to prevent the opponent from completing a vertical four-in-a-row or to use the vertical stack as a parity-breaking tool.

Preconditions involve two empty squares in a column where the upper square is odd.9 This typically appears in the center columns where players compete for vertical stacks to control the board's heart.10 Variations include the "Double Vertical," where two such stacks exist.9

The offensive move is to stack three discs and wait for the opponent to be forced to play the fourth.21 Defensive response involves "freezing" the column and not playing the square below the odd-row threat.10 Detection logic scans for columns with three of the same color and an empty odd square above them.12

### **Lowinverse and Highinverse**

Lowinverse and Highinverse are complex rules involving the interaction of parity across multiple columns.9

* **Lowinverse**: Requires two columns, each with two empty squares where the upper is odd.  
* **Highinverse**: Requires two columns with three empty squares where the upper is even.

These rules are powerful because they allow the Zugzwang controller to "offset" the parity of the game, potentially turning an odd-row threat into a useless one.9 They appear in complex endgames where the board is fragmented. Offensive use involves the careful placement of discs to maintain these specific vertical ratios. Defensive response involves breaking the vertical stack in one of the columns.9 Detection logic must track the total number of odd/even empty squares across all "inverse" columns to determine who benefits from the final filling sequence.9

### **Aftereven, Before, and Specialbefore**

These temporal rules govern when a threat should be taken.

* **Aftereven**: Describes the realization of a Claimeven threat after other columns have been filled.9  
* **Before**: Involves taking a threat before the opponent can set up a counter-threat.18  
* **Specialbefore**: A nuanced version where taking a threat immediately is necessary to prevent a global loss of Zugzwang control.18

Strategic purpose is to manage "Sente" (the initiative).8 Preconditions are complex and depend on the global threat environment. Detection logic requires a full scan of all pending threats and a simulation of the "filling order" of the board.12 Solvers are critical here to determine if "waiting" (Gote) is better than "taking" (Sente).8

## **Multi-Threat Motifs: Forks and Zig-Zags**

Advanced play relies on creating multiple winning paths simultaneously, ensuring that a single block by the opponent is insufficient.

### **Double Threats and Forks**

A Double Threat (or Fork) occurs when a move creates two separate winning opportunities.10 The most common is the "Mixed Vector Threat," combining a horizontal and vertical possibility.21

For example, if White has discs at ![][image20] (horizontal three) and ![][image21] (vertical stack), and the square ![][image22] is open and ![][image23] or ![][image24] is open, White has two threats.21 Preconditions require the surrounding squares to be either filled or playable in a way that doesn't trigger an opponent win first.21

Variations include the "Dual Diagonal Threat," created through a zig-zag setup where completing either of two diagonals leads to a win.21 Defensive response is "early blocking"—preventing the three-in-a-row from forming.11 Detection logic identifies empty cells that satisfy the checkWin criteria for a single player in two or more distinct directions.24

### **Zig-Zag Patterns**

Zig-Zag patterns involve alternating discs between columns in a staggered manner to create diagonal threats that are difficult to track.21

* **Basic Zig-Zag**: Alternating across two columns, e.g., ![][image25], then ![][image26], then ![][image22].21  
* **Multi-Directional**: Extending the staggered pattern across three columns (![][image27]).21

Strategic purpose is to disguise intent and build height toward upper-row threats.21 Preconditions involve an open central area and control of the columns being used for the zig-zag.21 Detection logic uses bitwise diagonal shifts (e.g., ![][image28] for a 7x6 board) to identify partial diagonal chains that can be completed by a single move.12

### **The "7" Trap and Septuplet Attack**

The "7" Trap is a specific configuration where discs form the shape of a 7, creating two game-winning spaces (one horizontal, one diagonal).11

* **Preconditions**: Requires three horizontal discs and two diagonal discs branching off the end.11  
* **Septuplet Attack**: An extreme advanced motif where a configuration allows for wins in seven different directions.22

Detection logic for the 7 Trap requires a template matcher that looks for the ![][image29] intersection.22 Solvers validate these as forced wins because the branching factor of the game cannot accommodate blocking both paths in the required time.3

| Tactic | Geometric Shape | Directions of Threat | Detection Complexity |
| :---- | :---- | :---- | :---- |
| Simple Threat | Line (3) | 1 | Low |
| Fork | L-Shape or T-Shape | 2 | Medium |
| 7 Trap | "7" Shape | 2 (Mixed) | High |
| Septuplet | Star/Cross | 7 | Very High |

## **Positional Strategy and Structure**

Beyond tactical "shots," the overall structure of the board determines which player is "leaning" toward a win.

### **Center Column Dominance**

The center column (Column ![][image3]) is the most critical area of the board because it is the only column that can participate in horizontal wins that span the left, middle, and right.10

Strategic purpose is to maximize connectivity and limit the opponent's options.10 Preconditions for dominance involve placing the first disc in ![][image30] (for White) or ![][image26] (for Black).11 Defensive response to White's ![][image30] is often to play ![][image26] immediately to "stack" the center and fight for the odd/even control of the most valuable column.11 Detection logic assigns higher heuristic weights to Column ![][image3] in evaluation functions.25

### **Upper Layer Control and "Dead Zones"**

The top rows (4, 5, 6\) are as critical as the foundation.21 Control of these rows limits the opponent's final moves.

* **Dead Zones**: Columns near the edges (![][image31]) that offer fewer connectivity options.11  
* **Strategic Purpose**: To use dead zones for "tempo burning" when in Zugzwang.10

Detection logic for positional strength involves calculating the "potential" of every empty square—how many different winning lines of four can pass through it.20 Solvers use this to weight moves in the early and mid-game where no immediate threat is present.25

## **Defensive Counter-Patterns and Mitigation**

Defensive play in Connect Four is not merely reactive; it is a proactive attempt to disrupt the opponent's "scaffolding."

### **Neutralization and Undercutting**

Neutralization involves creating a threat that takes precedence over an opponent's threat.6

* **Example**: If Black has an even-row threat at ![][image32], White can neutralize it by creating an odd-row threat at ![][image22].6  
* **Strategic Purpose**: To make the opponent's threat "useless" because the game will end at a lower row first.9

Detection logic for undercutting checks all threats in a column. If ![][image33] and ![][image34] exist in column ![][image6] and ![][image35], then ![][image34] is flagged as "latent" or "useless".8

### **Preventative Blocking**

Preventative blocking is the act of stopping a "two-in-a-row" before it becomes a "three-in-a-row".11

* **Board Configuration**: Opponent has discs at ![][image36] and the ends ![][image37] are open.  
* **Strategic Purpose**: To prevent the opponent from reaching a fork state.11

Detection logic identifies "gaps" and "sequences of 2" that have at least two empty squares in the same line of four.24 Rule-based systems use this to prioritize blocking over building in high-risk zones.22

## **Implementation Logic for Educational Detectors**

Building an automated teaching system requires precise logic to explain *why* a move is good or bad.

### **Bitboard-Level Pattern Matching**

Using bitboards allows for extremely fast detection.12

* **Shift Logic**: Horizontal wins are detected by ![][image38], vertical by ![][image39].12  
* **Detector for Allis’s Rules**: Each rule can be represented as a bit-mask. For example, a Claimeven mask identifies all columns where the height is odd and the total remaining squares are even.20

### **Solver Integration for Rule Refinement**

A Connect Four solver (e.g., Fhourstones) provides a score for every move.3

* **Win in N**: A score of ![][image40] means White wins in 15 moves.  
* **Validation**: If a detector flags a "Double Threat" but the solver score is ![][image41] (Draw), the detector has found a "False Positive" where the opponent has a forced counter-sequence.3  
* **Refinement**: Use the solver to analyze "Edge Cases" where parity rules are broken by "floating" threats that can only be realized by specific sequences.1

### **False Positives and Ambiguity Handling**

Common false positives in pattern detection include:

* **Useless Threats**: Flagging a win that is blocked by a lower win.9  
* **Impossible Parity**: Assuming a player gets a square they cannot reach.16  
* **Floating Discs**: Illegal board states during simulation.29

To handle these, the detector must perform a "gravity check" and a "temporal check" (is it physically possible to reach this state given the alternating turns?).24

## **Practical Examples and Coordinate-Based Analysis**

In an educational app, examples should be presented using the ![][image42] coordinate system.6

### **Joseki 13: The 3-4 Opening**

The "Joseki 13" opening highlights the struggle for central dominance.8

1. **D1** (White takes center bottom)  
2. **d2** (Black stacks the center)  
3. **D3** (White maintains central column height)  
4. **c1** (Black moves to an adjacent foundation)  
5. **C2** (White follows up)  
6. **c3** (Black continues building on the left)  
7. **C4** (White creates a vertical threat on the third row)

Analysis: White has established an odd-row threat at ![][image43] or a horizontal potential at ![][image44].8 This sequence illustrates the importance of central positioning and the early preparation for row parity wins.

### **The J-Configuration Win**

A common winning pattern for the first player is the "J-Configuration".8

* **Coordinates**: White discs at ![][image45].  
* **Effect**: This creates a diagonal threat at ![][image46] and a horizontal threat at ![][image47] or ![][image22].  
* **Detection**: The system identifies this as a "Diagonal-Horizontal Fork".8

## **Conclusion for Automated Instruction**

The integration of these tactical and strategic patterns into an educational Connect Four app requires a multi-layered approach. The system must first identify basic threats, then overlay Allis’s nine rules to determine Zugzwang control, and finally use solver-based heuristic weights to prioritize moves.9 By categorizing gameplay into these systematic motifs, the app can provide clear, expert-level instruction that moves beyond simple "win/block" logic and into the deep game-theoretical heart of Connect Four.10 The ultimate goal for the advanced player is not just to see the next four-in-a-row, but to understand the mathematical inevitability of the endgame board.15

#### **Works cited**

1. A Knowledge-based Approach of Connect-Four \- John Tromp, accessed April 29, 2026, [https://tromp.github.io/c4/connect4\_thesis.pdf](https://tromp.github.io/c4/connect4_thesis.pdf)  
2. Connect Four \- Chessprogramming wiki, accessed April 29, 2026, [https://www.chessprogramming.org/Connect\_Four](https://www.chessprogramming.org/Connect_Four)  
3. Connect 4 Solver, accessed April 29, 2026, [https://connect4.gamesolver.org/](https://connect4.gamesolver.org/)  
4. Connect Four \- Wikipedia, accessed April 29, 2026, [https://en.wikipedia.org/wiki/Connect\_Four](https://en.wikipedia.org/wiki/Connect_Four)  
5. Strongly Solving $7 \\times 6$ Connect-Four on Consumer Grade Hardware \- arXiv, accessed April 29, 2026, [https://arxiv.org/pdf/2507.05267](https://arxiv.org/pdf/2507.05267)  
6. Connect Four \- A Single Neuron \- WordPress.com, accessed April 29, 2026, [https://asingleneuron.wordpress.com/2012/08/04/connect-four/](https://asingleneuron.wordpress.com/2012/08/04/connect-four/)  
7. What is the winning strategy for connect 4? : r/explainlikeimfive \- Reddit, accessed April 29, 2026, [https://www.reddit.com/r/explainlikeimfive/comments/12d6de/what\_is\_the\_winning\_strategy\_for\_connect\_4/](https://www.reddit.com/r/explainlikeimfive/comments/12d6de/what_is_the_winning_strategy_for_connect_4/)  
8. Expert Play in Connect-Four \- John Tromp, accessed April 29, 2026, [https://tromp.github.io/c4.html](https://tromp.github.io/c4.html)  
9. Intro to A.I. Topics \- MIT, accessed April 29, 2026, [https://web.mit.edu/sp.268/www/connectfour.pdf](https://web.mit.edu/sp.268/www/connectfour.pdf)  
10. Connect 4 Strategy: How to Win Connect 4 \- Domino Duel, accessed April 29, 2026, [https://domino-duel.com/blog/connect-4-strategy/](https://domino-duel.com/blog/connect-4-strategy/)  
11. How to Win at Connect 4 Every Time You Play: Top Strategies, accessed April 29, 2026, [https://www.wikihow.com/Win-at-Connect-4](https://www.wikihow.com/Win-at-Connect-4)  
12. BitboardC4/BitboardDesign.md at master \- GitHub, accessed April 29, 2026, [https://github.com/denkspuren/BitboardC4/blob/master/BitboardDesign.md](https://github.com/denkspuren/BitboardC4/blob/master/BitboardDesign.md)  
13. Connect Four \- MIT OpenCourseWare, accessed April 29, 2026, [https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202\_MITES\_268S10\_ses5\_slides.pdf](https://ocw.mit.edu/courses/es-268-the-mathematics-in-toys-and-games-spring-2010/93065d11435de67c6e650adc02b6c202_MITES_268S10_ses5_slides.pdf)  
14. Connect Four Strategy Guide | PDF \- Scribd, accessed April 29, 2026, [https://www.scribd.com/doc/280987684/Fourup](https://www.scribd.com/doc/280987684/Fourup)  
15. Connect 4 Strategy \- Parity \- YouTube, accessed April 29, 2026, [https://www.youtube.com/watch?v=VSTQnPUILfo](https://www.youtube.com/watch?v=VSTQnPUILfo)  
16. Connect Four \- MIT, accessed April 29, 2026, [https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf](https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf)  
17. Connect 4 | College of Humanities, Arts & Sciences, accessed April 29, 2026, [https://chas.uni.edu/hpc/demos/connect4](https://chas.uni.edu/hpc/demos/connect4)  
18. Connect 4 Research Paper | PDF | Matrix (Mathematics) | Linear Algebra \- Scribd, accessed April 29, 2026, [https://www.scribd.com/document/549351485/Connect-4-research-paper](https://www.scribd.com/document/549351485/Connect-4-research-paper)  
19. GitHub \- dsanmart/connect4: Knowledge-based backtracking algorithm to win the game of connect 4\. This work is based on the master thesis "A Knowledge-based Approach of Connect-Four" from Victor Allis back in 1988., accessed April 29, 2026, [https://github.com/dsanmart/connect4](https://github.com/dsanmart/connect4)  
20. The Wondrous World of Connect Four Bit Boards \- Jorrit Dorrestijn, accessed April 29, 2026, [https://jorrid.com/posts/the-wondrous-world-of-connect-four-bit-boards/](https://jorrid.com/posts/the-wondrous-world-of-connect-four-bit-boards/)  
21. Connect 4 Advanced Guide | papergames.io, accessed April 29, 2026, [https://papergames.io/docs/game-guides/connect4/advanced-guide/](https://papergames.io/docs/game-guides/connect4/advanced-guide/)  
22. Connect Four With App Designer | MATLAB Helper ®, accessed April 29, 2026, [https://matlabhelper.com/blog/matlab/connect-four-app-designer/](https://matlabhelper.com/blog/matlab/connect-four-app-designer/)  
23. How to Play Connect Four: Rules, Setup, and Winning Strategies \- Game On Family, accessed April 29, 2026, [https://gameonfamily.com/blogs/tutorials/connect-four](https://gameonfamily.com/blogs/tutorials/connect-four)  
24. Connect Four Low Level Design \- Hello Interview, accessed April 29, 2026, [https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/connect-four](https://www.hellointerview.com/learn/low-level-design/problem-breakdowns/connect-four)  
25. How this evaluation function work in a Connect 4 game? (Java) \- Stack Overflow, accessed April 29, 2026, [https://stackoverflow.com/questions/30948894/how-this-evaluation-function-work-in-a-connect-4-game-java](https://stackoverflow.com/questions/30948894/how-this-evaluation-function-work-in-a-connect-4-game-java)  
26. The Complete Guide to Connect 4 Game Rules and Why This Classic Board Is Still the Best for Family Play \- AliExpress, accessed April 29, 2026, [https://www.aliexpress.com/s/wiki-ssr/article/connect-4-game-rules](https://www.aliexpress.com/s/wiki-ssr/article/connect-4-game-rules)  
27. Connect 4 Algorithm \- Connect Four Robot documentation \- Read the Docs, accessed April 29, 2026, [https://roboticsproject.readthedocs.io/en/latest/ConnectFourAlgorithm.html](https://roboticsproject.readthedocs.io/en/latest/ConnectFourAlgorithm.html)  
28. From Vibe Coding to Bitboards: Beating Connect Four with Python | by Athichart Tangpong, accessed April 29, 2026, [https://medium.com/@athicharttangpong/from-vibe-coding-to-bitboards-beating-connect-four-with-python-b58aca5d0ec5](https://medium.com/@athicharttangpong/from-vibe-coding-to-bitboards-beating-connect-four-with-python-b58aca5d0ec5)  
29. Connect 4: Spot the Fake\! \- Code Golf Stack Exchange, accessed April 29, 2026, [https://codegolf.stackexchange.com/questions/178944/connect-4-spot-the-fake](https://codegolf.stackexchange.com/questions/178944/connect-4-spot-the-fake)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAXCAYAAACS5bYWAAABdUlEQVR4Xu2VvUrFQBCFR8VGUVREG4WLCBZaCwoWPoU/ICooCDa2PouVlYWlnS+gjYXY+QC2Iv7/e87NLk4mm7gRriDsBwfunNkwJ3eziUgi8T85h06hbWgFWoIWoQWnv2YP+oSeoAnTazbKdK3WtZoOyWZuunrI1TlozEGT0Dg05lRY2GI470jV3HF6ncqTM104TqApawZYtoaBg3qsGWBdsmBtxm+YusAsdGjNEoahG2s6uqEXa5bwLN872QtNq14ldbd/BLozHoO+Gq8Kf0YuJHscZ1xdecD3neoyCt273wz6pnox+LDzyltzXrvycrDZsGYkPnDdoMSH1fD5pXdg/CYbUrygDgOSbf2jbUQQCkvo+R3LcSnhC2LwQckg9KB6MfAghmbTu7ImKbu7n+iX4mFi4OA/UsKWFGf3OW/V+E1+E5avGX4WQzCwfUtUwdm7qj6G3lWdg4vrHo4daxj4QWDoGLokuznu0gd0m28nEokE+QJSDFk7vFvkvQAAAABJRU5ErkJggg==>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAAAXCAYAAACGcCj3AAAC+0lEQVR4Xu2Xy8uNQRzHf64RIZcskGxclpJL/gFlz06EQrFQKIWSbFi/C2UjC7eIIkWRZEOERNm8b6EsJJfcIvy+zRnv73zPb86ZOef1Fs2nvp1nvjPPPPN8zzzPzCNSqfxDLFbdJW+c6p3ql+ow1VV64ICqT1oDf2COv6vOmHKlRw5Ka+CY2RMbx3sb5Y7MlcyGEh6fQ6o5qtGqFar7TS0CM1T9Evp9rprfXD3srJb2s2+/6oPqs2oT1UW8wC1XVN/Y9EAouYHHtlY7m1qEd91NU94sod0O4w0He1QfZXCcZ5ur//BUdd2Un6jumHIEgd9j04BrTGCTuab6JGWB49E5odpCdZGvEtqNN17Jn/o3SAU+SfxxwZtCHgL3nmbwXjWZTWa26pLqjfgX9fjBhsNpae0vN/DlbDgsZCODVOAPxR8XvOPkIXC7SEYeS3i9gnO2gokXKgkcK3EpKyX0f4QrHDDwn2wacsfJpAJPTQTPR+D4gyynVBtVG1TbJDzdLuclLHygJHAsCtge4RGKMxmBplgmoc0trmjDWPHH43m59Bo4XrtvJWSFe48zOraLQq4tTFPdMOWSwLGSrzLlGOhU40WOqk5KqF9PdZ3g0HPHlwLne487BxtJ+V3BHZUE7oFz8UekGCOhzQD5nYihQyOorhT04c2+VLApv5hj0rrolASO8JicwcU2C7iiDSMlr+8c0McFNiXdf8ov5qrqNil2jmNemS3rJLTbTT4PDu87/kDA7gZt9pGfIoYNRpnjbsH5F9mUwX06A+8Zm0MFBxZZo5ppyliN0W6W8QA8fE0CrA9ef9FbRL4HXh98fq+h41xsgZm14vcLbwmbQ4UXULxp9rl82fFQnmfK8eOi33jt4P4idtaXENcC7+sRoG6rKWOx7+Y6HcEm/rXqRUM4tp+ueAR3mTKYLmEw2Brh94u0LmiYjfBRP9D4xassB7sD8sC1lrKZYLuE9emVhPt7KeEeMTYLvogxRrwGH0nYS/M9VSqVSqVSqfxH/AZSZPKLhIGXtwAAAABJRU5ErkJggg==>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAXCAYAAADtNKTnAAAAsUlEQVR4XmNgGAWEQBcQfwTi/1D8HYjfoYldh6smAGAasIGfDLjlUABI0SF0QSjgYYDIN6CJo4AIBogiR3QJJIDPpWBwjYGAAgYiDCGogIEINSDJA+iCSMCNAaIGZyzBwsMBTRwZ3GaAqBFDl4ABQs40ZIDI16FLIAOQAlA6wAVA8k/QBZGBCgNEUTO6BBDIMUDk1qFLwEAgEJ9kQHjlDhAfh+KzUDFQ0jeFaRgFIw4AAFhqNpdzGLpuAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAABCUlEQVR4XmNgGAW0BvVA/AWI/0PxWVRpDPCQAaEWpK8YVRoVwBSCMC6gB8S1DBA1xmhyWMETBoSLcYHHQHyMAb8aOPAC4hQg3sKAW8M6KE3IN3BwAkqDwgebBh4gzoWyQfKrkeRwAphBoHACsWWQ5EDgB5R2Z4DIayHJ4QRPkdggTXFI/Hwg5oayQT7C5hMMALI9DYkP0rQQiY/sVZLDEwZAmkCxDALPkCUYIHKr0MSwAnSbYa6xBWIdJHFvqLg2khhO8BKN/4YBovk2mjgop6E7AAMwAvFdBki2QwbLGbBrJhiePUD8AYjfAvFnIP6DJOcDxKFI/K8MCLWfgPg3EFciyY+CUUALAABbjUmZS+msywAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAy0lEQVR4Xu2SMQ8BURCER6XSqiVahd8gWr3/4g8olCqVH6KlUGkQnUonR0hEEGaz7708e+/UivuSSS4zs5fbzQElI+pMvZ1u1JF6RF7Dl4vwRcsM6jdtECOFuTVJB5qtbeDpQwtdG5AJNJsaP7BB+pOFonUCqUKbelJ74+eQQbnwklpRd+dV41IKv68cJmbr/J/skC4NoX7dBjGpfYUr1K/YIEYKC2ui+KWBAbTQswHyw+F5TF2oDHrlE/XyoaMFHThA//fad1zy53wAhPQ9J2j9tisAAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAsUlEQVR4XmNgGJZAGogLgHgmECshiVshsTHAYiD+D8S3gdgbiFWBeBoQPwdiS6gcVgCS+AfE/OgSQFDJAJG/hC4BAn8Y8JgKBSD5IHTBD1AJTnQJNIBhuC5U8Ba6BBaAofkvVBCbPwkCkEYME4kFZGtmZoBofIkugQVgtYAYmy2AOAFdEATuMkA0g1yBDYDEX6ELIgOQZlAiQTfACIhfo4lhBbsZEF74CqVTUVSMgqEIAG1gK0HBSgf2AAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAYCAYAAADUIj6hAAAEbUlEQVR4Xu2ZWYhURxSGj9sIE0UFxS0uSCJERQUfApo8GEHFDZUsgkbGBUHBBYWooAxJXkTiixuCuKOioogYRIWgjgZfBJUQBfVBJiYkRNFoVNzPP1XVXX36VPe9PcztnvF+8DO3/qq6t7pu3apTNUQpKSkpzY2B0mghjJVGSjTeSqOM9GF1lmYjqGI9kmZzoZb1hMwLgq7kZudxl7JlUW9FbnZk/mZ1k2YZOErZ3xPn6/6M9S+ZepdZrXOzG5hGxfszSY6Qae/vrGqRp+I6ptDXO5S1lkyZESIvDrNZ/0izzMQZFJtYW730UzL1B3ieA353aSZMOzLt6GvTbWy6Z6ZEgD8oO2OEqGf9SoXLRAH1e0izzMQZFCj7qeJp/TKP9UyaCVNH5v36/ER6ezNMYM1nnaRwwWP2b+jHR6UXNa5+UxF1UHxAeh9oniPkJwWe789sYKT1g2BNBIgPtIIdWIvtNfKxNpXKXtYLaTLfsNaw9tk0gr5a1pJMCTMN/sDaYvM1PmJdIjOjYZkKMZN1gDXFpqMOCvAja5Twig0KfHjlwC0V6FufftafLvwM7scgTsD1h14eeG7/jiOTP8jLi8tr1n5pMqvIPAf3X8caY/2z1kOnbrbel9bDjsEHg/uWl95A2bY7PiFTd5FN4x7uhUYdFBqo/0aaFnwEp6WZEMPJtG258BHkw18p/Az3vGsU9L+wpWSmTIBOdwOoVFAfX5oGljDkLxQ+vNuK55Y0gDpa2+BdFOlfvLSjMYPiOpn6oYj+JpldWzEwS4a0h7WbtZO1g7WdzKxYjC/ItM2fcUEX6+M+eeDrX+ClURANcPhLBfK0jo8D6s+RpqWG9PvD+1rxzom0VhcDwPmT7bUWdZc6KBBwom6h7fUp0tuWBDgcxLOXCb+r9dUP1MUTDhSst9d/+hlk8g4LLy64R400LbNI7zx4ck2Gd0GktbrHyfhYW7FsaWUAfHwgcXBfW3uZIfiZws9talqRefZq4btlE7FVHrKxrnM/Zw3x/InWH+x5pYB7fC9NCxoo2wPglToo/C30Rnvt9us+8MdLswA4rJLPwzSvcYP1QJoK62Mq6rtAO0O7D23WbDhZ9HGndH7ABnAyJzuhFHCPUOfVkP6M0KCo89Kh9r2krI/ZAtdzs9kZtGcUQgsqNQ8g2D0jzQRBcI+4x+c7UvoL08odyg+ADpJSmIyn+XHBNlDuCBxuS1zledXWk3EIvN8Ub5uXHma9Tp53wno+7tBul/BDYDfh+kNKA/5UaSYIjuRl25DGzJkBp1kPWfdZj1mvvLxJrK+89P+ULfsfmS9Prk9x6E/5DQR4MdgFIZ75i3Wedc1ew0Me2vItmdkNHk7p5LSMcxD3gq6y2uZmN4BI3JVB3OTW3UIv1tGb8geCU+jkstg9k8DNDIfIDGrsYioKNA5B2vvADDIDO6UIOPtwO5yWDj6ASvs/T8WCJaujNFsYoyn3LCUlApWw1jYV2LIiBkqJCQK8j6XZQlAPhVJSUlKaL+8A9HFOIMHkdpUAAAAASUVORK5CYII=>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAYCAYAAADUIj6hAAAEH0lEQVR4Xu2ZWahNURjHP9NVF+FBZkkoQzx48IAHKWSKMpWh65Iiw4MSRTe8SLyYUjKHECESSua8KKQoPMgsZCbz979rrbPX+c5a++x9Tvfue4/9q393r/+31z5rr73mS5SSkpJS3+gpjRJhuDRSovFXGgnSmdVKmkVQxvogzfpCFeszqQ8E3cwO5/CYgnuRb0l2ODKvWG2kmQBHKXifOL17MOsNqXw3WA2zw9VMoPz1WduMYh2Spg9TMWG9tx9rJal7BohYHGayXkszYeI0ik2srVb6K6n83SzPAL+tNGuZpaxPFHzfw9lhP08pGDF8PGFdp/B7ooD87aSZMHEaBe4d6PBc9TKb9U2aCRK5UWBImcM6Re4XA8f0X9/LR6UDFZe/pojaKJqRuw5cnsHnJ0HkRoE5EWB94HqB5qyF+hrxI1YsLntZP6TJTGGtYO3TaSz6qliLMncQNWGtZm3RcRfdWddIjWiYpnxMYx1gjdPpqI0CrGENEl6+RoGOVxeI3CjMy2CdgOtOVgx8139HkIr3tmJx+c3aL01mGanfwfPXsoZp/7z2UKmbtTdRe9gx2KBxP7DSGygou6EXqbzzdRrPMB80aqNwgfx/pKlBJzgrzYSI3CieWdfIZPewxaSGTIBK9/WGqCA/epoLTGGIzxM+vIcOz0xpAHlcZYN3VaQvWGlDMY3iDqn85TKguU9q15YPjJI+7WHtZu1k7WBtJzUqxgXlzDvSo/fPtdLIhAIY7Acg5qr4OCD/LGlqKsj9fHiTHd5FkXblRQMw/lh93T4IZyi0UWDBibxh2+sz5C5bEqAc2IaHYtYTBmTCLgM8twOkYpGGnhDwjAppaqaTu/LgyTkZ3mWRduU9TspvRGract0D4KODxKE1qXxNZUBwmvy/W9ugHPYI60QW1lTuEFZfyx+t/T6WVwh4xipparD4k+UBxTQKewu9UV93CcIZ4I+UZgg4rJK/ZxbJknusd9J0sC6mCvkWKDM6Sig4WbQxp3T2gg3gZE5WQiHgGb7KqyD3b/gaxRUr7SvfTwp8jBa4rgzCGVy/EYZrUenyABa756SZEHjPE9I0NGA9otwF0EFyVy48lx8XbAPljsBgtsRllleuPbkOgXfX4W2z0v2119LyTmrPxhza7RK+D+wmTH1IuYA/XpoJgHpFWbBlz2E96z3rLanjz19WbAxrkpX+QsG9H0n1vOVWPC5dyV15+DDYBWE984J1iXVbX8NDDGWZQWp0g4dTWDks4xzEfKBbrMbZ4Wpw9mHuwboJHSTfhzV0pNyGYOQ7ucz3zJpmAakZwNQv6u0l+cubCKgkLNL+B6aSatgpecDZh9nhlDroAHXt/zx1FkxZLaRZYgyl7LOUlAgkPdfWJNiyYg2UEhMs8HpIs0TAmUtKSkpKCfEPYxdC1PwSBGkAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAYCAYAAABXysXfAAABUElEQVR4Xu2Wv0oEMRCHxz+NIHKNbyA2Fja+gb2Fr3GFL2EjvoNYWdhYWFwh2gkKWosgFgpWKoogIor+5pLF2TFxZ7PuapEPPtj8ZpPLHBdyRJlMpgkb8Al+eDdLVcc7fdXZxXK5E3rkPtuE3GyIAzijw5aZhldUvbcSI3AAd8hNWC6Xh5gWinCogwTMzazABf8cm/Smgxoc6SCB2L6+cSeeH8hNmhLZLFwT47qc6CABczPyJT4XPD4X2RacFOO6nOogAVMzfF52VaYnVi5SQWfNyPMiM5647sevovYTE+TW0p4FskIrpmbudeApJs/BVVWLwXfBUsCLQFZoxdRM7IU9crVLct94Ezr5mY3DfR16RsmwgJHWmxmDt/BYFwTP8EWHCbTazDZ8JHe/8L3C/71CzMO+DhNo0gzv7wZee/mZsz+jSTP/Dj5/mUwm87t8AhFIYpfqIT5FAAAAAElFTkSuQmCC>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAAAYCAYAAABXysXfAAABL0lEQVR4XmNgGAWjYBRQAuYB8Wcg/g/FC1BkIeAvA0IehJ1RpekCBBggdhMFkB2LDewDYhV0QRoDUSB+xEDYbSiAEYi3A/F6BoiGIFRpMCDKIBoCoj2TD8QmUDYuTX/QBegMcLkLA7xFYn9ggGjiQxJTA+JOJP5AAKI9g6wIlC9A/JtIYsuAmAeJPxCAKM+A8stmNDF0jQQNoQNAdxNWgJxfkMVAGruh/F9IcoQAyCxiMSmAKM+8QxeAAphmbSBuQZPDB/xIwMxQPcQAojyDS8FuBojcPSDmRJMbCEDQMyxAvBddEAqYGIgwgI4Ar1tAUfwGiE+iSyCBb0D8A11wgABOz6wC4o8MkPoFVK+A2l7YgD4QZ6ML0hmA3PcMiB9DMYgNEhsFo2AUjIJRMDgBADelWNi9f+wEAAAAAElFTkSuQmCC>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAYCAYAAAD3Va0xAAAA3UlEQVR4XmNgGAWkgnlA/BmI/0PxAhRZCPjLgJAHYWdUaVSArBAb2AfEKuiC6IARiLcD8XoGiEFBqNJggMsCFJAPxCZQNi5X/UEXwAbeIrE/MEAM4kMSUwPiTiQ+ToDsAlA4gPg3kcSWATEPEh8rAIXPZjQxdO9h8yoGQA4fZDGQ5m4o/xeSHE7wDl0ACmCu0gbiFjQ5rACXs3czQOTuATEnmhwGYAHiveiCUMDEgBlWWAEzEL8B4pPoEkjgGxD/QBdEBquA+CMDJP2A0g0oL2ED+kCcjS44CkYBEAAACJA03uJ9VF8AAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFQAAAAYCAYAAABk8drWAAACeElEQVR4Xu2YOYgUQRSGn6goqIiBCIqyoIEHXmggaiguGAgewUaCYGCsgVeiYGKiCAZiIiaKbrCZgbgmnoiK4cKykYiBouC5K17vt7qcN/9U93R1z4xzffAz9f5XVTP16KruHpE+fbqVfWz0ECvZKMsN1XY2e4hnqrVsFmWX6g6bXcgM1Xc2Db9Vc9gsAibqZsbErdErjZ2qL2zGclL1ks02pPRClY+SXVCA/BI2Y8AEW9hsQ1pVUJylD9hkDqquS/imU+8LAA7rW6pjnKjDXtUpE2M3HDFxDK0q6JDU6YPkQNI+IW5RHtyMsgbjgEb+YhKvTuI8rFGdVV2Sytk1W3VeNWH65aVVBQWpfe6pnpgYHc+Z+EzihZgpLnfBeL4weficfN4UNwZ3WAjtK75TBG1RUD/BVdVSyoFrkj74ndTm5lGchd8JmGPK+HNNO8QG1eaAvgU8aL4blouYgmI31bBKKlcV9KE6/bfQaV8A/zmbBcA8p9nMAMfQ7oAmAx602A3LRUxBMy+eFao3UjvZ8YAHcDXDP8CJSLBYzDOLEwX471sepj/HrGfZE/A88AfYVAZN+5BqoYmZy5I+fyxtUdAFJr6rGjaxJzhY+SXu/d6CR6eRpL1e3Ni08QA5nH2NoBEF/SrZvxfgD6Jgnx3iiuIXfbQ6/Q/kNrGZ8Eoq41+oFlWn5anqLXkWjNvPZkHKFPSTuCMP64Feq96rlttOCY9Uj9mM4bbqIZsR/GCjSZQpaAy4CPDIWIrgJZ6TcTaaxHQ2msA2yf43Kjd4o8EDeCzYRtPY7GB+inv5aAj3VevYrMMyNjqYUdVGNstymI0eYisbffp0Bn8AcGKjt4cDo0AAAAAASUVORK5CYII=>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAA7klEQVR4XmNgGAW0BhOA+CMQ/4fi70D8Dk1sFVw1iQBmADqQZ4CI70KXIAaANB5HF4QCXBbiBREMEE3u6BJAwMlApqHXGHBrWs8AkQtAlyAEcLnEkQEiPhFdghgAM/QDEL8H4h9Q/mUgFkZSRzSAhWcSugQl4CYDdq9TBHCFJ0UAZOAddEEsIBWIlwPxcyCeDsRLgNgARQUUVDNADE1Hl0AD7EBsC2V/BWJ7IP4ExIVwFUAwGYg/M0BiGpTPQQr/ISvAA6geVIwMVDR0DgMk19UD8QmoWAlCmjzgCcS7GSARA4qoo0BsiaJiFFAdAABRYD+4n2JkOQAAAABJRU5ErkJggg==>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAYCAYAAAC4CK7hAAACFElEQVR4Xu2WPWgUQRiGv4CioCksJBBJuMIiKiZIGjGWIYF0/hSpBMHCWgvz0yjY2CiCRUgjNgmJhV2KoGniH0FDerGysFAQRAkJ0eR7b3a8796budvdC3sS8sBLZp5vZjK3e7N7IvvsHa6wKIAeFs0yq7nIsgA+aM6yzMuIZpFlgWxrjrDMAxZqJUOa3yyzMqFZY9kCcDFPsMwCFjjPsgXgrLxmyVzXzEj4MKf5WuEwzmvucKEBlzWTpo+7f8v0LaPSYC8olpL2uLjFPDjk9SbjAKL+OOmfTvppOKO5r3kibg5yWPNQ89mMs0TXXtK8N30MfGD69xIX4qC42iPj/IbS8Cv5OyduzoEkaE/7QUR07Z/iik81XVQDzyQ++bvU1tqpXw9/57HGhvFHTZvxd62GU1K5isiP6nL5A/JmPfAfWeYA69xlGQFj616sk5qvUrvpsYADuHvw17iQkU5x6xziQoTQXsrSf0+ts1wKOA98iaUybNo3NMdNn5mS+PohgmMhj5n+S81z0/cEJyt/xf3+suAR/CJp94mbG5sPUFtnGQE/WINrDYrbjP9nt6vL/0Ctn2XCF6nMX9V0VJdlRfONnAXzrrKM8FbzjmUWFjRvWGZgi0VO8KHxyG+K4C1NyScWORjQbLLMA97AeHFlBU/CNpY5+CPuZbkrLGt6WTagm0UOXmnOsWyWmywK4AKLff5XdgD5M3Sl6Hk40AAAAABJRU5ErkJggg==>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAA7klEQVR4XmNgGAW0BruA+D+RmGSAT6MUA245nICZAaLpIroEEiDZ0BIGiCY/NPECJDbJhn5kwNTkBcRxSHxzJDZRABaelkDsCMRlUD7ZABae94G4DYinAPETqBjZoJwBYoAHmvhdJLYwEDMi8QmCzwyYrmJlgIQpDPxEYhMF8KVPEBAF4n3ogvgAGwPEwNPoEkgAJM+CJgZKzyuB+DWaOBhMYMCePkEggAEih+51kBgocmFsOFgFxH+A+B9UAh2DxH8D8XcgNoDqAYGZQHwPiU8V8BeIQ9AFKQUHgNgNiU81C0De3wCledDkRgEVAQBQOkTVbJlycwAAAABJRU5ErkJggg==>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAYCAYAAABjswTDAAABrklEQVR4Xu2WPShGURjHH18phU3ZlDIZiEwmKRbKZqQUg91ARgyKwaRIyWRUQgbeIkmR8lWIgYHksyTE/+l5zutx3Lt4h/u+dX/16577f8497zm9534QxcRkNqPwEX6pr/AOvpuszHVOF9zEfFZJ8nK/ECU8oQ0/BA0ktQO/EBXtJBNq9AtgkqQ24+WRcUjBW4AJ2x6RETShKvgBL7w8cnii/ATYhnvwTbN82ykdcPuVbyTLkeZpxQkFT2qEJC/xC1EStF+ZF5I8yy9ECU9o0w8pfBHMIDyFO7BYszP63d+/NgGX4b2eF8F5OAf74DR80log/SSDtvgF+jtZ196HXSYfgG3a/iSZBMOvawdf627WJlgAj00tW9vnsEbbSSbgM8kq+SnwQPJDlkqSga5JvhcKYY5mS/AGDiV7C3Zxu3rs1Zxf2zxOc7KHLHrFnPv/RkrUUfiA3XDdnI/rcRHOmtxyBeu1nUfhY/8bO2AunNL2MMleZjr1yPAiFsx5Nf18xdmxeHFjsMNkKdMDb0m2ED+jLfw3b8FaL18juYn5mlKT81ZyVMBL2GqymJiM4xsOi3F/cNjfhQAAAABJRU5ErkJggg==>

[image17]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAE8AAAAYCAYAAAC7v6DJAAACg0lEQVR4Xu2XS8hNURiG39xCSQohE5dcQhlIbiUZkJFCLoWSQpkp/QMkCRNMUAopzMxdBigzKSIpSYoMSO7XhPftW+uc5fv30Tn7HP/5O9ZTb3vt99t7nbXX+da39gYymUwm0xtYQb2hfgV9p15T3xJvUeXqTCFxojx7Yf5a53ckg6i+3qyDmHWeAag9sR3DJOorddb59TAKNjn7fYCsg8We+EBPM5M6QvUP55uoQ9VwKRbDHu6gDzTACVgfylpPzLoy2dwylP43qZWwwXyhxsAmsMyS2Ai7b7sPlKBoWY6lXlEfqD4u1uNcD8dtsIFqcELtR6FdD12we7RLtgr1p3p3i7pDvQ3euPSidrI7HFU70n95YNL+G0epn9RcH2iSWO/2Of9U8HsVGtANb9bBediGMN4HmuQkbEyDnb80+Kuc31Y0oIXebICYgXN8oCRF9U5chvkLfKBdrEHxQMuwA9bXch9okFjvPHFSR/sA2UM9pm5TQ4N3Cfal0i+c++c8B6upTxPvCnWfWkZdhI0j3t8NXeg7bZbVsD61ETXKfNi9h30A1ckbnpyLe9Tm0Ba7YHVzGPUAttxF+l74jpoS2kNg2axyIdTviNA+A0uKQn5Qx7zZIubBlrMv/EVowj/CMkXfsdpdNbYUZZQe7DP1nJoGe9eTpyX9kjpQudpIE0PlRUwP/lXYb26pXAFMpD4l5xqD/oi2MRL2TvkvmI3aK2cy/lz+d8NxJ/Us8VMuwDI3UqvvjiF9QNWn06G9hLoW2jNQrYVTYRkeURnYENrqK35tqXbrHXMCuu/8HcNW2JeHJkQbYMoL2MfAeucfpx5S76lZiZ9mqkqC4kXf15lMJvPf8Bv7ipaoiMjY3wAAAABJRU5ErkJggg==>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAYCAYAAAAlBadpAAAAoElEQVR4XmNgGAUTgPgjEP+H4u9A/A5NbBVcNQ4AU4gO5Bkg4rvQJZABSMFxdEEowGUwGEQwQCTd0SWAgJOBgOZrDLgl1zNA5ALQJWAAl8mODBDxiegSyACm+QMQvwfiH1D+ZSAWRlKHAWD+TUKXIAbcZMDuZKIALv8SBUAa76ALEgOqGSCa09El8IHJQPyZARKyoHT8FYj/oagYBUMdAABsmDE6TV027AAAAABJRU5ErkJggg==>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAAAYCAYAAAB6OOplAAAC5UlEQVR4Xu2Xy+tNURTHlxQpj4GJmIhEnjHxKBNS8hgQZUBIDJBEKf0mNwMMJBTyyISJZx7FwISBf8AMiUKeyZu817e1Vr/1W799z7n3nlu32J/69tvru/Y+d5919tln/4gymUym7YxgbWUdY41y/izXzlTgNOsP6wFrIWsM6wjrOWum5jJpFrDORjMFivibNSQmmJ0k+bsx0WEOUWcf/g7WR5I5QOd6pnvzk8onjPzSaHYYzOltNOuQWkDtpLTQ70g6DYiJQNmD6ASYE74ljbCXZEFNiYk2UVjoSSQd7sdEgqJCryD5keUxwexjdUWTGR/iRawDLh7O2s/a4zwwjGQ/XEsypyUaNwped4xbHBMVKSz0L5IOrb5Wq0jGj9YYhcKqMXB9XBt9djkfRfYPbgJJAU6of5VV09wN9QwUaDvrofrbVM2ykmT8pphokcJCI1m0UotYR+mx8NaQrDgU0LyatsE19YxP+tcKPc/lUNh6v/Mmmi0wl+Ra2FqqgGucj6ZRpdAYdz2aJP5l1mqNcUyMv4H4sYs3Ov+78wEmH8cDeFuiWYGJrB+s4zHRIJjPxWiCviTJlzGRIN5oTb2BwR+svt9XsVrjeMQbggfg7054cY4oCvw+wa8C9v4PlF48jYD5XIqmgWQsQmQGyVbgeU3pcSdJfDxEA/FBF09VL4IbjQ/PFgP+WfJcUL8d4HuBlXwqJpoE88GbnMQ+KL4wHvivosncovSNwrud8Ma6+Ip6AAUzjjrfOOy8+axl2ob3XtsWN8scknH+I10FXAv3Vhd0wEkhFnsaycpNMZRkXH/n3WM9crGBfraX2tZihcGpxID3zcUA284Xbftion1G23hdx7lcGXbaSG1drdKP5Jp3YiJyk7oL8Fn/ru/Rozd2BjdhhaSYTd19rDh2rBxknTS2FWuMVB/y+zEKa/505xeBh43+zZy5y9hMcvJ5xnrCesp6wfrqO/1vTI5GJpPJZDKZzL/DX647zMJyYxEEAAAAAElFTkSuQmCC>

[image20]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF4AAAAYCAYAAABz00ofAAADCUlEQVR4Xu2YS6hNURzG/3mHxIAwUKIYIAYYSAYeAwMiJhQZmDGhTKTIVTIx88jAUIhQSgYyYChFkULe72fII6//57+Wu+539l5r73N29+TYv/q6d3/fWmuv/T9n73XWFqmpqampUQapVqsOqRYHfl/VqOD4n6ZL9V71y+mz6q3qneqH8578bd3IcLE2VbBCuuewXjVetdF5KHreefDhHGWzJMvFrtvX4Zs7Rh2+O++lqp/vkMFk1XM2U/gTMmPF/I+BN1L1wPl5/cpyT2ycReSDodJ4ni2qD4F/LMhagc8T8lgaM8wXH4jv96JnnAadzrDpiE0mlhXlktgYwzgIQH6NTUfVhf/KZgDyi2w6Shd+iVin6RwoI8Qy3P5ZtFr4g2L9V3FA4LZfxqajqsKPFhtrBwcBsestXfgrEh8M6sOBIzaRIhTtn/oWVlH4fWJjYXHPIzbf0oX3g01wwiKx13mpRSs2kRRHxPru5KAkVRW+yLXE2jRV+AuqBar57u8a558N2mURm0gK33cwByXBGMfZbAKM84XNAL/I49deFsiw0BbCP99ncKAMFMvucBBQReFbBWOcYLMk/vm+nfwQ7CvQZikHDmSv2czjqsQvPlWcVB6jaN/rbBAY4ySbJfGLfLPPd4DsDZt5FBmslTzGTynW9y4bBMY4xWZJUtdxWCyP7ZyRY8NVCDQ+x6bD72jHcRAQmzBu37VsBvh1ZCUHAZ/YyABjnGbTMU21kM0MMEbeLyfsapFjZx0DbVCzJJvEGs8kf5LYJJDNooyJFd5n2O7ncVuszVTycctj7zCEfGaAWP/LHDhi8/PMEWuzK8O/77LUPADa5e13/rBb7F2Ev9W9cIz3ElhMUxsa3FJ4h/PQCf/zbbZVdUO1jnxms3TPAYsT/u7v0aKRDapXYtt4nP+R6pk0XvgB1U2x9z4MXsT59zBeOEZtMM55sQ1kjCliz3U/D+ip2OuMtoIXWLPZ7GX2qPqz2encYqMN4Bv8XzFXtY3NXgaPu3lsdjpj2GgDE9moqamp6WB+A8NwBzt4L7DfAAAAAElFTkSuQmCC>

[image21]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAYCAYAAACr3+4VAAACP0lEQVR4Xu2XuWsVURjFv7gUFiq4gCBYCAoaXCKKiY2FhaBW4h8gaLCxsBPxH7C2ECQ2YiWSPpLOCIKFoNioCG4gJuBCCCnUxHPevde5c+ZOZpyMCM/5weHNO+du32zvPrOOjr5kK3QJugltj/wj0fHfZid0FboBbYj8c9FxY+5Ai9Ar6CS0w9xEH6ERn6Vgv11qNuShuXkeQcegfdAENAVdhBaypj2uQd+hH9BtyZJwcA6yXgNwxVz+LPK4ILanT+2OsiasNjfOLLRCMnLfXH498r5BB/zxRsvWUgrPxpINzOWn1TQ3URuFcox5NQW2YUHkMPQJWpvFdshcmyeR95uv5sI1GghlJ6KNQiuvhCduw1uW359HHkmOtcebLzVIUOjsWW6hfO7Y/5YGCX7K93vQOvGShbIjzdRzWZflFppcWEPCC5MnIEcbk4RCBzWoSRtrCHAcfSv3aGOSUCgfgz/loLm+7zRowLgVb+0eK81NwjdXFUudjFDoXg1qcNRc37saJPiiRsQFcy/VUupc0WHorJoRodD9GtRgwFzfaQ2Ey5bfocVwfW/EK9T02pu8uinoVy0iFDqkgec8tFnNiLDpKGMT9EBNzxboqZpWMh5Nbhi0WBYwI16KE+bGOKWBue1b1V3DXRDzzxqAM1by4w9WWTa2itvHJJOWNZrzn6O5FkV4pfl8f4De+096b+NG4LHVO2EvLFsD967U8VyLPGNWLDCIW9Z/Au+Y/wL+G+p7+BePb9e+Z5saHR0dlfwCSKif1paXU2EAAAAASUVORK5CYII=>

[image22]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABO0lEQVR4Xu2TP0sDQRDFR60UIaWFnSDYqGDjn9rOTjsrQSyCjY2FjR8hjSBY2/gBrMxnSGORIsFa1MbCf2DUvMnM6dy7DWhII9wPHrl9b3Z39i4rUjJEpqED6AyaCf5aeB6Yc+gLakMb0Cx0Ct1Cq55FtqA39y+h0XxcRAs/oQoH4Egsvw7eBbQbxk2xmong5ehIsUtG800axzmLPtZTF3gUC8c5ILiJd7GTZyyL1TSC12PegxYHCXgT5kqsZoqDDw9S3+EvVMXW2eZA4fc6CDWxf9YTNEdZj2FskrEuttZhNMfcvItmH37bSLLppEmsQDvk6TfUeXvkZ+uNRPPGTT1VCvXv2QQnYvNeyO/btJp6GXmjJeiBvIxJKS6mt1+9Y/K/qctPF8/+y6+CWRCr00v56s/7uYqSkv9NFzmJUkzfcSo2AAAAAElFTkSuQmCC>

[image23]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAA/ElEQVR4Xu2TvUoDURCFDxLEB0iVJ7AwttZptMmz5CVS2qdKa2PlYwTsg72I5MeQGDEBFTOHuWFnD1kNsimE/eDA3nOWmbt37gIVJXFlGqpZJt9JP3FqGqm5DzcobnBpmiDLx/n4d45MryhuEPlTg6mphgM1aJpu0/MnDtAgFuQNKrVB19QO6zt4gXrwFOYc+F6sZX0NL9ASP8L8Rc1dPMBvTtQ7vEAnvKcwn6mpNEwDNY1zeIG+BgHmczWVokEew7N7DQLMF2puOTE9w49iFxwuC3xoEGC+UpP04J/GAbHBWz7GF7Kc8+A/cZGyM/i5P5kek7jRZcorKv4DGwYGTmuv7A8RAAAAAElFTkSuQmCC>

[image24]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABFUlEQVR4Xu2TMWpCQRCGR4xeQGxyinRiaRdSiCfwBCksgt4gtYWX0GBIWgs7K6scIKQwgRRpxEJCgjrDvMU/v64spAnhffDD7j8zO4/ZfSI5f52JapuoY1yphmzGOHXQufyMdVWrzDONIBalKJ78xAEg9gHJTW7Ek5vkd2D96yZLOTzEZt2GfQ3WSHKTMNu6qiE+c24aI6lJuI8X1a1qoHrNvBQs745NpieeeEn+M6wrqgLsEasds8mEp4iUxO8k8Alrxmrv2WTCfcSoqqZsAlb7wCZSFk+acwCw+BmbgMUf2UT64kn8fxgt8dipUYWPnHHAsCf3rdrIflwo879Ua9VFVoNcqz5Ub6qF+Gt8F8/PyfkP7AD2PlWMQgq/6wAAAABJRU5ErkJggg==>

[image25]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABBUlEQVR4Xu2TPQ4BURSFb6JSWYBOokAIKiwBlRVo9FobkagtQ2sFSqIQEkGj0fm7N29uPMcbMxnTSOZLTmZyzp05783LECXESJY1ZE1YOctvWfeRmbIerBWrw8qzxqw9q+llLuS5Apou5AV3VgYDZkQmX1jenMy8+KKilTm5kv8qFcl7aDJ1ClFyJjOUxgDwW0RgSZnMwBIDB5FLbmQGXOcQlsASPbRf0JISBkqcJfLpP0iRCQ8YOPi2EC2pYKCE2UmD1UfTQkuqGChrMgOyKxfiH9EEtKSGgY0MyM+IRfLwCTwXbTLv6GKAzOj16S7edfA28YnsUM5zx9p6V/E29lBCwh/zBOenRB0mtJ6KAAAAAElFTkSuQmCC>

[image26]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAYCAYAAADkgu3FAAABK0lEQVR4Xu2UMU8CQRSERwoKY4s9Gjt/BBTSEW2M9oaC0tpGWkOLv4DOP0BhcfE3GI3R2NOQ2GAMGn3L213fzS3S0EjuS6bYmeEdtywLlPw3rkRvom+vd9GEvMfYzrMpuod2XkQ7+ThNGJriA8WsLhqb9S200zdeEle6Y9OzBc0vjefW52YdPP5COU6hhSYHBh7Ca8eN97rkRx5Q/BDDgw9RfKMM2mmTH+EhKVbScWHGpqEF7Sw6fY5jaOeEg0D4fRrkW56hnW0OPBvQvMOB5QlLXheaf7FpcPlfB2nOsn0NB6XCgWcq2jPrXdGZWUfckEX/nx403+fA84ridg5ENfJwAR10QP4R9AqakW8Z4Xc3WJFr6J7b8BN61bi7biiqxnYaHp58UEnJmvIDhtliFMEegmwAAAAASUVORK5CYII=>

[image27]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF4AAAAYCAYAAABz00ofAAADUklEQVR4Xu2YS6hOURTHl1eeiUQoIgoDrwEGkuQxMCCvEkWSMDBhKEUoTIy8UgxlYKKUJBkoGUgRUh7Xs5BQ5JHX+rf2vnfd/3fOPue73+3e3Ht+tfru/q+19t5n33P2S6SioqKiQumntl7ttNpSp/dSG+HK/zUH1D6r/Q32Te2j2ie130F70xxdyxCxmPZgtbT0YYvaeLUdQcOgcztj1ZqCfk9tcCtvfawUe+44Dj9DGePwK2jv1XrHBEcftdtiMW/VFrR2p4kNMqPF9C9OG672Iuh5efXSJFbPEtLBIKltZ5XaTVd+JuZf7rS2wO14XkutD/9sjEVkuljMBaclQfBFFgOpzqR8ZbkhVkfqjYX/LpXXuHLUGu0L8n+w6ID/uitfC9o8p5XuxzKxwBnsUIaK+fD5Z1G6kRxOieWvYweBz36FK2e1i6kA2hTSyzJSLH8fOxzc7rZQxiwQ4Zhc4vyURaykJzsCpRvJoWw+v4Xb1daShhjUlfpyUhwXy8finkdRf/uL+W+xI4tY2YRgk9WOBu28i8uiqCMpzonl7mdHG2mkL6BMfipmnJjvJem5IBhz1SK1heF3Q9AvubgsUh0pIuYOYEcbOCZW1yR21AHyv7PoiIs8dnvMYbUzYv7d5Mskzu8z2aH0FfM9YYejPQa+UYaJ1TObHXUQ5/e9pHtwrkBM0c4JMXlrYjN3JP3wRYNT5E9RNhd79Dx6iNUxhh11Ehf5Rub3SDwXbWWHp6iyRv0p/ki53KcsOJA/0JU3i61T9VL0HGfF/HxyxuHyOWlXxWLxmwsCLrMYiP85nBDzSHUYn+9GFh1xHeH9uOcrCw7Mx3ySvE/laWqLScsC/eCdUwSnWvhxsmaynv9V0LDVzGSnWMAs0rFAxa1Z0byZ1XAk+nDcz+OxWMxU0vHJY570b7OHT87ePFkaM1cs5mCGjrcZvrx+4DoB66QH8Zlz/CGxu4j4qUdDGRVhMS060OAOA58Ztk4w/A3Ng9X9gdom0pld0tKHD+H3RKuIWniwvXlOqj0Uu/dhcBEX72GioYyxwcBdETtAFvFOLPdR+E2tSR0GbhfnsNjBHBG7yOpW4C3obPAGdytwcbSHxQ4G0918Frs6o1joBCayUFFRUdGF+QfWkB12JUWzSAAAAABJRU5ErkJggg==>

[image28]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAAAYCAYAAADjwDPQAAAEMElEQVR4Xu2YW6iUVRTH/5ZmUWr1UOHtRbyQdgM1NUTEvBaWQpgKHkSihB4yQ3wpUCNERUUfekgERQR9CVJJRTznJR+KLj5IZioVoaKYCZn3y/6f9e2ZPf+z9zcz55BnOjM/WMx8/7Vmf/vbe8/aa39AgwYN/n9MUaELc9+edbizi872q6MC3nO2XMUuzEPOLqsY41NY4N3Mrjq75OxvZ7cz7UwhupR+MD95xdnUwFeOAUi3Sy6g2Cca+8jJ/zfQni1E1wZPwp6JfTvtrE+pu5VZzr5XMYV/UKUvTP9HHY7rzg4F1y3B93KwzYdVFL6AxT2oDqT721nwXxAusm6w/r0UaB7qT6sYg4FfqZiRGgBqHDjyqLP1gS+PcbAJLccdxO9LvoX5JqlDYAzvF9ITtsh6i94RmFmUEbBsoyyCZaRcZsI6/6I6HE/AfLFGqB/Nvp8NHWW4icr2Erb/l4oZqYUS42PYPZ8RvdnZSdiq7ijsy2LRXsj0GCm9AHNcKsg//APqcPwO8+1AaWXxnLORzp6HTfTEwEf4m0dEU5iPGfeBOhy7Yb731VGGL52dc9Y90JgamXb2BFp74D7MPoXpnP+e8cF1CGNnqBjiB35QZsOcbci0XUGcMh0Ws0L012CbMn2/wVaqp1eml2MdLG4wrE9DYIUEVzz/PY8XQ6vmhLNvRHsK1vYq0SuFk+vHkcYJeb0kopQbzg6oGMJGDjt7FZaj+bkg0/cFcconsJhY6uIK0b8z4b+mkknxld9kWJ9onJRjsP2Ie1hHeAy2r2wWfQzsvqySqsUXRd7Y1xTHYZkmit9PYlUCN0T6TqkDtvq3ophKdOXGNjiyEJVNCmOYEmLkFQDVMhTW1hzR34Hdp7/oKbhg/L47AcWJ8Xuu8jVynuFH5DhRbDzkXdE0ZiesQIjRhLbtKaz3GfOROjJ+gPnHqqMdDIQN/hLR58LuwQqqEmLP9AfiOmEGSvnaDKgS86vGB+P1d7DJ2Bv4FJ8e8mBKYUzsfEL0/u2Bm/15tN3guYex7WqKiLeQ7g91PrPyM9KVZeuPUq9I/Emfgx4SG5TPEjrZFHz3JXYeqXbIGzDfEXVUQTMsJYelMA+yHKQtgVYpTP2p/qb0a84Oqkg+hP1olOjMs9xM6RstPvIL2k4WzwB+MMMN/mVnnwfXhDE8Acdg6U2/viOivj3z5RUfeWyEvabRQ+NPsMNoR2C/VorGa7Ydg/FvhsJqWEnmN0xvvL4FW0XzCtFxWFLyN9zc+OlXGDdG3x7b+jPTQ+hbqiJs9fiqKzRq9K2FldTV0gRrhy9PQ7bBUlgP0duLzyysrPjJ81sK+muKZYi/S/sv4MPPFo2piguGJWxn8Dbix4hOh4MVnqzrCT67vvKpCaY5+1XFOoCH5xYVa4k1sENavcBi5YqKtQg34XphvgoNGjSohnsjLCsgnBQPzgAAAABJRU5ErkJggg==>

[image29]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAXCAYAAACS5bYWAAABUUlEQVR4Xu2UTSuEURTHTymyE1kpH4GShYWysFOk5DsoSzs1ZaOUl6LYKBs2slHkGyi+grWUwmbs5OWcOfeO4++ZnjN3DKn7q38zz+/cmefffV6IMpn/yzDnkfPOueL0fB3/GtekHe44EzCrscDZMcdHpD8YMa7ddHJezPEGaYdL42qIlJQ5D6sonDxztsDdk3bos/I2SEtq2TUUTuL5+o1bDO7YuG8sky6awoEDuXwpyC23Dm6FtMcm+DqzpAu2ceCk4R8n8ETapQsHguzKCeeVMwkzLz9VdpC06B4OkAHShec4AEYLIm8SdDHNIOc/QNkIzwM2U5DTAhfjpcpZQhmRy74PLpYdB19Gq7fBDWca3GH8MkfFuxhdB/gyWil7xhkDNx9SB5+4oeAujPOSWrZCnxuE6TbrqJfzFgYP4XPXLmiC1LJY0KZtpJbNZDJ/yQeyAlusT9TzsQAAAABJRU5ErkJggg==>

[image30]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAYCAYAAADkgu3FAAAA/0lEQVR4Xu2UPw4BQRjFvyhUamdQOAQFtdJdNLQO4AQOIg5BRCkiCCEKEYR5mfk24+3OhERD9pe85r23M5k/OyI5v0bf6Gj0cDob7cmbJu1sKkZrNkPooFlcJJ01jbbOhzavcRiUx2w6SmLzLvnK2xO1xZbrHHjEVvz2RBMJD6J8ZaLYIEqs89FEIzY9cPDohG4fMlyMKHo+NfJ95mI7ZQ4cyHZsMjMJb4mC/M6mB3L8e1Fiew/0ohQ48EB+YJNBKfT/9MTmVQ4IdPCSBOmILTXIb4n98Ep+CIyBpyvFQOye67ZBN7FPDT4YGhWTdjZYJc5labRwWhmd/FJOzp/yBAX4WGqQX7cFAAAAAElFTkSuQmCC>

[image31]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAAYCAYAAACWTY9zAAABoklEQVR4Xu2UvStGcRTHv+S12CyUTRmERUkGMSBZTEaDyUAmo0UsBiYpsoksFH+CQZkksrHIQnlLyuv3dO7DeY57Xc9zn6I8n/p27z3f3/md0/29AHn+GT3UsQ8mpJ2ao6aoAhOfMe+xvAVKSjF1A51rhWqheoPYAHVEzX+MjmEVuWmsCzrHtjcCUjWqvBFGIXWL5I3VQfPXvGEYRQY1LqkiJGusHJr76A1HM/Xqg2E0UhvB+zOyb+wcmlvvDUcb9DDEYhuRE5lNY7LZk/ztL8gR7jffW8hgYxqGoXkH3sgWvx9moQU6XTyOHWjekDdINdUHnbMDemq700Y4TqAn0eoBWmDMjPsJm9C8Bm9AGxqndqFjzqgRO8BSQ+35IGmCJi97I4ZBaN60Nwzr0DFSO5KoTVoC9fa9QSagV0oUkic3exTiR9VFGXUBXbIwZNNL8pOLy9JK/M7FLbKPZMyhN8gi1Au9vxaoa+oK2th9uo0XfPqy3+ROazX+aRD7jkpo8dTfkTnlWRv4k8Ez50QuxW9SSi354F9AluVPUuEDefIY3gHu6muvt4yDBwAAAABJRU5ErkJggg==>

[image32]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABEElEQVR4XmNgGAVUBNJAXADEM4FYCUncColNNlgMxP+B+DYQewOxKhBPA+LnQGwJlcMFghjwy4MBSME/IOZHlwCCSgaI/CV0CSQAksdryR8GAgoYIPIg12IDLxgIWPKBASLJiS6BBnAZ4AvEhQx4LNFlgEjcQpfAArAaAAQ/oDROS/4yQCSwxQMx4AEQs0DZOC3BKUEEsAXieiQ+TrNwShABfqPxsZrFDBV8iS6BBaBrvgzEHGhiWC0BAZwSSMACiBPQxA5jwTCzQOwchFIGhrtQCZCvsAGQ+Ct0QRwAr4NBEqDMiG6RERC/RhPDB/BaAgK7GRCKvkLpVBQVuMFPBkjZ9hiKQXHci6JiFIyCoQkAMahSqqJcZLsAAAAASUVORK5CYII=>

[image33]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAYCAYAAADUIj6hAAAE9ElEQVR4Xu2ZV6gsRRCGy8g14UUUBdM1XBFEfPFBVMSAioqYAybui15UjAhieBAjihgwoOiT8UF9EBFEURBExKwgiCDXhKJiFnOq73TXbm1tT+/sOeeeXc+dD4qd/qt6prenZ7q6R6Sjo6OjYzRHR2ERs67aZlFcXSxR2yOK/wPeV9s8iouc79U2iWKJp9T+HcM8vzbo084NaldGMXOy2nfS/19/5DId+k/W3uhFD3OJ2tlRHJOX1X6Wfhs4/lbt71z+U22jXvQgS6V+P2q+HgSdWNBi5V0LGqC9G8Up4Be1V6OorC3l/xEp9QGsJ0nnJhmPSho8Vucc55sLNgAiXBvf+rm8hdonWWtqt3G92utR9DDH8KbwWKe9HXTgwhFij4niFEC7Loyi8qza7VEs0HRDoNbx8zUotpZ0ruuiQ7laku+u6JB62wz8a0XReFqGnXQklY4KOqPylqAdK6MbMAnIcWgXAzyCTtJVYytJcUwzJWodP1+D4h5J59owOpQPJPlWBB1qbTOYhq6NonFBFKQ/n0aYq7YMGtOGxTKPPqi2U9/d40a1E/IxN+p+tYP77gH2UXtChgelsY7aZVJu+75qh6s9J6ldR+aysWPWR3G3pLiNo0PSdfHdGh2Z+RoUtZuL/lcUM7V6BgOuqX6RNic1iPtRbZWkNwnZPNpuLuYRSYMJ/T1JsfCh2ukWJGkKIua4XD5C7bW+ewaeXOZuINGyedy4WFKih/ZNLmPGTdk3iqY+WCZJfz7oHvzzNSh+D9qhWX8p6J6mtnv2ltExPXgKCa4mIg5ivyxodL5Bxm66NeSKfLxNLh+Yy9vmskGyaJwqKYYlsMEqoPTn0M6LovKilOMj1tYfJCV1tIPy52q7u7gSxJ0bxTGxh+gjScmyvZHHaXsNmx5bcamkYJ7SUfB6L50Y7QBX3t/p1zjdz5X4mOeAHOf4rPm5n/IXrmwayzUPNw095krwcbYa1mEPREdLqFsakONg+cQGQbclcY02gwLaxMzwk7QPflOGY1cWNLBM2j/lBtMAvlckvWHOV9t+IKI/SDi/B438wvN41kuskvT01bhXUv0doqMl1OU/zIWmG0sflXRPU91Im5gZ2p4QiCNH8DCS4zwI1tEl9pPk2zM6HM/IcP3tssa+gQfN7yF4OI9NZ02M0wclqFtaCo8D57DcydOmbW1ibHoaCYkigePkE7ai8Nop+dimA9N/c2WP5TGlLecz8u+dMvwnHnLaw05HI9k0fFLG/kQ8T6RNp9ag7kVRzBwmg0l4iWWSzsEmU6RN29rE7CWjY2a4T1LgiqCXOEiGT7qL086UwScf/SpXjjCA4hzOptrl+dimGOOQXDbN+zjeOR/Ht5ZvYwmWw/jZoZwNtvq6OTok5Thtbpi9FUvfKGJ9VliRGFPiDqnEsPlEZs3eBBfAyCviUi9ym5SffBJB6p0VdDTeCDWsLka+EhNFG4iYZfeWePmvf9wQNNpX2qTCFze1TpL0v60fSF4ZqHFqauIxta/VPlP7NP+yKotTwJPSnNO8I2l5z9SHsfKJUx3fZWj/W/nXw7cZVkdcH+MYrQQ7tU0bc2skX0l563ihKH2PWWjigFrjYZk3yU6Z5LWBPaJp/IA5cV6QuX/eng18jCsl1AvJpAflVMOcX/q2sTpZHoUFhrxt0yh2DHJaFBYxTJvxM0JHR0fHLPgPMEePDRQhnWAAAAAASUVORK5CYII=>

[image34]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIUAAAAYCAYAAADUIj6hAAAFPElEQVR4Xu2ZZ6gkRRDHy5zxTCiYzsiBiCCComJERUXMnugp98UTEQMqiAkOI2bFgKL4wYigH0SEw8MDQQ9zggMR5NQPimJWzKl/r7ve1NbW7My+4+1b380Pip3+V/VsT09Pd02PSEdHR0dHMyd4YRazdrLNvThdrJ9sLy/+D/gw2ZZenOV8n2wTL0Y8n+zfIczya40+7tyU7GovFk5P9p1U1/VHKdOh/xTt7cnoigOTfS3Z/1qyNXvdQ7E82c9StYHjb5P9Xcp/JttoMrridcn+z5Md7HxKq3tF0GmB5ivPCzRA+8CLY8Avyd7wouSbFV2HJ+oDWEeyzk1S7kl2vynz38TsbLSpoAPAw3/jW7eU+bVxt0n2v2o05cZkb3nRwhrDTGHRTnvP6fCZFyTHnujFMYB2XezFxIvJ7vZiQN0NAT9gON7XlFWLBlVbtpVc/wbvSFwr2XdfKTOT3FG5J/hScswWTgf0NbyovCD9TjqSSsc7ndHo//gkWbULny7IcWhXNIWjk3QNYhvJcSwzEfaGM41HAyDShuEByfU39I7ER5J9C0tZ/2srDUicX7SnjaawDF3vReUiL0i1nnrmJNvaaSwbGntesseS7VK5J7k52anlmBv1cLIjKncPByR7VvoHpbJWsiskbjvr+jHJlkpu13GlrDCdR9fmYSkgbmPvkPy/+O402nWS221Z1UExqD76X6a8d7JbTRkWS4673enAgLP1GxnUGA9xPyZbKXkmIZtH28PEPCl5MKGvkBwLHyc7S4MkL0HEnFzKxyZ7s3JPwJNL4gc8oRzbtl6S7LKifVPKmHJL8TVR1wdzJesvOT2COBLTqUL93512VNFfcXqE5h3reUdif4mvL4SnkOCBiYiBWNYur9H5inaM7eiryvF2pXxYKW9fygoJm3Km5BhegRXeAqKLQ7vAi4mXJY73aFt/kNy5mjiS1e9p4urQGTSa+tugD9EnkpNlPV+btsMOkmNt8mvR5bEVl0sO5iltguk9OjHaoaZ8iNGZZhXbYfhY54Ac55Si2bWf8hemrBpJloWbhu5zJfi02CC0wx71jpaQcFLfru/DovnEBk7XV+ImiHnEi44255ngJ2kf/I70x54baKCZtH3KFU3UeLdnhrkw2Y49EdUg4fwWNPILyzNFj1gp+ekbxIOS6+/kHS3YTHLdaMoeBs4RXQN9FOkW7uGlXgxoOs8kdY2JII4cwcJI9usgaEdHHCTZt493GJZIf32dItk3sKDZPQQL52la54fpA0u0/0HiPRU4j+ZOlqa28VZCcm2J2qDLUyMkigQOk0/oG4XVzijHuhyo/pspWzSPibaczy6/90r/RTxutCeMjkayqdikjP0Jfx5PU8fXEQ02rx0tvUl4xFzJ/88mk2dQ29hv2s9p3B9/j4C4uvP08JDkwIVOjzhc+k+6u9HOkd4nH32xKXsYQH4N5yKvLMe6xChHlrJq1sfxruXYz1q2jRG8VuJ/yjsa0LegyBRyHK9F6KwYfaPw9XnDgmuMz5vPS4Ad2Np2sPlEZs3eBH+AsSb5Vz3PXRI/+SSC1FvkdDRmhEFoXYx8xSeKOhAxNmZAEy/79U+3eGlftEmFz29qzZd83doPJK8MVL80RWi+FBnfhizPSX1O877k13uWPow3Hz/T8F2G875bfhX/v9Yi2Kmt25hbLflK4q3jURF9jxk1dYNltYXpdCY7ZSb/G9gjGscPmDPOMsnb8qOGj3FRQj1KZnpQjjXsxEbfNqaT3bwwYsjbNvViRy8LvDCLYdn0nxE6Ojo6psB/FZCna1hSvXIAAAAASUVORK5CYII=>

[image35]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEsAAAAYCAYAAACyVACzAAACgElEQVR4Xu2XS6hNURjH/x4lr6TkysAjQwbCwJTuQImSAWWgmJgZGckEA8lEyaurDEwJAyEzMRCl5DVQSijyfr99n2+tu7/zt/Y+5+x9bqdb61f/uvv//9a6a62z9tp7A5lMJjN6OSB6J/oT9EX0SvTDefNiMTFe9J3NPvISxZhVb0Sf3PWRonSYrShqLlJWSuyQuQLzFzjvQfDK2vSTU7AxTSF/evDvOO+WaHP4exyK+UwYrihBi66xKayEZXc5EN5j5BZrFhsdUvUD+mws7O6ZU8SYDMsr75aNsKJBDoTjsOwk+cpILNYKWJ+7OegQbfuNzYBfrFV0HUl5LdxDeUFV414u1hZYX9s46IIBWB97OBDOwzK/IU6I5rtrpWq+/0gVLBb9FD0m39OLxdoF62MtBzU4DOtrovP0LDob/EXOTzEJVveEA48W6BPwhug2bBur1+6ga7JYOrHfomUcNCD+6DqPm6JH4Xq/L6rgM9rMJ55XepB77ge/ijqLdQb2ejKXgx6gY+HzSg9w9deTz2yH1elOLOUh0hPeB/NncuCos1hXRS9E0zhoyGzYWPZyAPNTT/PIUtgub0vcusxHmD+GA0edxYqchm17/+huwhBsLPr49ywPvr4vppgB2+me0jNLO7rOJsoX0dNksSIHRb9ESzjokrLxXob5xziA3XL6ls+k+sFOWLCGA/z/z1MdtD0Qu2AHrK/VHHSAf/tmzsH8Q+467r7YhtVyS2rDD7BV1afgW9iv69HHrDZ8BtumU12mbZ/Dtqvqqeg1Wj+J6rIB9n/1m60T9LtOx6/z0Pl8Fa1rqSi+cy+IjgZvU/BSuhRqRg0L2chkMplMJtMP/gKU0tKfn/OHMgAAAABJRU5ErkJggg==>

[image36]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAYCAYAAABEHYUrAAACD0lEQVR4Xu2WzytmURjHn6ghJBaEhdIs2CgWWFnRLCyUYjNTJgu7saFsZMXCzlLyBwgRU8rKiqXUTCk1M8mvLGgIiczwPJ1zvMf3PffH6cri7X7q233f7/c855zn7d77HqKUlJR3oJD1hTXH6rL8fFal9d2bSdYV60nrjvWXdcn6p73Tl9HZlJEa8xb0UmYPg6w61pD2pNGgdeQHWUAzDNMsUkPKv7G8Ctah9oPqfDkgNc8n8IUSyl5nlHVt+YtWFokUfEdTgwvZhGVx2SI1RykGFpL/QFPj1Ww3qYImDJhyUpncWi6SNjtLqv4zBoA8Wj1oarya3aHgDZtm8jDQJG02bv09GhZezZoFP2o1sKa1F/Xgx92si3lStRMYeOLd7Cark9Whr/3aX7fGuUjSrKktwsATmWMJTRfmeW3GgCkglf3GwOItmk2KzLGMpotdCl8wakNReRhxa3+iAcgcK2i6iFowaR7Gf4pX+wcNQOZYRdOFDNxAU2NOVrUYWIQ1W8X6iqaFeS/0YWBxi4YDmWMNTWSY1MAW8OtJveola4UMCWvWZHLUC+IXqTGN4Mv5WP7bi8FHPpCq38bAMMV6oMxtZCTfH0m9kKL+5OXsLGfmIy35LJ7NGGuPNQA+MkKZPVzo68yrEdl8Y52zTkitf8w6o+DDz7sgh/Q2NHOVfTRylXbWOJq5SjUaKSkp3jwDWrOomntGtFkAAAAASUVORK5CYII=>

[image37]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAYCAYAAABEHYUrAAAB9klEQVR4Xu2Wuy8FQRTGTwSRUJAgopMoFGgVClGgkUhE53/wD2iIaOiFkKg0KrVKKdGjRRDvZ7yF8zmz9849dmYf91b37i/5krvfN3tmZu/OzBJlZFQMI6x9bZYrP0Y+ulgX2kzIOOuO8v19mOt71pfxrljVwQ0hNFL0WJ1skHuywySdB/llYZwaV3/glP5nLaxj4/vu9VLFeqR4BUo92XdtWiDf0aYhzlhDuSZ5ZeIUKNVk20hqzerAwjceX+akh7VpfgfrxUepJrtEUqtOBxa+CfkyJ/YN2ImjCpRqsnEG62vjy0KZY41a11skBZotT4Mcm1WxoM6bNi0aSNp868CQeLK6s0WSAoPKt0F+o82EBOt1Rvk2qyRtxnRgSDTZQ5Id2NYLSYEpq50G+a02E7JCUiftegVReY521q42mV6SAms6sECOw78Yoga6TpK36sAiqkYOV6NakmxPBxbIH7RpwMMa0mYIqOE6X/F1hXxCB4rIyeK1OSd5XcPAxoQCnzqwQP6qTUPkAJh+kjbzIf6RyepVFoa3L5xreP2wuWCyz4Xx364X5Fi/OHP7TNZNsk7xCXdihIf2ZPKAZdYBq0P5YJLy53ggXOO7GA9vm9WUa+0GYzyj/Djwu9hllZoFVo02yxX8UxXBNGtAm+VKpzYyMjJS8QtHZq1ZMmmy1QAAAABJRU5ErkJggg==>

[image38]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAAAYCAYAAADjwDPQAAAED0lEQVR4Xu2YXYhVVRiG3zQtMbW8yMgSSa3wJwrKSvEi8i8Ff7rxJ3QQFQ27yB/CG4MoJDRU9MKLRDBCUC+CStQInRstkqwuQk0FA9Eo+hHSSs383r69Zta8s/be55xRZ3TOAy8z5/2+s/baa6+z1rc2UKdOnVuP8Wrcxty0ex1m+tW0VwMVsNi0Us3bmO6m82qmeAee+F+mv0y/m/4w/Zt5Z5uyW9IfHiejTROiWBkPI79d8gua+0Sxj3z4FyNvaFN2+/Od6UvTEtMc0yzTTNOMTIHppq+jz4WEG1UehPt/asD4x/R59Lkx+r8Mtnm3msL78LyuGkB+f9uLeAKpOMlj6PUTLwkTP1YzI28A6HHgSE/TuihWxCj4Ay3jKtLXJV/BYy9qQGAOrxdzF3yS9Ra/LfA6Y+DL+WDTI5lS/Z8PX5EKmQL/8pMaMO6Dx1KN0OfPlpyLAyVcRmV7Cdv/Tc2MvImSYhX8mg+If8B00nSH+LWQWpK+MA1XM6O072wwLyncfBcNGD/CYx+iZWUxwvS06Qn4g34hihF+p4d4Sh943usaMHbCY69poISPTD+Z7ow8Lo3c2z6JvOsBf5271Ixg/yepGRMGflCmx03rM29HlKe8BM95S/zJ8E2ZsdPwmRrolfllvAfPGwLv06PwQoIznr+ee5tTq+YH00Hx7oe3/bb4tVJ2j5dM+9SMYQP7TWPhazT/zs383VGe8iY8J7V0cX19VU34r6aswyRUfuPgfaL4UL6H70fcw9rCPfB9ZZP4z8GvyyqpVrZlKuIYfKVJEvaTpzQA3xAZO6UB+OzfiualRGcuBzXFPFT2UJijVUugqAColsfgbcVlK1kIv85D4lcC2xuoprAHBffwDQqC8JjGF4mnOdvhBUKKBrRuT+kLz1mhgYwj8PjzGqiBAfDBXyo+zxm8Rt5GnccClN8f4QqUm6cDqqTi6vHG+Pkw/GF8GsWUsDwUwSWFOanzCdHr1wI3+5/ReoPnHsa2qy0iAtyvKunbUeRXlv83kPeKJJz0OegxqUFZneOTjdH/ocQuIq8dMhUeO6SBKjgAX5LjUpgHWQ7SlsirhaK+x/xt+kxNsgzewDPic53lZsrYSImR42j9sHgGCB2KN/hnTZujz4Q5fA+UgqU34/qOiP4HWayo+ChiA/w1jR4av4UfRq8HlT4U5kyLjXfhJVnYMIP4+Qp8Fs1uyk7DkpLf4aGSf8MM48YY2mNbZzI/hrHlasJnT6i6YtFjbC28pK6WBng7PG3HsELiEtZN/LYQ7rsM5nUo3kD6XdqNgDf/snhcqjhwfK/XHvBFZeoY0e5wsOKTdWeC966vfDoEE00n1OwE8PDcqGZHYg38kNZZYLFyQc2OCDfhzsIratSpU6cargHA4B/73pdiawAAAABJRU5ErkJggg==>

[image39]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGUAAAAYCAYAAADjwDPQAAAD/UlEQVR4Xu2YWaxNVxzGP9QUswhiehFDtITELB7EWBLTC62ENCJmMUW8kIimaVQQHjwQCRGiHiRaUU2DFx6I6UGoISHEGNUmKDWuz3/ve9f97tp7n3Ouuod7fsk/55zv+++1915rn7X+awMlSpT49BilwmfMR7vXL108cvGbGjkwx8VKFT9j6rn4R8UQ38MS30bxr4vHLv528TrS7pRlV6Q9zCdDXIz2vCw6Irld8hDl18TgNXLwn3laj7Ls4mK5i7kqRkxycUbFJOIbVdrB9CdqOF64+MP7fdz7ngXbbKCisA2WV0cNJF9vdbHXxX8ov655Fe0K0G+jYggmHlQxIqkDqLHjSCMXGzwvjcGwAc3iDcLnJadg3nA1BObwfD71YQ9ZU9E/FFmDMhM2I6UyHtZQbzUcLWBeqBHqF6Lvd30jg5fIbS1h+3+pGJH0oIRYBTtnW9GPubjmopboVSVrUEjmtXOOS0qKb762Go6bMG83KlYWPV30ddELNtDDPI/wmIaiKc1geYvVcPwM8xaokcEBF/dcfOFpnBq5tv3iaVUl10EZq6JP3PGdo+juYmOk7fPylK9hOWtEHwdblOndgD2pMU0iPYv1sLwusGvqCisk+MTz39O8PDVvrrg4IVprWNtrRS+EXAaF688RFX3YyFEXI2BzND+nR/ohL09ZDcsJTV1DEa5A+K/JZVDiym8k7JoYHJSLsPWIa1hVaAxbV7aIPhB2XlZJhcLj56soXIbNNEHi9aSPGrAFkd51NWBP/w6UTyX65LJTQ3yH3AaFOSzNQ6QVAPnSDdbWFNFnwc7TQfRcYHsLVRQOI+UeziHFhHnqzxZNc/bACoQQM1C5PaUlLIf1foizMH+QGgXQCdb5S0T/BnaOr0TPBR63SEWBM1BiP2iHKiFfNd4Yf5+GDcavnqfE00ManFKYE9qfED1/IXCxf4DKCzzXMLadbxHhw+NDBYrPJSRXlu8bSHpFEu/02ek+oU75IUEnm73vcYmdRlI7ZALMO6lGHhyDTcl+KcyNLDtpu6cVCq9P/3nKcxe/q0iWwhroJzrnWS6m9PqLR/5E5cHiHiDuTH+BH+Biq/ebMIfvgUKw9Kav74io74q8tOIjjU2w1zS6aTwP24x+CFrBrpHVYxrMmegLP8JKsnjBjIO/X8Geom/LssOwpOQx3FTyM37CuDDG7bGt25HuQ2+ZirCnJ666/KBG7ydYSZ0vM2Dt8OWpz07YFFZX9ELYD3tfx/u9FX3eh/VzCF5PUbEC4Xdp/we8+cmicariA8P3etXBVIS3EdUOO8vfWdckeO/6yqcoGOPiqoo1AG6ej6tYTKyDbdJqCixWnqpYjHARrilMU6FEiRL58A640hu8D6XgBwAAAABJRU5ErkJggg==>

[image40]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAXCAYAAABu8J3cAAABFklEQVR4XmNgGAWjgL7gDLoAFBgC8R4gNgJiJiBWAuIJQLwBWRGl4CQQ/0fC2IALA6oaEH6FogIPYAXiUnRBPKCIAbdD7IF4KxDPAeImIOZBlcYPOBio5xAbIG5EFyQWgFxNLYdYM1DgEF4G6jnEEoiXMkDklwPxNyA+hKICD6CmQ0C55SGaGEjtYTQxBhMsGJTAJmERB2FsAJ9DsIEXDFjU+2HB4UC8AIs4CGMDpDrkAANEvTiaOAagZtTAyg5kACr8QGKg3IkXUNshq9HEfkHFCQJSHdLFADFYFF0CCC4wQLIwDEgyQNTGI4nhBMQ6BOQzUMJ7AsSPofRrIF6MrAgIrjFALIeFBKjYJwoQ65BRMApGFgAA345JQRy7td4AAAAASUVORK5CYII=>

[image41]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAWCAYAAAD5Jg1dAAAAqklEQVR4XmNgGFqAG4h3AfF/ID4NxIyo0hAgzQBRwAnlC0P5THAVUPAViFeiiZ0B4h9oYmDdYWhiVVBxOLCDCtggCwJBPFRcCCZQABUwgglAQShU3Bwm0AQV0IMJQEEgVDwaJhAEFTCGCUAByM0gcX2YgBZUwBkmAAVpUHF2ZEGQQA6yABBMgIqjgG9AfA1N7B0Q30cTY2BhQLU+CsrHCUDWnQDiYHSJYQUA4f4lJK6jxZYAAAAASUVORK5CYII=>

[image42]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEkAAAAYCAYAAAC2odCOAAACU0lEQVR4Xu2XPWgVQRSFj6JiYaOxkDQpAv6AxkYQBA0aEhE0ja2dYCWCpaQJWCoIChZiCAgGTBBThaRWUJJeYyEWopIfRY1RQU28hzvr3ty3s1lE3nsh88EhO+fM7M67uzuzARKJRJNxUvTcm2uA3aI+0W3RDuOfN8f/jeWgMvaKZrzZIJ5A5/tU1CU6KBoXPRZdFC3lXf9yRPQFOu6Gy1blPuJF6hHNIc9nV8Z1ZzN0Hh9EG1xGJqD5TeezmPYGvxBdMe1SNiKvblGRLM1QJM5h0ZsO9mkx7avBy9gZ2mPGK2VetAlro0hV5kh8H7YHnMeloxIHRMPh+BdqT+5pZJG4zvD6Qz4o4Lc55obEcWdDu9dklbBF4c7WzEWq+hR5HkDHnRP1i7aL3ojemz5R+J6eNu1R6Mn4vsZgzkW8EfxrkV5Cx310Pr1bzqvhh2tfgw487nwLc+4qVeDCeaii9oQxMdiH137tg8AZ0QlRJ3T+3Sabgo69YDyyatGnoTua1TfooEumn6fojsRog77/VXQ0jInBbyBee8QHwjboenUd+Q+/bPLB4LUbj5QWqVX0zJtCB3TQXR8YmH/yZp3gtX9608Ddin3uOP9U8Pc5v7RIsWALNOPjGYP5Z2/Wie+Iz508hOa7fAD1uXB7r+arfCt0RedrVUT2gVV2t5hzso2AH72xu38M8Yzcw8rPAr6iNQXlP398TbjoskhfbQg9QZZzfeI30+GQ7YeuQ2+hW2e2fS6EvN68Ql4QzsE+JZNZpwIeQfu+C3/5uxKJRCKRSKxv/gCMBbHd22z+EAAAAABJRU5ErkJggg==>

[image43]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABOUlEQVR4Xu2UvUpDQRBGJwZBQfABBAvFUhQrtdYqXZ7ARrBLxMrOpxDsBPEBIgQiCjZ5gpQJ1qJp0tjERP0ms4tzZyckRBvhHjgk+83+5m4uUc4fsgKr8AquqXxffZ+ZG/gFO7AEN+AlfIF7oRaphdo6LMAt2IDbqk8CT/AJl20BnJPUWyprhkx7q+oJA8ru0oPrZdV+gqckpz9TuUuPZIJFWzDYTTyS/EwT2SQZ3LYFB7vIA025yJBksPccJnEPK7APr0nmOdEdIvGBzcIdvFDtBZK5DlQ24jeLeCTzFUPwqsMxeBuZtwE5i4wNDbvwyGSrJOPqJnfnew4hn8qD8zcbkrxqeNyhyTnj/1xCLNiFdmDXZBoeN6fa8a3AF8CF73w86nv4PM70SOEF+Pp+0M/YpUyPnJz/zTcXt09B9E5s1gAAAABJRU5ErkJggg==>

[image44]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAK0AAAAYCAYAAACIqH2FAAAEaElEQVR4Xu2aS4gWRxDHy6wkJgaCD5CoeDAaPSj4RiMGQQ8+8IHxJCiLoF5EEsFAEtEVNYhEFJFAEEQQUW8iCIIQCB70YAjowReiEqPGB0bX4PtRf6p7v97a7p5edr+ZVfsHf77prtrp6umanp6eJcpkMplMJpN57xjA+pb1G2uwU/+Vc5x5i9nEesB6bfSYdZ/1H+ulqbvR4h0Gfn10ZcnsI4njEms2ayjrV9ZN1iRjC7GA4vZ6c531jGrj0My6y3rk1G1s8Q6zk3VWV5aIjbVIp+0feHjI+kZX+rAn0/QnqcfFC3GAxKfKpEX7r1ifaQPzA4n9jDY4hPpfJkNIYtisDczXJLbD2uDwCYlPlUkLvieJI5R4mBB36ErDCor/bSvgeERXGmID2pt1japN2hcUjs8CO2ZTH7co3sey2E0Sw8faYDhK8Rhx03aFpLVP7hAbKDwWdygxaeeSOI7SBqYXiQ3LBh+wjTC/VSQt7trYQFtCF3EO6zvqGklbFMMsEvs8bWB+YY2nrpG0vn6sco6byJ8rGEuQlLR/UttGLDaAD7SB2cMaTtUl7UiSdi9qg4dQ/56YX9+FLhu0b+PxMYPERz9aP2KdN8dVJ20DSQzIKRf32mLcNEtYjeY4KWntgH1hhETcbuoOOX4un1JtMV1V0toXRd86NoWrrO7muOqk7UfSfpOqd9lF4rNU1T93jqtO2jUkMaxjTSR5il9gXXGdPODly5KctL+zprOmmV9kPuqxjvKB9ZOlqqTtSKJNYa13yh05V2eAXQ6030MbHJ6S+Hzu1K1lTXXKVSctkg8x/EyyZDloysinEP+yujnlwqS169nR2kDy2IHtsqrfyhrrlFOT9kPWuES55w/RkURzZyeQei4dZ0ztIaV97YMlG16CXVKTVscaU3vQMYJzqjzfOcY63V3vgsKk/YvaNuKig0Di6SBSk7YnyU2SIrwgxbBrJ9ylRej+YVD1jKb7GULHGRNiTAVtx9azi0l8sJ1k+d85tqQmrY41plSw1EL7p1S9u8+PDz/YS7b4XvALk7ZosLQdG/YnlLCZD5+TplwWOjYfWFc1qjodP2TPheOVNddSGEjSNraCQsCuP/LoPth+IJlxPLnmWgo/krQ/UxscmlVZx4/3JJwDEyPKXuBwTFca7H7bIG1QLCfxK5ppOxssW9BugzYYUH9bVwZIuQHqxV6StkPbdtgK0oMdAudJmWnrAW6W2DVcSPLlL8aXJOcIzrSrSRywv+cyjGqL/gnK5uMnEl80WDZoFx8XdOKOIdmoTqXKpPW1jfUqXmRQv1/ZYsC/KDHqha8foC/rDxIbdkli4OkAP0yErdhC8p3bfkGxQhkJgBlsUYt3GHx4uEdykf5m/UMyO5fNcar1wd7ty1p5hMHNif9NQPwQ1sjbWnnUD/um7V5/vCBibQub3tqKgX5j+YA+YDxwwxa9F3QWiNduP2qhT7Ah34pyA//zghyyfUA5k8lkMplMJpPJZDKZTCaTeRd5Azj+e1b7k7O1AAAAAElFTkSuQmCC>

[image45]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIEAAAAYCAYAAADdyZ7bAAAD0klEQVR4Xu2ZS6hOURTHV97PkIiJUpKBR5mQR5cBSUQepQwuM2XIQHl0DRh4ZUIeYUBhbCZ1b0oxERNCKeSdt7xf+2/tdb/1re+89jnfvecbnF+tOvu/1tlnffvsc87a+yOqqKioqKioqGhkn7MPzv56++rsrdHudkdHM8XZSysGssrZO6pd84dvv3f2y2uvnfWTEwxXiGM+OWs3vhDmUC2HNFvmzxFueP2ZszbjC6FIDoXGQTqN4js1+hYT3xQ571W9OzdJeTylaB/y6+uPhxPHPK65c/GRoq8lwDfSHw9w9lP5DhD7ryktDyE5gMLjgBOuWtEzjNjfYXSh2ZMAPyYO+LtUe5fXdiotaSJlJa0PneNnZ4dUG+DNiPNHGz2EkBwKj8M64uCF1qFI6hB6MybBOOK+dluHwuYxzbf1a9HGhIKnCeffNPopdfxbHcv1xihts9cuKi2E0BwKj8MdSg9O6hB6MybBUeK+BlmHIikPAX58E/OylbiP5UZ/qI5Xq+OZzvarNugg7uOg0bMSmkMUQeOQdWDjYpo1CZKuISTFjCAuaL9YRyBSFM/ztoG4OG1XMWmguEYfA60jI0VyyDUOuFiXFRUoAhETt0qAD0ViUdDPNysqpDbRr0EB38ITxKsbvFGKIBNtr7PDzjp9OysTiOOL5JE3h1zjIPXAAqNrHhDHjLUOD3xvrBiI1AMdRtecJI5ZYR0GGcA8YAmKc68b3fY32bQ1iD1txQCakQPIPA73KD0Q/qinT4Afr78iHCfup2g9AC4Rx523jgxsIz53idE71fER4kkbBb7BW6wYSNEchMzjkDawUjT2sQ4F/NjUKUJaHmeI/fZtdIt4Pa3ZQRyr1+5ZwXIvKQ8Q579PjYXcWdPOQp4cCo0DguL2B7BUg3+qdRgQg0IkiunOFlkxAvQRtz+A3UT411gH1SbPEKWd89oFpeGpaVftOKS/OLAruMmKxE/dbKOt9Sb0ZA5Zx6GB7cRB9iatJL6pqTPIgz5QiESR9oPAXOKYPRH6I+8banzCE+Ktb03UNUWTHbUopC6xa3Mwg/htZ/sFKMakf2uDVVxP5pB1HLpB1YhvvE4Wyw88ibiZmEHYCk0CbwfUAdjKRQKw59S4Lj1GvKqYaHSwnmr/C+g88L8B8rjsbFR3dDy3ic+V+uZFvfs/mPD4tG20DuJ1Pib8H6rPRQw68sLKJeqpsvHaND2ZA8gyDqWBGdrfiiWw1NksK/YyrZBDKeDJbgXwhJRNK+TQ6+AV2GbFEphP9X+ulEEr5FAKk6xQEuOtUAKtkENFRUVFRYXwD37vlQC3HMQ6AAAAAElFTkSuQmCC>

[image46]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAAA+0lEQVR4XmNgGAWDHewC4v9EYlwgiAG/PBzgM2gVEP9GF0QC+PTCATMDRNEpdAko4AXig+iCUPCCgUhLShggijzQxDmgND8QNyFLQIEvEBcyEGnJRwZMRVVArAJlswIxN5IcDPyA0kRZgq5IC42PDTwAYhYoG10/BoDFBzaMC9gCcT0Sn5B6hnIGiAI/JDE9IF6NxEcH6CmNoCWfGTAVpAKxJpoYDFxmQCQIGCBoCUEFaOAwFgwzA8TOQSiFADYGiORJdAkSAV6HTmCASIajS5AIsFqynAESF++B+C0Qf2CApPnpyIqIAD+B+DkQP4bil0Dci6JiFIyCoQkAwpFXMdQ4PucAAAAASUVORK5CYII=>

[image47]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAYCAYAAAAPtVbGAAABK0lEQVR4XmNgGAWDHewC4v9EYmQQDMQ/oOJbgJgJVRo7wGYQDKwC4t9I/BVAnIzEv8YA0cuFJIYBmBkgik6hS0ABLxAfROKjO0gfyn+OJIYBShggijzQxDmgND8QNyGJg3z1D4lvzgDRfxZJDAN8ZMAMqiogVoGyWYGYG0kOHcDiVRxdAhmge18LjY8PZDJA1EahSyADWHxgw4RAHwMkZX0BYg00ORRQzgAx0A9JTA+IVyPxCQEXBogZpegSMPCZAdPVqUCsiSZGCOD1PV5JLACU0kDqQQ5BBjBzGNHEGdigEifRJfCAyQwQPd/QxHE6dgIDRCIcXQIP4GHANAyU+0FidciCyxkgcfEeiN8C8QcGSDk0HVkRHgBKGCBDQZnyO5SdjaJiFIyCoQ0AynJW04KZh6sAAAAASUVORK5CYII=>