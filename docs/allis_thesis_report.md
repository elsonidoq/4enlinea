# **Strategic Logic and Game-Theoretic Foundations of the VICTOR Connect 4 Solver**

The game of Connect 4, while appearing deceptively simple to the casual observer, represents a significant milestone in the history of artificial intelligence and combinatorial game theory. Formally classified as an adversarial, finite, zero-sum game of perfect information, it was once thought to be too complex for exhaustive analysis by the computational standards of the late 20th century.1 In 1988, Victor Allis solved the game, proving that the first player (White) can force a win if and only if the opening move is made in the center column, d1.1 If White starts in any other column, a perfect opponent can force a draw or even a win.1 This solution was not achieved through raw processing power alone, which would have required storing or checking trillions of positions, but through a sophisticated knowledge-based approach embodied in a program named VICTOR.1 Unlike pure brute-force engines, VICTOR utilized nine strategic rules based on the fundamental properties of the board’s geometry and the mechanics of alternating play.1

To understand how these strategic rules function, one must first grasp the core concepts of square parity and zugzwang control. In Connect 4, every square on the 7x6 grid is identified by its coordinates, ranging from a1 at the bottom-left to g6 at the top-right.1 These squares are categorized as "odd" or "even" based on their row number.1 In a standard game where players alternate moves, White, the first player, typically occupies odd rows (1, 3, 5), while Black, the second player, occupies even rows (2, 4, 6).1 This distribution of squares is the foundation of "parity strategy." A "threat" is a group of three discs of the same color placed such that the fourth square in the sequence is empty and could result in a win.1 Strategic play revolves around creating "good" threats that force the opponent into a disadvantageous move, while neutralizing the opponent's threats.8

The most critical tactical concept in VICTOR is "zugzwang," a German chess term meaning "compulsion to move".1 In many Connect 4 positions, a player would ideally prefer to skip their turn to avoid opening up a winning square for the opponent.7 Since skipping turns is illegal, players are often forced to make moves that weaken their position.7 A player is said to possess "zugzwang control" if they can guide the game so that the opponent is the one forced to make a losing move.1 Generally, the second player (Black) begins the game with zugzwang control because all columns contain an even number of empty squares, allowing Black to adopt a "follow-up" strategy—playing in the same column as the opponent to ensure they always get the even squares.7 White can only seize control by creating an "odd threat," which forces Black to eventually deviate from the follow-up pattern.1 The nine strategic rules developed by Allis provide a mathematical proof that the zugzwang controller can refute all potential winning sequences by the opponent, effectively turning the board into a "house of cards" where every threat is neutralized.1

# **Claimeven**

## **Simple Explanation**

The Claimeven rule is the fundamental defensive strategy for the player who controls the zugzwang, allowing them to effectively "own" specific even squares on the board before they are even played. It works on the principle of vertical pairing. If a column has an even number of empty squares, and the controller of the zugzwang always plays directly on top of the opponent in that specific column, the controller is guaranteed to occupy every even-numbered row in that column. By doing so, they ensure that the opponent can never use those even squares to complete a winning line of four. This rule transforms the second player's natural parity advantage into a concrete defensive blockade.

## **Strategic Purpose**

Claimeven serves to neutralize horizontal, vertical, and diagonal threats that rely on squares in rows 2, 4, or 6\. In a standard Connect 4 match, many potential winning groups for White (the first player) are blocked if Black (the second player) can guarantee that White never occupies a specific even square in a given column. Because White must play in the odd square below before the even square becomes playable, the zugzwang controller uses the mandatory alternation of turns to their advantage. This matters because it dramatically prunes the search space for the solver; if every one of White's potential groups of four contains at least one square that Black has "claimed" through this rule, White is mathematically proven unable to win via those groups.1

## **Example**

Consider column b, which is currently empty. The squares are b1 (odd), b2 (even), b3 (odd), b4 (even), b5 (odd), and b6 (even). If Black has zugzwang control, Black can apply Claimeven to squares b2, b4, and b6.

* **Coordinates**: {b1, b2}, {b3, b4}, {b5, b6}.  
* If White plays at b1 (the odd row), Black immediately plays at b2 (the even row).  
* If White later plays at b3, Black immediately plays at b4.  
* By following this sequence, Black occupies all even squares in column b, preventing any White 4-in-a-row that requires b2, b4, or b6.

## **Step-by-Step Logic**

During the evaluation of a board state, the VICTOR solver identifies columns where the number of empty squares is even. The controller of the zugzwang then designates the empty even squares in those columns as "claimed." In the actual flow of gameplay, the controller adopts a "wait-and-see" approach. They do not initiate moves in these columns unless forced or unless it serves an offensive purpose. As soon as the opponent drops a disc into an odd-numbered square (the playable square below the claimed even square), the controller immediately plays in the square directly above it. Because the board has an even number of rows (six), and play must start from the bottom, the controller is mathematically guaranteed to have the "last word" in any even-high vertical pair, provided they do not waste their turns in that column prematurely.

## **Conditions**

The rule is valid only under specific conditions. First, the two squares in the pair must be in the same column and directly adjacent vertically. Second, both the odd square and the even square must currently be empty. Third, the targeted square must be at an even height (row 2, 4, or 6). Finally, and most importantly, the player applying the rule must maintain zugzwang control. If the opponent creates an odd threat elsewhere on the board that the controller cannot refute, the controller may be forced to play in the odd square themselves, thereby losing the "follow-up" opportunity and handing the even square to the opponent.1

## **Pseudocode**

Code snippet

// Inputs: board\_state (current grid), col, row, player\_role  
// Outputs: Boolean (Can this square be claimed?)

function check\_claimeven\_eligibility(board, col, row, player\_role):  
    // The target square must be even (2, 4, 6\)  
    if row % 2\!= 0:  
        return False  
          
    // The square and the odd square below it must be empty  
    odd\_row\_below \= row \- 1  
    if not board.is\_square\_empty(col, row) or not board.is\_square\_empty(col, odd\_row\_below):  
        return False  
          
    // The player must be the controller of zugzwang  
    if not board.has\_zugzwang\_control(player\_role):  
        return False  
          
    return True

