From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
Go-MokuS olved by New Search Techniques
L.V. Ailis
H.J. van den Herik M.P.H. Huntjens
University of Limburg Vrije Universiteit
P.O. Box 616 De Boelelaan 1081
6200 MDM aastricht, The Netherlands 1081 HVA msterdam,T he Netherlands
{ allis,herik }@cs.mlimburg.nl matty@cs.vu.nl
Abstract discussed. In section 3, somei nsight is given into
Manyd ecades ago, Japanese professional Go-Moku the wayo f thinking by hamanG o-Mokeux perts, the
players stated that Go-Mok(uF ive-in-a-row on "thinking" of the strongest computerp rogramsa nd
horizontally placed 15×15b oard) is a wong amef or the main differences betweent hem. Section 4 con-
the player to movef ast. So far, this claim has never tains a description of threat-space search. The
been substantiated by (a tree of) variations or by results of this news earch techniquea re presentedi n
computer program. Meanwhile many variants of section 5. The Go-Mokup rogram Victoria is
Go-Mokwu ith slightly different rules have been described in section 6. The main result is given in
developed. This paper shows that for two common section 7: howV ictoria solved the commovna riant
variants the game-theoretical value has been esta- of Go-MokuS.e ction 8 contains conclusions.
blished.
2. The rules of Go-Moku
Moreover, the Go-Mokup rogram Victoria is
described. It uses two new search techniques, In Go-Mokus,i mple rules lead to a highly complex
threat-space search and proof-numbers earch. One game,p layed on the 225 intersections of 15 horizon-
of the results is that Victoria is boundto win against tal and 15 vertical lines. Goingf roml eft to right the
any (optimal) counterplayi f it movesf ast. Further- vertical lines are lettered from’ a’ to ’o’; goingf rom
more,i t achievesg ood results as a defender against the bottomt o the top the horizontal lines are num-
non-optimallyp laying opponents. In Ibis contribu- bered from 1 to 15. Twop layers, Black and White,
tion we focus on threat-space search and its advan- movei n turn by placing a stone of their ownc olor
tages comparedto conventionals earch algorithms. on an empty intersection, henceforth called a
square. Black starts the game.T he player whof ast
1. Introduction makesa line of five consecutives tones of his color
(horizontally, vertically or diagonally) wins the
Japanese professional Go-Mokpul ayers have stated
game. The stones once placed on the board during
for manyd ecadest hat the player to movef ’ast (i.e.,
the game never movea gain nor can they be cap-
Black) has an assured win (Sakata and Ikawa,
tured. If the board is completelyI dled, and no one
1981). Still, up to this contribution, as far as we
has five-in-a-row, the gamei s drawn.
know,n o proof has been published nor has any Go-
Mokup rogram ever shownt o be undefeatable when Manyv ariants of Go-Mokeux ist; they all restrict
playing Black. As a case in point we mention the the players in somes ense, mainly reducing the
game between the Go-Moku1 991 World Champion advantage of Black’s fast move. Wem ention five
program Vertex (Black) and the program Polygon variants.
(White), Vertex maneuveredit self into a position A. In the early days the game was played on a
provablyl ost for Black( Uiterwijk, 1992a). 19)<19 board, since Gob oards have that size.
The intriguing difference betweenh umans trategic This variant is still occasionally played. How-
abilities and the performancoe f the state-of-the-art ever, the larger board size increases Black’s
computer programs makes Go-Mokua n attractive advantage( Sakata and 1Lawa,1 981).
research domain. The investigations focus on the B. Ano verline is a line of six or morec onsecutive
discovery of new domain-specific strategic stones of the samec olor. In the variant of Go-
knowledge and on the development of new search Mokup layed most often today, an overline does
techniques. Both issues are discussed below not win (this restriction applies to both players).
although emphasisi s placed on a new search tech- Only a line of exactly five stones is considered
nique. as a winningp attern.
Thec ourseo f this article is as follows. In section 2, C. Black plays his last moveu sually at the center
the rules of five Go-Mokuv ariants are briefly square and his second move diagonally

-2-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
connected to his  first  move. In  a commonly occupied the four center  squares,  while the two
playedv ariant it is forbiddent o Blackt o play his outer squares are empty; the three (diagraml c  and
second movei n the 5x5 square of whichh is fast ld) is either  a line of seven squares of whicht he
movef orms the center. This restriction  reduces three center squares are occupiedb y the attacker,
Black’s advantage considerably,  but not com- and the remainingf our squares are empty, or a line
pletely. of six squares, with three consecutives quares of the
D. A professional  variant  of Go-Mokuis   Renju. four center squares occupiedb y the attacker, and the
Whitei s not restricted in any way,e .g.,  an over- remaining three squares empty; the broken three
line  wins the gamef or White. However,B  lack (diagraml e) is a line of six squares of whicht he
attacker has occupiedt hree non-consecutives quares
| is  not allowed to makea n overline,  |     | nor a so- |     |     |
| ------------------------------------- | --- | --------- | --- | --- |
of the four center squares, while the other three
| called three-three or four-four (cf.  |     | Sakata and |     |     |
| ------------------------------------- | --- | ---------- | --- | --- |
Ikawa, 1981). If Black makesa ny of these pat- squares are empty. If a player constructs a four, he
threatens to win at the next move. Therefore, the
terns, he is declaredt o be the loser. Renjui s not
threat must be countered immediately.I f a straight
| a symmetricg ame;t o play it  | well requires dif- |     |     |     |
| ----------------------------- | ------------------ | --- | --- | --- |
four is constructed, the defender is too late,  since
| ferent strategies  | for Black and for White. Even |     |     |     |
| ------------------ | ----------------------------- | --- | --- | --- |
thoughB  lack’s advantagei s severely reduced, he there are two squares wheret he attacker can win on
still  seemst o havet he upper hand. his next move.W  ith a three, the attacker threatens
to create a straight  four on his next move. Thus,
E. In an attempt to maket he gamel ess unbalanced,
even though the threat has a depth of two moves,i t
in Renju a choice rule for Whiteh as been intro-
must be countered immediately. If an extension at
| duced: Black must play his first                |     | movei n the |                                       |                |
| ----------------------------------------------- | --- | ----------- | ------------------------------------- | -------------- |
|                                                 |     |             | both sides is possible (diagraml c),  | then there are |
| center,  White at one of the eight squares con- |     |             |                                       |                |
two defensive moves:b oth directly adjacent to the
nected to Black’s stone; Black’s second movei s
attacking stones. If only one extension is possible
| unrestricted.  | Then, White has  | the  choice |     |     |
| -------------- | ---------------- | ----------- | --- | --- |
then three defensive movesa re available (diagram
| between continuing  | the  play with the  | white |     |     |
| ------------------- | ------------------- | ----- | --- | --- |
ld). Moreovera, gainst a broken three, three defen-
| stones,  or swapping colors  | with Black. [When |     |     |     |
| ---------------------------- | ----------------- | --- | --- | --- |
sive movese xist (diagraml e).
| playing optimally, Blackw  | ill, if possible at all, |             |     |     |
| -------------------------- | ------------------------ | ----------- | --- | --- |
| choose his                 | second moves uch that    | the  game-  |     |     |
| theoretical                | value of the resultant   | position is |     |     |
drawn.]
| Wei llustrate  our search techniques with the non- |                          |     |     |     |
| -------------------------------------------------- | ------------------------ | --- | --- | --- |
| restricted  variant                                | of Go-Moku:a n overline  | is  |     |     |
alloweda nd sufficient to win, for either player. In
section 7, we present the solution of this variant as
well as of variant B.
3. Expert knowledge
In this  section, three types of Go-Mokkun owledge
and their applications are discussed. The f’Lrst type
consists of a numbeor f definitions importantf or all
| players  (humans and computers). Wea pply these |                            |     | Diagram1 : Threats. |     |
| ----------------------------------------------- | -------------------------- | --- | ------------------- | --- |
| definitions  to threat                          | sequences. The second type |     |                     |     |
contains  strategies  taken  from humanG  o-Moku To win the gamea gainst  any opposition a player
players’  thinking.  The third  type embodies the needs to create a double threat (either  a straight
| choice-of-moves election  | process of conventional |     |                                   |                 |
| ------------------------- | ----------------------- | --- | --------------------------------- | --------------- |
|                           |                         |     | four,  or two separate threats).  | In most cases,  |
Go-Mokup rograms.  Then,  we examine to  what threat sequence, i.e.,  a series  of movesi n which
extent  move-selection approaches by humansa nd each consecutive movec ontains a threat,  is played
by computersa re different. Asa  result it  transpires before a double threat  occurs. A threat  sequence
| which ability  is lacking in conventional Go-Moku |     |     |     |     |
| ------------------------------------------------- | --- | --- | --- | --- |
leading to a (winning)d oublet hreat is called a w/n-
| programs. |     |     | ning threat sequence. Each threat  | in the sequence |
| --------- | --- | --- | ---------------------------------- | --------------- |
forces the defender to play a movec ountering the
3.1. Definitions andt hreat sequences threat.  Hence,t he defender’sp ossibilities  are lim-
| In Go-Mokua,  threat  | is an important notion; the |     | ited. |     |
| --------------------- | --------------------------- | --- | ----- | --- |
main types  have descriptive  names: the  four In diagram 2a a position  is showni n which Black
(diagraml a) is defined as a line of five squares,  can win through a winningt hreat sequencec onsist-
which the attacker has occupieda ny four, with the ing of fours only. Since a four must be countered
fifth  square empty;t he straight four (diagraml b)  immediately,t he wholes equenceo f movesi s forced
| a line  of six squares, of which the attacker has |     |     | for White. |     |
| ------------------------------------------------- | --- | --- | ---------- | --- |

