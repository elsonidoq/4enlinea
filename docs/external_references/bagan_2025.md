4202
rpA
21
]OC.htam[
2v00770.4042:viXra
Poset Positional Games∗
Guillaume Bagan1, Eric Duchˆene1, Florian Galliot2, Valentin Gledel3, Mirjana Mikalaˇcki†4,
Nacim Oijid1, Aline Parreau1, and Miloˇs Stojakovi´c†4
1Univ Lyon, CNRS, INSA Lyon, UCBL, Centrale Lyon, Univ Lyon 2, LIRIS, UMR5205,
F-69622 Villeurbanne, France.
2Univ. Bordeaux, CNRS, Bordeaux INP, LaBRI, UMR 5800, F-33400 Talence, France
3Universit´e Savoie Mont Blanc, CNRS UMR5127, LAMA, Chamb´ery, F-73000, France
4Department of Mathematics and Informatics, Faculty of Sciences, University of Novi Sad,
Serbia
Abstract
We propose a generalization of positional games, supplementing them with a restriction on
the order in which the elements of the board are allowed to be claimed. We introduce poset
positional games, which are positional games with an additional structure – a poset on the
elements of the board. Throughout the game play, based on this poset and the set of the board
elements that are claimed up to that point, we reduce the set of available moves for the player
whose turn it is – an element of the boardcan only be claimed if all the smaller elements in the
poset are already claimed.
We proceed to analyse these games in more detail, with a prime focus on the most studied
convention, the Maker-Breaker games. First we build a general framework around poset posi-
tional games. Then, we perform a comprehensive study of the complexity of determining the
game outcome, conditioned on the structure of the family of winning sets on the one side and
the structure of the poset on the other.
1 Introduction
1.1 General motivation
Positional games. Positional games are a class of combinatorial games that have been extensively
studiedinrecentliterature–seebooks[5]and[11]foranoverview ofthefield. Theyincludepopular
recreational games like Tic-Tac-Toe, Hex and Sim. Structurally, a positional game is a pair (X,F),
where X is a (finite) set that we call the board, and F ⊆ 2X is a collection of sets that we call the
winning sets. The pair (X,F) is referred to as the hypergraph of the game. The game is played
in the following way: two players alternately claim unclaimed elements of the board, until all the
elements are claimed. Depending on the way the winner is determined, there are several standard
conventions: Maker-Maker games, Maker-Breaker games, Avoider-Enforcer games, etc.
In Maker-Maker games, also known as strong making games, players compete to fill up one of the
winning sets i.e. claim all its elements, and whoever does it first wins. If there is no winner by the
time all the board elements are claimed, the game is declared a draw. Tic-Tac-Toe (“3-in-a-line”)
is a notable representative of this type of games and every child knows the game ends in a draw,
∗This research was partly supported bythe ANRproject P-GASE(ANR-21-CE48-0001-01)
†Partly supported by Provincial Secretariat for Higher Education and Scientific Research, Province of Vojvodina
(GrantNo.142-451-2686/2021). PartlysupportedbyMinistryofScience,TechnologicalDevelopmentandInnovation
of Republicof Serbia (Grants451-03-66/2024-03/200125 & 451-03-65/2024-03/200125).
1

provided that both players play optimally. It can be generalized to the n×n board, going under
the name “n-in-a-line”, and it is also known to be a drawn game [5] for all n ≥ 3. More generally,
Tic-Tac-Toe can be played on the hypercube[n]d, where the winning sets are all the geometric lines
of cardinality n. The Hales-Jewett Theorem [10] states that, for every n, there exists a positive
number d, also called the Hales-Jewett number HJ(n), such that for all k ≥ d, the game [n]k is a
first player win.
Generally speaking, the strong making games are natural to introduce and study, and many recre-
ational games are of this type. Hence, it is no wonder that numerous questions about them have
been asked in the literature. Yet, it may come as a surprise that the majority of those questions
remain unanswered. The thing is, in a typical strong making game, each player’s goal can be seen
as two-fold: they are simultaneously trying to claim a winning set and to block their opponent’s
attempts at claiming a winning set. This makes most such games notoriously hard to analyse, and
hardlyany general tools areknown for this purpose. As a consequence, there arevery few published
results about this convention, when compared to Maker-Breaker games.
In Maker-Breaker games, we call the players Maker and Breaker, and they have different goals –
Maker wins if she fills up a winning set, while Breaker wins otherwise, i.e. if he claims at least
one element in each winning set. Note that no draw is possible in this convention. Maker-Breaker
gamesarethemostresearchedconvention ofpositionalgames, eversinceErd˝osandSelfridge[8]first
introducedthemin 1973. Lookingat Tic-Tac-Toe onthestandard3×3boardintheMaker-Breaker
convention, it is straightforward to convince oneself that Makers wins when playing first.
The main problem on positional games consists in determining the outcome i.e. the identity of the
player who has a winning strategy (possibly depending on who starts), if there is one, assuming
that both players are playing optimally. The study of the complexity of computing the outcome
of a given positional game can be traced back to Schaefer [14], who was first to prove that Maker-
Breaker games are PSPACE-complete, even when the winning sets are of size at most 11. This was
later improved by Rahman and Watson [13], requiring only winning sets of size 6. On the other
hand, Galliot et al. [9] proved that the outcome of any Maker-Breaker game with winning sets of
size at most 3 can be determined in polynomial time. Maker-Maker games are also known to be
PSPACE-complete, as shown by Byskov in [6].
Poset positional games. Letusnowtakeacloser look atapopularrecreational game, Connect-4,
which has a lot in common with the Tic-Tac-Toe family of positional games. In Connect-4, two
players play on a board that is 7-wide and 6-high. They move alternately by placing a token of
theirs in a column of their choice. Each placed token drops down with “gravity”, landing on top of
the last previously placed token in that column, or heading all the way to the bottom of the column
ifitisempty. Thefirstplayer withtokens onfourconsecutive positions inaline(vertical, horizontal
or diagonal) wins, and, if neither of the players manages to do that by the time all the columns are
full, then a draw is declared. Although the game is similar to Tic-Tac-Toe at first glance, there is
one crucial difference – the players cannot choose freely from all the empty positions of the board,
as at any point a column offers at most one available position (the lowest token-free position).
The outcome of the game is known as a first player win, as shown by Allis in [3], and independently
by Allen [1] who later wrote a whole book [2] about this game. Connect-4 was solved in [17] for
some nonstandard board sizes, and for some other in [16].
Recently, Avadhanam and Jena [4] studied Connect-Tac-Toe, where they introduce a restriction on
which unclaimed elements can be claimed, combining the nature of Connect-4 with the positional
gameofTic-Tac-Toe. Theyalsolookatthegeneralized[n]dConnect-Tac-Toe,playedonahypercube
[n]d, relating it to the restricted version of the [n]d Tic-Tac-Toe. Additionally, they give a lower
bound on an analogue of the Hales-Jewett number, HJ(n), in this setting.
2

|     |     |     |     | d   |     |     | i h |
| --- | --- | --- | --- | --- | --- | --- | --- |
|     |     |     |     | c   |     |     | g   |
a
|     |     |     |     |     | b   |     | f   |
| --- | --- | --- | --- | --- | --- | --- | --- |
e
|     |     |     | Figure | 1:  | A poset | on nine | vertices. |
| --- | --- | --- | ------ | --- | ------- | ------- | --------- |
In the present paper, we propose a new framework which, in full generality, enables us to combine
the move restrictions with positional games (like it is done in Connect-4). Namely, we introduce
poset positional games, which are positional games with an additional structure – a poset on the
elements of the board. Throughout the game play, based on this poset and the set of elements that
are claimed up to that point, we reduce the set of available moves for the player whose turn it is –
an element of the board can only be claimed if all the smaller elements (in the poset) are already
claimed.
Weproceedtoanalysethesegamesinmoredetail,withaprimefocusonthemoststudiedconvention,
the Maker-Breaker games. After setting out a formal introduction of poset positional games, we
go on to build a general framework around them. Then we perform a comprehensive study of the
complexity of determining the game outcome, conditioned on the structure of the family of winning
| sets on       | the one side | and the  | structure  | of  | the poset | on the | other. |
| ------------- | ------------ | -------- | ---------- | --- | --------- | ------ | ------ |
| 1.2 Framework |              | of poset | positional |     | games     |        |        |
A poset P on a set X is defined by a partial order relation ≤. On top of that, we use < to denote
the same relation acting on distinct elements. In this paper, posets will be depicted by directed
graphs in the usual way, where the elements are vertices, and two elements x and y satisfy x ≤ y if
and only if there exists a directed path from x to y. For example, in the poset in Figure 1, we have
e ≤ i and e ≤ d. Two elements are deemed incomparable if there exists no directed path between
| them (e.g. | b and | i are incomparable |     | in the | poset | from | Figure 1). |
| ---------- | ----- | ------------------ | --- | ------ | ----- | ---- | ---------- |
In addition, we will use the following standard definitions about posets: A chain is a set of elements
that are pairwise comparable. In other words, it is a set S ⊆ X such that for any x,y ∈ S, we have
x ≤ y or y ≤ x. An antichain is a set of elements that are pairwise incomparable. In other words,
it is a set S ⊆ X such that for any x,y ∈ S, we have x 6< y and y 6< x. The height of a poset is the
cardinality of its longest chain. The poset from Figure 1 has height 4. The width of a poset is the
cardinality of its largest antichain. The poset from Figure 1 has width 4 because of the antichain
{a,b,i,h}. Given an element x, we say that y is a predecessor of x (resp. a successor) if y < x
(resp. x < y) and there is no other element between x and y. An element x is said to be maximal
(resp. minimal) in the poset if it has no successor (resp. no predecessor).
We are now able to formally define a poset positional game as follows. A poset positional game is a
triple (X,F,P) where X is a finite set of elements (also called vertices), F is a collection of subsets
| of X corresponding |     | to the winning |     | sets, | and P | is a poset | on X. |
| ------------------ | --- | -------------- | --- | ----- | ----- | ---------- | ----- |
The game is played by two players that alternately claim an unclaimed vertex x of X such that all
vertices smaller than x have already beenclaimed. Therest stays the same as before. In theMaker-
Maker convention, the first player that fills up a winning set S ∈ F wins. If no player manages to
fill up a winning set, the game ends in a draw. In the Maker-Breaker convention, Maker wins if
she fills up a winning set at some point during the game, otherwise Breaker wins. During a game,
when a player claims a single vertex, we call that a move, whereas a round corresponds to a pair of
| moves | made successively | by  | both players. |     |     |     |     |
| ----- | ----------------- | --- | ------------- | --- | --- | --- | --- |
3

Note that a standard positional game is a poset positional game where all the vertices are pairwise
incomparable. Furthermore, in poset positional games, from any given position, the set of moves
that are available to the next player forms an antichain of the poset. In particular, there are at
most w available moves at any point of a game, where w is the width of the poset.
Remark 1. In the Maker-Breaker convention, we will indifferently use the terms game and game
position. Indeed, any game position that includes moves already played by Maker and Breaker can
be simplified to a position without pre-played moves. To do this, it suffices to remove all the vertices
already played. The winning sets containing at least one move of Breaker can be removed, and those
containing moves of Maker can be reduced to only unclaimed vertices. By definition of the rules,
both operations do not affect the winner of the game. With this reduction, all the elements that are
available for any player correspond to minimal elements of the poset.
It is a well-known result that, for any standard positional game played in the Maker-Maker con-
vention, the second player cannot have a winning strategy, so that the only possible outcomes are
a first player win FP or a draw D. Similarly, for any standard positional game played in the
Maker-Breaker convention, there are only three possible outcomes (if we do not specify who starts):
• M if Maker has a winning strategy no matter who starts the game,
• B if Breaker has a winning strategy no matter who starts the game,
• N if the next player (i.e. the player whose turn it is) has a winning strategy.
AsimplestrategystealingargumentensuresthatthesecondplayercannotwininanyMaker-Breaker
game.
When switching to the framework of poset positional games, the property asserting that the second
player never wins is not true any more. As a consequence, there are game positions for which the
next player may have interest in skipping their turn. The corresponding outcome will be denoted
by P (standing for “Previous player wins”, or equivalently meaning that the second player has a
winning strategy). Such phenomena are generally called zugzwangs in the literature of combinato-
rial games [7]. Zugzwangs are known to be hard to deal with, in particular when the games are
decomposed into sums (i.e. disjoint unions) of smaller games, leading to a kind of “waiting game”
withinthe game. Sinceposetpositional games may have this property, this leads to a morecomplex
analysis of their study from a general point of view. Therefore, it motivates the study of the dis-
joint union of poset positional games according to the outcome of each game of the union. Figure 2
gives the possible outcomes in a disjoint union of poset positional games, according to the parity of
the number of vertices in each game. In particular, one can remark that the outcome M is often
absorbing in a disjoint union of poset positional games. The results from this figure will be proved
in the appendix (Theorem 26).
If we have a disjoint unionof poset positional games, becauseof the existence of zugzwangs, compo-
nents without a winning set cannot be directly removed from the union, as they can be considered
as waiting moves. Yet, only the parity of such components plays a role in the outcome.
Lemma 2. Let G =G ∪G be a poset positional game that is a disjoint union of two poset positional
1 2
games G and G , such that G has no winning set. Then the component G can be removed from G
1 2 2 2
if its board is even, or replaced by a single vertex if its board is odd, without changing the outcome
of the game.
′
Proof. Define G as G (if the board of G is even) or G plus a new isolated vertex x (if the board
1 2 1
of G is odd), and fix the identity of the first player. We will show that the winning player, i.e. the
2
′
player who has a winning strategy S in G , can also win in G using a strategy that we now describe.
• Firstly, suppose that the board of G is even. The winning player can simply follow the
2
strategy S, except when theopponentplays inside G , in which case the winningplayer claims
2
4

even\even M N P B
M M M M M
N M M,N M M,N
P M M P P
B M M,N P P,B
even\odd M N P B
M M M,N M M,N
N M M,N M all
P M N M N
B M N M,P N,B
odd\odd M N P B
M M M M M,N
N M M,P M,N all
P M M,N M M,N
B M,N all M,N all
Figure2: Possibleoutcomesforadisjointunionoftwoposetpositionalgamesdepending
on the parity of the number of vertices in both games. We write ”all” when all four
outcomes are possible.
an arbitrary vertex in G (as made possible by the parity). Since there is no winning set in
2
G , this ensures a win in G.
2
• Now, suppose that the board of G is odd. The strategy is the same, except that we need to
2
handle two events E1 and E2 which may occur at some point:
– E1: The winning player is instructed by S to claim x.
– E2: The opponent claims the last remaining vertex in G .
2
If E1 occurs before E2, then the winning player can simply claim an arbitrary vertex in
G , after which the parity ensures that E2 never occurs. If E2 occurs before E1, then x is
2
′
unclaimed in G , so the winning player can imagine that the opponent claimed x, after which
E1 obviously never occurs.
From now on, unless explicitly stated, we will only consider the Maker-Breaker convention of poset
positional games. Though the computation of the outcome is generally the main issue when investi-
gatingsuchgames,thisstudycan,undercertaincircumstances,bereducedtothecaseofaparticular
player starting the game. Indeed, starting with a game G = (X,F,P) where Maker (resp. Breaker)
′ ′ ′ ′
is the first player and claims a vertex x, we get a resulting game G = (X ,F ,P ) where Breaker
′ ′ ′
(resp. Maker) is the first player, defined by X = X −x, P = P −x and F = {W \{x}| W ∈ F}
′
(resp. F = {W| W ∈ F,x 6∈ W}). Therefore, when studying a class of games which is stable
under Maker’s (resp. Breaker’s) moves in terms of that update, we may freely assume that Breaker
(resp. Maker) is the first player, up to considering all possibilities for their opponent’s first move
otherwise. In this paper, all studied classes will be stable under Breaker’s moves, so we will al-
ways assume that Maker is the first player. Therefore, the decision problem that will be mainly
investigated is the following:
MB Poset Positional Game
Input: A poset positional game G = (X,F,P).
Output: The player having a winning strategy (i.e. Maker or Breaker) when Maker starts.
5

Since standard positional games are included in poset positional games, the problem MB Poset
Positional Game is PSPACE-complete from a result of Schaefer [14].
1.3 Exposition of the results
Themainobjective ofthispaperistoconsiderthecomplexity ofMB Poset Positional Gamere-
lated to some parameters of the instance. More precisely, we have chosen to focus on the properties
of the poset, as it is the main distinctiveness of the current contribution, comparing the results
we obtain to the previous results about standard positional games. In Section 2, we will firstly
examine the problem depending on the height of the poset. As it is already known that, even for
height 1 (i.e. all the elements are pairwise incomparable) and winning sets of size 6, the problem
is PSPACE-complete [13], we will also refine our classification according to the number and/or the
size of the winning sets. The main contribution of this section addresses the case where there is
only one winning set of size 1. By adding such a condition, the problem admits a complexity jump
between instances of height 2, proved to be polynomial, and height 3, proved to be NP-hard.
Section 3 deals with the width of the poset. As the case of width 1 is straightforward (P is made
of only one chain, so the order of the moves is completely predetermined), we start by considering
instances with width 2. We show that MB Poset Positional Game is PSPACE-hard in this case,
even if all the winning sets are of size 3. This illustrates a major difference with standard positional
games, which are known to be tractable in this setting. We then give a polynomial-time algorithm
that solves the general case where the width of the poset and the number of winning sets are fixed.
Section 4 is devoted to the case where the poset is a union of disjoint chains. This case is a direct
generalization of thegame Connect-4. Ourfirstresultis afullcharacterization of the outcome when
all the winning sets are of size 1. When the winning sets are of size at most 2, things are more
tricky, but we do provide a polynomial-time algorithm when the width of the poset (i.e. the number
of chains in the union) is fixed. Finally, by adding the restriction that the height of each chain is
at most 2, we get a polynomial-time algorithm regardless of the number of chains.
Table 1 summarizes all the results known about the complexity of MB Poset Positional Game,
referring either to the literature of standard positional games, or to results proved in the current
paper. In the table, recall that the complexity class XP defines the class of problems parameterized
by a parameter k and that can be solved in time O(|X|f(k)), where |X| is the size of the instance
and f is a computable function. In addition to these results, the choice of focusing on the Maker-
Breakerconvention insteadoftheMaker-Maker oneisreinforcedinAppendixbyTheorem28,which
yields an instance (height 2 and all non-minimal elements are winning sets of size 1) for which the
resolution is PSPACE-complete in the Maker-Maker convention, whereas it is in polynomial time
in the Maker-Breaker convention (see Theorem 7).
2 Posets of small height
2.1 Posets of height 2
2.1.1 Winning sets of size 1
We first look at what happens when all the winning sets are of size 1. This case is rarely straight-
forward, and often deserves to be studied depending on some parameters of the poset. In addition,
it is closely correlated to the case where there is a unique winning set (of any size). The following
remark explains the link between both situations.
Remark 3. Up to switching the roles of the players, a poset positional game with a single winning
set of size k is equivalent to a poset positional game with k winning sets of size 1.
6

poset
|     |     |     |     | general |     |     | height | h   | width | w   | disjoint | chains |
| --- | --- | --- | --- | ------- | --- | --- | ------ | --- | ----- | --- | -------- | ------ |
winning
sets
P
w = 1:
|     |         |     | PSPACE-c |     |      |          | h = | 1:   | w =      | 2:  | h =      | 1:   |
| --- | ------- | --- | -------- | --- | ---- | -------- | --- | ---- | -------- | --- | -------- | ---- |
|     | general |     |          |     | [13] |          |     |      |          |     |          |      |
|     |         |     |          |     |      | PSPACE-c |     | [13] | PSPACE-c |     | PSPACE-c | [13] |
(Th. 11)
s = 1:
P
|     |      |     |          |        |     | h=       | 1,  | s = 6: |          |        | (Th. | 17) |
| --- | ---- | --- | -------- | ------ | --- | -------- | --- | ------ | -------- | ------ | ---- | --- |
|     |      |     |          | s = 3: |     | PSPACE-c |     |        | w =2,    | s = 3: |      |     |
|     |      |     |          |        |     |          |     | [13]   |          |        | s =  | 2:  |
|     | size | s   | PSPACE-c |        |     |          |     |        | PSPACE-c |        |      |     |
XP
|     |     |     |     |          |     | h=  | 2,  | s = 3: |      |     | by w | (Th. 23) |
| --- | --- | --- | --- | -------- | --- | --- | --- | ------ | ---- | --- | ---- | -------- |
|     |     |     |     | (Th. 11) |     |     |     |        | (Th. | 11) |      |          |
NP-h
|     |     |     |     |     |     |     | (Th. | 8)  |     |     | h= 2, | s = 2: |
| --- | --- | --- | --- | --- | --- | --- | ---- | --- | --- | --- | ----- | ------ |
P
|     |        |     |     |         |     |     |      |        |         |     | (Th.   | 25) |
| --- | ------ | --- | --- | ------- | --- | --- | ---- | ------ | ------- | --- | ------ | --- |
|     |        |     |     | NP-hard |     |     |      |        |         |     | m =    | 1:  |
|     |        |     |     |         |     | m   | = 1, | h = 3: |         |     |        |     |
|     | number | m   |     |         |     |     |      |        | XP (Th. | 12) | P (Th. | 17  |
NP-hard
|     |     |     |     | (Th. 9)  |     |       |     | (Th. 9)   |     |     |            |     |
| --- | --- | --- | --- | -------- | --- | ----- | --- | --------- | --- | --- | ---------- | --- |
|     |     |     |     |          |     |       |     |           |     |     | and Remark | 3)  |
|     |     |     |     |          |     | h= 2, | m = | 1, s = 1: |     |     |            |     |
|     |     |     | m   | = 1, s = | 1:  |       |     |           |     |     |            |     |
P
|     | number | m      |     |         |     |       | (Th. | 5)        |         |     |          |     |
| --- | ------ | ------ | --- | ------- | --- | ----- | ---- | --------- | ------- | --- | -------- | --- |
|     |        |        |     | NP-hard |     |       |      |           | XP (Th. | 12) | XP (Cor. | 14) |
|     | and    | size s |     |         |     | h= 3, | m =  | 1, s = 1: |         |     |          |     |
|     |        |        |     | (Th. 9) |     |       |      |           |         |     |          |     |
NP-hard
|     |     |     |     |     |     |     |     | (Th. 9) |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | ------- | --- | --- | --- | --- |
Table 1: Complexity of MB Poset Positional Game dependingon some parameters
|     | of the | poset and | of  | the collection |     | of winning |     | sets. |     |     |     |     |
| --- | ------ | --------- | --- | -------------- | --- | ---------- | --- | ----- | --- | --- | --- | --- |
In the above remark, the equivalence means that the two games have the same outcome. Indeed,
Maker wins when there is a single winning set of size k if and only if she manages to claim all the
elements of this set. In the second game, a win of Breaker consists in claiming all the winning sets
(of size 1), thus corresponding to the equivalence. Note that Breaker is starting in one of the two
games,butthisisnotapitfallbyRemark1sinceboththeseclassesarestableunderBreaker’smoves.
We continue with a minor result which is useful when dealing with winning sets of size 1. Given
a poset P and a vertex x, we denote by p(x) the number of vertices that are not greater or equal
to x i.e. p(x) := |X|−|{y| y ≥ x}|. This quantity is used in the following lemma, which yields a
necessary and sufficient condition for Maker to win when there is a unique winning set of size 1.
Lemma 4. Let G = (X,{{x}},P) be a poset positional game. Suppose that, after some rounds of
play in G, all predecessors of x have been claimed apart from one, which we denote by y. Then, in
| this | position, | Maker | wins | if and only | if  | p(y) is | odd. |     |     |     |     |     |
| ---- | --------- | ----- | ---- | ----------- | --- | ------- | ---- | --- | --- | --- | --- | --- |
Proof. At this point in the game, neither player wants to claim y, since it would free up x and
the opponent would win on the spot. Therefore, the game is just a parity game, with both players
claiming all the vertices they can without claiming y. There are exactly p(y) such vertices that can
be claimed, including all the vertices that have already been claimed. If p(y) is odd (resp. even),
then Maker (resp. Breaker) will claim the last vertex that can be claimed without claiming y, after
which Breaker (resp. Maker) will be forced to claim y and Maker (resp. Breaker) will claim x to
win.
7

Theorem 5. MB Poset Positional Game can be solved in polynomial time when: the poset is
of height 2, there is only one winning set, and this winning set is of size 1.
Proof. Let G = (X,{{x}},P) be a poset positional game with x ∈ X and P has height 2. If x
is a minimal element, then Maker trivially wins. Thus we can assume that x has at least one
predecessor. One can partition the predecessors of x into two sets M and B where M (resp. B)
contains the predecessors y of x such that p(y) is even (resp. odd).
We claim that Maker wins if and only if |M| ≤ |B|. Indeed, assume that |M| ≤ |B|. Then Maker
repeatedly claims an unclaimed vertex of M until all vertices of M are claimed. At this point B
contains at least one unclaimed vertex. Thus, the last predecessor of x to be claimed will be in B.
By Lemma 4, this means that Maker wins. If |M| > |B|, then similarly Breaker wins by claiming
vertices of B – they will be all claimed before the vertices of M are, and the last predecessor of x
to be claimed will be in M. We again conclude with Lemma 4 that Breaker wins.
The situation is already much more complicated with two winning sets of size 1, and we leave it as
an open problem.
Open question 6. What is the complexity of MB Poset Positional Game on a poset of height 2
with two winning sets of size 1?
However, for winning sets of size 1 and a poset of height 2 whose nonminimal elements are all
winning sets, one can compute the outcome in polynomial time, as we now show. Note that the
same situation is PSPACE-complete in the Maker-Maker convention (see Theorem 28 in Appendix).
Theorem 7. MB Poset Positional Game can be solved in polynomial time when: the poset is
of height 2, all the winning sets are of size 1, and all nonminimal elements are winning sets.
Proof. LetP bea posetof height 2on a set X. We say theminimalelements of P arethe “bottom”
vertices, and the others are the “top” vertices. For every relation x < y, we know x is a bottom
vertex and y is a top vertex. Note that every vertex that is not comparable with any other vertex
is a bottom vertex. We say that x is a private predecessor of y if y is the only successor of x.
Theposet positional game we consider is G = (X,{{y},y top vertex},P). We will prove that Maker
wins if and only if at least one of the following conditions holds:
1. |X| is odd.
2. There exists a top vertex y which does not have more private predecessors than non-private
ones.
First note that these two conditions can be tested in polynomial time.
We prove that Maker winsunderany of these two conditions. Ifcondition 1 holds then, since Maker
starts, she also plays last. Let y be any top vertex. Maker plays as follows. She never claims y or
its last predecessor. When the last predecessor of y is claimed, either it is claimed by Breaker and
Maker wins by claiming y, or Maker has to claim it. In this case, as the total number of vertices is
odd, there are at least two remaining vertices, all of which are top vertices. Therefore, Maker will
win with her next move.
Assume now that Condition 2 holds, and let y be a top vertex which does not have more private
predecessors than non-private ones. Maker starts by claiming private predecessors of y until all of
them are claimed. Right after the last private predecessor of y is claimed, since there are at least as
many non-private predecessors of y by assumption, there will be still some unclaimed predecessors
of y that are not private.
8

Then,as long as Breaker doesnot claim thelast predecessor of y, Maker claims an arbitrary bottom
vertex which is notthelast predecessorof y, if possible. Whenthelast predecessorx of y is claimed,
either it is claimed by Breaker and Maker wins by claiming y, or Maker has to claim it. The fact
that Maker has to claim x means that all the other bottom vertices have been claimed, so all the
successors of x are now available. Moreover, since x is not a private predecessor of y, it has at least
two successors. Therefore, even if Breaker claims one of them, Maker will claim another and win.
We now prove that Breaker wins when none of the conditions hold, i.e. when |X| is even, and the
property (∗) “all the top vertices have strictly more private predecessors that non-private ones”
holds. Note that the status of being private/non-private cannot change during the game.
Wegive astrategy forBreaker thatmaintains theproperty(∗)throughout. Whenever Maker claims
| a   | bottom | vertex x, | Breaker | answers | as follows: |     |     |     |
| --- | ------ | --------- | ------- | ------- | ----------- | --- | --- | --- |
• If x was the last predecessor of some top vertex y, then Breaker claims y. Since (∗) was true
beforeMaker’sturnandy hasonlyonepredecessorx,weknowxmustbeaprivatepredecessor
of y. In particular, there is no other top vertex that has been made available when Maker has
claimed x. Moreover, (∗) is still true after Breaker’s move since the predecessors of the other
|     | top | vertices have | not | changed. |     |     |     |     |
| --- | --- | ------------- | --- | -------- | --- | --- | --- | --- |
•
Otherwise,ifxwasaprivatepredecessorofsometopvertexy thathasatleastonenon-private
|     |     | ′   |     |     | ′   |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
predecessor x, then Breaker claims x. Note that this way, (∗) still holds for y as well as for
|     | all the | other top | vertices. |     |     |     |     |     |
| --- | ------- | --------- | --------- | --- | --- | --- | --- | --- |
• Otherwise, if there is a bottom vertex that is not a private predecessor of any top vertex, then
Breaker claims an arbitrary such vertex. The property (∗) still holds after this move.
• Otherwise, every bottom vertex is a private predecessor of some top vertex. Since the total
number of vertices is even and it is Breaker’s turn, there must be a top vertex y with at least
two (private) predecessors. Then Breaker claims an arbitrary predecessor of y. The property
|     | (∗) still | holds | after this | move. |     |     |     |     |
| --- | --------- | ----- | ---------- | ----- | --- | --- | --- | --- |
By following this strategy, Breaker thus ensures that the property (∗) is satisfied after each of his
moves, so Maker will never be able to claim a top vertex. Therefore, Breaker wins.
From Remark 3, note that the above result also resolves MB Poset Positional Game in poly-
nomial time for posets of height 2 and with a unique winning set built with all the nonminimal
elements.
| 2.1.2 | Winning | sets | of  | size 3 |     |     |     |     |
| ----- | ------- | ---- | --- | ------ | --- | --- | --- | --- |
NP-hard,
Theorem 8. MB Poset Positional Game is even when restricted to instances where
| the | poset | has height | 2 and all | the winning | sets are | of size 3. |     |     |
| --- | ----- | ---------- | --------- | ----------- | -------- | ---------- | --- | --- |
Proof. Theproof is a reduction from 3-SAT. Let φ bea 3-SAT formula. We build a poset positional
game G = (X,F,P) with P of height 2 and winning sets of size 3 as follows:
• For any variable x of φ, we add four vertices u ,v ,v and v in X.
|     |     |     | i   |     |     | i i i | i   |     |
| --- | --- | --- | --- | --- | --- | ----- | --- | --- |
e
•
For any clause C j = l j1 ∨l j2 ∨l j3 in φ, we add the winning set S j with, for 1 ≤ k ≤ 3, v jk ∈ S j
|     | if l | = x , and | v ∈S | if l | = ¬x . |     |     |     |
| --- | ---- | --------- | ---- | ---- | ------ | --- | --- | --- |
|     | jk   | jk        | jk   | j jk | jk     |     |     |     |
• For any variable x of φ, we add the relations u < v , u < v and u < v in P.
|     |     |     | i   |     |     | i i i | i i | i   |
| --- | --- | --- | --- | --- | --- | ----- | --- | --- |
e
9

We prove that φ is satisfiable if and only if Breaker wins the poset positional game played on G.
Supposefirstthat φ is satisfiable and let ν bea valuation that satisfies φ. We consider the following
| strategy | for | Breaker: |     |     |     |     |     |     |     |     |     |     |
| -------- | --- | -------- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
•
Whenever Maker claims a vertex u i , if x i is set to True in ν then Breaker claims v i , and if x i
|     | is set | to False | in  | ν then | Breaker | claims | v   | .   |     |     |     |     |
| --- | ------ | -------- | --- | ------ | ------- | ------ | --- | --- | --- | --- | --- | --- |
i
• WheneverMakerclaimsavertexin{v ,v ,v },Breakerclaimstheremainingvertexin{v ,v ,v }.
|     |     |     |     |     |     |     | i i | i   |     |     |     | i i i |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- |
|     |     |     |     |     |     |     |     | e   |     |     |     | e     |
Note that, since Maker starts, these moves are always possible. For each winning set S , by as-
j
sumption, ν satisfies the corresponding clause C by assumption. Thus, there exists some l ∈ C
|     |     |     |     |     |     |     |     | j   |     |     |     | jk j |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- |
that is evaluated to True. If this literal is x , then Breaker has claimed v ∈ S , and if it is ¬x
|      |         |     |         |     |            |       | jk      |       |     |     | jk j | jk  |
| ---- | ------- | --- | ------- | --- | ---------- | ----- | ------- | ----- | --- | --- | ---- | --- |
| then | Breaker | has | claimed | v   | jk ∈ S j . | Thus, | Breaker | wins. |     |     |      |     |
Conversely, suppose that φ is not satisfiable, and consider the following strategy for Maker:
|     | • As her | first | move, | Maker | claims | some | arbitrary |     | u . |     |     |     |
| --- | -------- | ----- | ----- | ----- | ------ | ---- | --------- | --- | --- | --- | --- | --- |
j
• Whenever Breaker claims avertex ofsomepair{v ,v }, Maker respondsbyclaimingtheother,
i i
|     | if it | is still | available. | Otherwise, |     | Maker | claims |     | an arbitrary | vertex. |     |     |
| --- | ----- | -------- | ---------- | ---------- | --- | ----- | ------ | --- | ------------ | ------- | --- | --- |
When all the vertices have been claimed, Maker has claimed at least one vertex in each pair {v ,v }.
i i
Consider the valuation ν such that, for all i, x i is True if and only if Breaker has claimed v i . As
Breaker could not have claimed both v and v for any i, we know that Maker has claimed all the
|     |     |     |     |     |     | i   |     | i   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
vertices correspondingto literals that are false underν. On the other hand,since φ is not satisfiable
by assumption, there exists some clause C whose literals are all false under ν. This means all three
j
vertices of S j have been claimed by Maker, so Maker has won the game.
| 2.2 | Posets       |     | of height | 3         |     |            |     |     |         |      |                  |      |
| --- | ------------ | --- | --------- | --------- | --- | ---------- | --- | --- | ------- | ---- | ---------------- | ---- |
|     |              |     |           |           |     |            |     |     |         | MB   | Poset Positional | Game |
| We  | now consider |     | posets    | of height | 3.  | UsingLemma |     | 4,  | weprove | that |                  |      |
is NP-hard even if there is only one winning set and that winning set has size 1.
Theorem 9. MB Poset Positional Game is NP-hard even when restricted to instances where:
the poset has height 3, there is only one winning set, and that winning set is of size 1.
Proof. We reduce from the problem Set Cover. A set cover of a hypergraph H = (V,E) is a set
S ⊆ E of edges such that every vertex of H belongs to some edge in S. Given an integer k, deciding
NP-complete
if a given hypergraph contains a set cover of cardinality k is [12].
Let H = (V,E) be a hypergraph, and let k be an integer. We assume that any vertex of H is in at
least one edge. We construct a poset positional game G H = (X,F,P) as follows. Define m := |E|
| and | n := |V|. | The   | set     | of vertices | X          | is the         | union | of: |      |     |     |     |
| --- | --------- | ----- | ------- | ----------- | ---------- | -------------- | ----- | --- | ---- | --- | --- | --- |
|     | • X ,     | a set | of size | n, in       | one-to-one | correspondence |       |     | with | V;  |     |     |
V
|     | • X , | a set | of size | m, in | one-to-one |     | correspondence |     | with | E;  |     |     |
| --- | ----- | ----- | ------- | ----- | ---------- | --- | -------------- | --- | ---- | --- | --- | --- |
E
|     | • X | , a set | of size | m−k; |     |     |     |     |     |     |     |     |
| --- | --- | ------- | ------- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
M
|     | • X , | a set | of size | n−k; |     |     |     |     |     |     |     |     |
| --- | ----- | ----- | ------- | ---- | --- | --- | --- | --- | --- | --- | --- | --- |
B
•
|     | x and | y, two | additional |     | vertices. |     |     |     |     |     |     |     |
| --- | ----- | ------ | ---------- | --- | --------- | --- | --- | --- | --- | --- | --- | --- |
There are 2(n+m−k+1) vertices in total. The set F contains a unique winning set {x}. As for
| the | definition | of  | P, we | have | v < u | in the | following | cases: |     |     |     |     |
| --- | ---------- | --- | ----- | ---- | ----- | ------ | --------- | ------ | --- | --- | --- | --- |
|     | • v ∈X     | and | u∈    | X ;  |       |        |           |        |     |     |     |     |
|     |            | M   |       | V    |       |        |           |        |     |     |     |     |
10

• v ∈X , u∈ X , and u∈ v in H;
E V
• v ∈X , u∈ X ;
E B
• v ∈X ∪X , u= x;
V B
• v ∈X , u= y.
B
See Figure 3 for an illustration of the structure of the game. Note that P has height 3. The
predecessors of x are in X and X . Moreover, for all v ∈ X , p(v) = 2(n+m−k) is even, and
V B V
for all u∈ X , p(u)= 2(n+m−k)−1 is odd. We will say a subset of X is empty if all its vertices
B
have been claimed: with Lemma 4 in mind, Maker wants X to be empty before X is.
V B
We will prove that H has a set cover of size k if and only if Breaker wins the game G .
H
First of all, suppose that H has a set cover of size k, S = {e ,e ,...,e }. Both players can only
1 2 k
claim vertices inX ∪X until either X or X is empty. Duringthefirstm−k rounds,Breaker’s
M E M E
strategy is the following. Whenever Maker claims a vertex in X \S, Breaker claims an arbitrary
E
vertex in X . Otherwise, Breaker claims an arbitrary vertex in X \S. This ensures that X \S
M E E
is empty after exactly m−k rounds. Note that, among the first m−k+1 moves of Maker, she has
necessarily claimed at least one vertex in S. Indeed, there are 2(m−k) vertices in X ∪(X \S),
M E
moreover anyvertex inX ∪X hasapredecessorinS andthuscannotbeclaimed whileallvertices
V B
in S are unclaimed. Therefore, after the (m−k+1)th move of Maker, 2(m−k)+1 vertices have
been claimed, all of which are in X ∪X , including all the vertices in X \S and at least one
M E E
vertex in S. This means that at most k −1 vertices in X are unclaimed at this point. Breaker
E
goes on to claim vertices in X until it is empty (at most k−1 additional moves), and then moves
E
on to claiming vertices in X until is is empty (at most n−k additional moves). During this time,
B
Maker cannot claim all n vertices in X , so the last predecessor of x to be claimed will be in X .
V V
By Lemma 4, Breaker wins.
Now, suppose that H has no set cover of size k. This means in particular that for any set S ⊆ E
of i ≤ k edges, at least k−i+1 vertices of V are not covered by any edge in S. Indeed, one could
otherwise add k −i edges to cover all the vertices and obtain a set cover of size k. We provide a
strategy for Maker, in three stages. She starts by claiming an arbitrary vertex in X . She then
M
answers the first m−k−1 moves of Breaker as follows:
(a1) if Breaker claims a vertex in X , then Maker claims an arbitrary vertex in X ;
E M
(a2) otherwise, Breaker can only claim a vertex in X , and then Maker claims an arbitrary vertex
M
in X .
E
This concludes the first stage. At this point, X is empty, and exactly m−k−1 vertices have been
M
claimed in X . In the second stage, Maker answers the next k+1 moves of Breaker as follows:
E
(b1) if Breaker claims a vertex in X , then Maker claims an arbitrary vertex in X ;
E V
(b2) otherwise, Breaker can only claim a vertex in X , and then Maker claims an arbitrary vertex
V
in X .
E
First of all, note that Maker is always able to play the move in (b1). Indeed, consider that i moves,
1 ≤ i ≤ k, have been played by Breaker in the second stage (including his last move in X ). Then
E
k+1−i vertices remain unclaimed in X , and n−i vertices are unclaimed in X . The k+1−i
E V
unclaimed vertices in X correspond to a set of edges of cardinality k+1−i ≤ k. As we observed
E
earlier, at least i vertices of V are not covered by this set and thus have all their predecessors
claimed already. Of those vertices, at most i−1 have already been claimed, so at least one vertex
in X can be claimed by Maker.
V
11

x y
X V X B
|     |     |     |     | if v ∈e |
| --- | --- | --- | --- | ------- |
|     |     | X   |     | X       |
|     |     | M   |     | E       |
Figure 3: Reduction from Set Cover to MB Poset Positional Game. A solid arc
means that all the possible relations are in the poset. The winning set is represented
| by a | red circle. |     |     |     |
| ---- | ----------- | --- | --- | --- |
After the second stage, X is empty, n−k−1 vertices remain unclaimed in X , and n−k vertices
E V
remain unclaimed in X . Therefore, Maker can claim all the remaining vertices in X before
B V
| Breaker claims | all the | vertices in X . | By Lemma | 4, Maker wins. |
| -------------- | ------- | --------------- | -------- | -------------- |
B
Remark10. Whenthere isonlyonewinningsetofsize1, theMaker-Makerconventionisequivalent
to the Maker-Breaker convention. Therefore, MB Poset Positional Game with only one winning
NP-hard
set of size 1 and height 3 is also in Maker-Maker convention.
| 3 Posets | of bounded | width |     |     |
| -------- | ---------- | ----- | --- | --- |
Inthissection,weconsiderposetsofboundedwidth. Forwidth1,thegameiscompletelydetermined
andthuspolynomial. However, forwidth2,weprovethatMB Poset Positional Gameisalready
PSPACE-hard
even if the winning sets have size at most 3. However, if the number of winning sets
is also bounded, we give an algorithm running in time O(|X|w2mw4).
| 3.1 Width | 2   |     |     |     |
| --------- | --- | --- | --- | --- |
The reduction will be made from 3-QBF, which has been proven PSPACE-complete by Stockmeyer
| and Meyer | [15]. |     |     |     |
| --------- | ----- | --- | --- | --- |
3-QBF
Input:
A formula of the form ψ = ∀x 1 ∃x 2 ...∀x 2n−1 ∃x 2n ϕ(x 1 ,...,x 2n−1 ) where ϕ is a 3-CNF
formula
| Output: The | truth value | of ψ |     |     |
| ----------- | ----------- | ---- | --- | --- |
PSPACE-complete
Theorem 11. MB Poset Positional Game is even when restricted to in-
stances where the poset is of width 2 and the winning sets are of size 3.
Proof. The result is obtained by reduction from 3-QBF. Let ψ = ∀x 1 ∃x 2 ...∀x 2n−1 ∃x 2n ϕ be a
3-QBF formula.
A classical equivalent formulation of 3-QBF is to consider that two players, Satisfier and Falsifier,
are choosing the valuations of the variables, with Falsifier starting and choosing the valuations of
the odd variables whereas Satisfier chooses the valuations of the even variables. Satisfier wins if the
valuation created by their moves satisfies ϕ, otherwise Falsifier wins.
12

v
|     |     |     |     |     |     |     |     | 4   | v 4 |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
u
3
|     |     |     |     |     |     |     |     | v   | v   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|     |     |     |     |     |     |     |     | 3   | 3   |     |     |
u
2
|     |     |     |     |     |     |     |     | v   | v   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|     |     |     |     |     |     |     |     | 2   | 2   |     |     |
u
1
v
|     |     |     |     |     |     |     |     | 1   | v 1 |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Figure 4: The poset positional game obtained by reduction of ∀x 1 ∃x 2 ∀x 3 ∃x 4 (x 1 ∨x 2 ∨
|     | x     | )∧(¬x   | ∨x         | ∨¬x   | )      |              |     |             |         |     |     |
| --- | ----- | ------- | ---------- | ----- | ------ | ------------ | --- | ----------- | ------- | --- | --- |
|     |       | 3       | 2          | 3     | 4      |              |     |             |         |     |     |
| We  | build | a poset | positional |       | game   | G = (X,F,P)  |     | as follows: |         |     |     |
|     | • For | any     | 1 ≤i       | ≤ 2n, | we add | two vertices | v   | and         | v in X. |     |     |
|     |       |         |            |       |        |              |     | i           | i       |     |     |
•
|     | For | any | 1 ≤i | ≤ 2n−1, | we  | also add | a vertex | u i | .   |     |     |
| --- | --- | --- | ---- | ------- | --- | -------- | -------- | --- | --- | --- | --- |
•
For any clause C j = l i1 ∨l i2 ∨l i3 in ϕ, we add a winning set S j ∈ F. For 1 ≤ k ≤ 3, we have
|     | v   | ∈S  | if l | = x and | v   | ∈ S if | l = ¬x | .   |     |     |     |
| --- | --- | --- | ---- | ------- | --- | ------ | ------ | --- | --- | --- | --- |
|     | ik  |     | j ik | ik      | ik  | j      | ik     | ik  |     |     |     |
• For any 1 ≤i ≤ 2n−1, we add in P the relations v < u , v < u , u < v and u < v .
|     |     |     |     |     |     |     |     |     | i i i | i i i+1 | i i+1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ----- | ------- | ----- |
See Figure 4 for an example of the reduction. We now prove that Falsifier wins on ψ if and only if
Maker wins in G. First note that, because of the poset P, the moves are almost all forced. For any
1≤ i ≤ n, Maker chooses one of v 2i−1 or v 2i−1 , then Breaker has to claim the other and Maker has
to claim u 2i−1 . Breaker then chooses one of v 2i or v 2i , Maker has to claim the other and Breaker
| has | to claim |     | u , and | so on. |     |     |     |     |     |     |     |
| --- | -------- | --- | ------- | ------ | --- | --- | --- | --- | --- | --- | --- |
2i
Now suppose that Falsifier has a winning strategy S on ψ. We define Maker’s strategy as follows.
For any 1 ≤ i ≤ n, when Maker has to choose between v and v , she considers that all the
|     |     |     |     |     |     |     |     |     | 2i−1 | 2i−1 |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | ---- | ---- | --- |
variables x with k < 2i−1such that Maker has claimed v are set to False, and the others to True.
|     |     | k   |     |     |     |     |     |     | k   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
If, according to S, Falsifier has to put x to True, then Maker claims v , otherwise she claims
|     |     |     |     |     |     | 2i−1 |     |     |     | 2i−1 |     |
| --- | --- | --- | --- | --- | --- | ---- | --- | --- | --- | ---- | --- |
v . Since S is a winning strategy for Falsifier, at the end of the game there exists a clause C
2i−1 j
that is not satisfied by the valuation provided by Satisfier and Falsifier, i.e. all its literals are false.
By construction, the three corresponding vertices will be claimed by Maker, who will have claimed
| all | the | vertices | of the | winning | set | S . |     |     |     |     |     |
| --- | --- | -------- | ------ | ------- | --- | --- | --- | --- | --- | --- | --- |
j
Conversely, suppose Satisfier has a winning strategy S on ψ. We define Breaker’s strategy as
follows. For any 1 ≤ i ≤ n, when Breaker has to choose between v and v , he considers that all
2i 2i
thevariables x with k < 2i suchthat Maker hasclaimed v aresetto False, and theothers toTrue.
|     |     |     | k   |     |     |     |     |     | k   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
If, according to S, Satisfier has to put x 2i to True, then Breaker claims v 2i , otherwise he claims v 2i .
Since S is a winning strategy for Satisfier, at the end of the game every clause C contains a literal
j
that is true. By construction, the corresponding variable will be claimed by Breaker, who will have
| claimed |     | at least | one | vertex | in each | S j . |     |     |     |     |     |
| ------- | --- | -------- | --- | ------ | ------- | ----- | --- | --- | --- | --- | --- |
13

| 3.2 | Parameterized |     | algorithm | with the | number | of winning | sets |
| --- | ------------- | --- | --------- | -------- | ------ | ---------- | ---- |
In the following theorem, we give an algorithm of time complexity O(|X|w2mw4) for MB Poset
Positional Game where m is the number of winning sets and w is the width of the poset.
Theorem 12. MB Poset Positional Game can be decided in time O(|X|w2mw4) for instances
where the poset is of width at most w and there are at most m winning sets.
Proof. We proceed by dynamic programming. Let G = (X,F,P) be a poset positional game. Let
F = {S 1 ,...,S m } be the winning sets of G. We characterize the games that can be reached from a
game played on G using an antichain Y of X and a boolean vector B = (b ,...,b ) ∈ {0,1}m. We
1 m
| define | the game | G(Y,B) | as follows: |     |     |     |     |
| ------ | -------- | ------ | ----------- | --- | --- | --- | --- |
• The set of vertices of G(Y,B) is X(Y,B) = {x ∈ X|∃y ∈Y,y ≤ x}.
• The set of winning sets of G(Y,B) is F(Y,B) = {S ∩X(Y,B)|1 ≤ i ≤ m and b = 1}.
i i
| • The | poset  | of G(Y,B) | is P restricted | to      | X(Y,B). |     |     |
| ----- | ------ | --------- | --------------- | ------- | ------- | --- | --- |
| • As  | usual, | Maker     | is the next     | player. |         |     |     |
The set Y corresponds to the available moves. The vector B registers, for each winning set S ,
i
whether it contains an element that has already been claimed by Breaker (then b = 0) or not (then
i
b i = 1). In the latter case, it means that Maker has claimed all the elements of S i below Y, so
she will win if she claims the other elements of S . Note that the initial game G corresponds to
i
G(Y ,(1,...,1)) where Y is the set of minimal elements of P. The outcome of G(Y,B) can be
| min      |             |     | min         |     |     |     |     |
| -------- | ----------- | --- | ----------- | --- | --- | --- | --- |
| computed | inductively |     | as follows: |     |     |     |     |
′
1. If Y contains a winning set S ∈ F(Y,B) of size 1, then Maker wins.
i
| 2. If | all b | ’s are 0, | then Breaker | wins. |     |     |     |
| ----- | ----- | --------- | ------------ | ----- | --- | --- | --- |
i
3. AssumeConditions 1and 2 arenot met, andconsider thenextround. Let u∈ Y beapossible
move for Maker. Note that Maker cannot win instantly with this move since condition 1 is
Yu Yu
not met. Let be the set of minimal elements after u is claimed, and let v ∈ be a
possible answer of Breaker. Finally, let Yuv be the set of minimal elements after v is claimed.
We define Buv ∈ {0,1}m as follows: for each 1 ≤ i ≤ m, let buv = 0 if v ∈ S , otherwise let
i i
buv Yu,
= b i . Then Maker wins G(Y,B) if and only if there exists u ∈ Y such that, for all v ∈
i
| Maker |     | wins G(Yuv,Buv). |     |     |     |     |     |
| ----- | --- | ---------------- | --- | --- | --- | --- | --- |
The algorithm consists in computing the outcome of all subgames, starting with Y = ∅, and
traversing the subgames in increasing order of |X(Y,B)|. Let us analyze the complexity of the
|X|w
algorithm. There are at most antichains in a poset of width w on |X| elements, and at most
| 2m  |     |     |     |     | |X|w2m |     |     |
| --- | --- | --- | --- | --- | ------ | --- | --- |
possible values for B. Thus there at most games G(Y,B) to consider. Computing the
outcome of G(Y,B), when already knowing the outcome of G(Y ′ ,B ′ ) for every antichain Y ′ above
Y, can be done in time O(w4). Indeed, there are O(w2) choices for the moves u and v of Maker and
|          | andcomputingYuv |                 |       | bedoneintimeO(w2). |     |               |                   |
| -------- | --------------- | --------------- | ----- | ------------------ | --- | ------------- | ----------------- |
| Breaker, |                 |                 | fromY | can                |     | Consequently, | thetimecomplexity |
| of the   | algorithm       | is O(|X|w2mw4). |       |                    |     |               |                   |
Remark 13. Note the result can easily be adapted to the Maker-Maker convention. Indeed, it
suffices to use elements b with three values {0,1,2}: b = 0 (respectively 1) means that all elements
|     |     |     | i   |     | i   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
of S below Y have been claimed by the first player (resp. second player), and b = 2 if both players
| i   |     |     |     |     |     |     | i   |
| --- | --- | --- | --- | --- | --- | --- | --- |
O(|X|w3mw4).
| have claimed |     | vertices | in S i . We obtain | an algorithm | in time |     |     |
| ------------ | --- | -------- | ------------------ | ------------ | ------- | --- | --- |
14

4 Posets made of pairwise disjoint chains
In this section, motivated by the game Connect-4, we consider posets made of pairwise disjoint
chains. First note that if the size and the number of winning sets are bounded, then Theorem 12
applies.
Corollary 14. MB Poset Positional Gameon posets made of pairwise disjoint chains, with at
mose m winning sets and winning sets of size at most s can be done in time O(2m|X|ms+1(ms)2).
Proof. Since the numberof winningsets is at most m and there are at most s elements in a winning
set, there are at most ms chains of P that intersect a winning set. Let Y be the set of all vertices
which are in a chain of P that does not intersect any winning set. In other words, the elements of
′ ′ ′ ′
Y are not comparable with any element of a winning set. Let X = X \Y. Let G = (X ,F,P )
′ ′
where P is the poset induced by P on X .
′
By Lemma 2, if |Y| is even, then G and G have the same outcome. If |Y| is odd, then G has the
′′ ′
same outcome than G , the game obtained from G by adding a single element incomparable with
the others. In both cases, we reduce the problem of deciding the outcome of G to the problem of
deciding the outcome of a game with: m winning sets, at most |X| vertices, and a poset of width
at most ms+1. By Theorem 12, it can be solved in time O(2m|X|ms+1(ms)2).
In the rest of this section, we give positive results for poset positional games on pairwise disjoint
chains with very small winning sets (but an unbounded number of them). We will often use parity
arguments when discussing games on posets made of pairwise disjoint chains. Therefore, we in-
troduce the following framework, which will be useful in this section. Consider a poset positional
game G = (X,F,P) where P is made of pairwise disjoint chains C ,...,C . The elements of the
1 w
chain C are denoted as x > x > ... > x . This numbering of the vertices from top to bottom
i i,1 i,2 i,ℓi
is best adapted to define the following coloring: a vertex x is colored white if j has same parity
i,j
as |X|, otherwise it is colored black. Note that this coloring satisfies the following properties:
• The coloring does not change after a full round. When Breaker is playing, we keep the same
coloring.
• All the maximal elements are of the same color, that is: white if |X| is odd, or black if |X| is
even.
• If |X| is even, then the number of black vertices that are minimal is even (resp. odd) when it
is Maker’s (resp. Breaker’s) turn.
• If |X| is odd, then the number of white vertices that are minimal is odd (resp. even) when it
is Maker’s (resp. Breaker’s) turn.
We firstestablish some elementary lemmas aboutwinningsets of size 1, whichhelp providealinear-
time algorithm in the case where all winning sets are of size 1. Recall that, by Remark 3, this is
equivalent to consideringa single winningsetof unboundedsize: we usethis tosolve someinstances
of Connect-k in the Maker-Breaker convention. Secondly, we use dynamic programming to design
an algorithm runningin time O(h2(w+1))whenall the winningsets have size at most2 (wherehand
w respectively denote the height and the width of the poset). Finally, we turn to the case where
all winning sets are of size at most 2 and all chains are of height at most 2, for which we give an
algorithm in time O(|X|4).
4.1 Winning sets of size 1
The first observation is that Maker wins if there is a winning set of size 1 which is white.
15

Lemma 15. If {u} ∈ F for some white vertex u, then Maker wins.
Proof. Write u = x . If x is a minimal element of P, then Maker can claim it as her first move.
i,j i,j
Otherwise, consider its unique predecessor x . The number of vertices that are greater or equal
i,j+1
than x is exactly j, which has same parity as |X| since x is colored white. Thus, the number
i,j i,j
of vertices that are not greater or equal than x , i.e. that can be claimed before x , is even.
i,j i,j
Therefore, if Maker never claims x , then Breaker will have to claim it, after which Maker can
i,j+1
claim x and win.
i,j
It is easy to see that the same assertion would be false for black vertices. However, if |X| is odd
and there are two such winning sets on different chains, then Maker is also winning.
Lemma 16. If |X| is odd and {u},{v} ∈ F for some black vertices u and v sitting on different
chains, then Maker wins.
′ ′
Proof. If u or v is a minimal element, then the result is obvious. Otherwise, let u (resp. v ) be
the predecessor of u (resp. of v), and let Y (resp. Y ) be the set of all vertices that are greater or
1 2
′ ′ ′ ′
equal than u (resp. than v ). Since |X| is odd and u,v are white, we know |Y | and |Y | are odd,
1 2
so |X \(Y ∪Y )| is odd. Maker’s strategy is as follows. She starts by claiming an arbitrary vertex
1 2
in X \(Y ∪Y ). Whenever Breaker claims a vertex in X \(Y ∪Y ), Maker answers by claiming
1 2 1 2
another arbitrary vertex in X\(Y ∪Y ). The parity ensures that Breaker will have to claim either
1 2
′ ′
u or v , at which point Maker claims its successor and wins.
It turns out these two elementary lemmas are sufficient to solve the general case where all the
winning sets are of size 1.
Theorem 17. Let G = (X,F,P) be a poset positional game where P is made of pairwise disjoint
chains and all elements of F are of size 1. Maker wins G if and only if at least one of the following
conditions hold:
• there is a winning set that is a minimal element; or
• there is a white winning set; or
• |X| is odd and there are two black winning sets on different chains.
In particular, MB Poset Positional Game can be solved in linear time for such games.
Proof. The “if” direction is a direct consequence of Lemmas 15 and 16. Let us prove the “only if”
direction: we suppose that none of the three conditions hold, and we show that Breaker wins. In
particular, all winningsets are black (we may assume that there exists at least one) and no minimal
element is a winning set. Additionally, we are in one of two cases:
• Case 1: |X| is even. This means there is an even number of chains of odd size, i.e. |Y|
is even where Y denotes the set of all black minimal elements. Breaker’s strategy is the
following. Whenever Maker claims a vertex in Y, Breaker also claims an arbitrary vertex in
Y. Otherwise, Maker necessarily claims a white vertex, so Breaker claims its successor (which
always exists since all maximal elements are black). Using this strategy, Breaker ensures to
claim every black vertex in X \Y, so he wins.
• Case 2: |X| is odd and all the winning sets are part of the same chain C . Let j be maximum
i
such that {x } ∈ F, and let Y be the set of all vertices which are not greater or equal than
i,j
x . Since |X| is odd and x is white, we know |Y| is even. Breaker’s strategy is the
i,j+1 i,j+1
following. Whenever Maker claims a vertex in Y, Breaker also claims an arbitrary vertex in
Y. Otherwise, Maker necessarily claims a white vertex in C , so Breaker claims its successor
i
16

(unless Maker has claimed x specifically, in which case Breaker plays an arbitrary move).
i,1
Using this strategy, Breaker ensures to claim every black vertex in X \Y, so he wins.
Usingthisresult,wecansolveabasiccaseofw×h Connect-k inMaker-Breaker convention, whichis
the poset positional game played on w chains of height h where the winning sets are the alignments
of k consecutive vertices (horizontal, vertical or diagonal). Note that the game is easily solved if
| k   | ≤ 2, or | if k > | w, or | if k > | h and wh | is even. |     |     |     |     |
| --- | ------- | ------ | ----- | ------ | -------- | -------- | --- | --- | --- | --- |
Corollary 18. Let k,w,h be integers with 3 ≤ k ≤ w and h > 1. If w and h are both odd, then
Maker wins the w×h Connect-k game in Maker-Breaker convention.
Proof. We actually show that a single well-chosen winning set if enough for Maker to win. Let W
be a horizontal alignment of k vertices on the top row: we claim that Maker wins G = (X,F,P)
where X and P are defined as in w ×h Connect-k and F = {W}. For this, using the idea from
Remark 3, she claims an arbitrary vertex x and then sees herself as Breaker (playing second, as
|     |     |     |     | ′   | ′ ′ ′ |     | ′   | ′   |     | ′   |
| --- | --- | --- | --- | --- | ----- | --- | --- | --- | --- | --- |
usual) in the game G = (X ,F ,P ) where: X = X \{x}, P is the poset induced by P on X ,
|     | ′   |     |     |     |     |     |     |     | ′   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
and F = {{y},y ∈ W}. Since h ≥ 3, all vertices of W are nonminimal in P . Moreover, they are
maximal in P ′ , so they are black since |X ′ | = wh−1 is even. Therefore, Theorem 17 ensures that
| Breaker |     | wins G | ′ , so | Maker wins | G.  |     |     |     |     |     |
| ------- | --- | ------ | ------ | ---------- | --- | --- | --- | --- | --- | --- |
Remark 19. It should be noted that Connect-k, unlike all other game classes studied in this paper,
requires a separate study of the case where Breaker plays first, since this case does not reduce to the
case where Maker plays first (after Breaker’s first move, we do not have an instance of Connect-k
anymore). However, from the same argument used in the proof of Corollary 18, we get that Maker
| wins | playing | second |      | if wh is | even.   |     |     |     |     |     |
| ---- | ------- | ------ | ---- | -------- | ------- | --- | --- | --- | --- | --- |
| 4.2  | Winning |        | sets | of size  | at most | 2   |     |     |     |     |
Things become more complicated when the winning sets are not all of size 1. We are going to need
the following reduction, using a similar idea to the proof of Theorem 17. The point is that, in the
presence of a black winning set of size 1, we can simplify the game (recall that Lemma 15 already
solves the case where there is a white winning set of size 1). Using the same notations as before,
assume that there exists a winning set {x } for some nonminimal black vertex x with j ≥ 3. We
|        |     |         |      |     |          | i,j           |     |     | i,j |     |
| ------ | --- | ------- | ---- | --- | -------- | ------------- | --- | --- | --- | --- |
|        |     |         |      | ′   | ′ ′      | ′             |     |     |     |     |
| define | a   | reduced | game | G = | (X ,F ,P | ) as follows. |     |     |     |     |
If|X|is even, thendefineY = {x ,...,x i,j−1 }, otherwisedefineY = {x ,...,x i,j−2 }. Inbothcases,
|     |     |     |     |     | i,1 |     |     |     | i,1 |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|     | ′   |     |     | ′   |     |     |     | ′   |     |     |
let X = X \Y and let P be the poset induced by P on X . Note that, since x i,j is black, we have
removed an even number of vertices in both cases. In particular, the coloring of the vertices is the
|     |     | ′   | ′   |     |     |     |     |     | ′   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
same for (X ,P ) as for (X,P). We now define the winning sets of G as follows. Let S ∈ F. If
|     | ′   |     |     | ′   |     |     |     |     | ′ ′ |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
S ⊆ X , then S ∈ F . If S only intersects Y on white vertices, then S ∩X ∈ F . Otherwise, i.e. if
S contains a black vertex greater than x , then we ignore S. See Figure 5 for an illustration in the
i,j
′
case |X| odd. We will prove that G and G have the same outcome. For this, we first need some
| technical |     | lemmas. |     |     |     |     |     |     |     |     |
| --------- | --- | ------- | --- | --- | --- | --- | --- | --- | --- | --- |
′
Lemma 20. If |X| is even and Maker has a winning strategy in G , then she has a winning strategy
′
in G such that she never claims x i,j+1 unless it makes her win on the spot.
′
Proof. Let S be a winning strategy for Maker in G . If, at any point during the game, Maker claims
x i,j+1 without winning instantly, then Breaker is forced to claim x i,j , otherwise Maker would win
on her next turn. Let S ′ be the same strategy as S with the exception that, when Maker should
claim x , sheskips this claim (and the forced answer x of Breaker) and goes on with the game,
|     | i,j+1 |     |     |     |     |     |     | i,j |     |     |
| --- | ----- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
following the strategy S as if that round had happened. Breaker will never claim x i,j+1 , otherwise
he would lose immediately. Note that, since x is white, there will always be another vertex for
i,j+1
17

|     |     |     |     | x1,1 | x2,1 |     |     | x2,1 |     |
| --- | --- | --- | --- | ---- | ---- | --- | --- | ---- | --- |
|     |     |     |     | x1,2 | x2,2 |     |     | x2,2 |     |
Y
|     |     |     |     | x1,3 | x2,3 |     |      | x2,3 |     |
| --- | --- | --- | --- | ---- | ---- | --- | ---- | ---- | --- |
|     |     | G   |     |      |      | ⇔   |      |      | G′  |
|     |     |     |     | x1,4 | x2,4 |     |      | x2,4 |     |
|     |     |     |     | x1,5 | x2,5 |     | x1,5 | x2,5 |     |
|     |     |     |     | x1,6 | x2,6 |     | x1,6 | x2,6 |     |
|     |     |     |     | x1,7 |      |     | x1,7 |      |     |
Figure 5: Reduction of a game G containing a black winning set of size 1 to a game
′
G . The winning set {x ,x } disappears since it contains a black vertex in Y. The
|     |     |     |     |     | 1,4 2,2 |     |     |     |     |
| --- | --- | --- | --- | --- | ------- | --- | --- | --- | --- |
′
winning set {x 1,3 ,x 2,3 } becomes the winning set {x 2,3 } in G since x 1,3 is white. By
Lemma 22, the two games have the same outcome. In this case, since G ′ has a white
|     | winning |     | set of | size 1, both | games | are winning | for Maker. |     |     |
| --- | ------- | --- | ------ | ------------ | ----- | ----------- | ---------- | --- | --- |
′
Breaker to claim. At some point in S, Maker will fill up a winning set W ∈ F . If x ∈/ W, then
i,j+1
|     |     |     |     |     | ′   |     |     | ′   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
W will also be filled up in S . If x ∈ W, then at some point in S Maker will have claimed
i,j+1
all the vertices of W except for x i,j+1 : in this case, Maker wins on the spot by claiming x i,j+1 ,
| satisfying |      | the       | statement | of the       | lemma. |     |     |     |     |
| ---------- | ---- | --------- | --------- | ------------ | ------ | --- | --- | --- | --- |
| We         | give | a similar | result    | for Breaker. |        |     |     |     |     |
| Lemma      |      | 21.       |           |              |        |     | ′   |     |     |
If |X| is odd and Breaker has a winning strategy in G , then he has a winning strategy
| in  | G ′ where | he  | never | claims x | .   |     |     |     |     |
| --- | --------- | --- | ----- | -------- | --- | --- | --- | --- | --- |
i,j−1
′
Proof. Consider a winning strategy S for Breaker in G . Note that Breaker never claims x i,j+1 in
S, otherwise he would lose immediately. We now define a new strategy S ′ as follows. Breaker plays
according to S until, inevitably, Maker claims x : at this point, Breaker claims x , but he then
|     |     |     |     |     |     | i,j+1 |     |     | i,j |
| --- | --- | --- | --- | --- | --- | ----- | --- | --- | --- |
goes on with S as if that last round had not happened. In particular, Breaker will never be told to
claim x , as this vertex is not even available in this narrative. Therefore, Maker will eventually
i,j−1
claim x : only at this moment does Breaker input into S Maker’s claims of x (prompting
|     | i,j−1 |     |     |     |     |     |     |     | i,j+1 |
| --- | ----- | --- | --- | --- | --- | --- | --- | --- | ----- |
the answer x i,j of Breaker) and x i,j−1 successively. Breaker then follows S until the end, winning
| the | game | without | claiming | x   | i,j−1 . |     |     |     |     |
| --- | ---- | ------- | -------- | --- | ------- | --- | --- | --- | --- |
Lemma 22. Assume that G has no winning set containing only white vertices that are greater than
x . Then the two games G and G ′ have the same outcome when Maker starts.
i,j
′ ′
Proof. Firstly, suppose Maker has a winning strategy S in G . If |X| is even, then we further
assume that S ′ satisfies the property from Lemma 20. Up to playing arbitrary moves after filling
up a winning set, assume that S ′ continues until all vertices in X ′ are claimed. The idea is the
′
following: Maker will fill up a winning set of G , and also claim all the white vertices in Y. By
′
definition of G , this will automatically ensure that Maker fills up a winning set of G. We now
| explain | how | she | achieves | this: |     |     |     |     |     |
| ------- | --- | --- | -------- | ----- | --- | --- | --- | --- | --- |
18

|     |     |     |     | ′   | ′   | ′   |
| --- | --- | --- | --- | --- | --- | --- |
• Case 1: |X| is odd. Maker plays her first move x ∈ X according to S . Since |X \{x}| and
|Y| are both even, Maker can then use the following strategy. Whenever Breaker plays inside
X ′ , Maker answers inside X ′ according to S ′ , thus ensuring to eventually fill a winning set
of G ′ . Otherwise i.e. whenever Breaker claims some (black) y ∈ Y, Maker claims the (white)
| successor | of y, thus ensuring | to claim | all the white | vertices in Y. |     |     |
| --------- | ------------------- | -------- | ------------- | -------------- | --- | --- |
| •         |                     |          | ′             |                |     |     |
Case 2: |X| is even. Maker plays according to S until x is claimed. Assume it is claimed
i,j+1
by Maker, otherwise she wins immediately by claiming x i,j . By the property from Lemma 20,
Maker has already filled up a winning set of G ′ at this point, so she just needs to claim all the
white vertices of Y. Breaker is forced to claim x , and then Maker claims x . From this
|     |     |     |     | i,j | i,j−1 |     |
| --- | --- | --- | --- | --- | ----- | --- |
point on, since j−2 is odd, Maker can force Breaker to claim all the black vertices in Y, and
| claim all | their (white) | successors herself. |     |     |     |     |
| --------- | ------------- | ------------------- | --- | --- | --- | --- |
|           |               |                     | ′   | ′   |     |     |
Lastly, suppose Breaker has a winning strategy S in G . If |X| is odd, then we further assume that
S ′ satisfies the property from Lemma 21. The idea is the following: Breaker will claim a vertex
|     | ′   |     |     |     |     | ′   |
| --- | --- | --- | --- | --- | --- | --- |
in each winning set of G , and also claim all the black vertices in Y. By definition of G , this will
automatically ensure that Breaker claims a vertex in each winning set of G. We now explain how
| he achieves this: |     |     |     |     |     |     |
| ----------------- | --- | --- | --- | --- | --- | --- |
• Case 1: |X| is even. Since |X ′ | and |Y| are both even, Breaker can then use the following
strategy. Whenever Maker plays inside X ′ , Breaker answers inside X ′ according to S ′ , thus
′
ensuring to claim a vertex in each winning set of G . Otherwise i.e. whenever Maker claims
some (white) y ∈ Y, Breaker claims the (black) successor of y, thus ensuring to claim all the
| black vertices | in Y. |     |     |     |     |     |
| -------------- | ----- | --- | --- | --- | --- | --- |
• Case 2: |X| is odd. Breaker plays according to S ′ until Maker claims x , which will
i,j−1
necessarily happen by the property from Lemma 21. Breaker pretends like that move did not
′
happen i.e. does not input that claim into S , and claims x i,j−2 himself. At this point, the
|     |     |     | ′   |     |     | ′   |
| --- | --- | --- | --- | --- | --- | --- |
number of unclaimed vertices in X is even, so that, whenever Maker plays inside X , Breaker
can answer inside X ′ according to S ′ . This will force Maker to claim all the white vertices
in Y \{x }, with Breaker claiming the (black) successor each time. Eventually, Maker will
i,1
′
have to claim x i,1 , at which point Breaker inputs Maker’s earlier claim of x i,j−1 into S . The
sets of vertices claimed by both players in S ′ now coincide with reality, which ensures that
′
| Breaker | claims a vertex | in each winning | set of G | .   |     |     |
| ------- | --------------- | --------------- | -------- | --- | --- | --- |
Now equipped with this reduction, we turn to the case where all winning sets have size at most 2.
Theorem 23. MB Poset Positional Game can be solved in time O(h2(w+1)) for instances where
the poset consists of w pairwise disjoint chains of height at most h and all winning sets have size
at most 2.
Proof. Our algorithm is based on a dynamic programming approach. As before, we consider a
poset positional game G = (X,F,P) where P is made of pairwise disjoint chains. We use the same
notationsandcolouringthanbefore. ThankstoLemmas15and22,wecanreducethenumberofsub-
positions to consider. Indeed, we can assume that each chain contains at most one (black) winning
set of size 1. Our algorithm computes dynamically the outcome of all these “useful” positions. A
sub-position will be given by two w-uplets : K = (k 1 ,...,k w ) with 0 ≤ k i ≤ ℓ i corresponding to the
heights of the chains in the sub-position, and W = (s ,...,s ) with 0 ≤ s ≤ k corresponding to
|     |     |     |     | 1 w | i i |     |
| --- | --- | --- | --- | --- | --- | --- |
the index of a black winning set of size 1 on the i-th chain that might be created during the game.
We will only consider values of s i that either are zero (no winning set of size 1 on the i-th chain)
or do not have the same parity as |X| (so that x is necessarily black) and such that there is a
i,si
winning set {x ,u} in F. The game G(K,W) is formally defined as follows:
i,si
| • The vertices | X(K,W) | of G(K,W) | on the i-th chain | are: |     |     |
| -------------- | ------ | --------- | ----------------- | ---- | --- | --- |
19

|     |       | – if s | = 0:    | the vertices |          | x to  | x ,      |      |            |     |     |     |
| --- | ----- | ------ | ------- | ------------ | -------- | ----- | -------- | ---- | ---------- | --- | --- | --- |
|     |       |        | i       |              |          | i,1   | i,ki     |      |            |     |     |     |
|     |       | – if s | > 0 and | |X|          | is even: | the   | vertices | x    | to x       | ,   |     |     |
|     |       |        | i       |              |          |       |          | i,1  | i,si−1     |     |     |     |
|     |       | – if s | > 0 and | |X|          | is odd:  | the   | vertices | x    | to x       | .   |     |     |
|     |       |        | i       |              |          |       |          | i,1  | i,si−2     |     |     |     |
|     | • The | poset  | P(K,W)  |              | is the   | poset | induced  | by P | on X(K,W). |     |     |     |
• The set F(K,W) contains all sets {x } where s 6= 0, and additionally, for each S ∈ F:
|     |     |        |        |         |         |        | i,si |          | i      |               |     |     |
| --- | --- | ------ | ------ | ------- | ------- | ------ | ---- | -------- | ------ | ------------- | --- | --- |
|     |     | – If S | has an | element |         | x with | j >  | k , then | S is   | ignored.      |     |     |
|     |     |        |        |         |         | i,j    |      | i        |        |               |     |     |
|     |     | – If S | has a  | black   | element | x      | with | j < s    | , then | S is ignored. |     |     |
|     |     |        |        |         |         | i,j    |      | i        |        |               |     |     |
–
Otherwise, if |X| is even (resp. odd), we add S\{x i,j ,j < s i } (resp. S\{x i,j ,j < s i −1})
to the set of winning sets F(K,W). By doing this, we might add an empty winning set
|     |     | to  | F(K,W), | which | actually |     | means | that | Maker | wins trivially. |     |     |
| --- | --- | --- | ------- | ----- | -------- | --- | ----- | ---- | ----- | --------------- | --- | --- |
•
|     | As  | usual, | Maker | is the | next | player. |     |     |     |     |     |     |
| --- | --- | ------ | ----- | ------ | ---- | ------- | --- | --- | --- | --- | --- | --- |
Note that initial game G corresponds to the game G(K,W) with K = (ℓ ,...,ℓ ) and W = (0,...,0).
1 w
We compute the outcome in increasing order of the total number of vertices.
Let G(K,W) be a position. We first list some trivial cases, using Lemmas 15 and 16:
•
|     | If  | there | are no | winning | sets, | then | Breaker | wins. |     |     |     |     |
| --- | --- | ----- | ------ | ------- | ----- | ---- | ------- | ----- | --- | --- | --- | --- |
•
|     | If  | there | is an empty |     | winning | set, | then | Maker | wins. |     |     |     |
| --- | --- | ----- | ----------- | --- | ------- | ---- | ---- | ----- | ----- | --- | --- | --- |
•
If there is a winning set of size 1 which is white or minimal, then Maker wins.
• If there is a winning set made of two white vertices on the same chain, then Maker wins.
• If there are two black winning sets of size 1 on different chains and |X| is odd, then Maker
wins.
In particular, that last item applies as soon as there are two positive s ’s and |X| is odd. The fourth
i
item comes from the fact that Maker can apply Lemma 15 twice in a row to claim both vertices of
| the | winning | set. |     |     |     |     |     |     |     |     |     |     |
| --- | ------- | ---- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Assuming none of these trivial cases hold, we consider every possible move x of Maker and every
i,j
′ ′
possible answer x i′,j′ of Breaker in the first round. Each choice leads to a sub-position G(K ,W ).
|     |     | ′   | ′   |     | ′   |     | ′   |     | ′   |     | ′ ′ |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
We define K = (k ,...,k ) as follows: k = k −1, k i′ = k i′ −1 (or, if i = i: k = k −2), and
|     |     |     | 1   |     | w   |     | i   | i   |     |     | i i |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|     |     |     |     |     | ′   |     |     |     |     |     | ′ ′ | ′   |
all the others values in K are equal to the corresponding values in K. As for W = (s ,...,s w ), its
1
| definition |     | depends | on  | x   | and x | i′,j′. |     |     |     |     |     |     |
| ---------- | --- | ------- | --- | --- | ----- | ------ | --- | --- | --- | --- | --- | --- |
i,j
• Suppose x is in no winning set. Then W ′ = W except that we define s ′ = 0 if j ′ = s i′.
|     |     |     | i,j |     |     |     |     |     |     |     | i′  |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
• Suppose x is in at least one winning set. Let U be the set of all vertices u such that
i,j
{x ,u} ∈ F(K,W) and u is not claimed by Breaker (i.e. u 6= x i′,j′). Then, for each u ∈ U,
i,j
{u} is a winning set after the first round. We assume that S only contains black vertices,
|     |     |     |     |     |     |     | ′′  | ′   |     |     |     | ′′  |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
otherwise Maker wins. For each i , let s i′′ be the maximum between s i′′ and all the j such
that x ∈ U. Lemma 22 ensures that, with this definition of W ′ , the game G(K ′ ,W ′ ) is
i′′,j′′
|     | indeed | equivalent |     | to  | this | case. |     |     |     |     |     |     |
| --- | ------ | ---------- | --- | --- | ---- | ----- | --- | --- | --- | --- | --- | --- |
Knowingallthepossibleoutcomes afterthesetwomoves, onecancomputetheoutcomeofG(K,W).
′ ′
If there exists a move of Maker such that, for any Breaker answer, the resulting game G(K ,W ) is
| winning |     | for Maker, | then | Maker |     | wins. | Otherwise, | Breaker |     | wins. |     |     |
| ------- | --- | ---------- | ---- | ----- | --- | ----- | ---------- | ------- | --- | ----- | --- | --- |
There are (h+1)w possible values for K and also (⌈h/2⌉ +1)w possible values for W (since the
winning sets of size 1 must be black) hence O(h2w/2w) positions to consider. To compute the
20

outcome of a position, one needs to consider O(w2) potential pairs of moves. Each given pair may
require to go through the whole set of winning sets, which is of size |F| = O((hw)2). All in all, the
running time of the algorithm is O(h2w/2w ∗w2∗h2w2)= O(h2(w+1)).
Remark 24. Thanks to Lemma 16, it is possible to reduce the number of sub-positions when |X| is
odd. Indeed, we can assume that there is at most one winning set of size 1 in this case. Therefore,
W could be replaced by an ordered pair (i,j) such that {x } is the unique winning set of size 1,
i,j
with the convention that i = 0 if there is no such winning set. Then there will only be at most wh/2
possible values for W, hence a final complexity in O(hw+3w5).
4.3 Winning sets of size at most 2, chains of height at most 2
The algorithm from Theorem 23 is not efficient for posets of unbounded width. However, when
restricting the problem to posets of height at most 2, we do get a polynomial-time algorithm in this
casealso. Sincethechains areof heightatmost2, wewillsimplyusethe“top/bottom” terminology
already adopted in the proof of Theorem 7, rather than the coloring previously used in this section.
Theorem 25. MB Poset Positional Game can be solved in time O(|X|4) for instances where
the poset on X consists of pairwise disjoint chains of height at most 2 and all winning sets are of
size at most 2.
Proof. Letx ,...,x ,y ,...,y betheverticesofthechainsofheight2,withx < y forall1≤ i ≤ t.
1 t 1 t i i
Let x ,...,x be the other vertices if there are any. We say the x are the “bottom” vertices and
t+1 w i
the y are the “top” vertices. We consider two cases depending on the parity of |X|.
j
• Firstly, suppose |X| is odd, which means Maker plays the first and the last move. There are
several easy winning situations for Maker (note that the first three actually hold regardless of
parity), all of which can clearly be identified in time O(|X|2) since there are O(|X|2) winning
sets:
1. There is a winning set of the form {x }. Indeed, Maker simply claims x as her first
i i
move.
2. There are two winning sets of the form {x ,x } and {x ,x }. Indeed, Maker starts by
i j j k
claiming x and will claim either x or x as her second move to win.
j i k
3. There are two winning sets of the form {x ,x } and {x ,y }. Indeed, Maker starts by
i j i i
claiming x and will claim either x or y as her second move to win.
i j i
4. There is a winning set of the form {x ,y } with i 6= j. Indeed, Maker starts by claiming
i j
x , the parity then allows her to wait until Breaker claims x , at which point she claims
i j
y and wins.
j
5. There is a winning set in which each vertex is a top vertex. Indeed, using the parity,
Maker can ensure to claim all the top vertices in the game. For this, she starts by
claiming x (that exists since the total number of vertices is odd). Each time Breaker
t+1
claims some x , Maker claims y if i ≤t or some x with j > t if i> t.
i i j
We actually claim that those are the only winningsituations for Maker. Indeed, supposenone
of the above apply: then the winning sets are pairwise disjoint and all of them are of the
form {x ,x } or {x ,y }, so whenever Maker claims a vertex of a winning set it is possible for
i j i i
Breaker to immediately claim the other.
• Secondly, suppose |X| is even, which means Breaker plays the last move. We then introduce
the following reduction rules:
21

R1: Assume there exists a winning set of the form {x ,x } that is disjoint from all the other
i j
| winning | sets. Then | remove x i and | x j . |     |     |     |
| ------- | ---------- | -------------- | ----- | --- | --- | --- |
R2: Assume there exists a nonempty set of indices I ⊆ {1,...,t} such that all the winning
sets that contain some x i with i ∈ I also contain some y j with j ∈ I. Then remove all
| vertices | with indices | in I. |     |     |     |     |
| -------- | ------------ | ----- | --- | --- | --- | --- |
Claim 1: The reductions R1 and R2 are outcome-neutral when Maker is the first player.
Let us prove Claim 1 (note that the proof heavily relies on the parity assumption):
|     | ′   |     |     |     |     | ′   |
| --- | --- | --- | --- | --- | --- | --- |
– Let G be a reduced game obtained from G through R1. If Maker wins G , then she wins
G by claiming x i as her first move: indeed, this forces Breaker to claim x j , and we get
the game G ′ . If Breaker wins G ′ , then he wins G by following his winning strategy in G ′
whenever Maker does not play inside {x ,x }, and only claiming x or x when Maker
|     |     |     | i j |     |     | i j |
| --- | --- | --- | --- | --- | --- | --- |
claims the other. However, we need to be careful that Breaker might be forced to claim
x or x before Maker does. Because of the parity assumption, this can only happen if,
| i   | j   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- |
say, i ≤ t and j > t, and x ,y ,x are the only three vertices remaining. In this case,
|     |     | i i | j   |     |     |     |
| --- | --- | --- | --- | --- | --- | --- |
Breaker simply claims x j : Maker must claim x i and Breaker claims y i , ensuring the win
| since | x is in no other | winning set. |     |     |     |     |
| ----- | ---------------- | ------------ | --- | --- | --- | --- |
i
′
– Let G be a reduced game obtained from G through R2, and let X I be the set of vertices
with indices in I. Then whoever wins G ′ also wins G, by following their winning strategy
′
in G whenever their opponent does not play inside X , and claiming y whenever their
|     |     |     |     | I   |     | i   |
| --- | --- | --- | --- | --- | --- | --- |
opponent claims x i for some i ∈ I. This strategy clearly works for Maker, who is going
to fill up a winning set of the game G ′ . As for Breaker, due to the parity assumption,
this strategy ensures that he gets all top vertices of X , which takes care of all winning
I
′
| sets      | that are not in    | the game G | by definition | of I. |     |     |
| --------- | ------------------ | ---------- | ------------- | ----- | --- | --- |
| This ends | the proof of Claim | 1.         |               |       |     |     |
We define a good pattern as a sequence of winning sets of the following form:
({x i1 ,x i2 },{x i2 ,y i3 },{x i3 ,y i4 },{x i4 ,y i5 },...,{x iℓ−1 ,y iℓ }), with ℓ ≥ 3 and pairwise distinct i k .
We define a winning pattern as a good pattern (with notations as above) prolonged with a
winning set of the form {x ,z} where either: z ∈ {x ,...,x }, z ∈ {y ,y }, or z is a
|     |     | iℓ  |     | i2  | iℓ−1 | i1 i2 |
| --- | --- | --- | --- | --- | ---- | ----- |
bottom vertex that does not appear in the good pattern. See Figure 6.
|     |     | y y   |     |     | y   |     |
| --- | --- | ----- | --- | --- | --- | --- |
|     |     | i3 i4 |     |     | iℓ  |     |
...
|     | x x   | x x   |     |     | x   |     |
| --- | ----- | ----- | --- | --- | --- | --- |
|     | i1 i2 | i3 i4 |     |     | iℓ  | z   |
Figure 6: A winning pattern where z is a bottom vertex that does not appear in the
good pattern.
| Claim | 2: If the game | contains a winning | pattern, | then Maker | wins. |     |
| ----- | -------------- | ------------------ | -------- | ---------- | ----- | --- |
Let us prove Claim 2. Maker starts by claiming x , which forces Breaker to claim x
i2 i1
because of the winning set {x i1 ,x i2 }. Then Maker claims x i3 , which forces Breaker to claim
y because of the winning set {x ,y }. Then Maker successively claims x ,...,x , which
| i3  |     | i2  | i3  |     |     | i4 iℓ |
| --- | --- | --- | --- | --- | --- | ----- |
forces Breaker to successively claim y ,...,y in similar fashion. If z ∈ {x ,...,x }, then
|     |     |     | i4 iℓ |     |     | i2 iℓ−1 |
| --- | --- | --- | ----- | --- | --- | ------- |
Maker has already filled up the winningset {x ,z} and thus won the game. Otherwise, either
iℓ
z ∈ {y i1 ,y i2 } or z is a bottom vertex that does not appear in the good pattern: in both cases,
22

z is an available vertex, so Maker can now claim z to win by filling upthe winningset {x ,z}.
iℓ
|     | This | ends | the proof | of Claim |     | 2.  |     |     |     |     |
| --- | ---- | ---- | --------- | -------- | --- | --- | --- | --- | --- | --- |
Claim 3: If there exists at least one winningset and neither R1 nor R2 applies, then Maker
wins.
Let us prove Claim 3. Suppose there exists at least one winning set and neither R1 nor
R2 applies. Let us first settle the case t = 0 (all vertices are bottom): since R1 does not
apply, there exists a winning set of the form {x } or two winning sets of the form {x ,x } and
i i j
{x j ,x k }, so Maker wins in at most two rounds. Therefore, we now assume r ≥ 1.
We start by showing the existence (in all nontrivial cases) of a good pattern. There exists
a winning set W in which each vertex is a bottom vertex, otherwise R2 would apply to the
set I = {1,...,t}. Maker wins trivially if |W| = 1, so assume W = {x ,x } for some p 6= q.
p q
Since R1 does not apply, we know that at least one of x p or x q , say x q , is part of a winning
set W ′ 6= W. If W ′ = {x }, W ′ = {x ,y }, W ′ = {x ,y } or W ′ = {x ,x } for some r 6= p,q,
|     |     |     |     |     | q   | q   | p   | q q |     | q r |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
′
then Maker wins the game in at most two rounds, so assume W = {x ,y } for some r 6= p,q.
q r
′
|     | Therefore, |     | there exist | good | patterns: | (W,W |     | ) is one. |     |     |
| --- | ---------- | --- | ----------- | ---- | --------- | ---- | --- | --------- | --- | --- |
Now, we will show the existence (in all nontrivial cases) of a winningpattern. Let I be the set
of all indices of top vertices that appearin good patterns. Note that I 6= ∅ andI ⊆{1,...,t}.
SinceR2doesnotapplytothesetI,weknowthereexistsj ∈ I suchthatthereexistsawinning
set of the form {x j ,z} where z 6∈ {y i ,i ∈ I} (assuming {x j } is not a winning set, otherwise
Maker trivially wins). Let ({x ,x },{x ,y },{x ,y },{x ,y },...,{x ,y }) bea good
|     |     |     |     |     |     | i1 i2 | i2 i3 | i3 i4 | i4 i5 | iℓ−1 iℓ |
| --- | --- | --- | --- | --- | --- | ----- | ----- | ----- | ----- | ------- |
patternwherei =j, whichexistssincej ∈ I. Sincez 6∈ {y ,i ∈ I},thisgoodpatterndoesnot
|     |     |     | ℓ   |     |     |     |     |     | i   |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
contain z as a top vertex, nor can it be prolonged into a longer good pattern by the winning
set {x ,z}. Moreover, we can also assume that z 6= x , otherwise Maker wins the game in
|     |     | j   |     |     |     |     |     | i1  |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
two rounds by claiming x as her first move. All in all, this leaves us with three possibilities:
i1
z ∈ {x ,...,x }, z ∈ {y ,y }, or z is a bottom vertex that does not appear in the good
|     |     | i2  | iℓ−1 |     | i1  | i2  |     |     |     |     |
| --- | --- | --- | ---- | --- | --- | --- | --- | --- | --- | --- |
pattern. In all cases, we get a winning pattern by definition, so Claim 2 ensures that Maker
|     | wins. | This | ends the | proof | of Claim | 3.  |     |     |     |     |
| --- | ----- | ---- | -------- | ----- | -------- | --- | --- | --- | --- | --- |
Finally, weshouldexplainhowtodetectinO(|X|3)timewhetherR2appliesornot. Itsuffices,
for each index 1 ≤ i ≤ t, to answer the following question in O(|X|2) time: is there a set
0
of indices containing i 0 and satisfying R2? Starting from the set {i 0 }, iterate the operator
I 7→ I ∪S {j ∈ {1,...,t}\I,{x ,y } ∈ F} until stability, and let I be the resulting set.
|     |     |     | i∈I |     |     | i j |     |     |     | 0   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
Note that I can becomputed in O(|X|2)time. Moreover, any set containing i and satisfying
|     |     |     | 0   |     |     |     |     |     |     | 0   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
O(|X|2)
R2 must include I . If I satisfies R2, which can be checked in time, then the answer
|     |     |     | 0   | 0   |     |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
is positive. Otherwise, it means there exists a winning set of the form {x i } or {x i ,x j } with
|     | i ∈I | , therefore | the | answer | is  | negative. |     |     |     |     |
| --- | ---- | ----------- | --- | ------ | --- | --------- | --- | --- | --- | --- |
0
In conclusion, detecting whether R1 or R2 applies, and performing the reduction if so, can be
O(|X|3)
donein time. Obviously, at most |X| such reductions can beperformedin succession.
When no reduction applies anymore, Claim 3 concludes: if at least one winning set remains,
|     | then       | Maker | wins, | otherwise | Breaker | trivially |     | wins. |     |     |
| --- | ---------- | ----- | ----- | --------- | ------- | --------- | --- | ----- | --- | --- |
| 5   | Conclusion |       | and   | future    |         | work      |     |       |     |     |
Thecurrent work introduces a new framework that opens the door to a variety of perspectives. Our
analysis with respect to the parameters of the poset led to a first classification of the complexity of
MB Poset Positional Game, which is a step towards a better understanding of the boundary
betweentractability andhardness. Theresultspresentedheredirectlyinducealistofopenproblems
that arise naturally in order to refine this boundary. Among them, we have identified the following
| two | questions | that | seem | the most | relevant | for | us: |     |     |     |
| --- | --------- | ---- | ---- | -------- | -------- | --- | --- | --- | --- | --- |
23

• When there is exactly one winning set of size 1, the height of the poset makes a difference
betweentractability (h = 2)andNP-hardness(h = 3). Therefore,whenh= 2,itisworthwhile
to examine how the conditions on the number m of winning sets and their size s impact the
algorithmic complexity. A next study would be to investigate the case m = 2 and s= 1.
• In the case of disjoint chains, an analysis of the complexity according to their width (i.e. the
number of chains) is a natural perspective. In particular, one may focus on the case w = 2,
even when restricted to s ≤ 3 (since we have a polynomial-time algorithm for s = 2). It would
also be interesting to obtain a hardness results for disjoint chains.
Going back to our initial motivation of giving a general framework for Connect-k games, one could
also examine the case of boards of even size for this game. For example, the famous case (k,w,h) =
(4,7,6), is known to be a Maker win in the Maker-Breaker convention since it a first player win in
the Maker-Maker convention. However, a direct proof for the Maker-Breaker convention could be
considered, that could also be extended to other sizes.
Finally, while we mostly studied the poset positional games in the Maker-Breaker convention, our
definition can be transposed to all other conventions of positional games. It would therefore be
interesting to perform a similar analysis for Maker-Maker or Avoider-Enforcer poset positional
games.
References
[1] James D. Allen. Expert play in Connect-Four. 1990. https://tromp.github.io/c4.html.
[2] James D. Allen. The Complete Book of Connect 4: History, Strategy, Puzzles. Puzzlewright
Press, 2010.
[3] Louis Victor Allis. A Knowledge-Based Approach of Connect-Four. Report IR-163. Vrije
Universiteit Amsterdam, The Netherlands, 1988.
[4] Pranav Avadhanam and Siddhartha G. Jena. Restricted positional games. 2021. Preprint,
https://doi.org/10.48550/arXiv.2108.12839.
[5] Jo´zsef Beck. Combinatorial Games: Tic-Tac-Toe Theory. Encyclopedia of Mathematics and
its Applications. Cambridge University Press, 2008.
[6] Jesper Makholm Byskov. Maker-Maker and Maker-Breaker games are PSPACE-complete.
BRICS Report Series, 11(14), 2004.
[7] Noam D. Elkies. On numbersandendgames: combinatorial game theory in chess endgames. In
Games of No Chance, Proceedings of 7/94 MSRI Conference on Combinatorial Games, pages
135–150. Cambridge University Press, 1996.
[8] PaulErd˝os andJohn L.Selfridge. Ona combinatorial game. Journal of Combinatorial Theory,
14:298–301, 1973.
[9] Florian Galliot, Sylvain Gravier, and Isabelle Sivignon. Maker-Breaker is solved in polynomial
time on hypergraphs of rank 3. Preprint, https://arxiv.org/abs/2209.12819, 2022.
[10] Alfred W. Hales and Robert I. Jewett. Regularity and positional games. Trans. Am. Math.
Soc, 106:222–229, 1963.
[11] Dan Hefetz, Michael Krivelevich, Miloˇs Stojakovi´c, and Tibor Szabo´. Positional Games, vol-
ume 44 of Oberwolfach Seminars. Birkh¨auser (Springer), 2014.
[12] Richard M. Karp. Reducibility among combinatorial problems. In R.E. Miller, J.W. Thatcher,
and J.D. Bohlinger, editors, Complexity of Computer Computations: Proceedings of a sym-
24

posium on the Complexity of Computer Computations, March 20–22, 1972, chapter 9, pages
| 85–103. Springer | US, | Boston, MA, 2004. |     |
| ---------------- | --- | ----------------- | --- |
[13] MdLutfarRahmanandThomasWatson. 6-uniformMaker-BreakergameisPSPACE-complete.
InProceedings ofthe 38th International Symposium onTheoretical Aspectsof ComputerScience
(STACS 2021), volume 187 of Leibniz International Proceedings in Informatics (LIPIcs), pages
| 57:1–15, 2021. |     |     |     |
| -------------- | --- | --- | --- |
[14] ThomasJ.Schaefer. Onthecomplexity ofsometwo-personperfect-informationgames. Journal
| of Computer | and System | Sciences, 16:185–225, | 1978. |
| ----------- | ---------- | --------------------- | ----- |
[15] Larry J Stockmeyer and Albert R Meyer. Word problems requiring exponential time (prelim-
inary report). In Proceedings of the Fifth Annual ACM Symposium on Theory of Computing,
| pages 1–9, | 1973. |     |     |
| ---------- | ----- | --- | --- |
[16] John Tromp. John’s Connect Four Playground. http://tromp.github.io/c4/c4.html.
[17] John Tromp. Solving Connect-4 on medium board sizes. ICGA Journal, 31(2):110–112, 2008.
25

Appendix
5.1 Outcome of the disjoint union of two games
Theorem 26. The possible outcomes for the disjoint union of two poset positional games is given
in Figure 7.
even\even M N P B
M M M M M
N M M,N M M,N
P M M P P
B M M,N P P,B
even\odd M N P B
M M M,N M M,N
N M M,N M all
P M N M N
B M N M,P N,B
odd\odd M N P B
M M M M M,N
N M M,P M,N all
P M M,N M M,N
B M,N all M,N all
Figure7: Possibleoutcomesforadisjointunionoftwoposetpositionalgamesdepending
on the parity of the number of vertices in both games. We write ”all” when all four
outcomes are possible.
For convenience, a poset positional game will be deemed even (resp. odd) if it has an even (resp.
odd) number of vertices. We start by showing that the outcomes which do not appear in Figure 7
are indeed impossible.
Lemma 27. Let G and G ′ be two poset positional games. The following assertions hold:
′ ′
1. If o(G) ∈ {M,P} and o(G ) ∈ {M,P}, then o(G ∪G ) ∈ {M,P}.
′ ′
2. If o(G) ∈ {M,P} and o(G ) ∈ {M,N}, then o(G ∪G ) ∈ {M,N}.
′ ′
3. If G is even and o(G )∈ {M,N}, then o(G ∪G ) ∈{M,N}.
′ ′
4. If G is even and o(G )∈ {M,P}, then o(G ∪G )∈ {M,P}.
′ ′
5. If G is odd and o(G ) ∈{M,P}, then o(G ∪G )∈ {M,N}.
′ ′
6. If both G and G are odd and have an outcome in {M,N}, then o(G ∪G )∈ {M,P}.
′ ′
7. If both G and G are even and have an outcome in {B,P}, then o(G ∪G ) ∈ {B,P}.
′ ′ ′
8. If G is even, G is odd, o(G) ∈ {B,P} and o(G ) ∈ {B,N}, then o(G ∪G )∈ {B,N}.
Proof. First of all, let us establish four important claims.
Claim 1: Let G and G be two poset positional games. If Maker has a winning strategy in both
1 2
G and G as second player, then Maker has a winning strategy in G ∪G as second player.
1 2 1 2
26

Claim 2: Let G and G be two poset positional games. If G and G are even and Breaker has a
|     |     | 1   | 2   |     |     | 1 2 |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
winningstrategy in both G and G as second player, then Breaker has a winningstrategy in G ∪G
|           |         |     | 1   | 2   |     |     | 1 2 |
| --------- | ------- | --- | --- | --- | --- | --- | --- |
| as second | player. |     |     |     |     |     |     |
Claim 3: Let G 1 and G 2 be two poset positional games. If G 1 is even and Maker has a winning
strategy in G as first player, then Maker has a winning strategy in G ∪G as first player.
|     | 2   |     |     |     |     | 1   | 2   |
| --- | --- | --- | --- | --- | --- | --- | --- |
Claim 4: Let G and G be two poset positional games. If G is even and Maker has a winning
|     |     | 1   | 2   |     |     | 1   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
strategy in G as second player, then Maker has a winning strategy in G ∪G as second player.
|     | 2   |     |     |     |     | 1   | 2   |
| --- | --- | --- | --- | --- | --- | --- | --- |
Let us prove those claims. Claim 1 is rather straightforward. Maker always plays in the same
component Breaker has just played in, according to her respective winning strategy. By the time
one of the two components has all its vertices claimed, Maker will necessarily have filled a winning
set in that component. Claim 2 is similar: Breaker always plays in the same component Maker
has just played in, according to his respective winning strategy. The parity ensures that the moves
alternate correctly in both components (even after one of them has all its vertices claimed), so that
Breaker successfullyacts as second player inbothcomponents, thus avoiding fillingany winningset.
Finally, Claims 3 and 4 are direct consequences of Lemma 2: indeed, Maker would have a winning
strategy even if G had no winning set, so the same strategy also works if G has winning sets. We
|         |            | 1         |     |            |     |     | 1   |
| ------- | ---------- | --------- | --- | ---------- | --- | --- | --- |
| can now | go on with | the proof | of  | the lemma: |     |     |     |
′
1. Since Maker has a winning strategy in both G and G as second player, she has a winning
strategy in G ∪G ′ as second player by Claim 1, which means o(G ∪G ′ )∈ {M,P}.
2. Since Maker has a winning strategy in G ′ as first player, there exists a vertex u in G ′ such
|     |     |     | ′′  |     | ′   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
that, in the game G that results from G after Maker claims u, Maker has a winning strategy
′ ′′
as second player. If Maker claims u as her first move in G ∪G , we obtain the game G ∪G ,
in which Maker has a winning strategy as second player by Claim 1. Therefore, Maker has a
′ ′
winning strategy in G ∪G as first player, which means o(G ∪G )∈ {M,N}.
3. Since G is even and Maker has a winning strategy in G ′ as first player, she has a winning
|     |     | ′   |     |     |     | ′   |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
strategy in G ∪G as first player by Claim 3, which means o(G ∪G ) ∈{M,N}.
′
4. Since G is even and Maker has a winning strategy in G as second player, she has a winning
|     |     | ′   |     |     |     |     | ′   |
| --- | --- | --- | --- | --- | --- | --- | --- |
strategy in G ∪G as second player by Claim 4, which means o(G ∪G )∈ {M,P}.
′′ ′
5. Playing first, Maker may claim an arbitrary vertex in G: we get a disjoint union G ∪G where
G ′′ is even and Maker has a winning strategy in G ′ as second player. By Claim 4, Maker has
a winning strategy in G ′′ ∪G ′ as second player, so she has a winning strategy in G∪G ′ as first
′
| player, | which | means | o(G ∪G | )∈ {M,N}. |     |     |     |
| ------- | ----- | ----- | ------ | --------- | --- | --- | --- |
6. Assume by symmetry that, playing first, Breaker claims some vertex in G: we get a disjoint
|     | ′′  | ′   | ′′  |     |     |     | ′   |
| --- | --- | --- | --- | --- | --- | --- | --- |
union G ∪G where G is even and Maker has a winning strategy in G as first player. By
Claim 3, Maker has a winning strategy in G ′′ ∪G ′ as first player, so she has a winningstrategy
|     | ′       |        |         |             | ′      |            |     |
| --- | ------- | ------ | ------- | ----------- | ------ | ---------- | --- |
| in  | G ∪G as | second | player, | which means | o(G ∪G | ) ∈ {M,P}. |     |
|     |         | ′      |         |             |        |            | ′   |
7. SinceG andG areeven and Breaker has awinningstrategy in bothG andG as second player,
′ ′
hehasawinningstrategyinG∪G assecondplayerbyClaim2,whichmeanso(G∪G )∈ {B,P}.
′ ′
8. Since Breaker has a winning strategy in G as first player, there exists a vertex u in G such
|     |     |     | ′′  |     | ′   |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- |
that, in the even game G that results from G after Breaker claims u, Breaker has a winning
strategy as second player. If Breaker claims u as his first move in G∪G ′ , we obtain the game
′′
G ∪ G , in which Breaker has a winning strategy as second player by Claim 2. Therefore,
|     |     |     |     |     | ′   |     | ′   |
| --- | --- | --- | --- | --- | --- | --- | --- |
Breaker has a winning strategy in G∪G as first player, which means o(G∪G )∈ {B,N}.
Proof of Theorem 26. For the disjoint union, by Lemma 27, any outcome that does not appear in
27

Figure 7 is impossible. Conversely, we now show that all the outcomes listed in Figure 7 can be
achieved. Consider the poset positional games described in Figure 8: EM, EN , EN , EN , EB
|     |     |     |     |     |     |     | 1 2 | 3 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
and EB are even games, while OM, ON , ON , ON , OP, OB , OB , OB and OB are odd
| 2   |     |     | 1   | 2 3 | 1   | 2   | 3 4 |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
games. Moreover, the reader can verify that we have o(EM) = o(OM) = M, o(EN )= o(EN )=
|     |     |     |     |     |     |     | 1   | 2   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
o(EN ) = o(ON ) = o(ON ) = o(ON ) = N, o(OP) = P and o(EB ) = o(EB ) = o(OB ) =
| 3   | 1   | 2   | 3   |     |     | 1   | 2   | 1   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
o(OB 2 ) = o(OB 3 )= o(OB 4 )= B. Now, consider the following disjoint unions:
•
We have o(EN 1 ∪EN 1 ) = M and o(EN 1 ∪EN 2 ) = N, therefore it is possible for the disjoint
| union of | two even | games of outcome | N to have | outcome | M or | N.  |     |     |
| -------- | -------- | ---------------- | --------- | ------- | ---- | --- | --- | --- |
• We have o(EN ∪EB )= N and o(EN ∪EB ) = M, therefore it is possible for the disjoint
|     | 1   | 1   | 1   | 2   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of two even games of outcome N and B respectively to have outcome M or N.
• We have o(EB ∪EB ) = B and o(EB ∪EB ) = P, therefore it is possible for the disjoint
|          | 1        | 1                | 2         | 2       |         |     |     |     |
| -------- | -------- | ---------------- | --------- | ------- | ------- | --- | --- | --- |
| union of | two even | games of outcome | B to have | outcome | B or P. |     |     |     |
•
We have o(EM ∪ON ) =M and o(EM ∪ON )= N, therefore it is possible for the disjoint
|     |     | 1   |     | 2   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of an even game of outcome M and an odd game of outcome N to have outcome M
or N.
• We have o(EN ∪ON ) = M and o(EN ∪ON ) =N, therefore it is possible for the disjoint
|     | 1   | 1   | 1   | 2   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of an even game of outcome N and an odd game of outcome N to have outcome M or
N.
•
We have o(EB ∪OP) = M and o(EB ∪OP) = P, therefore it is possible for the disjoint
|     | 2   |     | 1   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of an even game of outcome B and an odd game of outcome P to have outcome M or
P.
• We have o(EM ∪OB ) = M and o(EM ∪OB )= N, therefore it is possible for the disjoint
|     |     | 3   |     | 1   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of an even game of outcome M and an odd game of outcome B to have outcome M or
N.
•
Wehaveo(EN ∪OB )= M,o(EN ∪OB ) = N,o(EN ∪OB )= P ando(EN ∪OB )= B,
|     | 1   | 3   | 1 1 |     | 2   | 1   | 3   | 1   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
therefore it is possible for the disjoint union of an even game of outcome N and an odd game
| of outcome | B to have | any of the | four outcomes. |     |     |     |     |     |
| ---------- | --------- | ---------- | -------------- | --- | --- | --- | --- | --- |
• We have o(EB ∪OB ) = N and o(EB ∪OB ) = B, therefore it is possible for the disjoint
|     | 2   | 1   | 1   | 1   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of an even game of outcome B and an odd game of outcome B to have outcome N or
B.
•
We have o(OM ∪OB ) = M and o(OM ∪OB ) = N, therefore it is possible for the disjoint
|     |     | 3   |     | 1   |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of two odd games of outcome M and B respectively to have outcome M or N.
•
We have o(ON 1 ∪ON 1 ) = M and o(ON 2 ∪ON 2 )= P, therefore it is possible for the disjoint
| union of | two odd games | of outcome | N to have | outcome | M or | P.  |     |     |
| -------- | ------------- | ---------- | --------- | ------- | ---- | --- | --- | --- |
• We have o(ON ∪OP) = M and o(ON ∪OP) = N, therefore it is possible for the disjoint
|     | 2   |     | 1   |     |     |     |     |     |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
union of two odd games of outcome N and P respectively to have outcome M or N.
• Wehaveo(ON ∪OB )= M,o(ON ∪OB ) = N,o(ON ∪OB )= P ando(ON ∪OB )= B,
|     | 2   | 2   | 1 1 |     | 2   | 1   | 3   | 1   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
thereforeitispossibleforthedisjointunionoftwooddgamesofoutcomeN andB respectively
| to have | any of the | four outcomes. |     |     |     |     |     |     |
| ------- | ---------- | -------------- | --- | --- | --- | --- | --- | --- |
•
We have o(OP ∪OB 2 ) = M and o(OP ∪OB 1 ) = N, therefore it is possible for the disjoint
union of two odd games of outcome P and B respectively to have outcome M or N.
• Wehave o(OB ∪OB ) = M, o(OB ∪OB ) = N,o(OB ∪OB ) = P ando(OB ∪OB )= B,
|     | 2   | 2   | 1 3 |     | 4   | 4   | 1   | 1   |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
therefore it is possible for the disjoint union of two odd games of outcome B to have any of
28

| the four | outcomes. |     |     |      |      |      |      |      |     |
| -------- | --------- | --- | --- | ---- | ---- | ---- | ---- | ---- | --- |
|          |           | EM  |     | EN 1 | EN 2 | EN 3 | EB 1 | EB 2 |     |
|          |           | OM  |     | ON   | ON   | ON   | OP   | OB   | OB  |
|          |           |     |     | 1    | 2    | 3    |      | 1    | 2   |
|          |           |     |     |      | OB   |      | OB   |      |     |
|          |           |     |     |      | 3    |      | 4    |      |     |
Figure 8: A selection of poset positional games that illustrate all possibilities for the
| outcome |     | of a disjoint |     | union. |     |     |     |     |     |
| ------- | --- | ------------- | --- | ------ | --- | --- | --- | --- | --- |
5.2 Posets of height 2, winning sets of size 1 in Maker-Maker convention
PSPACE-completeness,
Weestablish intheMaker-Maker convention, forafamily of posetpositional
gameswhichTheorem7hasshowntobesolvedinpolynomialtimeintheMaker-Breakerconvention.
Theorem28. For poset positional games inthe Maker-Makerconvention, deciding whether the first
(resp. second) player has a winning strategy is PSPACE-complete, even when restricted to instances
where: the poset is of height 2, all the winning sets are of size 1, and all the nonminimal elements
| are winning | sets. |     |     |     |     |     |     |     |     |
| ----------- | ----- | --- | --- | --- | --- | --- | --- | --- | --- |
Proof. We perform a reduction from Avoid True, which is defined as follows. Given a 2-POSDNF
formula φ on a set of variables V, two players, Alice and Bob, alternately choose a variable in V
(which has not been chosen yet) and set it to True, until one of the clauses of φ is satisfied. The
player who first turns φ to True loses. Note that no draw is possible. Deciding the outcome of
| Avoid True |     |      |        |     | PSPACE-complete |     |             |       |     |
| ---------- | --- | ---- | ------ | --- | --------------- | --- | ----------- | ----- | --- |
|            | has | been | proved | to  | be              |     | by Schaefer | [14]. |     |
Let(V,φ)beaninstanceofAvoid True. Denotebyx 1 ,...,x n thevariablesinV andbyC 1 ,...,C m
the clauses of φ. We build a poset positional game G = (X,F,P) as follows:
| • For | each variable |     | x ∈ | V, we | add a vertex | v in | X.  |     |     |
| ----- | ------------- | --- | --- | ----- | ------------ | ---- | --- | --- | --- |
|       |               |     | i   |       |              | i    |     |     |     |
•
For each clause C j ∈φ, we add a vertex u j in X and the winning set {u j } in F.
•
| For | each variable |     | x i ∈ | C j , we | add v i | < u j in P. |     |     |     |
| --- | ------------- | --- | ----- | -------- | ------- | ----------- | --- | --- | --- |
29

We prove that the first player in Avoid True has a winning strategy in (V,φ) if and only if the
first player in G has a winning strategy (which is equivalent to the second player in G not having a
| winning strategy, | since no draw | will be possible | in G). |     |
| ----------------- | ------------- | ---------------- | ------ | --- |
We will name the players Alice and Bob in both games. By symmetry, suppose Alice has a winning
strategy S in Avoid True, going first (resp. second). We define a strategy for her in G as follows.
Alice considers that any vertex v being claimed corresponds to the variable x being set to True in
|     |     | i   |     | i   |
| --- | --- | --- | --- | --- |
Avoid True. Whenever it is Alice’s turn, she claims the vertex v i corresponding to the variable x i
that she would have set to True according to S. Since S is a winning strategy for Alice, Bob will
be the first in Avoid True to set some variable x to True which turns a clause C to True. This
|     |     |     | i   | j   |
| --- | --- | --- | --- | --- |
means that v is the last predecessor of u in G. Therefore, Alice simply claims u to win.
|     | i   | j   |     | j   |
| --- | --- | --- | --- | --- |
30