function execute\_claimeven\_response(board, opponent\_move, player\_role):  
    col \= opponent\_move.column  
    row \= opponent\_move.row  
      
    // If opponent played in an odd square, check if row above is a claimed even  
    if row % 2\!= 0 and check\_claimeven\_eligibility(board, col, row \+ 1, player\_role):  
        return make\_move(col, row \+ 1\)  
      
    return None 

## **Common Mistakes**

A frequent mistake for intermediate developers is attempting to apply Claimeven to odd-numbered squares. While it is physically possible to play in an odd square, the zugzwang logic does not guarantee that you can "claim" it, because the opponent is the one who initiates the odd-row plays. Another misconception is that Claimeven is an offensive winning strategy. In VICTOR’s formal framework, Claimeven is primarily a defensive refutation tool used to show that an opponent’s threat is harmless. Developers also often fail to check for "column parity shifts"—if another rule (like a Lowinverse) is active, the simple follow-up logic of Claimeven might be interrupted.

## **Interactions With Other Rules**

Claimeven is the building block for several more advanced rules, such as **Aftereven** and **Before**. It is inherently compatible with **Vertical** and **Baseinverse** strategies, provided the sets of squares involved are disjoint. However, it can conflict with **Lowinverse** and **Highinverse**. Because those inverse rules rely on a specific sum of empty squares across multiple columns to force the opponent into a move, a Claimeven move in one of those columns could inadvertently "fix" the parity in a way that benefits the opponent. Therefore, VICTOR’s adjacency matrix logic ensures that a Claimeven and an Inverse rule are never applied to the same column if they would interfere with the board's global zugzwang state.1

# **Baseinverse**

## **Simple Explanation**

Baseinverse is a tactical maneuver designed to neutralize threats on the very first row of the board. It relies on the simple physical limitation that a player can only place one disc per turn. If there are two empty squares on the bottom row (the "base") that are both part of the same potential winning line for the opponent, the zugzwang controller can ensure the opponent never completes that line by pairing those two squares. If the opponent takes one, the controller immediately takes the other. This "inverses" the opponent's attempt to use the base row for a victory.

## **Strategic Purpose**

Horizontal wins on the bottom row are among the most dangerous threats in Connect 4 because the squares are "directly playable" from the start of the game. Unlike threats on rows 3 or 4, which require discs to be stacked below them, a row 1 threat is an immediate problem. Baseinverse allows a player to solve horizontal and diagonal threats that intersect the base. It ensures that the controller gets at least one square in a critical sequence, thereby breaking the opponent's chain. This matters because it provides a zugzwang-independent defense; as long as row 1 squares are available, the response is guaranteed.1

## **Example**

Consider the bottom row (row 1). White has discs at c1 and d1. The squares a1, b1, e1, and f1 are empty. White has a potential horizontal group at a1-d1.

* **Squares involved**: {a1, b1}.  
* Both a1 and b1 are directly playable.  
* If White plays at a1, Black (the controller) immediately plays at b1.  
* If White plays at b1, Black immediately plays at a1.  
* Regardless of White's choice, Black occupies one of the two squares needed for White's a1-d1 win, effectively "refuting" that group.

## **Step-by-Step Logic**

During the evaluation phase, the VICTOR program scans the bottom row for empty squares. It then looks at the opponent’s potential winning groups (horizontal or diagonal) that contain at least two of these empty base squares. The solver then "locks" these two squares into a Baseinverse pair. During live play, the program monitors the opponent's moves. If the opponent places a disc in one of the squares of the pair, the program immediately generates a response move in the other square of the pair. This response is considered "high priority" because it directly eliminates a playable threat.

## **Conditions**

The rule requires that both squares in the pair are "directly playable," which in Connect 4 terminology means they must be at row 1 and currently unoccupied. Furthermore, both squares must belong to the same potential group of four for the opponent. If the squares are in different groups, taking one does not necessarily neutralize the threat in the other. Finally, the rule is zugzwang-independent, meaning it can be applied regardless of which player is currently guiding the board's parity, as long as it is the controller's turn to respond.1

## **Pseudocode**

Code snippet

// Inputs: board\_state, list\_of\_opponent\_groups  
// Outputs: list\_of\_base\_pairs

function identify\_baseinverse\_pairs(board, opponent\_groups):  
    pairs \=  
    base\_row \= 1  
    empty\_base\_squares \= board.get\_empty\_squares\_in\_row(base\_row)  
      
    for group in opponent\_groups:  
        // Find empty squares in this group on row 1  
        empty\_in\_group \= \[sq for sq in group if sq in empty\_base\_squares\]  
          
        // If there are at least two empty squares in this group on row 1  
        if length(empty\_in\_group) \>= 2:  
            new\_pair \= {sq\_a: empty\_in\_group, sq\_b: empty\_in\_group}  
            if not is\_conflict\_with\_existing\_pairs(new\_pair, pairs):  
                pairs.append(new\_pair)  
                  
    return pairs

function baseinverse\_responder(current\_pairs, move\_made):  
    for pair in current\_pairs:  
        if move\_made \== pair.sq\_a:  
            return pair.sq\_b  
        if move\_made \== pair.sq\_b:  
            return pair.sq\_a  
    return None

## **Common Mistakes**

One common mistake is assuming that Baseinverse can be used on rows higher than row 1\. While the "take-one-if-they-take-the-other" logic is sound, it only works reliably on the base row because those squares do not depend on the opponent's moves in other columns to become available. Another mistake is pairing two squares that the opponent *already* needs to win, but failing to realize the opponent has *another* win path that doesn't involve those squares. Programmers must ensure the Baseinverse actually "solves" the group by occupying a square the opponent absolutely needs.

## **Interactions With Other Rules**

Baseinverse is unique because it is "zugzwang-independent." This means it can be combined with almost any other rule in VICTOR's repertoire without affecting the global parity logic. However, the squares involved must be disjoint from other rules. For example, a square cannot be part of a Baseinverse and a **Baseclaim** simultaneously, as the response logic would overlap and potentially fail. If a Baseinverse is used to solve a group, it effectively "uses up" those two squares, preventing them from being used in complex temporal rules like **Before**.1