-3-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
|     |     | The way a humane xpert finds  |     | winning sequences |
| --- | --- | ----------------------------- | --- | ----------------- |
so quickly can be broken downi nto the following
steps.
|     |     | 1. A section of the board is chosenw  |     | heret he confi- |
| --- | --- | ------------------------------------- | --- | --------------- |
guration of the stones seemsf avorable for the
|     |     | attacking                            | player.  It  is  then decided whether |           |
| --- | --- | ------------------------------------ | ------------------------------------- | --------- |
|     |     | enougha ttacking stones collaborate  |                                       | makingi t |
useful to search for a winning sequence. This
|     |     | decision is based on a "feeling",  |     | which comes |
| --- | --- | ---------------------------------- | --- | ----------- |
from a long experience in judging patterns  of
|     |     | stones (cf. DeG  | root, 1965). |     |
| --- | --- | ---------------- | ------------ | --- |
2. Threats are considered,a nd especially the threats
related to other attacking stones already on the
Diagram2 a: A winningt hreat sequenceo f fours.
|     |     | board.  Defensive moves by the opponent are |     |     |
| --- | --- | ------------------------------------------- | --- | --- |
mostlyd isregarded.
|     |     | 3. As soon as a variation  | is  | found in which the |
| --- | --- | -------------------------- | --- | ------------------ |
attacker can combineh is stones to forma  double
|     |     | threat,  it                             | is investigated howt he defender can |                     |
| --- | --- | --------------------------------------- | ------------------------------------ | ------------------- |
|     |     | refute  the potential                   | winning threat                       | sequence.           |
|     |     | Whenever the                            | opponent                             | has  more than  one |
|     |     | defensive move, examinationi s started  |                                      | whether             |
the samef lu-eat sequencew orksi n all variations.
|     |     | Moreover, it         | is  investigated             | whether  the |
| --- | --- | -------------------- | ---------------------------- | ------------ |
|     |     | opponentc an insert  | one or moref ours neutraliz- |              |
ing the attack.
4. If only somev ariations do not lead to a win via
the samet hreat sequence,e xaminationi s started
Diagram2 b: A winningt hreat sequence of threes. whether the remaining positions can be wonv ia
other winnings equences.
In practical play, a winningt hreat sequenceo ften
| In diagram 2b a position  | is showni n which Black | 5.  |     |     |
| ------------------------- | ----------------------- | --- | --- | --- |
wins through a winningt hreat  sequence consisting consists of a single variation, independenot n the
defensive moves.
of threes, occasionally interrupted by a white four.
As mentionede arlier,  Whiteh as at each turn a lim- 6. Notably,t he size of the search spacei s consider-
ited  choice. During the play,  he can create  two ably reducedb y fhst searching for one side (the
fours as is showni n diagram2 b. Still,  his loss is attacker).  Only if  a potential  winning threat
inevitable.  Wer emarkt hat the exact winningt hreat sequence is  found, the  impact of  defensive
sequence  by Black  is  dependent  of  White’s movesi s  investigated.  This approach is  sup-
responses to the threes.  Therefore, in such cases, ported by the analyses given in Sakata and Ikawa
preference is given to the notion of winningt hreat
|     |     | (1981).  Whenp resenting  |     | a  winning threat |
| --- | --- | ------------------------- | --- | ----------------- |
trees.  In practice,  for the difference betweent he sequence, they only provide the movesf or the
notions sequencea nd tree,  inessential fours by the attacker, thus indicating that the sequencew  orks
defendera re disregarded( see 6. below). irrespective  of the defensive moves. Possible
|     |     | fours which the  | defender can create  | without |
| --- | --- | ---------------- | -------------------- | ------- |
3.2.  Humanex pert analysis refuting the threat  sequence are neglected all
together.
| During the  second and third  | Computer Olympiad |     |     |     |
| ----------------------------- | ----------------- | --- | --- | --- |
(Levy and Beal,  1991; Van den Herik and AUis, In positions without winningt hreat  sequences, the
1992) we have observed  two human expert  Go- movesto  be played preferably increase the potential
Mokup layers (A. Nosovsky,5 th dan, and N. Alex-
|     |     | for creating threats,  | or, wheneverd efensive moves |     |
| --- | --- | ---------------------- | ---------------------------- | --- |
androv,  5th dan).  These Russian players  are are called  for,  the movesc hosen will reduce the
involved in two of the world’s strongest  Go-Moku opponent’s potential  for  creating  threats.  The
playing programs( Vertex and Stone System). While humane valuation of the potential of a configuration
| observingt he experts, it  | becamec lear that they are |     |     |     |
| -------------------------- | -------------------------- | --- | --- | --- |
is based on two aspects: (1) direct calculations
able to find  very quickly sections  on the board the possibilities,  e.g.,  ff the opponentd oes not
where a winning threat  sequence can be created, answer in that  section of the board and (2) a so-
regardless of the numbeor f threes whicha re part of called goods hape, i.e.,  configurationso f whichi t is
the winning sequence. The length of these winning
knownth at stones collaborate well.
sequenceasr e typically in the rangeo f 5 to 20 ply.
3

-4-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
3.3.  Computepr rograms’s trategies
|     |     |     |     | 6,000 variations exist.  | For humans,h owever,i t  | is  |
| --- | --- | --- | --- | ------------------------ | ------------------------ | --- |
The strongest Go-Mokpur ograms use (variants  of) immediatelyc lear that noneo f the variations leads
|     |     |     |     | to  a winning threat  | sequence.  | Somehowh umans |
| --- | --- | --- | --- | --------------------- | ---------- | -------------- |
the cx-13 search algorithm (Knutha nd Moore,1 975).
|                                                  |     |                  |     | understandt hat executinga ll  | these threats leads to |     |
| ------------------------------------------------ | --- | ---------------- | --- | ------------------------------ | ---------------------- | --- |
| In each position only a restricted               |     | numbe(rn ormally |     |                                |                        |     |
| 10-15) of the best-looking movesa re considered. |     |                  |     | nothing.                       |                        |     |
The selection is  based on heuristics.  Searching a In diagram3 b, a position similar to diagram3 a is
variation ends whena  win (loss) has been found,  given. Black nowh as a winningt hreat sequence. It
whena  pre-determinedd epth has been reached; then is conceivable that a Go-Mokpur ogram only after
a heuristic  evaluation is performed.S omep rograms long searching finds the winning threat sequence.
also  use forward pruning in  branches where an Its  tree  mightb e polluted by unnecessary threats
intermediate evaluation leaves little  hope for suc- carried out in non-relevants ections of the board.
cess. Whenth reats are involved, the defender has a
| limited  | numbero f moves; the  | strongest  | programs |     |     |     |
| -------- | --------------------- | ---------- | -------- | --- | --- | --- |
then search up to a depth of 16 ply. In the opening
| phase of the  | game, all  | programs use an opening |     |     |     |     |
| ------------- | ---------- | ----------------------- | --- | --- | --- | --- |
book.
There are somei mportant differences betweenp ro-
| grams. For instance,  | Polygon (Uiterwijk,                     |     | 1992b) |     |     |     |
| --------------------- | --------------------------------------- | --- | ------ | --- | --- | --- |
| searches first        | for a winningt hreat tree withoutu sing |     |        |     |     |     |
a heuristic evaluation function. Usingt ransposition
tables Polygonr eaches in somev ariations depths of
20 to 30 ply (or even more). If no winningt ree
found, an n-ply deep search is performed using a
strategic heuristic evaluationf unction( n is mostly
| small number); it  | then selects  | a move.B  | efore the |     |     |     |
| ------------------ | ------------- | --------- | --------- | --- | --- | --- |
Diagram3a : A position with manyl oose threats.
| strategic                             | movei s  played, it  | examinesw  | hether the      |     |     |     |
| ------------------------------------- | -------------------- | ---------- | --------------- | --- | --- | --- |
| opponent has a winning tree           |                      | after      | the  movei s    |     |     |     |
| played. If so, the movei s rejected,  |                      |            | and a newm  ove |     |     |     |
is generatedb y the strategic search.
| Another instance is the 1991 WorldC  |     |     | hampionV er- |     |     |     |
| ------------------------------------ | --- | --- | ------------ | --- | --- | --- |
tex. It  does not use transposition tables nor special
search techniques. A standard search depth of 16
ply, a fine-tuned selection of the most-promisin1g4
| movesp er position,  | and an extended opening book |     |     |     |     |     |
| -------------------- | ---------------------------- | --- | --- | --- | --- | --- |
have resulted in a strong program.
| 3.4.  Manv s.  | machine |     |     |     |     |     |
| -------------- | ------- | --- | --- | --- | --- | --- |
Obviously, both humansa nd programs spend some
| time to search  | for  winning threat  |     | sequences. |     |     |     |
| --------------- | -------------------- | --- | ---------- | --- | --- | --- |
Humanuss e methodso f optimistic search and verif- Diagram3b : A position with real threats.
ication, programsu se conventionalt ree-search tech-
niques (Newella nd Simon,1 972). In the latter  case, Wec onclude that  conventional tree-search  algo-
| superior calculation powert ries  |     | to makeu p for the |     |     |     |     |
| --------------------------------- | --- | ------------------ | --- | --- | --- | --- |
rithms do not mimich umane xperts whens earching
large  amounto f extra work and to compensatet he
|     |     |     |     | for a winning threat  | sequence. Beloww e provide a |     |
| --- | --- | --- | --- | --------------------- | ---------------------------- | --- |
heuristic evaluation function, whichi s clearly infe-
|           |                    |              |         | model attempting to formalize                 | the humans earch |     |
| --------- | ------------------ | ------------ | ------- | --------------------------------------------- | ---------------- | --- |
| rior  to  | human evaluation.  | A challenge  | for  AI |                                               |                  |     |
|           |                    |              |         | strategy.  This model needs the introduction  |                  | of  |
| research  | is  investigating  | how experts  | can be  |                                               |                  |     |
threat-spaces earch.
outsmarted by clever techniques and not achieving
the humanp laying strength by heavy searching (cf.
4. Threat-spaces earch
| Levinsone t al.,  | 1992). The aim could be realized |     |     |                                                        |                    |             |
| ----------------- | -------------------------------- | --- | --- | ------------------------------------------------------ | ------------------ | ----------- |
|                   |                                  |     |     | A winning threat                                       | sequence consists  | of threats. |
| by formalizing    | the human’s complicated methods  |     |     |                                                        |                    |             |
|                   |                                  |     |     | Thereforew  ec oncentrateo n the space of all threats. |                    |             |
and then applying the surplus of calculation power.
The size of the space often comprisess everal mil-
In  diagram 3a we provide an extreme example.
lions of positions. Hence,e mphasisis  placed on (1)
| Black has 16 places whereh e can create a four.  |     |     | In  |                     |                               |     |
| ------------------------------------------------ | --- | --- | --- | ------------------- | ----------------------------- | --- |
|                                                  |     |     |     | reducing the size,  | and (2) searching through the |     |
total,  Blackh as 8!><28=  10,1900,000w ayso f creat-
remainings pace as efficiently as possible.
ing a series of 8 moves( with 8 forced responses).
|                                            |     |     |           | A substantial  | reduction comesf rom the determina- |     |
| ------------------------------------------ | --- | --- | --------- | -------------- | ----------------------------------- | --- |
| Whentr ansposition tables are used, still  |     |     | moret han |                |                                     |     |
tion of the defensive movesc onnectedt o a threat.