# **Vertical**

## **Simple Explanation**

The Vertical rule is a specialized defense against columns where the opponent is trying to stack four discs to win. It relies on the rule that you cannot play two discs in the same column in a single turn. If an opponent has three discs in a column and needs the fourth square to win, and there are at least two empty squares available in that column, the zugzwang controller can claim one of those squares to ensure the opponent never completes the vertical line.

## **Strategic Purpose**

While many rules focus on horizontal or diagonal lines that span multiple columns, the Vertical rule provides a robust way to "close" a column to an opponent's vertical victory. It is primarily used when the upper square of a pair is an "odd square." This matters because if the upper square were even, the solver would likely use the more powerful **Claimeven** rule. The Vertical rule allows VICTOR to categorize vertical threats as "solved" as long as there is a vertical pair of squares that the opponent cannot simultaneously occupy.1

## **Example**

Consider column e. White has discs at e1 and e2. The squares e3, e4, e5, and e6 are empty. White has a potential vertical group of four consisting of {e1, e2, e3, e4}.

* **Squares involved**: {e3, e4}.  
* Both are currently empty. Square e4 is even, but square e3 is odd.  
* To use the Vertical rule, the controller (Black) pairs e3 and e4.  
* If White plays at e3, Black immediately plays at e4.  
* White is now blocked from completing the sequence at e4.  
* Even if White never plays at e3, Black might eventually be forced to play there, but White can still never occupy both e3 and e4 in a single sequence.

## **Step-by-Step Logic**

The solver identifies columns where the opponent has a potential vertical winning group. It then searches for two consecutive empty squares in that column that are both part of that group. These squares are designated as a Vertical pair. During play, if the opponent places a disc in the lower square of the pair, the controller immediately places a disc in the upper square. Because gravity dictates that discs must be stacked, and the rules of Connect 4 dictate alternating turns, the controller is physically guaranteed to be able to "reply" in that column, provided it is not full.

## **Conditions**

The Vertical rule requires two squares directly above each other in the same column. Both must be empty at the time of evaluation. The rule is formally defined as being used only if the upper square is odd (row 3 or 5), because even-row upper squares are handled by the more efficient Claimeven rule. Like Baseinverse, the Vertical rule is zugzwang-independent because it relies on the local physical constraints of a single column.1

## **Pseudocode**

Code snippet

// Inputs: board\_state, col  
// Outputs: Boolean (Is vertical threat solved?)

function find\_vertical\_refutation(board, col):  
    opponent \= board.get\_opponent\_color()  
      
    // Scan for potential vertical groups of four  
    for base\_row from 1 to 3:  
        group \= \[ (col, base\_row), (col, base\_row+1),   
                  (col, base\_row+2), (col, base\_row+3) \]  
          
        if board.count\_discs(group, opponent) \== 3:  
            target\_square \= board.get\_empty\_square\_in\_group(group)  
              
            // Check if there are two consecutive empty squares to pair  
            row \= target\_square.row  
            if row \> 1 and board.is\_square\_empty(col, row-1):  
                if row % 2\!= 0: // Upper square is odd  
                    return True  
                      
    return False

## **Common Mistakes**

A common misunderstanding is that the Vertical rule only applies to the *last* square needed for an opponent to win. In reality, it can be applied to any two empty squares in the sequence. By ensuring you get one of them, you break the 4-in-a-row. Another error is neglecting that the opponent might have *two* different vertical winning groups in the same column (e.g., one starting at row 1 and another at row 2). In such cases, a single Vertical pair refutation might not be sufficient to solve both threats if they don't share the specific empty squares being paired.

## **Interactions With Other Rules**

The Vertical rule is a foundational component for the **Lowinverse** and **Before** rules. Because it is zugzwang-independent, it serves as a reliable fallback when other parity-based rules cannot be applied. It is compatible with Claimeven and Baseinverse as long as the squares do not overlap. In VICTOR’s solver, if a column is "solved" by a Vertical rule, that column is effectively removed from the list of concerns for vertical wins.1

# **Aftereven**

## **Simple Explanation**

Aftereven is a "termination" rule that identifies a game-winning sequence for the zugzwang controller that occurs entirely on even squares. It states that if you can complete your own group of four using only squares that you have already "claimed" via the Claimeven rule, you are guaranteed to win. Consequently, any threats the opponent might have in squares *above* your winning sequence are totally irrelevant because the game will end before those squares are ever played.

## **Strategic Purpose**

The strategic goal of Aftereven is to prove that high-row threats (rows 5 and 6\) by the opponent are "useless threats." Often, an engine might see White having a threat on row 5 and try to block it. However, if Black can prove they will win on row 2 or 4 in that same column (or another column), the row 5 threat never happens. Aftereven provides a way for VICTOR to simplify the board by "ignoring" any opponent paths to victory that are physically blocked by the controller's own path to victory. It effectively prunes the top layers of the game tree.1

## **Example**

Black has discs at c2, d2, and e2. The square b2 is empty. Black has a valid Claimeven claim on the pair {b1, b2}.

* **Aftereven Group**: {b2, c2, d2, e2}.  
* Black knows that as soon as White plays at b1, Black will play at b2 and win.  
* Now suppose White has a major threat at b3-e3 (row 3).  
* To complete the threat at b3, White would first have to play at b1, then Black would play at b2, and then the game would be over.  
* Therefore, the threat at b3 is useless. Black is safe.

## **Step-by-Step Logic**

The solver first identifies all groups of four where the zugzwang controller can claim all missing squares using Claimevens. This group is designated the "Aftereven group." The solver then identifies the "Aftereven columns"—the columns where the empty squares of this group reside. For any opponent threat that exists in these columns at a row number *higher* than the row number of the Aftereven square in that column, the threat is marked as "solved." The logic is chronological: row ![][image1] must be played before row ![][image2]; therefore, a win at row ![][image1] terminates the possibility of a win at row ![][image2].1

## **Conditions**

The primary condition is that the Aftereven group must be completeable by the zugzwang controller using *only* squares that are either already occupied by the controller or can be claimed through Claimevens. This means all empty squares in the group must be at even heights (2, 4, or 6). Furthermore, the player must maintain zugzwang control to ensure they can force the opponent to play in the necessary odd squares that trigger the Claimeven responses.

## **Pseudocode**

Code snippet

// Inputs: board\_state, controller\_groups, active\_claimevens  
// Outputs: list\_of\_useless\_opponent\_threats

function check\_aftereven\_win(board, controller\_groups, active\_claimevens):  
    useless\_threats \=  
      
    for group in controller\_groups:  
        empty\_squares \= board.get\_empty\_squares(group)  
        is\_aftereven \= True  
          
        for sq in empty\_squares:  
            if not is\_square\_in\_claimevens(sq, active\_claimevens):  
                is\_aftereven \= False  
                break  
          
        if is\_aftereven:  
            for col in get\_columns\_in\_group(group):  
                win\_row \= get\_row\_for\_col\_in\_group(col, group)  
                  
                // Any opponent group needing a square above this row is blocked  
                for opp\_group in board.get\_opponent\_threats():  
                    if opp\_group.needs\_square\_in\_col\_above(col, win\_row):  
                        useless\_threats.append(opp\_group)  
                          
    return useless\_threats

## **Common Mistakes**

A major misconception is that Aftereven works even if White can win in a *different* column. The rule only proves that threats in the *same* columns (at higher rows) are useless. If White has a threat in column g that is completely independent of the columns used in Black's Aftereven group, Black must still find a separate rule to refute the column g threat. Another error is failing to realize that White can choose the order of columns. If Black's Aftereven group requires two even squares (b2 and f2), White might fill up the rest of the board first, so Black must ensure they can still win regardless of which column White chooses to "lose" in.

## **Interactions With Other Rules**

Aftereven is a "high-level" rule that depends entirely on the success of the **Claimeven** rules it incorporates. It is effectively a way of saying "I have multiple Claimevens that, when triggered, actually end the game." In the hierarchy of VICTOR’s solver, Aftereven is checked after the basic refutations. If an Aftereven win is found, the evaluation of the position can often stop immediately, as a win for the controller is guaranteed. It is incompatible with rules that would require the same even squares to be used defensively (like **Specialbefore**).1

# **Lowinverse**

## **Simple Explanation**

Lowinverse is a clever parity trick that allows a player to claim "odd" squares, which usually belong to the first player. It is based on the mathematical fact that if you have two columns that each have an odd number of empty squares, the total number of empty squares in those two columns is even. This forces the opponent to be the first to play in one of those two columns. As soon as the opponent plays, the zugzwang controller can take the square directly above, thereby gaining an "odd" square they wouldn't normally get.

## **Strategic Purpose**

The primary purpose of Lowinverse is to refute White’s "odd threats." In Connect 4, White’s strongest offensive weapon is a threat on row 3 or 5, as White naturally occupies these rows through the standard play of the game. Lowinverse allows the second player (Black) to effectively "steal" one of those odd squares. By pairing two columns, Black ensures that White cannot occupy the odd squares in both. This matters because refuting White's odd threats is the only way for Black to maintain a draw or force a win on a standard board.1

## **Example**

Consider two empty columns, a and c. Both have 6 squares, but let’s say they currently have an odd number of empty squares available (for instance, row 1 is filled in both, leaving squares 2, 3, 4, 5, 6 empty—which is 5 squares per column).

* **Squares involved**: Column a (a2-a3) and Column c (c4-c5).  
* Note: In this scenario, rows 3 and 5 are the "odd" squares.  
* Because both columns have an odd number of empty spots, the total is even. White is forced to move in a or c eventually.  
* If White plays a2, Black immediately plays a3.  
* If White plays c4, Black immediately plays c5.  
* Black is guaranteed to get at least one of these upper squares, even though they are on "odd" rows (3 and 5).

## **Step-by-Step Logic**

The solver looks for two different columns where the controller of zugzwang needs to occupy an odd square to block an opponent's threat. It identifies two "Vertical" pairs (one in each column) where the upper square of each pair is an odd-numbered row. Because the global zugzwang ensures that an even number of squares are available, the opponent will eventually be forced to drop a disc into the lower square of one of these two columns. The controller then follows the Vertical rule logic for that specific column. The opponent decides which of the two columns is "triggered" first, but the controller is guaranteed to get at least one of the two desired odd squares.1

## **Conditions**

The rule requires two different columns (the "Lowinverse columns"). In each column, there must be two empty squares directly above each other. Crucially, the upper square of both pairs must be at an odd height (row 3 or 5). The controller must also have zugzwang control, as the entire rule relies on the opponent being the one forced to "break" the parity of the empty columns. Additionally, no other Claimeven can be placed *below* the squares involved in the Lowinverse.1

## **Pseudocode**

Code snippet

// Inputs: board\_state, col\_i, col\_j, row\_i, row\_j  
// Outputs: Boolean (Is Lowinverse group solved?)

function is\_lowinverse\_valid(board, col\_i, col\_j, row\_i, row\_j):  
    // Both upper squares must be odd  
    if row\_i % 2 \== 0 or row\_j % 2 \== 0:  
        return False  
          
    // Squares in column I: {row\_i-1, row\_i}  
    // Squares in column J: {row\_j-1, row\_j}  
    if not board.are\_empty(col\_i, \[row\_i-1, row\_i\]) or   
       not board.are\_empty(col\_j, \[row\_j-1, row\_j\]):  
        return False  
          
    if not board.has\_zugzwang\_control():  
        return False  
          
    return True

function solve\_with\_lowinverse(group, lowinverse\_pair):  
    // A Lowinverse solves a group if the group contains BOTH upper odd squares  
    sq\_i \= lowinverse\_pair.square\_i  
    sq\_j \= lowinverse\_pair.square\_j  
      
    if group.contains(sq\_i) and group.contains(sq\_j):  
        return True  
    return False

## **Common Mistakes**