-5-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
Froms ection 2, we know:a fter a four, one defen- with gain square d15 (and cost squaree l5).  These
sive movies  possible;a fter a three, twoo r threea re two threats cannotb oth be executedi n one andt he
possible. If wec onsider,f or instance, after a three samew  inning threat sequence. Therefore, these
all possible countermovetsh, e numbeorf  variations threatsa re in conflict. If threatsh avea  large depen-
rapidly increases. Froms ection 3.2,  however,i t dency tree, it  is a great deal of workt o examine
whethert he dependenctyr ees are in conflict.  How-
appears that humane xperts mostly find winning
sequencesi n whicht he choices by the opponenat re ever, the extra worko utweighsth e worki nvolvedi n
| irrelevant. This idea is used to reducet he space. |     | the normailn vestigation. |     |     |
| -------------------------------------------------- | --- | ------------------------- | --- | --- |
Instead of choosing betweent he defensive moves,
Threat-spaces earch can nowb e describedw  ith the
| we allow the opponentto  play all possible counter- |                | help of twop rinciples.                       |     |     |
| --------------------------------------------------- | -------------- | --------------------------------------------- | --- | --- |
| movesa t the samet ime. If we still                 | find a winning |                                               |     |     |
|                                                     |                | 1, Threat A being independento f threat B is  |     | not |
threats equencei,t   is sure that the opponent’ms oves
allowedt o occuri n the searcht ree of threatB  .
are inessential. Thed rawbacmk ightb e that in some
|                                                  |     | 2. In the threat-spaces earch tree only threats for |     |     |
| ------------------------------------------------ | --- | --------------------------------------------------- | --- | --- |
| positions no winningth reat sequenceis  found,w  |     | hile                                                |     |     |
still  onee xists. In section5  this drawbacisk  treated the attackera re included.A  fter a potential win-
anda  remedyis  given. ningt hreats equenche as beenf ound,i t is investi-
gated whethert he sequencec an withstand any
In brief,  we have reducedt he search space to a
counterattack.
space of attacking moves( threats) only, each
In Table1 , we have shownt he threat-space search
thema nsweredb y all  directly defensive moves.F or
tree of the positiono f diagram3b .
a precise description of threat-space search we
introducesi x notions,t heir definitionsf ollowb elow.
1. Theg ain square of a threat is the squarep layed Depth Typeo f threat Gains quare Cost squares
| by the attacker. |     |     | Foul" | 115 k15 |
| ---------------- | --- | --- | ----- | ------- |
l
|     |     | 1   | Four | k15 115 |
| --- | --- | --- | ---- | ------- |
2. The cost squares of a threat are the squares
|     |     | 1   | Four | el5 d15 |
| --- | --- | --- | ---- | ------- |
playedb y the defenderi,n  responseto  the threat.
|     |     | 2   | Four | ill h12 |
| --- | --- | --- | ---- | ------- |
3. Ther est squareso f a threat are the squaresc on- 3 Straight Four i8 i7
|                                |                 | 2   | Four | h12 H1  |
| ------------------------------ | --------------- | --- | ---- | ------- |
| taining a threat possibility;  | the gain square |     |      |         |
|                                |                 | 1   | Four | d15 e15 |
excepted.
|     |     | 1   | Four | o12 oll |
| --- | --- | --- | ---- | ------- |
oll o12
| 4. ThreaAt i s dependenot n threatB  | , if a rest square | 1   | Four |         |
| ------------------------------------ | ------------------ | --- | ---- | ------- |
|                                      |                    | 1   | Four | a12 all |
of Ai s the gains quareo f B.
|     |     | 1   | Four | aI1 a12 |
| --- | --- | --- | ---- | ------- |
5. Thed ependenctrye e of a threat Ai s the tree with 1 Three HI i7,i8,i12
root A and consisting of dependennt odeso nly, 2 Four h12 el5
viz. the children of eachn odeJ  are the threats 2 Four el5 h12
|                 |     |     | 3 Five | d15           |
| --------------- | --- | --- | ------ | ------------- |
| dependenot n J. |     |     |        | i8 i7,i11,i12 |
1 Three
|                                             |                    | I   | Four | 05 04 |
| ------------------------------------------- | ------------------ | --- | ---- | ----- |
| 6. Twod ependenctyr ees P andQ              |  are in conflict,  | if  |      |       |
|                                             |                    | 1   | Four | 04 05 |
| within dependenctyr ee P a threat A exists  |                    | and |      |       |
|                                             |                    | I   | Four | 11 kl |
within dependenctyr ee Q a threat B, in such a
|     |     | 1   | Four | kl H |
| --- | --- | --- | ---- | ---- |
wayt hat (1) the gains quareo f A is cost square
|     |     | 1   | Four | el dl |
| --- | --- | --- | ---- | ----- |
B, or (2) vice versa, or (3) a cost squarein  A  l Four dl el
| also cost squarein  B. |     | 1   | Four | 05 a4 |
| ---------------------- | --- | --- | ---- | ----- |
|                        |     | l   | Four | a4 05 |
Wee xemplifyt he definitions. In diagram3 b, play-
ing e15 creates a four (with gain squaree 15, cost Table1 : Thes earcht ree of diagram3 b.
square d15, and rest squares a15, b15 and c15).
After the movese 15 and d15, playing ill  creates a Eachl ine in table 1 containst he depth, the type of
four (with rest squarese 15,f14 and g13). Thust he threat, the gain squarea ndt he cost squares.I n the
| four with gain squarei ll  is dependenot n the four |     |     |     |     |
| --------------------------------------------------- | --- | --- | --- | --- |
searcht ree 18 independentht reats exist: 16 fours in
with gain squaree 15, since e15 is rest squarew ithin
the comerso f the boarda ndt wot hrees in the range
the threatw  ithg ain squarei1 1. of i7-i12.  For 16 of these threats (15 fours and
The dependenctyr ee of threat ill  is a tree whose three) the gain squared oes not contributea nything
root is the four with gain squarei 11; the only child to creating newt hreats. Henceth e 16 nodesa re ter-
of the root is the threat with gain squaree 15. Since minalsi n the threat-spacsee archt ree, since the first
this last threat consists of rest squaresw  hicha re principleo f threat-spacsee archs tates that a childi n
a search tree mustb e dependenotn  its  parent. Only
| alreadyp resent on the board,i t  | does not dependo n |     |     |     |
| --------------------------------- | ------------------ | --- | --- | --- |
anyt hreats. two threats producea  gain square exploitable in
subsequentt hreats. Wed iscuss themb elow.
A clear exampleo f definition 6 is the threat with
gain squaree 15 (andc ost squared 15) andt he threat After e15 (with cost squared 15), two newf ours can