The most common mistake is thinking Lowinverse guarantees *both* odd squares. It only guarantees *one out of two*. Therefore, it only "solves" an opponent's threat if that threat absolutely requires *both* of the squares to be occupied by the opponent. If the opponent can win using only one of the two squares, Lowinverse is an insufficient defense. Programmers also often overlook that the columns must be different; you cannot perform a Lowinverse in a single column because the "odd \+ odd \= even" math would not apply.

## **Interactions With Other Rules**

Lowinverse is "zugzwang-dependent" and is often in direct conflict with **Claimeven**. If a developer applies a Claimeven to a square below a Lowinverse pair, the number of empty squares in that column changes from odd to even, which might allow the opponent to avoid the parity trap. In VICTOR’s graph-based evaluation, a Lowinverse and a Claimeven in the same column are marked as "connected nodes," meaning only one of the two can be chosen.1

# **Highinverse**

## **Simple Explanation**

Highinverse is an advanced version of the Lowinverse rule, applying similar parity-shifting logic but over a larger set of squares. Instead of pairing two pairs of squares, it pairs two columns that each contain three empty squares stacked vertically. This rule allows the zugzwang controller to claim squares in the higher rows (4, 5, and 6\) across two columns, effectively creating a wide-reaching defensive net against complex horizontal and diagonal threats.

## **Strategic Purpose**

Highinverse is used to solve "high threats" that span across the top half of the board. While Lowinverse targets rows 3 and 5, Highinverse specifically targets row 6 and its interactions with rows 4 and 5\. This matters in the endgame, where the board is mostly full and the final few moves are critical. By using Highinverse, the solver can prove that even if White has multiple threats in the top rows, Black can guarantee they will get at least one defensive square in every necessary sequence.1

## **Example**

Columns d and e both have three empty squares remaining: d4, d5, d6 and e4, e5, e6.

* **Squares involved**: All six squares.  
* Top squares d6 and e6 are even.  
* **Logic**: White is forced to move first in column d or e.  
* If White plays at d4, Black immediately plays at d5.  
* Now, the squares d6 and e4 are both "directly playable." Black can now treat these remaining squares as a **Baseinverse** (effectively a new row 1).  
* Through this shifting logic, Black is guaranteed to get at least one square from every pair: {d6, e6}, {d5, e5}, and {d5, d6}.

## **Step-by-Step Logic**

The solver locates two columns with three empty squares each, where the highest square is even. Because of the global board zugzwang, the opponent must eventually place a disc in the lowest of these six squares. As soon as the opponent plays, the controller takes the square immediately above it. This leaves four squares empty. The controller then transitions the logic into either a Claimeven or a Baseinverse, depending on which squares are remaining. The result is a guaranteed occupation of key squares in rows 5 and 6\.1

## **Conditions**

The rule requires two different columns, each containing exactly three empty squares. The highest square in each column stack must be an even row (usually row 6). The player must have zugzwang control. Additionally, the squares in the three-high stack must be consecutive; you cannot have a gap between the three squares being used for the Highinverse calculation.1

## **Pseudocode**

Code snippet

// Inputs: board\_state, col\_a, col\_b  
// Outputs: List of square pairs guaranteed for the controller

function apply\_highinverse(board, col\_a, col\_b):  
    stack\_a \= board.get\_empty\_stack(col\_a)  
    stack\_b \= board.get\_empty\_stack(col\_b)  
      
    if len(stack\_a)\!= 3 or len(stack\_b)\!= 3:  
        return None  
          
    // The highest squares in the stack must be even  
    if stack\_a.row % 2\!= 0 or stack\_b.row % 2\!= 0:  
        return None  
          
    guarantees \=  
    // Highinverse solves groups containing both top squares  
    guarantees.append({stack\_a\[2\], stack\_b\[2\]})  
    // Highinverse solves groups containing both middle squares  
    guarantees.append({stack\_a, stack\_b})  
    // Highinverse also acts as a local Vertical for each column  
    guarantees.append({stack\_a, stack\_a\[2\]})  
    guarantees.append({stack\_b, stack\_b\[2\]})  
      
    return guarantees

## **Common Mistakes**

Developers often confuse Highinverse with a simple set of two Claimevens. While Claimeven only guarantees the even squares (d4 and d6), Highinverse guarantees that you can get the *odd* square (d5) if the opponent tries to take the *even* square below it first. The mistake is forgetting that Highinverse is a "choice-based" rule; it doesn't give you all squares, it gives you a selection of squares based on where the opponent plays first.

## **Interactions With Other Rules**

Highinverse is a "heavy" rule that consumes many squares. It is incompatible with any Claimeven or Vertical rule that attempts to use any of the same six squares. In VICTOR's logic, if a Highinverse is used, it often "subsumes" multiple smaller rules, providing a more elegant proof of a position's safety. It is zugzwang-dependent and is typically the last rule evaluated before the solver concludes a position is a draw.1

# **Baseclaim**

## **Simple Explanation**

Baseclaim is a powerful combined rule that uses three empty squares on the bottom row and one square on the second row to solve "staggered" threats. It combines the logic of a **Baseinverse** and a **Claimeven**. By coordinating responses across three columns, the zugzwang controller can prove they can defend against a horizontal threat on the base and a simultaneous diagonal or vertical threat just above it.

## **Strategic Purpose**

Baseclaim is designed to handle "forked" attacks where an attacker creates two threats at once—one on row 1 and one on row 2\. Baseclaim provides the mathematical proof that Black can block *both*, provided there are enough empty squares on the base. It matters because it solves complex tactical traps that simpler rules like Baseinverse would miss.1

## **Example**

White has a horizontal threat at b1-e1 (needs b1 or e1) and another threat at b1-e4 which requires square c2.

* **Squares involved**: {b1, c1, e1} on row 1 and {c2} on row 2\.  
* Squares b1, c1, e1 are all empty and playable. c2 is empty.  
* **Baseclaim Logic**:  
  * If White plays b1, Black plays e1. Now Black can use a simple **Claimeven** for {c1, c2}.  
  * If White plays c1, Black plays e1. Now Black uses **Baseinverse** logic for {b1, c2}.  
  * If White plays e1, Black plays c1. Now Black uses **Baseinverse** logic for {b1, c2}.  
* In every possible variation, Black occupies the squares needed to block both threats.

## **Step-by-Step Logic**

The solver identifies three directly playable squares on row 1 (the "base trio") and one even square on row 2 located directly above the middle square of the trio. The rule "links" these four squares. During play, the controller monitors all three base columns. The first move by the opponent in any of those three columns triggers a specific response that preserves the controller's ability to block the remaining threats using the principles of Claimeven and Baseinverse.1

## **Conditions**

The rule requires exactly three empty squares on row 1 and one empty square on row 2\. The row 2 square must be in the same column as one of the three base squares. The player must have zugzwang control. The rule is only valid if it solves at least two different groups of the opponent.1

## **Pseudocode**

Code snippet

// Inputs: board, sq\_b1, sq\_b2, sq\_b3, sq\_e2  
// Outputs: Boolean (Are staggered threats refuted?)

function apply\_baseclaim(board, b1, b2, b3, e2):  
    // e2 must be directly above b2  
    if e2.column\!= b2.column or e2.row\!= b2.row \+ 1:  
        return False  
          
    // All squares must be empty and base must be row 1  
    if not board.are\_all\_empty(\[b1, b2, b3, e2\]) or b1.row\!= 1:  
        return False  
          
    groups \= board.get\_opponent\_groups()  
    solved \=  
      
    for g in groups:  
        // Group contains base squares for Baseinverse part  
        if g.contains(b2) and g.contains(b3):  
            solved.append(g)  
        // Group contains first base square and upper square  
        if g.contains(b1) and g.contains(e2):  
            solved.append(g)  
              
    return len(solved) \>= 2

## **Common Mistakes**

The biggest mistake is trying to apply Baseclaim with only two base squares. The mathematical "shift" that allows the controller to block row 2 requires the flexibility of three base options. Another mistake is using an odd square for the "upper" square; it must be an even square (row 2\) for the Claimeven logic to be valid within the Baseclaim framework.1

## **Interactions With Other Rules**

Baseclaim is a "hybrid" rule and is mutually exclusive with its components. If a square is part of a Baseclaim, it cannot be simultaneously part of a Baseinverse or a Claimeven. It is zugzwang-dependent because of its internal Claimeven component. In VICTOR, Baseclaim is often used to resolve conflicts where a Baseinverse and a Claimeven were competing for the same column.1

# **Before**

## **Simple Explanation**

The Before rule is a temporal strategy that focuses on the speed of the game. It is used when both the controller and the opponent have potential winning lines. It states that if the zugzwang controller can complete their own line of four *before* the opponent can complete theirs, the opponent's threat is effectively neutralized. It relies on pairing squares across multiple columns so that every move the opponent makes toward their win allows the controller to make a move toward an even faster win.

## **Strategic Purpose**

In the middle-game, players often enter a "race" to see who can finish their 4-in-a-row first. The Before rule provides a mathematical proof that the controller is "one step ahead." It matters because it allows the solver to dismiss threats that *look* dangerous but are too slow to ever be realized. This allows VICTOR to maintain offensive pressure while relying on this rule for passive defense.1

## **Example**

White has a potential win at d3-g3 (row 3). Black has a potential win at f1-f4 (column f).

* **Squares involved**: White needs f3 to win. Black needs f2 and f3 to win.  
* Black pairs {f2, f3} using the Vertical rule logic.  
* **Logic**:  
  * If White plays at f2, Black immediately plays at f3. Now Black has connected four and won.  
  * If White never plays at f2, Black will eventually play at f2 and f3 themselves and win.  
* In either scenario, White never occupies square f3. Thus, White's threat at d3-g3 is refuted.

## **Step-by-Step Logic**

The solver identifies a "Before group"—a sequence of four squares where the zugzwang controller has some discs and the opponent has none. For every empty square in this group, the solver must identify a successor (the square directly above it). The controller must be able to "claim" every successor through either a Claimeven or a Vertical rule. During play, as soon as the opponent attempts to block the controller's group by playing in one of the empty squares, the controller takes the square above. This guarantees that either the controller wins or the opponent is permanently blocked from using those higher squares for their own win.1

## **Conditions**

The Before group must currently have zero opponent discs. Every empty square in the group must have a successor square available (i.e., no square in the group can be at row 6). The controller must have zugzwang control, as many of the constituent pairings will rely on Claimeven logic. Finally, the rule only solves opponent threats that require *all* of the successor squares in the paired columns.1

## **Pseudocode**

Code snippet

// Inputs: board, c\_group, o\_group  
// Outputs: Boolean (Is the race won?)

function check\_before\_refutation(board, c\_group, o\_group):  
    if board.contains\_opponent\_discs(c\_group):  
        return False  
          
    empty\_sqs \= board.get\_empty\_squares(c\_group)  
    successors \=  
      
    for sq in empty\_sqs:  
        if sq.row \== 6: return False   
          
        successor \= (sq.column, sq.row \+ 1\)  
        if not board.can\_form\_pair(sq, successor):  
            return False  
        successors.append(successor)  
          
    // Solves the opponent group IF it requires ALL successors  
    for target in o\_group:  
        if target in successors:  
            continue  
        return False   
          
    return True

## **Common Mistakes**

A frequent mistake is applying the Before rule when the opponent only needs *one* of the successor squares to win. The Before rule only guarantees that the opponent won't get *all* of the squares in the pairs. Another mistake is using it when White already has a disc in the "Before group"; if the sequence is blocked, Black can no longer threaten to win, and the logic collapses.

## **Interactions With Other Rules**

Before is a "meta-rule" that bundles together several **Claimevens** and **Verticals**. It is mutually exclusive with **Aftereven**, as Aftereven is a stronger version of the same temporal logic. In VICTOR, Before is used primarily when the squares involved are not all even. It is zugzwang-dependent.1

# **Specialbefore**

## **Simple Explanation**

Specialbefore is the most complex rule in the VICTOR solver, designed to resolve a specific kind of "conflict of interest" in a column. It occurs when a player wants to use a column for a **Before** rule (to win a race) but that same column is needed for a **Claimeven** to block a different threat. Specialbefore allows the player to "shift" their defense to a directly playable square in a different column, ensuring that both threats are handled simultaneously.