-6-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
be created,  viz.  on ill  and h12. The gain square six combinations of two gain squares.  Wer emark
h12 (with cost square i11) results in no newt hreats. that h9 and hlO are both gain squares and lie  close
After ill  (with cost square h12), a straight four can enougho n the samel ine,  but their  dependencytr ees
be created at i8.  Since a straight four guarantees a conflict.  Therefore, the combinationh 9-hlOi s not
win, a potential winningt hreat sequencei s found. added to the threat-space search tree.  For the same
|            |                                             |     |     | reason, i9-j10 is not addedt o the search tree.  |     |     | The |
| ---------- | ------------------------------------------- | --- | --- | ------------------------------------------------ | --- | --- | --- |
| After ill  | (with cost squares i7, i8 and i12), two new |     |     |                                                  |     |     |     |
fours can be created, viz. at h12 and e15. The gain combinationh 9-jlO does not lie  on a line. The three
|     |     |     |     | combinations where the  |     | gain squares  | are  close |
| --- | --- | --- | --- | ----------------------- | --- | ------------- | ---------- |
square e15 (with cost square h12) leads to the crea-
|     |     |     |     | enough on the same line,  |     | and whose dependency |     |
| --- | --- | --- | --- | ------------------------- | --- | -------------------- | --- |
tion of a five at d15. Thusa  second potential win-
trees do not conflict are hlO-i9, hlO-jlOa nd h9-i9.
| ning threat  | sequence has been found. The total |     |     |                               |     |        |             |
| ------------ | ---------------------------------- | --- | --- | ----------------------------- | --- | ------ | ----------- |
|              |                                    |     |     | In Table 3 we have shownt he  |     | three  | potentially |
threat-space search tree consists of 24 nodeso nly,
with all potential threat sequencesfo und. beneficial  combinations. For each combination, we
|     |     |     |     | have, if possible, developeda  news earch tree,  |     |     | using |
| --- | --- | --- | --- | ------------------------------------------------ | --- | --- | ----- |
In the exampleo f diagram 3b two potential winning
the principles of threat-space search. It turns out
| threat  | sequences have been found in  |     | a process |     |     |     |     |
| ------- | ----------------------------- | --- | --------- | --- | --- | --- | --- |
that the combinationh lO-i9 can be used to create a
wheree ach subsequentt hreat is dependento n stones
|     |     |     |     | straight  | four at  f12.  | The combination of threats |     |
| --- | --- | --- | --- | --------- | -------------- | -------------------------- | --- |
already on the board: every new gain square ori-
{hlO, i9} followed by f12 thus forms a potential
| ginated from a previous threat.  |     | In somep ositions, |     |     |     |     |     |
| -------------------------------- | --- | ------------------ | --- | --- | --- | --- | --- |
winningt hreat sequence.
however,t he gain squares of two or three indepen-
dent threats can be combinedto  create a newt hreat.
In such cases independent nodes should be linked. Depth Typeo f threat Gains q. Cost sq.
| The resultant  | combination can be the ancestor of |     |     | 1   |     | hlO | h9  |
| -------------- | ---------------------------------- | --- | --- | --- | --- | --- | --- |
Four
|               |                  |                        |     | 2   | combinationw ith i9 | i9  | ~o  |
| ------------- | ---------------- | ---------------------- | --- | --- | ------------------- | --- | --- |
| newt hreats.  | Wen ote that it  | is only useful to link |     |     |                     |     |     |
|               |                  |                        |     | 3   | Straight Four       | fl2 | e13 |
independent nodes when the gain squares poten-
|                                                       |     |                  |     | 2   | combinationw ith jl0 | ilo | i9  |
| ----------------------------------------------------- | --- | ---------------- | --- | --- | -------------------- | --- | --- |
| tially combineto  a newt hreat, i.e.,                 |     | they mustl ie on |     |     |                      |     |     |
|                                                       |     |                  |     | 1   | Four                 | h9  | hlO |
| a single line, and close to each other for a possible |     |                  |     |     |                      |     | jw  |
|                                                       |     |                  |     | 2   | combinationw ith i9  | i9  |     |
jlo
| five-in-a-row. |     |     |     | 1   | Four |     | i9  |
| -------------- | --- | --- | --- | --- | ---- | --- | --- |
jlo
|     |     |     |     | 1   | Four | i9  |     |
| --- | --- | --- | --- | --- | ---- | --- | --- |
Table3 : Combinationosf  threats for diagram4 .
|     |     |     |     | The two examplesc learly  |          | indicate                   | the working of |
| --- | --- | --- | --- | ------------------------- | -------- | -------------------------- | -------------- |
|     |     |     |     | threat-space              | search.  | Wen owp rovide the general |                |
description. Froma  given position a search tree of
|     |     |     |     | dependentt hreats is  |     | developed. Whenevear  branch |     |
| --- | --- | --- | --- | --------------------- | --- | ---------------------------- | --- |
ends in a straight four or five it is examinewd hether
|     |     |     |     | the potential  | winning sequence can be refuted.  |     | If  |
| --- | --- | --- | --- | -------------- | --------------------------------- | --- | --- |
noneo f the variations leads to a win for the attacker,
|     |     |     |     | combinations are made between all  |     |                  | independent |
| --- | --- | --- | --- | ---------------------------------- | --- | ---------------- | ----------- |
|     |     |     |     | nodes, with the condition that     |     | the gain squares |             |
involvedl ie on a single line and close to eacho ther.
|     |     |     |     | This process is repeated until  |     | a winning threat |     |
| --- | --- | --- | --- | ------------------------------- | --- | ---------------- | --- |
Diagram4 : A winning gain-square combination.
sequence has been found, or no new potentially
beneficial combinationsc an be created. Generaliz-
Diagram 4 shows a position  where Black can win ing the idea, wes tate that threat-spaces earch linear-
by combiningg ain squares of independent threats.
izes part of the search process.
| In Table 2 we showt he initial  |                            | threat-space search |          |     |     |     |     |
| ------------------------------- | -------------------------- | ------------------- | -------- | --- | --- | --- | --- |
| tree.  The tree                 | does not contain straight  |                     | fours or |     |     |     |     |
5. Results of threat-space search
fives.  This meanst hat no potential winningt hreat
|     |     |     |     | For Go-Moknuo  standard set of test  |     |     | positions  is |
| --- | --- | --- | --- | ------------------------------------ | --- | --- | ------------- |
sequenceh as been found.
|     |     |     |     | available,  | comparablet o the Bratko-Kopetce st  |     | for |
| --- | --- | --- | --- | ----------- | ------------------------------------ | --- | --- |
chess (Kopec and Bratko, 1982). Weh ave chosen
Depth Typeo f threat Gain square Cost squares 12 positions earlier  investigated  by the program
1 Foul" hlO h9 Polygon( Uiterwijk,  1992b) for testing  the effi-
1 Four h9 hlO ciency and efficacy of threat-space space. For this
jw
| I   | Four | i9  |     | purpose we have developed Victoria Threat-Space |     |     |     |
| --- | ---- | --- | --- | ----------------------------------------------- | --- | --- | --- |
jlo
| 1   | Four | i9  |     |     |     |     |     |
| --- | ---- | --- | --- | --- | --- | --- | --- |
Search, meaningt hat Victoria TSS does not use any
Table2 : Initial search tree for diagram4 . additional search techniques. Here, two remarksa re
in order.
With the four gain squares of Table 2 we can create First, in the test positions the defendingp layer has