## **Strategic Purpose**

The purpose of Specialbefore is to handle "overloaded" columns where White is trying to force Black to use a square for two different defensive purposes. In high-level play, a sophisticated attacker will target a square that is essential for both an offensive race and a defensive blockade. Specialbefore provides the logic for Black to escape this trap by utilizing the freedom of the base row.1

## **Example**

White has threats at a1-d1 (needs b1) and b1-e4 (needs e4). Black has a Before group at d2-g2.

* To solve White's threat at d3-g3, Black needs a Vertical at e2-e3.  
* To solve White's threat at b1-e4, Black needs a Claimeven at e3-e4.  
* **The Conflict**: Both rules need square e3 to function as a response square.  
* **Specialbefore Solution**: If Black can identify an extra playable square on the base (e.g., g1), they can use the physical turn-taking of row 1 to "offset" the Vertical, freeing up e3 for the Claimeven.

## **Step-by-Step Logic**

The solver identifies a standard Before group for the controller. It then identifies an "extra" directly playable square (row 1\) in a different column. It pairs one of the empty squares in the Before group that is also on row 1 with this extra square. This creates a Baseinverse-like relationship. Through this pairing, the controller can satisfy the requirements of the Before rule and the overlapping Claimeven rule by choosing which "base" to play in depending on the opponent's first move.1

## **Conditions**

The rule requires all conditions for a standard Before rule. Additionally, one empty square in the Before group must be directly playable (row 1). There must also be another empty square in a different column that is directly playable. The player must have zugzwang control. Finally, the rule must be the only way to resolve the conflict between the Before rule and an intersecting defensive rule.1

## **Pseudocode**

Code snippet

// Inputs: board, c\_group, extra\_sq  
// Outputs: Boolean (Is the overload conflict resolved?)

function apply\_specialbefore(board, c\_group, extra\_sq):  
    if not is\_before\_valid(board, c\_group):  
        return False  
          
    // One square in the Before group must be row 1  
    base\_in\_group \= \[s for s in board.get\_empty(c\_group) if s.row \== 1\]  
    if len(base\_in\_group) \== 0:  
        return False  
          
    // Extra square must be row 1 and in a different column  
    if extra\_sq.row\!= 1 or extra\_sq.column \== base\_in\_group.column:  
        return False  
          
    return True

## **Common Mistakes**

Misunderstanding the "relief" mechanism is common. Specialbefore isn't just "Before plus an extra square"; it is a specific resolution for when two rules want the same square. Another mistake is using it without two empty base squares. Without the mobility of row 1, the controller cannot "shift" their defense.1

## **Interactions With Other Rules**

Specialbefore is the "ultimate" rule in VICTOR's hierarchy. It interacts with **Before**, **Claimeven**, and **Baseinverse**. It is zugzwang-dependent and is only invoked when the solver encounters an "unsolvable" group of threats that could be solved if only one square weren't double-tasked.1

### ---

**Summary of VICTOR Strategic Rules**

| Strategy Name | Main Idea | Zugzwang Required? | Primary Use | Key Limitation |
| :---- | :---- | :---- | :---- | :---- |
| **Claimeven** | Pair odd/even squares vertically. | **Yes** | Blocks threats using rows 2, 4, 6\. | Only works on even rows. |
| **Baseinverse** | Pair two squares on the base row. | **No** | Refutes immediate row 1 threats. | Only works on row 1\. |
| **Vertical** | Stack two squares in one column. | **No** | Blocks vertical 4-in-a-row wins. | Only refutes vertical groups. |
| **Aftereven** | Chain reaction of even row wins. | **Yes** | Prunes higher-row "useless" threats. | Only refutes threats that require ALL Aftereven columns. |
| **Lowinverse** | Pair two columns (![][image3]). | **Yes** | Claims odd-row defensive squares. | Opponent chooses which of two you get. |
| **Highinverse** | Pair two 3-high column stacks. | **Yes** | Refutes complex row 4-6 threats. | Requires complex parity setup. |
| **Baseclaim** | Combined Baseinverse and Claimeven. | **Yes** | Solves staggered row 1/row 2 threats. | Requires three empty base squares. |
| **Before** | Win the race to a win/block. | **Yes** | Neutralizes "slower" opponent wins. | Opponent must need ALL successors. |
| **Specialbefore** | Shift Before-logic to new base. | **Yes** | Resolves overlapping rule conflicts. | Requires two empty base squares. |

The application of these nine rules represents a revolutionary departure from traditional "minimax" search. By defining a finite set of "knowledge" about the game's parity and physical constraints, Allis reduced the problem of Connect 4 from a search for moves to a search for *proofs*. If the VICTOR solver can find a mutually consistent set of these rules that covers every single one of the 69 possible winning lines on the board, it has mathematically proven that the opponent cannot win.1

#### **Works cited**