-7-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
almost no interrupting  threats.  Moreover, the attack- misses a winning line,  which has to be compensated
ing player has only a few threats  not related  to the for  by starting  the proof-number search procedure.
area of interest.  Obviously, in positions  with many For a discussion  on efficiency  we confine ourselves
independent  threats  on both sides  the difference to the nine positions  solved by all  programv ersions.
between  threat-space  search  and conventional As a main result  we note  that  Victoria  TSS has
search is  expected to be more manifestly. searched  less  nodes  in  all  nine  positions  than
|                               |           |              |                                   |               |         |            | Polygon with the                 |                                           | 3-ply knowledge rules.  |     |                     | This holds |     |
| ----------------------------- | --------- | ------------ | --------------------------------- | ------------- | ------- | ---------- | -------------------------------- | ----------------------------------------- | ----------------------- | --- | ------------------- | ---------- | --- |
| Second,                       | the       | number of    | nodes searched                    |               |         | by Polygon |                                  |                                           |                         |     |                     |            |     |
|                               |           |              |                                   |               |         |            | also  true                       | for the comparison with Polygon’s version |                         |     |                     |            |     |
| am not                        | directly  |              | comparable to the number of nodes |               |         |            |                                  |                                           |                         |     |                     |            |     |
|                               |           |              |                                   |               |         |            | with the 7-ply knowledge rules,  |                                           |                         |     | except for position |            |     |
| searched                      |           | by Victoria  | TSS, the                          |               | reason  | being  (1) |                                  |                                           |                         |     |                     |            |     |
| Polygon uses knowledge rules  |           |              |                                   | reducing the  |         | depth of   | 9.                               |                                           |                         |     |                     |            |     |
search,  (2)  Polygon uses transposition  tables,  (3) The extremes in efficiency  are found in position  1,
Victoria  TSS only generates  movesl ocally  (in rela- with Polygon 3-ply  searching  3.2 times more nodes,
tion to the gain square of the current  parent node); and in position  8, with Polygon 3-ply  searching  87
Polygon generates  moves globally  (threats  at  any times  more nodes.  For the  comparison with Polygon
section  of  the  board,  independent  of the  parent 7-ply,  the figures range from 0.8 (position 9) to 17.2
node).  As a result  we mention  that  on the  same (position  7).  Considering  the  number of  nodes
hardware,  Victoria  TSS searches  5,000  nodes per searched as a measure of efficiency,  the competition
second and Polygon 500. is  in favor of  Victoria  TSS. Moreover, if  we take
|          |            |     |       |              |     |            | into  account that  |     | Victoria  |     | TSS searches  | ten times |     |
| -------- | ---------- | --- | ----- | ------------ | --- | ---------- | ------------------- | --- | --------- | --- | ------------- | --------- | --- |
| Finally  | we remark  |     | that  | Polygon has  |     | adjustable |                     |     |           |     |               |           |     |
knowledge levels.  Its  1-ply  and 3-ply  knowledge faster  since  it  is  not  hemmed by a  burden  of
|        |      |             |     |       |           |       | knowledge,  | we may conclude  |     |     | that  | threat-space |     |
| ------ | ---- | ----------- | --- | ----- | --------- | ----- | ----------- | ---------------- | --- | --- | ----- | ------------ | --- |
| rules  | are  | comparable  |     | with  | Victoria  | TSS’s |             |                  |     |     |       |              |     |
search is a valuable new search technique.
| knowledge: a five                          |                    |     | is  a 1-ply rule,  |          | and the straight |             |                |     |              |     |     |     |     |
| ------------------------------------------ | ------------------ | --- | ------------------ | -------- | ---------------- | ----------- | -------------- | --- | ------------ | --- | --- | --- | --- |
| four                                       | is  an example of  |     |                    | a 3-ply  | rule             | (Uiterwijk, |                |     |              |     |     |     |     |
| 1992c). In Table 4 we compare the results  |                    |     |                    |          |                  | on the 12   | 6. Victoria’s  |     | architecture |     |     |     |     |
test  positions.  The measures  are  expressed  in The implementation  of  threat-space  search,  as
number of nodes searched.  The Polygon version  is described  in section  4,  has resulted  in a module
described  in  Uiterwijk  (1992b);  we distinguish capable  of  quickly  determining  whether a winning
betwcen the version  using only the 1-ply and 3-ply threat  sequence exists  (averagely  0.1 CPU-seconds
rules,  and the version using the knowledge rules  up on an IBMR  S6000). This  module can be used  as
to 7 ply. first  evaluation  function.  If  the evaluation  value
|     |     |     |     |     |     |     | reads a "win for the attacker"  |     |     |     | then there is a win. If |     |     |
| --- | --- | --- | --- | --- | --- | --- | ------------------------------- | --- | --- | --- | ----------------------- | --- | --- |
Po$. Poly. 3-ply Poly. 7-ply Vict.  TSS no winning line  has been found by the module, the
|     | I   |     | 433  | 419  |          | 134 |                                   |                          |     |                          |                   |          |     |
| --- | --- | --- | ---- | ---- | -------- | --- | --------------------------------- | ------------------------ | --- | ------------------------ | ----------------- | -------- | --- |
|     |     |     |      |      |          |     | proof-number search procedure is  |                          |     |                          | started.          | All this |     |
|     | 2   |     | 2863 | 2367 | ~.s.)976 |     |                                   |                          |     |                          |                   |          |     |
|     |     |     |      |      |          |     | means that                        | the threat-space         |     | search procedure seen as |                   |          |     |
|     | 3   |     | 1715 | 1585 |          | 526 |                                   |                          |     |                          |                   |          |     |
|     |     |     |      |      |          |     | a heuristic                       | evaluation procedure is  |     |                          | admissible (Nils- |          |     |
|     | 4   |     | 1810 | 1797 |          | 303 |                                   |                          |     |                          |                   |          |     |
son, 1980).
|     | 5   |     | 5821 | 888  |     | 153 |            |                   |     |                            |     |     |     |
| --- | --- | --- | ---- | ---- | --- | --- | ---------- | ----------------- | --- | -------------------------- | --- | --- | --- |
|     | 6   |     | 7267 | 4826 |     | 643 |            |                   |     |                            |     |     |     |
|     |     |     |      |      |     |     | Hence, it  | is  nowp ossible  |     | to construct a search tree |     |     |     |
|     | 7   |     | 1658 | 1429 |     | 83  |            |                   |     |                            |     |     |     |
8 16811 2875 193 from the  initial  position  using the  techniques  of
9 4635 518 677 threat-space  search and proof-number search,  which
10 6274 6049 (n.s.)104 arrives at the same game-theoretical result  as a full-
11 775 505 ~.s.)558 width  game tree  would.  We def’me  a node to  be
|                                  | 12         |     | 8294                      | 6776            |     | 504     |                                               |                 |                                      |       |                       |           |       |
| -------------------------------- | ---------- | --- | ------------------------- | --------------- | --- | ------- | --------------------------------------------- | --------------- | ------------------------------------ | ----- | --------------------- | --------- | ----- |
|                                  |            |     |                           |                 |     |         | internal                                      | in  the search  |                                      | tree  | if  no winning threat |           |       |
|                                  |            |     |                           |                 |     |         | sequence (tree)                               |                 | can be found for the player to move. |       |                       |           |       |
| Table 4: Measuring the efficacy  |            |     |                           | and efficiency. |     |         |                                               |                 |                                      |       |                       |           |       |
|                                  |            |     |                           |                 |     |         | The main problem to be faced is               |                 |                                      |       | the large             | branching |       |
|                                  |            |     |                           |                 |     |         | factor  (averagely                            |                 | over 200),                           |       | especially            | when      |       |
| In three                         | positions  |     | (2,  10 and 11) Victoria  |                 |     | TSS did |                                               |                 |                                      |       |                       |           |       |
|                                  |            |     |                           |                 |     |         | threat  needs to be answered (Van den Herik,  |                 |                                      |       |                       |           | 1983, |
not  find  a winning line  (indicated  by n.s.,  not p. 253).  Then all  defensive  moves must be investi-
solved),  the reason being our reduction of the search gated in order to guarantee a correct  evaluation  of
| space described in section 4. After (n.s.)  |                                        |               |                           |                   |                    | we provide | internal                         | nodes         |                                   |          |               |                |      |
| ------------------------------------------- | -------------------------------------- | ------------- | ------------------------- | ----------------- | ------------------ | ---------- | -------------------------------- | ------------- | --------------------------------- | -------- | ------------- | -------------- | ---- |
| the                                         | number of nodes necessary to traverse  |               |                           |                   |                    | the res-   |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | To reduce the branching factor,  |               |                                   |          | in positions  |                | with |
| tricted                                     | search space.                          |               | As an aside,              |                   | we remark that     | in         |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | Black  to                        | move we have  |                                   | applied  |               | the  null-move |      |
| its                                         | tournament version                     |               | Victoria                  |                   | uses a combination |            |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | heuristic                        | (Beat,        | 1989). Black may only make moves  |          |               |                |      |
| of                                          | threat-space                           |               | search                    | and proof-number  |                    | search     |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | which, after                     | a null        | move by White, are followed by    |          |               |                |      |
| (Allis                                      | et                                     | al.,  1994).  | This combination results  |                   |                    | in         |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | a winning threat                 |               | sequence. Such moves thus consti- |          |               |                |      |
| finding the winning line                    |                                        |               |                           | in all  three     | positions          | men-       |                                  |               |                                   |          |               |                |      |
|                                             |                                        |               |                           |                   |                    |            | tute  hidden                     | threats.      |                                   | This     | procedure     | normally       |      |
tioned. Details are to be found in Allis (1994).
|            |           |                   |                  |         |              |             | reduces    | the  number of  |     | possible  | countermoves to  |     | a   |
| ---------- | --------- | ----------------- | ---------------- | ------- | ------------ | ----------- | ---------- | --------------- | --- | --------- | ---------------- | --- | --- |
| On the     | efficacy  |                   | we may conclude  |         | that         | our  imple- | few dozen. |                 |     |           |                  |     |     |
| mentation  |           | of  threat-space  |                  | search  | now and then |             |            |                 |     |           |                  |     |     |