1. connect4\_thesis.pdf  
2. Connect-4 AI: A Comprehensive Taxonomy and Critical Review of Methods and Metrics, accessed May 12, 2026, [https://www.preprints.org/manuscript/202601.2416](https://www.preprints.org/manuscript/202601.2416)  
3. How to Win Connect 4 Every Time, According to the Computer Scientist Who Solved It, accessed May 12, 2026, [https://www.rd.com/article/how-to-win-connect-4/](https://www.rd.com/article/how-to-win-connect-4/)  
4. Solving Connect Four with Game Theory \- Cornell blogs, accessed May 12, 2026, [https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/](https://blogs.cornell.edu/info2040/2015/09/21/solving-connect-four-with-game-theory/)  
5. Literature Review \- CONNECT 4 \- Weebly, accessed May 12, 2026, [http://connect4hci.weebly.com/literature-review.html](http://connect4hci.weebly.com/literature-review.html)  
6. Connect 4 Research Paper | PDF | Matrix (Mathematics) | Linear Algebra \- Scribd, accessed May 12, 2026, [https://www.scribd.com/document/549351485/Connect-4-research-paper](https://www.scribd.com/document/549351485/Connect-4-research-paper)  
7. Intro to A.I. Topics \- MIT, accessed May 12, 2026, [https://web.mit.edu/sp.268/www/connectfour.pdf](https://web.mit.edu/sp.268/www/connectfour.pdf)  
8. Connect Four \- MIT, accessed May 12, 2026, [https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf](https://web.mit.edu/sp.268/www/2010/connectFourSlides.pdf)  
9. GitHub \- dsanmart/connect4: Knowledge-based backtracking algorithm to win the game of connect 4\. This work is based on the master thesis "A Knowledge-based Approach of Connect-Four" from Victor Allis back in 1988., accessed May 12, 2026, [https://github.com/dsanmart/connect4](https://github.com/dsanmart/connect4)  
10. Trashtalk217/victor: VICTOR: An Arcane Connect Four AI using Ancient Knowledge from the 80s \- GitHub, accessed May 12, 2026, [https://github.com/Trashtalk217/victor](https://github.com/Trashtalk217/victor)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAXCAYAAAA/ZK6/AAAAlUlEQVR4XmNgGAWDCegC8Twg5obyeYG4AYgnADETVAwO2IF4KxBHA/F/IG4G4gVQuXqoGArYC6VhGhqR5EA2YWgohdLXGDAls7GIwQFIoh2L2GU0MTCQYIBIgpwAA3xQMQUofypCCsJBtxpZrBqIlZDkGP4C8VdkASAoYIBo0AfiS2hyDBZAzIouyACJHwN0wVFACAAA3qgdBAlcrcAAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC0AAAAYCAYAAABurXSEAAABJklEQVR4XmNgGAWjYBTQE2gA8Ut0wcEI3ID4NRD/h+JXqNK0BUfRBcgAdHf0CXQBMgBeR+sC8Twg5obyeYG4AYgnADETVIxUcAZdgAyA09HsQLwViKMZIIqagXgBVK4eKkYOOIsuQAbA6ei9UBrm6EYkOVCID7SjQZkSA5RC6WsMmA7MxiKGDjiB2AQLvo5FDIaJBSC736ILIgOQgmNoYh+h4viAABD7YcF3sIjBMLEAZPc7dEFkAFLggUWsEk2MWECt5PEBXRAGwhkwQzQUSUwIiKcgyREDqOVoUGxjBZcZMB29BUnsBbIEkYBajv6OLggDf4B4MpoYKwNEEwiD0i2pgFxH6zBA0vFTIH4Mxc+B+DOyIloBch09oIDcmnQUjIJRMBQAAEJrTTWbyc7EAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJQAAAAYCAYAAAAcTtR3AAAEZklEQVR4Xu2YW6hVVRSGh5e8EkmeBykvh0gtTfBBlErFS7cHEcWyB30o0CIFUTFCiM42UVETo3yK6pwuJhEkiOZLiiLWg71Y0EMhQikqghe8pYg5/jPH2Gussdc+Z+59ZLvB+cHPmfOfY68151xjzTXnIUokEolEIlEDQ1lPe7OAYazh3mxSBrImerOA2LEnIniL9b9oj2uzfEVZ3GrX1oz8R1l/qxE79kQdYFKneNOBtxhxfX1Dk4K+7vdmATFjT9TAO9T1m6x8T3Fxnn3eaBDo67PedMSOPVED5yhuUhFzzZsR3I+EWkZxY4od+wPNi6wfWMt9g6GN9bGUMaE/mzbLR6wPpYy4901bLPcioVpZ37E+YfXON5V5nUIMDg1dJUrs2BvFI6ytrHWsfq7tOdZ2581hzXOeMp61k/WG8yewvmQNlvrDrBKFeag2nzSJwgShE2Ch1C0viIcT0KNShqbZIGYt65aUR1MW178cEU9PEuoh1h3WBqnjRIZ+oE8K+gRvptSvSv1AOSIQO/ZGgQd5nfUThUTqQ/nndZDCs/yFwiFD0X5bkDDwdBEZwbooZcwPnsEiiVnP6pC2NvEq0AtioizwOqQ8Tur4q+CN9xdcKt4A4/0uXj30JKFwzw+ch4lCkimIwVuptIg33XixYy+ixPqmir6mML/trC9Yn7NW4UcR4N7HCzyAZENCqWcTCglh+/2Y1F81HtAYfbE0obASKlipCucApmakBf4lU/Y/Pl3goX6mwLvhPA9WyCIdLfCgqkutgPv5voFTlPlHTFnRfwdYYsfeKJCM9t5jWCdYG6XeStlpGnHzpaz8bcp4uey1Zkl9pNTflb9/im/BiuY9miHmy84H8H9lDZLyrnxzp3fI1F8R723jAXgl53nmVtFvBR7U3edT++6xyWHLik+U2LE3Eu03VklsL2bkWjM2UeX4nqH8s0b7P6xtFP5HaFdhC+Lw+bRcFj8HNuAVJrOYgo/s17d2bC4ieLr3ANjU+ms9KZ79BNZCPZ88bC5xz6LNJ3z9xFVLlMOmHjv2auD3W2rQyvCzLsG9r3izAMT552E/k70otK8xXjUQhwXDe0joHCWqvCmAd17K+L76mCXGw77pCdYO4ynfGs/uVWKpJ6F0VXnc+VixbP9Qft7U1cOyj8nGf/hjx95IcO8/vEnZKUxB3G7nYT9rQcwC54GXTBknYD8HrxkPe288+zJoeMrU8RBxgrAgBrt/gFjU9YJ6osOA7I3RURvnOxVDPQkFblPY9Cq6qcQxW0EdG2Fb1z5+RuGUqH53Y28kK6hyLqdS5T74JoVPuPKvKSvw8MmzbGb9aOpIXn+/vcY7axtAC2WbM+jNfHMnoyhr/1Q8dBj1yRrEzBYP0mOoXtufImOoN6HAScr60u7aFPyzFe365h6SeofUQezYG8l7lPUJiYSE8uDgcoFCDF4wnMqKOEbZtf6iypUOv9VxK3jZ9DdDXFtT05OESiQSiUQikUgkEolEIlE3dwEyEVpIUv3xywAAAABJRU5ErkJggg==>