From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
The selection of this  type of hiddent hreat movesis  section 6), and (2) establishing that no mistake
rather straightforwarda nd can be doneb y heuristics. been made in  merging all  hundreds of  subtree
| Victoria assigns points for creating patterns of two |     |                       | results. |     |     |
| ---------------------------------------------------- | --- | --------------------- | -------- | --- | --- |
| or three stones in a row. TheN                       |     |  movesw ith the larg- |          |     |     |
The calculations were performedi n parallel,  on 10
est  numbero f points are examinedt o see if  they
SUNS PARCstations2  of the Vrije Universiteit  in
result  in a win after  a null moveb y White. After Amsterdam. Each of  the  machines was equipped
| some testing  | N=10 proved to  | be a reasonable |                           |           |              |
| ------------- | --------------- | --------------- | ------------------------- | --------- | ------------ |
|               |                 |                 | with 64 or 128 Mbytes of  | internal  | memorya nd a |
choice.
|     |     |     | swap space of  | over 200 Mbytes. Our processes |     |
| --- | --- | --- | -------------- | ------------------------------ | --- |
Since we can be sure that every selected black move could  only  run overnight.  As a result,  some
constitutes  a threat,  the vast majority of White’s processesn ot finished at 8 a.m. werek illed,  and had
movesc an be disregarded. Still,  we must makes ure to be restarted at 6 p.m. Still,  over 1000C  PU-hours
not to reject  by accident a white movep otentially a weekw  ere available for solving Go-Moku.
playing an importantp art in his defense. Therefore,
|     |     |     | First,  the non-restricted  | variant of Go-Mokwu as |     |
| --- | --- | --- | --------------------------- | ---------------------- | --- |
we have created a moduled educting from a winning
examined,i n whicha n overline is a winningp attern.
threat sequence the white movesw ith any defensive
Thec alculations also served as a testing groundf or
| value.  These are  | (1)  all  | moves in  the  winning |     |     |     |
| ------------------ | --------- | ---------------------- | --- | --- | --- |
the program, and indeed a few programminge rrors
| sequence itself,  | (2) all  movesc onnected to white |     |     |     |     |
| ----------------- | --------------------------------- | --- | --- | --- | --- |
were discovereda nd repaired.
| stones on the board, and (3) all  |     | movesw  hich come |                  |                  |                  |
| --------------------------------- | --- | ----------------- | ---------------- | ---------------- | ---------------- |
|                                   |     |                   | Second, variant  | B (cf.  section  | 2) was examined. |
connectedt o the cost squares in the winningt hreat
Againa  testing period was necessary to investigate
| sequence.  | The module generally  | reduces  the |     |     |     |
| ---------- | --------------------- | ------------ | --- | --- | --- |
the effects of overlines in the evaluation function
| numbero f potential  | white movesf rom over 200 to |     |     |     |     |
| -------------------- | ---------------------------- | --- | --- | --- | --- |
between1 0 and 50. Each of the remaining movesi s and in the white-moves election module.
Bothv ariants have been solved: in each case a win-
| investigated on the fact whetherit   |     | really refutes the |     |     |     |
| ------------------------------------ | --- | ------------------ | --- | --- | --- |
winning sequence (by executing the move, and then ning tree for Black has been found and stored in a
performing a threat-space search).  WhenB lack has database. Table 5 showst he statistics  of both solv-
more than  one possible  winning sequence,  the ing procedures.I nspection of the solution tree took
numbero f defensive  white movesu sually  lowers approximately 1 CPUd ay per variant  of Go-Moku.
further. A position in whicha ll defensive movesa re The optimal line starts  with a human-understandable
thus eliminatedi s a win for Black. If not all defen- opening (11 plies).  In the middle game, Black and
sive movesa re eliminated the search is developed Whitea lternatively create threats,  with Black suc-
for each defensive white move. cessfully increasing his threat potential. After 35
plies it is all over.
The moduled escribed above solves to a large extent
the problemo f the huge branching factor.  Weh ave non-~stricted variantB
| found that only after the first  |                            | two black moves,a nd |                   |                           |                |
| -------------------------------- | -------------------------- | -------------------- | ----------------- | ------------------------- | -------------- |
|                                  |                            |                      | CPUti me          | 1.1m  illionse conds1.3m  | illionse conds |
| in somev ariations after         | the third and fourth black |                      |                   |                           |                |
|                                  |                            |                      | pos.i nvestigated | 5.3m  illion              | 6.3m  illion   |
move,B  lack does not threaten to win after  a white
|     |     |     | solution-trseiez e | 138,790 | 153,284 |
| --- | --- | --- | ------------------ | ------- | ------- |
null move. In these cases all  200+m  ovesm  ust be solution-tredee pth 35 35
examined. By doing so we have solved the gameo f
Go-Mok(use e section 7). Table 5: Statistics  on solving Go-Moku.
| 7. Results |     |     | As is  well-known, the Computer Olympiads( Levy |     |     |
| ---------- | --- | --- | ----------------------------------------------- | --- | --- |
Althoughw  e have described above howt he size of and Beal, 1989, 1991; Van den Herik and Allis,
Go-Moku’gs amet ree  can be reduced considerably, 1992) provide an excellent  test  bed for  game-
still  a tree of several millionso f positionsr emainsto  playing programs. At the  fourth  Computer Olym-
be searched. To accomplisht his  feat,  a numbero f piad (London, 4-11 August1 992), Victoria entered
practical  problemsm  ust be overcome: the Go-Moktuo urnament, where the competition is
playeda ccordingt o the rules of variant B.
| 1. the tree mustb e split  | in a few hundreds ubtrees. |     |                                       |     |                |
| -------------------------- | -------------------------- | --- | ------------------------------------- | --- | -------------- |
|                            |                            |     | Whenp laying Black, Victoria wona ll  |     | its  games.I t |
2. the results of each calculation (the solution of
started  playing from the database and wheno ut of
subtree) has to be stored in a database;
moves,i t  founda  winningt hreat sequenceu sing the
3. the results  of all  calculations must be merged threat-space search module.V  ictoria also wonh alf
into a final tree, containingth e solution;
|                                                        |     |     | of its  gamesp laying White. This result  |     | sufficed to |
| ------------------------------------------------------ | --- | --- | ----------------------------------------- | --- | ----------- |
| 4. the solution in the final tree mustb e inspectedo n |     |     | win the gold medal.                       |     |             |
consistency and completeness.
Wer emark that inspection of the solution as men-
tioned under 4 serves two goals: (1) determiningt he
correctness of the white-moves election module( cf.

-9-
From: AAAI Technical Report FS-93-02. Compilation copyright © 1993, AAAI (www.aaai.org). All rights reserved.
8. Conclusions version  from 1946. Second edition  1978. Mouton
Publishers, The Hague.
Threat-space search has been developed to model
the way humane xpert Go-Mokup layers  f’md win- Herik,  H.J.  van den (1983).  Computerschaak,
ning threat sequences.E arlier, in a modestv ersion,
|     |     |     |     |     | Schaakwerelde n Kunstmatigel ntelligentie.  |     |     |     |     | Ph.D. |
| --- | --- | --- | --- | --- | ------------------------------------------- | --- | --- | --- | --- | ----- |
it  has been successfully applied to Qubic( Alli.~ and thesis,  AcademicS ervice,  The Hague, The Nether-
| Schoo, 1992). Threat-space search finds deep win- |     |     |     |     | lands. |     |     |     |     |     |
| ------------------------------------------------- | --- | --- | --- | --- | ------ | --- | --- | --- | --- | --- |
ning lines of play based on threats in averagely 0.1
Herik, H.J. van den (1990). Synthesis of Reliable
| CPUs econds. The price paid for this               |     |     |                | success is |                        |                                  |                        |     |     |     |
| -------------------------------------------------- | --- | --- | -------------- | ---------- | ---------------------- | -------------------------------- | ---------------------- | --- | --- | --- |
|                                                    |     |     |                |            | Plans from Low-OrderK  |                                  | nowledge. Description  |     |     | of  |
| small: in somec ases wherea  winningl ine exists,  |     |     |                | it         |                        |                                  |                        |     |     |     |
|                                                    |     |     |                |            | SIONp roject           | no. 612-332-021, The Netherlands |                        |     |     |     |
| is  not found. To overcome this                    |     |     | problem proof- |            |                        |                                  |                        |     |     |     |
Organizationf or Scientific Research.
| numbers earch is  |     | evoked. Threat-space search and |     |     |     |     |     |     |     |     |
| ----------------- | --- | ------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
proof-numbers earch are applicable to other games Herik, H.J. van den, and Allis, L.V. (eds.) (1992).
|     |     |     |     |     | Heuristic Programmining  Artificial  |     |     |     | Intelligence 3: |     |
| --- | --- | --- | --- | --- | ------------------------------------ | --- | --- | --- | --------------- | --- |
as well as to the area of theorem proving. Imple-
|                                             |     |     |     |      | the third  | computer olympiad. Ellis  |     |     | HorwoodL td., |     |
| ------------------------------------------- | --- | --- | --- | ---- | ---------- | ------------------------- | --- | --- | ------------- | --- |
| mented in the tournament program Victoria,  |     |     |     | they |            |                           |     |     |               |     |
Chichester, England.
solved the gameo f Go-MokuV: ictoria always wins,
whenp laying Black. Knuth, D.E. and Moore, R.W. (1975). An Analysis
|                     |     |              |                  |     | of Alpha-BetaP runing. Artificial  |                  |                          | Intelligence, Vol. |     |     |
| ------------------- | --- | ------------ | ---------------- | --- | ---------------------------------- | ---------------- | ------------------------ | ------------------ | --- | --- |
| Acknowledgements    |     |              |                  |     | 6, No. 4, pp. 293-326.             |                  |                          |                    |     |     |
|                     |     |              |                  |     | Kopec, D. and Bratko, I.           |                  | (1982). The Bratko-Kopec |                    |     |     |
|                     |     |              |                  |     | Experiment"                        | A Comparison of  |                          | Humana nd Com-     |     |     |
| The investigations  |     | were partly  | supported by the |     |                                    |                  |                          |                    |     |     |
puter Performancei n Chess. Advancesi n Computer
| Foundation for  |     | ComputerS cience Research in The |     |     |     |     |     |     |     |     |
| --------------- | --- | -------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
Netherlands (SION) with f’mancial  support from Chess 3 (ed.  M.R.B.C  larke),  pp. 57-72. Pergamon
| The Netherlands  |     | Organization  | for  | Scientific | Press, Oxford, England. |     |     |     |     |     |
| ---------------- | --- | ------------- | ---- | ---------- | ----------------------- | --- | --- | --- | --- | --- |
Research (NWO),f ile  number 612-332-021.  The Levinson, R.A., Beach, R., Snyder, R., Dayan, T.,
research has been performed in the  frameworko f and Sohn, K. (1992).  Adaptive-Predictive  Game-
the SYRINpXr oject (  SYnthesiso f Reliable Infor- Playing Programs. Journal of  Experimental and
mation using kNowledgeo f eXperts), a part of  TheoreticalA rtificial  Intelligence, Vol. 4, pp. 315-
| joint  research effort  |     | of IBMa nd the University of |     |     |     |     |     |     |     |     |
| ----------------------- | --- | ---------------------------- | --- | --- | --- | --- | --- | --- | --- | --- |
337.
Limburg( project  code 561553). Finally,  we would Levy, D.N.L., and Beat, D.F. (1989).  Heuristic
like  to thank Loek Schoeumakefro r constructing
|     |     |     |     |     | Programminign  Artificial  |     | Intelligence:  |     | the first |     |
| --- | --- | --- | --- | --- | -------------------------- | --- | -------------- | --- | --------- | --- |
the X-interface for the tournamentv ersion of Vic-
|        |     |     |     |     | computer olympiad. Ellis  |     | HorwoodL td.,  |     | Chiches-  |     |
| ------ | --- | --- | --- | --- | ------------------------- | --- | -------------- | --- | --------- | --- |
| toria. |     |     |     |     | ter,  England.            |     |                |     |           |     |
|        |     |     |     |     | Levy, D.N.L., and Beat,   |     | D.F. (1991).   |     | Heuristic |     |
References
|                                            |     |                  |     |               | Programmiinng  Artificial  |     | Intelligence 2: the second |     |          |     |
| ------------------------------------------ | --- | ---------------- | --- | ------------- | -------------------------- | --- | -------------------------- | --- | -------- | --- |
|                                            |     |                  |     |               | computer olympiad. Ellis   |     | HorwoodL td.,              |     | Chiches- |     |
| Allis,  L.V. (1994). Gamesa nd Artificial  |     |                  |     | Intelli-      | ter, England.              |     |                            |     |          |     |
| gence. Ph.D. thesis                        |     | in preparation,  |     | Departmento f |                            |     |                            |     |          |     |
Newell, A., and Simon, H.A. (1972). HumanP rob-
ComputerS cience,  University  of Limburg, Maas- lem Solving. Prentice-Hall, Inc., EnglewooCd liffs,
tricht,  The Netherlands.
NewJ ersey.
Allis,  L.V., Meulen,M  v an der, and Herik, H.J. van Nilsson,N  .J. (1980).P  rincipleso f Artificial Intelli-
| den (1994).  | Proof-NumberS earch,  |     |     | accepted for |     |     |     |     |     |     |
| ------------ | --------------------- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |
gence. Tioga Publishing CompanyP, alo Alto, Ca.
| publication in Artificial  |     | Intelligence.  |     | Also pub- |     |     |     |     |     |     |
| -------------------------- | --- | -------------- | --- | --------- | --- | --- | --- | --- | --- | --- |
lished in a provisional version as ReportC  S9 1-01, Sakata, G. and Ikawa, W. (1981). Five-In-A-Row.
Renju. The Ishi Press, Inc., Tokyo,J apan.
| Department of Computer Science,  |     |     | University  | of  |     |     |     |     |     |     |
| -------------------------------- | --- | --- | ----------- | --- | --- | --- | --- | --- | --- | --- |
Limburg,M  aastricht, The Netherlands. Uiterwijk,  J.W.H.M.( 1992a). Go-Mokust ill  far
from Optimality. Heuristic Programminign  Artifi-
| Allis,  L.V. and Schoo, P.N.A. (1992).  |     |     |     | Qubic |                    |               |     |                   |     |     |
| --------------------------------------- | --- | --- | --- | ----- | ------------------ | ------------- | --- | ----------------- | --- | --- |
|                                         |     |     |     |       | cial Intelligence  | 3: the third  |     | computer olympiad |     |     |
Solved Again. Heuristic Programminign  Artificial
httelligence  3: the third computero lympiad( eds. (eds. H.J. van den Herik and L.V. Allis),  pp. 47-50.
Ellis  HorwooLd td, Chichester, England.
| H.J. van den Herik and L.V. Allis),  |     |     |     | pp. 192-204. |     |     |     |     |     |     |
| ------------------------------------ | --- | --- | --- | ------------ | --- | --- | --- | --- | --- | --- |
Ellis  HorwooLd td., Chichester, England. Uiterwijk, J.W.H.M.( 1992b). Knowledgaen d Stra-
|     |     |     |     |     | tegies  in  | Go-Moku.H euristic  |     | Progranvning in |     |     |
| --- | --- | --- | --- | --- | ----------- | ------------------- | --- | --------------- | --- | --- |
Beal, D.F. (1989). Experimentsw ith the Null Move.
|                                    |     |     |                 |     | Artificial                                      | Intelligence 3: the third computero lym- |     |     |     |     |
| ---------------------------------- | --- | --- | --------------- | --- | ----------------------------------------------- | ---------------------------------------- | --- | --- | --- | --- |
| Advancesi n ComputerC hess 5 (ed.  |     |     | D.F. Beal), pp. |     |                                                 |                                          |     |     |     |     |
|                                    |     |     |                 |     | piad (eds. H.J. van den Herik and L.V. Allis),  |                                          |     |     |     | pp. |
65-79. Elsevier Science Publishers B.V., Amster-
|     |     |     |     |     | 165-179. Ellis  | HorwooLd td, Chichester, England. |     |     |     |     |
| --- | --- | --- | --- | --- | --------------- | --------------------------------- | --- | --- | --- | --- |
dam, The Netherlands.
|                          |     |                       |     |     | Uilerwijk,  | J.W.H.M.( 1992c). Personal Communi- |     |     |     |     |
| ------------------------ | --- | --------------------- | --- | --- | ----------- | ----------------------------------- | --- | --- | --- | --- |
| Groot,  A.D. de (1965).  |     | Thought and Choice in |     |     |             |                                     |     |     |     |     |
cation.
| Chess (ed.  | G.W.B aylor) Translated from the Dutch |     |     |     |     |     |     |     |     |     |
| ----------- | -------------------------------------- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
9