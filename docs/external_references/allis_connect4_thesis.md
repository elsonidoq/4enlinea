|     | A Knowledge-based |     | Approach | of  |
| --- | ----------------- | --- | -------- | --- |
Connect-Four
|     |            | The GameisSolved:         | White Wins    |         |
| --- | ---------- | ------------------------- | ------------- | ------- |
|     |            | Victor                    | Allis         |         |
|     | Department | ofMathematics             | andComputer   | Science |
|     |            | Vrije Universiteit        |               |         |
|     |            | Amsterdam, TheNetherlands |               |         |
|     |            | Masters Thesis,           | October 1988† |         |
ABSTRACT
A Shannon C-type strategy program, VICTOR, is written for Connect-Four,
based on nine strategic rules. Each of these rules is proven to be correct, implying
| thatconclusions | made byVICTOR | are correct. |     |     |
| --------------- | ------------- | ------------ | --- | --- |
Using VICTOR, strategic rules where found which can be used by Black to at
×
least draw the game, on each 7 (2n) board, provided that White does not start at
asonany6×(2n)board.
| themiddle column, | aswell |     |     |     |
| ----------------- | ------ | --- | --- | --- |
In combination with conspiracy-number search, search tables and depth-first
×
search, VICTOR was able to show that White can win on the standard 7 6 board.
Using a database of approximately half a million positions, VICTOR can play real
opponentsonthe7×6board,always
| time against |     |     | winningwithWhite. |     |
| ------------ | --- | --- | ----------------- | --- |
(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)(cid:0)
†Publishedin1988asReportIR-163bytheFacultyofMathematicsandComputerScienceattheVrijeUniversiteitAmsterdam,
TheNetherlands.Alsopublishedin1992asReportCS92-04bytheFacultyofGeneralSciencesattheUniversityofLimburg,
Maastricht,TheNetherlands.

Contents
| Introduction                 |             |                          |                       |            | 5   |
| ---------------------------- | ----------- | ------------------------ | --------------------- | ---------- | --- |
| 1. Introduction              |             | intoConnect-Four         |                       |            | 7   |
| 1.1.TheRules                 |             | oftheGame                |                       |            | 7   |
| 1.2.Nomenclature             |             |                          |                       |            | 8   |
| 2. DifferentApproaches       |             |                          |                       |            | 10  |
| 2.1.Complexity               |             | oftheGame                |                       |            | 10  |
| 2.2.Knowledge-Based          |             |                          | Approach              |            | 12  |
| 2.3.Correctness              |             | ofStrategic              |                       | Rules      | 14  |
| 3. Some                      | Strategic   |                          | Rules forConnect-Four |            | 16  |
| 3.1.Useless                  |             | Threats                  |                       |            | 16  |
| 3.2.Another                  |             | Useless                  | Threat                |            | 18  |
| 3.3.OddandEvenThreats        |             |                          |                       |            | 19  |
| 3.4.Tactics                  |             |                          |                       |            | 21  |
| 4. Control                   | ofZugzwang  |                          |                       |            | 25  |
| 4.1.DefinitionofControl      |             |                          |                       | ofZugzwang | 25  |
| 4.2.ControlinInitialPosition |             |                          |                       |            | 26  |
| 4.3.ControlforWhite          |             |                          |                       |            | 27  |
| 4.4.Some                     |             | Special                  | ControlPositions      |            | 28  |
| 4.5.Benefits                 |             | ofControllingtheZugzwang |                       |            | 30  |
| 5. More                      | Strategic   |                          | Rules                 |            | 32  |
| 5.1.Baseinverse              |             |                          |                       |            | 32  |
| 5.2.Claimeven                |             |                          |                       |            | 33  |
| 5.3.Combination              |             |                          | ofRules               |            | 33  |
| 5.4.General                  |             | Usage                    | ofRules               |            | 34  |
| 6. Formal                    | Definitions |                          | ofRules               |            | 36  |
| 6.1.Claimeven                |             |                          |                       |            | 36  |
| 6.2.Baseinverse              |             |                          |                       |            | 37  |
| 6.3.Vertical                 |             |                          |                       |            | 38  |

| 6.4.Aftereven             |                      |              |          | 39  |
| ------------------------- | -------------------- | ------------ | -------- | --- |
| 6.5.Lowinverse            |                      |              |          | 40  |
| 6.6.Highinverse           |                      |              |          | 41  |
| 6.7.Baseclaim             |                      |              |          | 42  |
| 6.8.Before                |                      |              |          | 43  |
| 6.9.Specialbefore         |                      |              |          | 45  |
| 6.10.Creation             | ofStrategic          | Rules        |          | 46  |
| 7. Interaction            | ofStrategic          | Rules        |          | 47  |
| 7.1.Dependence            | ofZugzwang           |              |          | 47  |
| 7.2.Zugzwang-Independent  |                      | Rules        |          | 49  |
| 7.3.Combinations          | ofZugzwang-Dependent |              | Rules    | 49  |
| 7.4.Collection            | ofPossible           | Combinations |          | 50  |
| 8. Howtoapplythe          | Strategic            | Rules        |          | 51  |
| 8.1.Strategic             | Rules forBlack       |              |          | 51  |
| 8.2.Strategic             | Rules forWhite       |              |          | 51  |
| 8.3.AnExample             | Threat               | Combination  | forWhite | 53  |
| 8.4.Threat                | Combinations         | inGeneral    |          | 55  |
| 9. Implementation         |                      |              |          | 58  |
| 9.1.Purpose               | ofVICTOR             |              |          | 58  |
| 9.2.Evaluation            | ofaPosition          |              |          | 58  |
| 9.3.BottleneckofAlgorithm |                      |              |          | 59  |
| 9.4.Some                  | Data ontheProgram    |              |          | 60  |
| 10. First                 | Results              |              |          | 61  |
| 10.1.Small                | Boards               |              |          | 61  |
| 10.2.The7x4Board          |                      |              |          | 62  |
| 10.3.TheStandard          | 7x6Board             |              |          | 62  |
| 11. Automated             | Analysis             |              |          | 63  |
| 11.1.TheOracle            |                      |              |          | 63  |
| 11.2.Conspiracy-Number    |                      | Search       |          | 64  |

| 11.3.HowtouseConspiracy-Number |     |                     |     |          | Search | 65  |
| ------------------------------ | --- | ------------------- | --- | -------- | ------ | --- |
| 11.4.Performance               |     | ofConspiracy-Number |     |          | Search | 65  |
| 11.5.Conspiracy                |     | Numbers             |     | asOracle |        | 67  |
| 11.6.Three-Level               |     | Search              |     |          |        | 67  |
12. Implementation ofConspiracy-Number Search andSearch Tables 68
| 12.1.Search         |     | Tree inMemory |     | duringSearch |     | 68  |
| ------------------- | --- | ------------- | --- | ------------ | --- | --- |
| 12.2.Transpositions |     |               |     |              |     | 68  |
12.3.Combination ofConspiracy-Number Search andDepth-First Search 69
| 12.4.Search                |             | Tables          |            |          |     | 69  |
| -------------------------- | ----------- | --------------- | ---------- | -------- | --- | --- |
| 12.5.Generalised           |             | Positions       |            |          |     | 70  |
| 12.6.Symmetry              |             |                 |            |          |     | 72  |
| 13. Results                | forthe      | Standard        |            | 7x6Board |     | 74  |
| 13.1.InitialMoves          |             |                 |            |          |     | 74  |
| 13.2.1.d1,d2               |             |                 |            |          |     | 74  |
| 13.3.1.d1,c1               |             |                 |            |          |     | 76  |
| 13.4.1.d1,b1               |             |                 |            |          |     | 78  |
| 13.5.1.d1,a1               |             |                 |            |          |     | 79  |
| 13.6.Evaluation            |             | ofResult        |            |          |     | 80  |
| 14. Conclusions            |             |                 |            |          |     | 81  |
| 14.1.Evaluation            |             | oftheProject    |            |          |     | 81  |
| 14.2.Results               |             | ofShannonC-type |            | strategy |     | 81  |
| 14.3.UsingtheResults       |             |                 | forPlaying |          |     | 82  |
| 15. Future                 | Development |                 |            |          |     | 83  |
| 15.1.Suggestionsforfurther |             |                 |            | Research |     | 83  |
| 15.2.Future                |             | Development     |            |          |     | 83  |
| 15.3.Results               |             | Confirmed       |            |          |     | 83  |
| References                 |             |                 |            |          |     | 84  |
| Appendix                   | A           |                 |            |          |     | 85  |
| Appendix                   | B           |                 |            |          |     | 88  |
| Appendix                   | C           |                 |            |          |     | 91  |

Introduction
One of the first domains in Artificial Intelligence (AI) research, has been computer chess. This
is not surprising, if we consider the possibilities people thought computers would have in the near
future. Usingthese possibilities,people thoughtitwouldbepossible tolet the computer perform tasks
forwhichhumansneed intelligence,whatever thatmaybe.
Chess has several features, which makes it a interesting subject for computer programming, in
thecontext oflettingthecomputer perform tasks forwhich intelligenceisneeded.
- chess isdefined byaset ofstrict rules.
- matches can beorganised between computer programs andhumanstomeasure performance.
- manypeople (especially amongcomputer scientists andthelike) playchess.
- the complexity of the game is large enough to be unable to make an exhaustive analysis of the
whole game, usingbruteforce only.
During the years, a large amount of work has been done in the area of computer chess. Some of
the results are specific for chess, others have a wider impact. Especially the different search tech-
niquesingame trees are usedinmanyotherareas ofComputer Science ingeneral andArtificial Intel-
ligence inparticular.
Another result of the last decades of research in the area of computer chess has been the obser-
vation that it is very hard to develop programs which play chess in a way which is more or less simi-
lar to the way humans play chess. For an excellent description of the state of the art of computer
chess, werefer to[1]and[2].
Programs which play chess in a way similar to chess masters, are called Shannon type C pro-
grams [3]. At this time, no strong Shannon type-C chess programs exist. Earlier attempts have failed
for reasons which are mostly due to the difficulty to describe the way human chess masters play
chess. The only promising results have been in subfields of chess, such as how to solve a mate-in-n
chess problem (even with retrograde analysis) and how to find an adequate plan in complex tactical
mid-game positions. Anexample ofthisistheprogram Paradise [4].
The fact that the Shannon-C strategy has not lead to good results in the computer chess area
made many people (especially chess masters) believe that it will never be possible to develop a pro-
gram thatplayschess atthelevel oftheWorld Champion. The main argument used bythese people is
the impossibility to implement intuition, which is considered to be necessary to play chess at grand
master level.
We believe that, althoughitseems tobeveryhard todevelop programs that play chess usingthe
Shannon-C strategy, it is not at all impossible. We therefore want to show that it is possible to
develop a program using this strategy. Furthermore, we would like to show that such a program can
play at World Champions level, or even better. That would show that, how difficult it may be, good
results can be achieved. It would, of course, be an impossible job to try to do this for chess now,
where so many attempts have failed in the past. The best way to choose the subject is to take a game
whichislesscomplex thanchess, butmore complex thancan bedealt withusingbrute force only.
Connect-Fourhasbeen chosen asagame whichmeets these restrictions.
A disadvantage of chosing Connect-Four as subject is the fact that, although many people know
therules ofthegame, mostofthem knowlittleaboutthewaythe game shouldbeplayed.
This gap of knowledge is tried to be filled in. Another aspect of the choice of Connect-Four, is the
fact that we do not know of any research done on the subject. Although some programs exist which

play by using simple alfa-beta algorithms, we do not know of research where knowledge about the
game isused. Therefore nowhere inthistext isreferred tootherarticles aboutConnect-Four.
Chapters 1, 2, 3 and 4 are written in a way, which expects no knowledge about the game.
Chapter 1explains the rules of the game and nomenclature usedthroughoutthis text. Chapter 2com-
pares the different possible approaches to find the game-theoretical value of Connect-Four. Chapters
3and4describe essential observations needed toplayConnect-Fouratanacceptablelevel.
Chapter 5 and 6 describe the set of strategic rules which are implemented in the program. This
set of rules is the knowledge which is given to the program. In chapter 5 it is also described how to
use this knowledge to find the move which should be played in a given position. Chapter 7 describes
the way the strategic rules interact. Chapter 8 discusses the situations in which the strategic rules can
be used to find the game-theoretical value of a position. Chapter 9 describes the program developed
usingtheknowledgeofchapters 6,7and8.
Chapter 10discusses the results foundusingthe program ofchapter 9, for several board sizes. It
willbeshownthat the described knowledgeisstrongenoughtofindthegame-theoretical value forall
initial situations on boards smaller than 7 x 6. It will also be made clear, that for the 7 x 6 board the
knowledge is not strong enough. Therefore search techniques are used to replace the gap of
knowledge. Chapter 11 describes the used search techniques, while chapter 12 describes the imple-
mentation of these. Chapter 13 describes the result of the search, as well as some of the variants
which were hard to solve. Chapter 14 evaluates the whole project. Chapter 15 describes conclusions
andtopics forfurther research.
Acknowledgements
Iwouldliketothankseveral people withoutwhomthisproject wouldnothavesucceeded:
Prof.Dr. H.J. van den Herik, my thesis supervisor, a specialist in the research field of computer
chess, forthestimulating wayhecriticallyfollowed andcorrected theproject.
I gratefully recognise that Prof.Dr. van de Riet and Prof.Dr. Siklóssy jointly brought me into
contact withProf.Dr vandenHerik.
Ir. Matty Huntjens for operating the 2 Sun-4’s at times I was unable to operate them myself, as
well as for being optimistic about the eventual result, which helped me through times where difficult
variants seemed tonever end.
Maarten Litmaath for writing a part of the interface which made it possible to collect the results
ofthegames played against theprogram.
Drs.Aart Middeldorp forreading several preliminary versionsofthistext.
Drs. Petra Allis-Meinsma for her support and encouragement during the long time I have spent
ontheproject.
Dr.J.W.H.M. Uiterwijk forcarefully reading andcorrecting apreliminary version ofthetext.
RuudWiggers for the way he solved all hardware problems Icaused. Ruudis a system adminis-
trator whoeventakes thetime tohelpyouafter midnight!

|     | 1.  | Introduction | into Connect-Four |     |     |
| --- | --- | ------------ | ----------------- | --- | --- |
In this introduction the rules of the game Connect-Four are described, as well as some nomen-
clature usedthroughoutthistext.
| §1.1.The Rules | ofthe Game |     |     |     |     |
| -------------- | ---------- | --- | --- | --- | --- |
Connect-Four is a game for two persons. Both players have 21 identical men. In the standard
form of the game, one set of men is yellow and the other set is red. The game is played on a vertical,
rectangular board consisting of 7 vertical columns of 6 squares each. If a man is put in one of the
columns, it will fall down to the lowest unoccupied square in the column. As soon as a column con-
tains 6 men, no other man can be put in the column. Putting a man in one of the columns is called: a
move.
The players make their moves in turn. There are no rules stating that the player with, for
instance, the yellow men should start. Since it is confusing to have to identify for each new game the
colourthatstarted thegame, we willassume that the sets ofmen are coloured white and black instead
of yellow and red. Like chess and checkers (and unlike go) it is assumed that the player playing the
| white menwillmake | thefirstmove. |     |     |     |     |
| ----------------- | ------------- | --- | --- | --- | --- |
Both players will try to get four connected men, either horizontally, vertically or diagonally.
The firstplayer whoachieves onesuchgroupoffourconnectedmen,winsthegame. Ifall42menare
| played andnoplayer | hasachieved | thisgoal,thegame | isdrawn. |     |     |
| ------------------ | ----------- | ---------------- | -------- | --- | --- |
Diagrams 1.1,1.2and1.3showpositionsinwhichWhite haswonthegame:
●
|     |     |     | ●   | White has | won |
| --- | --- | --- | --- | --------- | --- |
●
|     |     | Diagram | 1.1. |     |     |
| --- | --- | ------- | ---- | --- | --- |
●
●
|     |     |     | ●   | White has | won |
| --- | --- | --- | --- | --------- | --- |
●
|     |     | Diagram | 1.2. |     |     |
| --- | --- | ------- | ---- | --- | --- |

●
●
|     |     |     | ● ● | White has | won |
| --- | --- | --- | --- | --------- | --- |
●●●
Diagram 1.3.
In the position of diagram 1.1, White has made a horizontal winning group, while his winning
| groupswere | resp. vertical | anddiagonalinthe            | othertwodiagrams. |     |     |
| ---------- | -------------- | --------------------------- | ----------------- | --- | --- |
| Apossible  | drawn          | positionisshowninthediagram | 1.4:              |     |     |
●
●●● ●●●
●
●●● ●●●
|     |     |     | ●   | Draw |     |
| --- | --- | --- | --- | ---- | --- |
●●● ●●●
Diagram 1.4.
§1.2.Nomenclature
In order to be able to talk about a position, it is useful to give each square a name. We have
chosen to use a nomenclature as used by chess players. The 7 columns are labeled ’a’ through ’g’,
while the rows are numbered 1 through 6. In this way the lowest square in the middle column is
called d1. Unlike the chess nomenclatures, we talk about the a-column, b-column etc, instead of the
a-file, b-file etc. Using the word file in a computer science environment would be confusing. There-
| foreweprefer | thewordcolumn. |     |     |     |     |
| ------------ | -------------- | --- | --- | --- | --- |
Itisnowpossible tomake a list of the moves made during a game. For the game of diagram 1.1
| thiscouldhave | been: |     |     |     |     |
| ------------- | ----- | --- | --- | --- | --- |
1.d1,d2
2.c1,d3
3.e1,b1
| 4.f1,White | wins. |     |     |     |     |
| ---------- | ----- | --- | --- | --- | --- |
It is also easy to use the names of the squares to show where the winning group was created. In
diagram 1.1 the winning group was on squares c1, d1, e1 and f1. Since the squares must lie on a
straight line, it is enough to specify the two endpoints of the group. In this case the group can be

identified with c1-f1. In general the notation <square1>-<square2> will be used to identify all
| squares onthelinewithsquare1 | andsquare2 | asendpoints. |
| ---------------------------- | ---------- | ------------ |

2. Different Approaches
In this chapter we show why a brute-force approach will not be successful at this time. More-
over, we show that in certain positions a few strategic rules are strong enough to show that a player
can atleast draw thegame.
§2.1.Complexity ofthe Game
In order to get an idea about the complexity of the game an estimate is presented of the number
of different positions which can be achieved, if the game is played according to the rules. A position
which can occur during a game is called a legal position, while a position which cannot be achieved
iscalled illegal.
Each square can be in one of three states: empty, white or black. Therefore it is easy to see that
the number of possible positions is at most 342 (≥ 1020). This upper bound is a very crude one, and
can bebroughtintobetter proportions.
If the total number of occupied squares in a given position is odd, the number of white men is
one more than the number of black men. If the total of occupied squares is even, these numbers are
equal. Furthermore, ifacolumncontains anemptysquare, all squares higher than this square are also
empty. If a position contains four connected men, the position concludes a game. Since the last
move ended the game, at least one of the four squares in the connected group must be the highest
filled square in its column. If this is not the case, or both players have connected four men, the posi-
tion is illegal. If one player has more than one connected group this position can only be legal if
these groups share a square which contains the last man played. In the calculations we are going to
make, we do not rule out positions in which are illegal for the reason mentioned above. We also do
not rule out positions which are not legal, because they cannot be achieved, during normal play.
Diagram 2.1showssuchaposition.
●
●
Illegal position
●
Diagram 2.1.
Although the position looks perfectly normal, it is clear that Black has made the first move.
Therefore itisnotlegal.
We have calculated the number of different positions, including all illegal positions which con-
tain too many connected groups of four men, and illegal positions as shown in diagram 2.1. For this
purpose a program was written in the C programming language, which can be found in appendix A.
Forthestandard, 7x6board,theprogram foundanupperboundof7.1*1013.

Todetermine theamountofmemory needed toconstruct adatabase forConnect-Fourthis upper
bound is useful. In order to show that such a construction takes too much memory, we need a lower
bound instead of an upper bound. If we want to find a (good) lower bound of the number of possible
positions, we have to make sure that each position we count is legal. Therefore all positions which
cannot be achieved during normal play, e.g. diagram 2.1, should be ruled out. We will show that this
isnota trivial task. For this reason we have notdetermined alower bound.Diagram 2.2illustratesthe
| difficultiesweare | facedwithindetermining | ifapositionislegal. |     |     |     |
| ----------------- | ---------------------- | ------------------- | --- | --- | --- |
●
|     |     | ●       | ●    |         |          |
| --- | --- | ------- | ---- | ------- | -------- |
|     |     | ● ●     | ● ●  |         |          |
|     |     | ● ●●●   | ●    |         |          |
|     |     | ● ●     | ●    | Illegal | position |
|     |     | ●●●     | ●●●  |         |          |
|     |     | Diagram | 2.2. |         |          |
The position of diagram 2.2 is a draw. Although at first sight it might look like a normal posi-
tion, it cannot be achieved during normal play. This can be seen as follows: the first move White
made must have been d1. If Black played as his first move one of b1, d2 and f1, there is no possible
second move for White. Therefore Blacks second move was one of a1, c1, e1and g1.SupposeBlack
played a1,White thenmusthave played a2assecondmove, givingthepositionofdiagram 2.3:
|     |     |     |     | Black | to move |
| --- | --- | --- | --- | ----- | ------- |
●
|     |     | Diagram | 2.3. |     |     |
| --- | --- | ------- | ---- | --- | --- |
NowBlack stillcannothave played b1, d2 or f1, for the same reason as before. The move ona3
is not possible either. Therefore Black must have played one of the remaining c1, e1 or g1. After one
of these, and after White’s answer to it, the position did not get any better. The farthest we can get
| withthisgame | isshownindiagram | 2.4. |     |     |     |
| ------------ | ---------------- | ---- | --- | --- | --- |

Black to move
|     |     |     | ●       | ●   | ● ●  |
| --- | --- | --- | ------- | --- | ---- |
|     |     |     | Diagram |     | 2.4. |
In this position Black has to move. For all seven columns, the lower two squares should be
filled by black men. Therefore after the next move of Black there is no move White can make which
willeventually result inthepositionshownindiagram 2.2.Therefore that positionisillegal.
This diagram shows that it can be rather difficult to detect if a position is illegal. It is equally
difficult to show which of the positions counted by the program of Appendix A, are not legal because
more than one group of four connected men is present. We therefore assume that a database should
contain a large number of illegal positions. We believe that in that case the order of magnitude of the
upper bound presented before, is a good estimate for the magnitude of the database. This number is
by far too big, to think seriously about making a database for Connect-Four. To see this, we have to
consider the number of positions which must be stored at the same time, when we build the database.
When a retrograde analysis is applied, as has been done for many endgamesinchess [5], we need not
necessarily store the positions consisting of, say, 20 men, as long as we have not yet determined the
value ofall positionsof21men. When we have determined the value ofthese positions,we nolonger
need the positions consisting of 22 men or more. Therefore we only need to be able to store all posi-
tions of nand n+1 men at the same time. For the 7 x6 board, this means that we must be able tohold
. 1013
all positions of 36 and 37 men at the same time, a total of over 1,6 positions. Appendix C con-
tains a table for the number of different positions for each number of men. We can store the value of
a position in 2 bits, since we have 4 possible states: win for White, win for Black, draw or not
checked (we can use the address of the 2 bits as identification for the position). This way we need at
| least 4Terabyte.     | Therefore | makingadatabase |     | doesnotseem | realistic yet. |
| -------------------- | --------- | --------------- | --- | ----------- | -------------- |
| §2.2.Knowledge-Based |           | Approach        |     |             |                |
Although the results of the last section show that an exhaustive brute-force approach of the
problem is too complex, this does not imply anything for a knowledge-based approach. It is possible
thatsomestrategic rules can befoundwhichensure awinforoneofthe players ora draw for both. If
the correctness of these rules can be proven, it is not necessary to evaluate a large number of posi-
| tionstoobtaintheresult |     | ofthegame | ifbothplayers |     | playcorrectly. |
| ---------------------- | --- | --------- | ------------- | --- | -------------- |
As an example of such a set of strategic rules we look at Connect-Four on other board sizes.
Suppose we play on a board of n columns, which are each only 2 squares high. It is easy to see that
| theonlywayonecan |     | connectfourmen,ishorizontally. |       |         |        |
| ---------------- | --- | ------------------------------ | ----- | ------- | ------ |
| Thefollowing     |     | strategy willensure            | Black | atleast | adraw: |

Suppose n is even. Group the columns in pairs, giving pairs of columns 1 & 2, 3 & 4, ...,
(n-1) & n. Each time White plays in one column of a pair of columns, Black plays in the
other column of the pair. For n is odd, groups are made in the same way, leaving the n-th
column as a single column. The same rules apply to this position. Only if White plays in
then-thcolumn, Black playsinthatcolumn, too.
Let us try to see why this simple strategy works. Suppose Black has used this strategy and
White has won the game. In that case White has four men, horizontally connected. We suppose this
has been done onthe first row. A groupin the second row is dealt with in the same way. It is easy to
see that at least two of the four men in the winning group must lie within the same pair of columns.
Since the rules show that as soon as White plays in one column of the pair, Black will take the other
square, it is clear that it is impossible for White to get both lower squares in a pair of columns.
Therefore the assumption that White has won somewhere in the first row is wrong. The same reason-
ing applies to the second row and therefore White cannot have won. This showsthat this simple stra-
tegyensures Black thathewilldraw thegame.
The previous set of strategic rules, shows that it is sometimes possible to find some easy rules
which can be used to play a game in a way which ensures a good result, although there are a large
numberofpossible different positions.
Surprisingly enough, it is also possible to give such a simple set of rules for more interesting
board formats. For all boards which consist of at most 6 columns and 2n rows (an even number of
rows), the following strategy will ensure Black at least a draw. For simplicities sake, the rules are
givenforaboardofexactly 6columns. However, itiseasy tosee thatitworksforlesscolumns, too.
Forcolumns 1,2,5and6thefollowing ruleisused:
(1) Black answers inthiscolumnifandonlyifWhite hasjustplayed inthiscolumn.
Forcolumns 3and4thefollowing ruleisused:
(2) If White plays for the first time in one of these columns, Black answers in the other column.
Otherwise ifBlack stillcan playinthecolumninwhichWhite justplayed, Black doesso,oth-
erwise Black movesintheother column.
First we have to check that Black always can play according to these rules. The rules state that
every time White plays in one of the columns 1, 2, 5 or 6, Black plays in the same column. This will
give Black the squares in the even rows of these columns, and White the squares in the odd rows.
Since thenumberofrowsiseven, Black always can answer aWhite moveinoneofthese columns.
For columns 3 and 4, after the first move of both White and Black, the lowest, odd squares are
occupied, one by Black and one by White. When White moves in one of these columns, he gets an
even square. Black will take the odd square above it if such a square exists. If not, he takes the first
empty square in the other column, which is even, and must exist, since a column cannot be filled up,
ifthelast square played isodd.
What will this strategy give to Black? He gets all even squares in columns 1, 2, 5 and 6. Furth-
ermore he gets one of the lower two squares in the middle columns. And most importantly, he gets at
least oneofthemiddle squares inevery oddrow.Thisfollowsdirectly fromrule(2).
In this way White clearly cannot get four men connected vertically. If he wants to have four
men connected horizontally, he will not get them in an odd row, since Black occupies at least one of

the middle squares. Each horizontal groupof four connected men contains both middle squares. (This
observation is not true for a board of more than 6 columns wide, which limits the power of the proof
tothese small boards.) Itisobviousthat fourhorizontally connectedmen in aneven row is not possi-
ble, either. For a possible diagonal group of four, we first observe that the four men in such a group
liealternately inoddand even squares. This shows that White cannotget adiagonalgroupwhich lies
partly in column 1 and column 2, since in that case both squares in the diagonal group would be odd.
For the same reason it is impossible to have a diagonal group partly in column 5 and column 6. The
only remaining possibility is a group spread over columns 2, 3, 4 and 5. However, White only will
get odd squares in columns 2 and 5, while he also needs an even square in one of those columns to
have adiagonalgroup. Thiscompletes theproofthatWhite cannotwin,givingBlack adraw.
We have shown in this section that it is sometimes possible to give a set of strategic rules with
which one of the players will never lose. This shows that a knowledge-based approach in at least
some cases can give results which cannotbeobtained using brute force only. Therefore it is useful to
investigate thepossibilitiesofthisapproach forthestandard boardof7columns and6rows.
| §2.3.CorrectnessofStrategic |     |     | Rules |     |     |     |     |     |
| --------------------------- | --- | --- | ----- | --- | --- | --- | --- | --- |
Let us consider a set of strategic rules for the well-known game tic-tac-toe, which some players
| mightliketouse.Theruleshave |                 |              | priorityintheorder |                             |     | given: |     |     |
| --------------------------- | --------------- | ------------ | ------------------ | --------------------------- | --- | ------ | --- | --- |
| 1. Ifthere                  | isawinningmove, |              | make               | it.                         |     |        |     |     |
| 2. Iftheopponentcan         |                 | winatasquare |                    | byhisnextmove,playthatmove. |     |        |     |     |
3. Taking thecentral square ismoreimportant thantaking othersquares.
4. Taking corner squares ismoreimportant thantaking squares ontheedges.
These four rules seem all to be very reasonable. Now let us see what happens if we use these
rules to play against a human player, who does not use the rules. The human player starts playing.
| Thewholegame | isshownindiagram |     |     | 2.5: |     |     |     |     |
| ------------ | ---------------- | --- | --- | ---- | --- | --- | --- | --- |
●
|     |     |     |     | ●       |     | ●    |     | ●   |
| --- | --- | --- | --- | ------- | --- | ---- | --- | --- |
|     |     |     | ●   |         | ●   |      | ●   |     |
|     |     |     | ●   |         | ●   |      | ●   |     |
|     |     |     |     |         | ●   |      | ●   |     |
|     |     |     |     | Diagram |     | 2.5. |     |     |
This game shows that the four strategic rules do not always assure that the best result possible
(draw) can bereached,althoughtherules lookperfectly reasonable. Thisexample isdueto[6].
For this reason we must make clear what the differences are between the four strategic rules for

| tic-tac-toe andtherules | usedinthisarticle | concerning | Connect-Four. |
| ----------------------- | ----------------- | ---------- | ------------- |
After the strategic rules in section 2.2 were described, we also showed that there was no way
the opponent could win. That proved that the rules wouldguarantee the player whouses them a draw.
The four rules for tic-tac-toe seem as reasonable as the rules for Connect-Four. Only this time noth-
ing is proved about the result of the game, when the rules are applied. Therefore it should not be
| surprisingthatthere | isawaytowinagainst | someone | usingthese rules. |
| ------------------- | ------------------ | ------- | ----------------- |
This example shows that the formulation of strategic rules is not enough. Each set of rules
should be classified as guaranteeing a certain result (in which case a proof should be supplied) or as
beingmerely aheuristic rule. Adifficulty isthefact thatwe donothave a formal framework (model)
which can be used to describe a proof in. For that reason, proofs will be as given in section 2.2. Still
we claim that these informal proofs are correct, meaning that the results which are promised by the
| rules, can always | beachieved. |     |     |
| ----------------- | ----------- | --- | --- |

|     | 3.  | Some | Strategic | Rules | for Connect-Four |     |     |
| --- | --- | ---- | --------- | ----- | ---------------- | --- | --- |
Mostarticles oncomputer chess assume that readers have some basic knowledgeaboutchess. If
an endgame of King and Queen versus King is considered it is tacitly assumed that the readers know
that it is very easy for the King and Queen to mate the other King. Although many people have seen
a ’Connect-Four’ set before, and a lot of them have played the game sometimes, very few seem to
have encountered at least some of the basic strategics of the game. For this reason in this chapter we
trytofillinthisgapofknowledge.
| §3.1.Useless Threats |                      |     |     |      |     |     |     |
| -------------------- | -------------------- | --- | --- | ---- | --- | --- | --- |
| Let usconsider       | thepositionofdiagram |     |     | 3.1: |     |     |     |
|                      |                      |     | ●   | ●●●  |     |     |     |
●
●
|                   |     |                    | ●   | ●●●     |      | White to | move |
| ----------------- | --- | ------------------ | --- | ------- | ---- | -------- | ---- |
|                   |     |                    | ●   |         | ●    |          |      |
|                   |     |                    |     | Diagram | 3.1. |          |      |
| Thispositionarose |     | after thefollowing |     | moves:  |      |          |      |
1.d1,d2
2.d3,e1
3.d4,e2
4.d5,d6
5.c1,c2
6.c3,a1
7.c4,a2
8.c5,c6
9.e3,a3
10.a4,a5
11.e4,a6
12.e5,e6
Which player will win the game? Let us consider the different possibilities to get a group of
fourconnectedmenforbothplayers.
White can get groups at a4-d4, b2-e5, b3-e3, b4-e4, b5-e5, b6-e3, c5-f2, c3-f3, c4-f4, c5-f5 and
c3-f6, while for all these groups he needs just one more man. Black can get groups at a2-d2, b2-e2,
| c2-f2, a6-d6b6-e6andc6-f6 |     | forwhich | healsoneeds |     | justonemore | man. |     |
| ------------------------- | --- | -------- | ----------- | --- | ----------- | ---- | --- |
First we should note that the possibilities a2-d2 and b2-e2 are not really different possibilities.

For both only the square b2 is needed. This means that both are completed or none is. So after
White’s 7th move, getting the possibility a2-d2 could not be the reason to play a2, since it would add
| nothingtoBlacks | chances towin(there | couldbeotherreasons, | ofcourse). |     |
| --------------- | ------------------- | -------------------- | ---------- | --- |
It is therefore better not to talk about which groups can be completed, but instead talk about the
squares needed to complete one of these groups. In our example White needs one of the squares b2,
b3,b4,b5,b6,f2,f3,f4,f5orf6.Black needs oneofthesquares b2,b6,f2off6.
Clearly White has more possibilitiesto complete groups.In this case it does not help him much,
becauseitis notimportant at all that White can winat b3,b4,b5,b6,f3,f4,f5off6.Tosee thisletus
supposethatplayhascontinued:
13.g1,g2
14.g3,g4
15.g5,g6
| Thisresults | inthepositionofdiagram | 3.2.  |     |     |
| ----------- | ---------------------- | ----- | --- | --- |
|             |                        | ● ●●● | ●   |     |
●
●
●
|     |     | ● ●●●        | ● White | to move |
| --- | --- | ------------ | ------- | ------- |
|     |     | ● ●          |         |         |
|     |     | Diagram 3.2. |         |         |
Nowthetime hascome thatWhite hastomove inthe b-column orthe f-column. Assoonas this
has been done, Black will take the square in the second row and win the game. Therefore it is clear
that in this game no square of b3-b6 and f3-f6 will be used. Therefore most of White’s unfinished
| groupsare useless, | aswell assomeofBlacks | groups. |     |     |
| ------------------ | --------------------- | ------- | --- | --- |
Now that we know this, we can go back to diagram 3.1 and list once again the squares for both
players which can complete a group of four connected men. For both players the lists consist of only
| thesquares b2andf2. |     |     |     |     |
| ------------------- | --- | --- | --- | --- |
A threat for player A, is a square which, if taken by player B, connects four of B’s men. A use-
less threat then is a threat which can never be taken by the opponent for some reason. In the position
ofDiagram 3.1wehave foundtwoserious threats: b2andf2,while allother threats were useless.
The main question is: Which player will be so unlucky that he has to play b1 or f1, because no
square in the other columns is left empty. As we have seen in diagram 3.2, it is White’s turn. There-
fore Black will win. Most unexperienced players feel White was really unlucky. This is however not
the case. In the position of diagram 3.1, it was already easy to count the empty squares to see that
eventually White would have to play b1 or f1. A better approach is to look more generally to this
| principle ofhavingtoplayamovewhichonewouldrather |     |     | not:Zugzwang. |     |
| ------------------------------------------------ | --- | --- | ------------- | --- |
Suppose we have, like in diagram 3.2, five columns filled up completely and the two other
columns empty. Without knowing anything about the way the columns are filled, it is easy to see that

it is White’s turn. This does not depend on the way the players filled the board, but depends only on
the number of moves made. If an even number of men are played, it is always White’s turn, while
Black hastomoveafter anoddnumberofmenplayed.
Since five full columns consist of thirty men, it must be White’s turn. The fact that five full
columns consist of an even number of men, is due only to the fact that a column consist of an even
number of men. Therefore in any position where some columns are completely filled and the others
are still empty, the number of men played is even and therefore it is White’s turn. So filling up the
g-column, (between diagram 3.1 and 3.2), does not help White at all, since he has to start playing
again afterwards. Toputitanother way:fillingupanother columndoesnotchange theZugzwang.
Nowletuslookonce again atapositionofthelast game, shownindiagram 3.3:
●
●●● Black to move
●
Diagram 3.3.
White has just played his 6th move and it is Blacks turn. Black already has his threats at b2 and
f2, and, having read the former sections, Black knows that eventually White has to play b1 or f1 (if
Black can prevent White from winning before that time). So Black tries to find possible other threats
White can compose. There are of course the vertical possibilities, but these are always easy to refute.
Diagonally White can achieve nothing, without a square in the range b2-b6 or f2-f6. So Black does
not have to worry about that either. Horizontally the same is true, except for the group a1-d1. This
groupcan becompleted withoutusingasquare inb2-b6orf2-f6. IfWhite takes a1, Black has toplay
b1 and then White can get b2. So to destroy White’s last hope, Black plays a1. We now know that
White cannot complete groups either horizontally, vertically or diagonally. Moreover we know that
White willbeforced toplayb1orf1eventually. Therefore weknowthatBlack willwin.
§3.2.Another Useless Threat
Let uslookatdiagram 3.4:

●●
|     | ●   | ●   |     |
| --- | --- | --- | --- |
●
|         | ●    | Black to | move |
| ------- | ---- | -------- | ---- |
|         | ●    | ●        |      |
| Diagram | 3.4. |          |      |
Inthis positionBlack can win if he gets square e3, while White can win if he gets e4. Now sup-
pose the remainder of the board is filled in without one of the players winning, before one of the
players starts playing in the e-column. As we know, White will have to play e1. Black then has to
play e2. White then takes e3, preventing Blacks possible win there, after which Black does the same
one4,preventing White fromwinning. Thiswaythegame willendinadraw.
Although this time the threat on e3 did not help Black to win the game, it was easy to see that
e4 was without a chance from the beginning. If White was to get e4, this would have meant that
Black was forced to play e3. Black probably would not mind, since this would immediately let him
winthegame.
In general: a threat for one player one square above a threat for the opponent is useless, since
either theopponentwillwinbefore thesquare isplayed, orboththreats are refuted.
§3.3.OddandEven Threats
As we have seen before, a threat can only be used to win, if at a certain time during the game
the opponent has, for some reason, to play the square below the threat. Most of the time, this happens
if all other columns are filled up completely. If that is the case, we have shown that White will get
the oddsquares and Black will get the even squares. If in the last column White has onlyeven threats
and Black has only odd threats, all threats will be refuted and the game will be drawn. This shows
thatforBlack thebestthreats are eventhreats, while White likes togetoddthreats.
Now suppose both players have been able to create a good threat. White has an odd one, while
Black has an even one. If these threats are in the same column, the lower threat will win. Let us see
what happens ifthethreats are indifferent columns, asisthecase inthepositionofdiagram 3.5.
|         | ●    | ●●         |      |
| ------- | ---- | ---------- | ---- |
| ●       | ●    |            |      |
|         | ●    | ●          |      |
| ●       | ●    | ●          |      |
|         | ●    | ● Black to | move |
| ●       | ●    | ●          |      |
| Diagram | 3.5. |            |      |

In diagram 3.5 White has an odd threat at b3 to solve a4-d1, while Black has an even threat at
e2, to solve c4-f1. The remainder of the board has been filled up and now one of the squares b2or e1
has to be played. Since the number of played men (as well as the number of empty squares) is odd,
Black has to move. If he plays b2 he will lose immediately. If he plays e1, White can refute Blacks
threat. He choosesthe lesser of two evils and plays e1. Now White and Black will alternately play in
| thee-column | givingthepositionofdiagram |     |     | 3.6.    |      |     |          |      |
| ----------- | -------------------------- | --- | --- | ------- | ---- | --- | -------- | ---- |
|             |                            |     |     |         | ●    | ●●  |          |      |
|             |                            |     |     | ●       | ●●   |     |          |      |
|             |                            |     |     |         | ●    | ●   |          |      |
|             |                            |     |     | ●       | ●●   | ●   |          |      |
|             |                            |     |     |         | ●    | ●   | Black to | move |
|             |                            |     |     | ●       | ● ●● |     |          |      |
|             |                            |     |     | Diagram | 3.6. |     |          |      |
Once again the number of empty squares is odd and it is Blacks turn. This time there is no way
| toescape. | Heplaysb2,White |     | answers | b3andwins. |     |     |     |     |
| --------- | --------------- | --- | ------- | ---------- | --- | --- | --- | --- |
What can be concluded from the last example? If both players have a good threat in different
columns (an odd threat for White and an even threat for Black), the white threat is the stronger one.
This is caused by the fact that the column in which the white threat lies (the b-column in the last
example) will remain empty for an odd number of squares (b2-b6 in the last example). Therefore if
Zugzwang happens on the remainder of the board, the squares which will be taken by the players are
of the kind they normally do not get: White gets even squares, while Black gets odd squares. In our
| last | example thisallowed | White | towin. |     |     |     |     |     |
| ---- | ------------------- | ----- | ------ | --- | --- | --- | --- | --- |
There are other possible combinations of threats for the two players. Let us suppose the combi-
nations ofone threat perplayer, assuming thatthethreats are indifferent columns. We can noweasily
deduce whosethreat willbethestrongest(we assume thatnoother threats willbecreated).
| 1)  | White hasanoddthreat, |             | Black          | hasaneven | threat.     |     |     |     |
| --- | --------------------- | ----------- | -------------- | --------- | ----------- | --- | --- | --- |
|     | Aswehave              | seen, White | willwinthegame |           | inthiscase. |     |     |     |
| 2)  | White hasaneven       | threat,     | Black          | hasaneven | threat.     |     |     |     |
Since there isnocolumninwhich onlyanoddnumberofmencan beplayed, bothplayers will
get their normal squares. Therefore Black can refute White’s threat, and winafterwards onhis
ownthreat.
| 3)  | White hasaneven | threat, | Black | hasanoddthreat. |     |     |     |     |
| --- | --------------- | ------- | ----- | --------------- | --- | --- | --- | --- |
Both players have a threat they cannot really use. Black will get even squares and White gets
odd squares. Therefore the game will be drawn. Notice that Black has to give up his odd
threat, before he willbe able toplay inthe column where White has hiseven threat. Ifhedoes
not want to do this, an odd number of squares remain empty in the column where Black has
his threat. This will cause odd and even to change sides in the other column, giving White
|     | even squares                   | andlethimwinthegame. |          |                 |     |     |     |     |
| --- | ------------------------------ | -------------------- | -------- | --------------- | --- | --- | --- | --- |
| 4)  | White hasanoddthreat           |                      | andBlack | hasanoddthreat. |     |     |     |     |
|     | Forthispositionwelookatdiagram |                      |          | 3.7.            |     |     |     |     |

|     |     | ●●  | ●            |          |      |
| --- | --- | --- | ------------ | -------- | ---- |
|     |     |     | ● ●          |          |      |
|     |     | ●●  | ●            |          |      |
|     |     |     | ● ●          |          |      |
|     |     | ●   | ●            | White to | move |
|     |     | ●   | ●●●          |          |      |
|     |     |     | Diagram 3.7. |          |      |
White hasanoddthreat atf3(d1-g4),while Black hasanoddthreat atc3(b4-e1). Bothcolumns
are filled as far as possible and now one of the players has to move. Since both columns contain an
odd number of empty squares, and odd plus odd makes even, it is White’s turn. Therefore White has
to give up his own odd threat. This will result in filling up the f-column. If the f-column is filled up
completely, Black has to move, which will cause him to get c2 instead of c3. In general both players
will therefore lose their odd threats. In this particular example Black has another trick left for White.
While filling up the f-column, Black gets f5. Now he can win by playing c2 (c2-f5) or c3 (b4-e1).
| Since White | cannotstopboth,Black | wins. |     |     |     |
| ----------- | -------------------- | ----- | --- | --- | --- |
The last example shows that although the given rules apply to all positions where the two men-
tioned threats are the only possible ways to win for one of the players, one has to be careful if other
| threats can | stillbecreated. |     |     |     |     |
| ----------- | --------------- | --- | --- | --- | --- |
The main conclusion is, however, that there is no luck involved in winning by an early created
threat. By simply looking at the difference between odd and even threats one can determine whose
threat willbethemostimportant.
§3.4.Tactics
Were the former sections devoted to strategic rules, rules which will affect play for more than
only a few moves, tactics is also very important in order to play Connect-Four at an high level. A
simple trick eachplayer whohas played the game at least afew times willhave seen before, isshown
first.
|                      |          |         | ●    | Black to | move |
| -------------------- | -------- | ------- | ---- | -------- | ---- |
|                      |          | Diagram | 3.8. |          |      |
| Thepositionofdiagram | 3.8arose | after   |      |          |      |

1.d1,d2
2.c1,..
Black can now very easily lose if he does not play b1 or e1. Suppose Black answers d3. White
| thenplayse1andthepositionofdiagram |     | 3.9arises: |     |     |     |
| ---------------------------------- | --- | ---------- | --- | --- | --- |
●
|     |     |         | ●    | Black to | move |
| --- | --- | ------- | ---- | -------- | ---- |
|     |     | Diagram | 3.9. |          |      |
Now Black has to defend two threats, one on b1 and one on f1. This is not possible and there-
fore White will win the game. On all second moves of Black except for b1 and e1, White can play
thistrick.
This diagram shows that one should not only try to create threats which can work in the long
run. Care should also be taken to avoid a sudden loss. Another position which is well-known is
| shownindiagram | 3.10. |     |     |     |     |
| -------------- | ----- | --- | --- | --- | --- |
●●●
|     |     |     |     | White to | move |
| --- | --- | --- | --- | -------- | ---- |
● ●
●
|     |     | Diagram | 3.10. |     |     |
| --- | --- | ------- | ----- | --- | --- |
White now can win early by starting to fill the g-column. After White has played g2, Black
must defend g3 and White will win on g4 (d1-g4). This shows that a player which has two threats in
one column directly above each other, can simply start to fill the column, until he wins. This cannot
be done, if the other player has a threat in the same column, which is below the highest square of the
double threat. In diagram 3.1 White not only had two threats above each other, but no less than five,
since hecould winat any square between b2and b6.Aswe have seen, itdidnothelp himat all, since
| Black couldeasily | winthegame,                     | becausehehadathreat | onsquare | b2. |     |
| ----------------- | ------------------------------- | ------------------- | -------- | --- | --- |
| Adeeper           | tactical trick isshownindiagram |                     | 3.11:    |     |     |

●●● White to move
●
Diagram 3.11.
Thispositionarose after:
1.d1,d2
2.c1,e1
3.d3,c2
4.c3,e2
White is now to move. We have seen before that if Black can play a1, he will win on b2 or f2.
In this position White can get a winning position. White plays first a1. Black has to answer b1. This
positionisshownindiagram 3.12:
●●● White to move
● ●
Diagram 3.12.
Now White plays b2 (forced) and Black again has no choice playing d4, giving the position of
diagram 3.13.
●
●●● White to move
● ●
Diagram 3.13.

Now White plays b3, creating an odd and therefore nice threat on a3. Black has to answer e3.
White then has to play e4. Therefore the position of diagram 3.14 can be reached from diagram 3.11,
withoutBlack havinghadanychoice.
●
●
●●● Black to move
● ●
Diagram 3.14.
Using VICTOR, which is described in chapter 9, it can be shown that the odd threat White has
ona3isstrongenoughtowinthegame. Inthisexample agoodlookingpositionforBlack, turnedout
to be lost after Black had to play 3 forced moves! A nice example of the tactics sometimes involved.
Each player should therefore try to achieve some good threats, but he should always be aware of tac-
tical tricks whichmightruinapositionforhim.

|     |     | 4.  | Control | of Zugzwang |     |     |
| --- | --- | --- | ------- | ----------- | --- | --- |
As has been shown in chapter 3, Zugzwang is a very important concept in playing Connect-
Four. In finding the result ofa game starting at a given positionafter correct play ofbothplayers, it is
| veryimportant | todetermine | which player | hascontrol | oftheZugzwang. |     |     |
| ------------- | ----------- | ------------ | ---------- | -------------- | --- | --- |
First we try to define Zugzwang: Zugzwang forces a player to make a move which he would
rather notmake. Theforce simplyconsists ofthefact thateachturnexactly onemovemustbemade.
| §4.1.Definition | ofControl | ofZugzwang |     |     |     |     |
| --------------- | --------- | ---------- | --- | --- | --- | --- |
To show what is meant by this, we look again at a position we have encountered before
| (diagram 4.1): |     |     |     |     |     |     |
| -------------- | --- | --- | --- | --- | --- | --- |
●
|     |     |     | ●●●     |      | White to | move |
| --- | --- | --- | ------- | ---- | -------- | ---- |
|     |     |     | ●       | ●    |          |      |
|     |     |     | Diagram | 4.1. |          |      |
We have already seen that this position can be won by Black, since he will win at b2 or f2,
depending onwhichcolumnWhite choosestolosein. Nowsupposethefollowing movesare made:
7.c4,a2.
●
|     |     |     | ● ●●●   |      | White to | move |
| --- | --- | --- | ------- | ---- | -------- | ---- |
|     |     |     | ●       | ●    |          |      |
|     |     |     | Diagram | 4.2. |          |      |
Inthepositionofdiagram 4.2allcolumns contain aneven numberofmen, consequently leaving
an even number of squares empty. This means that it is White’s turn. Now White has to play in one
of the columns, which will result in an odd number of empty squares left in that column. Since this
means that White cannot fill a column completely with his next move, Black can then answer in the
same column as White just played. That would result ina positionin which all columns contain again

| anevennumberofempty |     | squares. |     |     |
| ------------------- | --- | -------- | --- | --- |
Now let us suppose that Black is going to use this simple strategy for the rest of the game: each
move he plays in the same column as White just played in (we call this strategy ’to play follow-up’.)
Which squares will White get this way and which squares will Black get? The answer to this ques-
tion is simple: White will only get odd squares, while Black will only get even squares. White can
choose the order in which he fills the columns, but there is no way he can force Black to take an odd
square. IfBlack wants toplayfollow-up, hecan doso,andWhite can donothingaboutit.
In our example, White cannot play b1 or f1 without losing immediately. Let us therefore
assume that he starts filling upthe other columns, while Black is playing follow-up. This willeventu-
| allyresult | inthepositionofdiagram | 4.3: |     |     |
| ---------- | ---------------------- | ---- | --- | --- |
● ●●● ●
● ● ●
|     |     | ● ●●● | ● White | to move |
| --- | --- | ----- | ------- | ------- |
● ●
Diagram 4.3.
The order in which White has filled up the columns is of no importance. The result will always
| bethesame. | Itisnowclear | thatWhite willloseafter | hisnextmove. |     |
| ---------- | ------------ | ----------------------- | ------------ | --- |
In this diagram, to play follow-up was a winning strategy for Black. One nice feature of the
strategy was, that White had no chance to interfere. Black wanted to get all even squares and White
could not do anything about it. If, however, Black wanted to get one or more odd squares, he could
have taken them. The only price he would have to pay, is that it would give White the opportunityto
| getaneven | square. |     |     |     |
| --------- | ------- | --- | --- | --- |
Concluding this section, we see that Black is able to take all even squares, without White being
able to do anything about it, while Black can take some oddsquares ifhe wants to,the price ofwhich
is the loss of some even squares. This enables us to define the concept of Control of Zugzwang: A
player is in control of the Zugzwang if he is able to guide the way odd and even squares are divided
amongbothplayers.
Being in control of the Zugzwang is important, since it can be used in positions like diagram
| 4.2,towinwithoutanypossible |           | tactical problems. |     |     |
| --------------------------- | --------- | ------------------ | --- | --- |
| §4.2.Control                | inInitial | Position           |     |     |
Let usnowtryto see, what can be said on which of the players is in control of the Zugzwang as
the game starts. Since all columns are empty, the number of empty squares in each column is even.
Therefore Black isina positiontoplay follow-up, which means that Black is the person who controls
the Zugzwang. Now suppose Black tries to use this control to play follow-up from the beginning. If
hecoulddothatforallofhis21moves, thepositionofdiagram 4.4wouldresult:

●●●●●●●
●●●●●●●
●●●●●●● Illegal position
Diagram 4.4.
Itisclear that this positionisillegal.Both players have connected four men at several positions.
Still it is interesting to try to find out which player must have won first, after which the players just
played on. Since White controls the whole first row, it is clear that before Black could have finished
one of his groups of four, White must have connected four men in the first row. Therefore it is clear
thatWhite musthave wonthegame.
This shows that playing follow-up is not a good strategy to start the game, for Black. He will
have toget some squares at the bottom rowand give White the opportunitytotake someevensquares
in return. If White does not take the right squares, like he did in the game which brought him to
diagram 4.1,Black can always switch toplayingfollow-up andwin.
§4.3.Control forWhite
Now let us see what White can do. Is there, for instance, a possibility that he can take over con-
troloftheZugzwang? Tosee thatthisisindeed possible, welookatthepositionofdiagram 4.5:
●
●●
●
●●● White to move
● ●
Diagram 4.5.
White is to move. Two columns contain an odd number of empty squares, and five columns
contain an even (possibly zero) number of empty squares. If we look at the a-column, it is clear why
Black has not yet played there. As soon as Black plays a2, he will lose the game, since White has a
threat at a3. This odd threat is a good one for White, as we have seen before. Therefore, from Blacks
point of view, playing in the a-column is out of the question. Since the a-column contains an odd
number of empty squares, this will however change the way oddand even squares are taken normally
by the players, on the remainder of the board. White, of course, knows this and plays b4. Now all six
columns of the remainder of the board contain an even number of empty squares. At this time Black
has to move. Since he cannot play in the a-column, he has to concentrate on the remainder of the

board and play an odd square. White can, if he wants, play in the same column as Black, creating a
new position in which Black has to play an odd square. In other words, White can play follow-up on
the remainder of the board. Therefore, in this position, White controls the Zugzwang. Let us see
what happens if Black and White fill up the board, except for the a-column, White playing follow-up
| allthetime | (diagram 4.6): |     |     |     |     |
| ---------- | -------------- | --- | --- | --- | --- |
●
●● ●●●
●●
●●●
|     |     |     | ●●● | Black to | move |
| --- | --- | --- | --- | -------- | ---- |
● ●●●
Diagram 4.6.
Neither of the players has connected four men. Therefore the game will be still in progress,
when this position occurs. Black has to move, and loses as White plays a3 (Black, knowing all this,
| couldhaveforfeited | thegame | before, naturally). |     |     |     |
| ------------------ | ------- | ------------------- | --- | --- | --- |
This diagram made clear that an odd threat for White gives him control of the Zugzwang as
soon as all other columns contain an even number of empty squares. White will win the game, if
Black cannotconnectfourmen,whenWhite playsfollow-up, since Black willbeforced toplay even-
tually the square below the odd threat. If, however, Black will be able to connect four men - if he is
forced to play against the follow-up - White will have to take some odd squares, giving Black some
even squares. Still, White is the one who can decide when to stop playing follow-up and is therefore
| theoneincontrol | oftheZugzwang.  |           |     |     |     |
| --------------- | --------------- | --------- | --- | --- | --- |
| §4.4.Some       | Special Control | Positions |     |     |     |
In the last sections, we stated that playing follow-up is possible if all columns (except for
columns as the a-column in the last diagram) contain an even number of empty squares. The position
| ofdiagram | 4.7showsthatitcan | beplayed | inother positionsaswell: |     |     |
| --------- | ----------------- | -------- | ------------------------ | --- | --- |
●
|     |     |     | ●●● | White to | move |
| --- | --- | --- | --- | -------- | ---- |
|     |     | ●   | ● ● |          |      |
Diagram 4.7.

| Thispositionarose | fromdiagram | 4.1,after playing |     |     |
| ----------------- | ----------- | ----------------- | --- | --- |
7.e3,g1.
Here, Black is just waiting for White to play b1 or f1. Therefore Black would like to play
follow-up. If we count the number of empty squares in the different columns, we see 4 columns with
an odd number of empty squares. This gives White a choice between four different even squares,
something which the player of follow-up, does not want to happen. Still Black can play a somewhat
modified follow-up, by observing that no real harm is done if White gets one or more of these even
squares. Therefore Black will try the following: as soon as White plays a2, Black answers at b4. If
White plays b4, Black answers at a2. As soon as White plays e4, Black answers at g2. If White
| playsg2,Black answers | e4. |     |     |     |
| --------------------- | --- | --- | --- | --- |
This will give Black exactly one of the pair of squares a2, b4 and one of the pair e4, g2. After
the squares of such a pair are used, the number of empty squares in the column is even and follow-up
can be played. From diagram 4.7 as starting position, this will result in one of the following four
positionsofdiagrams 4.8to4.11. (ifWhite doesnotgiveupbefore byplayingb1orf1).
|     |     | ● ●●●        | ●       |         |
| --- | --- | ------------ | ------- | ------- |
|     |     | ● ● ●        | ●       |         |
|     |     | ●●●          | White   | to move |
|     |     | ● ●          | ●       |         |
|     |     | Diagram 4.8  |         |         |
|     |     | ● ●●●        | ●       |         |
|     |     | ● ●          | ●       |         |
|     |     | ●●●          | ● White | to move |
|     |     | ● ●          | ●       |         |
|     |     | Diagram 4.9  |         |         |
|     |     | ● ●●●        | ●       |         |
|     |     | ● ●          | ●       |         |
|     |     | ● ●●●        | White   | to move |
|     |     | ● ●          | ●       |         |
|     |     | Diagram 4.10 |         |         |

|     |     | ● ●●●        | ●       |         |
| --- | --- | ------------ | ------- | ------- |
|     |     | ●            | ●       |         |
|     |     | ● ●●●        | ● White | to move |
|     |     | ● ●          | ●       |         |
|     |     | Diagram 4.11 |         |         |
As can easily be detected, in each of the four given positions, White has not been able to con-
| nect fourmenandwillloseafter |     | hisnextmove. |     |     |
| ---------------------------- | --- | ------------ | --- | --- |
This shows that follow-up can also be played if some columns contain an odd number of
squares. The number of these columns must beeven, since the total number ofempty squares iseven,
ifthe opponentofthe follow-up player has to move. The follow-up player simply groups the playable
even squares (in our example a2, b4, e4 and g2) in pairs of two (like we paired a2, b4and e4, g2). Of
each pair exactly one square will be taken by White and one square will be taken by Black. Which
square is taken by the follow-up player, can be chosen byhisopponent,while the pairing can bedone
bythe follow-up player himself. For all other squares, the normal follow-up rules apply: even squares
are taken bythefollow-upplayer, while theoddsquares are forhisopponent.
| §4.5.Benefits | ofControllingthe | Zugzwang |     |     |
| ------------- | ---------------- | -------- | --- | --- |
As we have seen in the last sections, Black controls the Zugzwang in the initial position, but
cannot play follow-up, since that way he would lose the game. Because Black cannot play follow-up,
there is a chance that White will create an odd threat, which gives him the control of the Zugzwang,
inall columns, except the column where he has the oddthreat. IfWhite cannotwinfromsuchaposi-
tion by playing follow-up, he also has a chance of losing the control again. Although we can talk
about one player controlling the Zugzwang, it cannot be used (yet) to win the game, or at least draw
thegame.
If White controls the Zugzwang, like in diagram 4.5, where follow-up would give Black no
chance to connect four men on the remainder of the board, White will win the game, using his odd
threat. In this case the control is winning for White. If Black controls the Zugzwang, like he did in
diagrams 4.2 and 4.7, where follow-up would give White no chance to connect four men, and Black
can complete agroupofhisown(b2-e2ofc2-f2), Black willwinthe game. Itis,however, notneces-
sary forBlack tohave aneven threat tobeable tousefollow-up. Diagram 4.12willshowsuchaposi-
tion:

●
●
● White to move
●
Diagram 4.12.
Thispositionarose after
1.c1,d1
2.d2,d3
3.d4,d5
4.d6,c2.
Since all columns contain an even number of empty squares, Black can apply follow-up in its
purestform.Thiswillresult eventually inthepositionofdiagram 4.13:
●●● ●●●
●
●●● ●●●
●
●●● ●●● Draw
●
Diagram 4.13.
The position of diagram 4.13 is a draw. Since this position was obtained by playing follow-up
by Black, starting in the position of diagram 4.12, we see that the follow-up strategy can sometimes
be used to get a draw. Although we now know that the position of diagram 4.12 is at least a draw for
Black, we do not know yet if White can also be sure to get a draw, or Black can actually win. Still
the result that we can show that a position can be drawn by Black, can be used while we try to show
that a position can be won by White. As soon as we encounter a variant in which Black can draw the
game, we know that White has made wrong move before, if White is trying to win. This observation
willbeusedinchapters 10andfurther.

5. More Strategic Rules
In chapter 4we have shown that a simple strategic rule as playing follow-up might reveal that a
given position can be won by one of the players, although the actual win may take another 20moves.
We have also shown that in some positions where not all columns are filled with an even number of
men, it was possible to play a special kind of follow-up, after pairing some of the even squares which
were directly playable. In this chapter we will look at some other strategic rules. All these rules can
be used to show that a given possible potential threat for the opponent can be refuted. A potential
threat for player A is a group of four men which can be connected by player B. The only restriction
for the squares of the potential threat is the fact that player A may not have occupied any of the
squares. A potential threat becomes a threat, as soon as exactly three squares are occupied by player
B. The rules in this chapter are described in an informal way. For exact definitions of the rules, with
proofs of their validity, we refer to chapter 6. The given rules are valid for the player who controls
theZugzwang. Inthischapter we always assume Black controls theZugzwang.
§5.1.Baseinverse
Let uslookatthepositionofdiagram 5.1:
●
● Black to move
●
Diagram 5.1.
Black is to move. Black controls the Zugzwang, since White has not yet created an odd threat.
Black cannot, however, play follow-up, since that way he would lose on a1-d1. Does this mean that
he has to stop White immediately by playing a1 or b1? If White plays a1, he has a group of three
men, needing only b1, an oddsquare. Still it is clear that a1-d1 is not a serious threat since as soonas
White playsa1,Black can answer b1andassoonasWhite playsb1,Black can answer a1.
This gives rise to a more general rule: if two squares are directly playable, and both squares are
part of the same group, player A can always prevent player B from completing the group, by playing
onesquare assoonasplayer Bplaystheother.
In diagram 5.1 this will assure Black, that he gets one of the squares a1 and b1. Which square
he gets depends on White, unless Black will play a1 or b1 immediately, since it is his turn. Now sup-
pose Black wants to get b1, and in the same way he not only wants to have one of c4 and d4, but
wants tohave d4forsure. Hecan have oneofeachgroup,andforonegroupcan choosewhichonehe
wants, since hecan make onemoveimmediately. Inthiswayitisimportant toknowifhehas used up
his immediate move at b1 or not. It would be much easier to look at the position where White is to
move. In that case Black cannot claim to get b1, since White could play it immediately, so Black has

to settle for one out of a1 and b1 and one out of c4 and d4, since it is not his move. Therefore let us
| lookatapositionwhere | Black | made hismove(diagram |     | 5.2): |     |
| -------------------- | ----- | -------------------- | --- | ----- | --- |
●
|     |     |     | ●●  | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●
|     |     | Diagram | 5.2. |     |     |
| --- | --- | ------- | ---- | --- | --- |
We have seen that Black can get one ofa1and b1, but White can decide which it is going to be.
We call this position a Baseinverse. Each rule which gives one of the players a square which he
wouldnotget, ifheplayed follow-up, iscalled aninverse. Inthis case Black gets a square, which can
be taken immediately by the opponent. The reason why Black can claim one of the squares, is that
they are both located at the bottom (base) of a column. This rule applied to a1 and b1 ensures Black
that White will not win the game at a1-d1. A complete description ofthe Baseinverse can befoundin
section 6.2.
§5.2.Claimeven
Now let us take a look at the group b1-e4 of diagram 5.2. White already occupies c2 and d3.
b1 can be taken by White if he wants to, so it is important for Black to be able to get e4. Fortunately,
this isaneven square and Black willnormally get this square. Black can therefore get e4 if he will be
able to hold control over the Zugzwang long enough to force White to play e3. This will be the case
if Black can find answers to all White’s threats. How Black can try to refute all White’s threats, will
be shown in the next chapter. For now it suffices to note that if Black controls the Zugzwang, he can
claim an even square, if the odd square below the even square is still empty. In that case he will take
| theeven square   | assoonasWhite  | hasplayed theoddsquare |     | below. |     |
| ---------------- | -------------- | ---------------------- | --- | ------ | --- |
| §5.3.Combination | ofRules        |                        |     |        |     |
| Let ustake       | alookatdiagram | 5.3:                   |     |        |     |

● ●
●●
● White to move
●
Diagram 5.3.
Suppose Black wants to be sure that he will not lose at a1-d1. Therefore he applies the Basein-
verse rule, which ensures him one of the squares a1and b1. Onthe other handhe wants tobe sure he
will not lose at a1-d4. Therefore he applies the Claimeven rule for b2. Now it must be clear that
something is wrong. The Baseinverse expects Black to play a1 as soon as White plays b1, while the
Claimeven expects Black to play b2 as soon as White plays b1. Therefore these rules cannot be
applied both in the given position. It is interesting, to find out in what cases these rules can be
applied simultaneously. For the two given rules, this is easy to detect: a Baseinverse is concerned
with two squares. A Claimeven is also concerned with two squares. Both rules state that if one of the
squares is played by White, the other should be played by Black immediately. If therefore the groups
of squares are not disjoint, we cannot be sure that these conditions can both be met, and therefore
these rules can onlybeapplied simultaneously, ifthesetsofsquares concerned are disjoint.
§5.4.General Usage ofRules
We have seen that some simple rules can be used to claim one of a set of squares by the con-
troller ofthe Zugzwang. For a Claimeven this onlyworks,iftheZugzwang can becontrolled untilthe
end of the game. On the other hand, Black can only be sure that the Zugzwang will be controlled to
the end, if White cannot make a serious threat. Sowhat we have isaset ofrules which can beused to
show that certain potential threats of White can be refuted. Some of these rules only work if Black
can be sure that White cannot make a serious threat. Somehow this sounds like a circular reasoning.
Itisnot,however.
Toclarify this,welookatthepositionofdiagram 5.4.
●● ●
●
● ●
●● White to move
● ●
Diagram 5.4.
Let us look at all positions where White might be able to create a position of four connected

men:
(1)a1-d1,
(2)a6-d6,b6-e6,
(3)c6-f6, d6-g6,
(4)d3-g6,c2-f5, b1-e4,e3-e6,
(5)a1-a4, a2-a5, a3-a6, a4-d1,
(6)b1-b4,b2-b5,b3-b6,
(7)f1-f4,f2-f5,f3-f6,
(8)a6-d3.
Nowletussee howwe can refute allthese potential threats.
a1-d1can berefuted byaBaseinverse ona1andb1.
Allgroupsin(2)can berefuted byclaiming thesquare b6,usingClaimeven.
Allgroupsin(3)can berefuted byclaiming thesquare e6, usingClaimeven.
Allgroupsin(4)can berefuted byclaiming thesquare e4, usingClaimeven.
Allgroupsin(5)can berefuted byclaiming thesquare a4, usingClaimeven.
Allgroupsin(6)can berefuted byclaiming thesquare b4,usingClaimeven.
Allgroupsin(7)can berefuted byclaiming thesquare f4,usingClaimeven.
a6-d3can berefuted byclaiming thesquare a6, usingClaimeven.
This list shows that for each potential threat we can find a way to solve the threat. This means
that if we hold on to a strategy which gives us all those squares needed, we will not lose control over
the Zugzwang, which will guarantee, that all squares can be taken. So in order to be able to claim a
square at a spot, which refutes some potential threats, we must be sure that there is a set of rules
which will ensure that all threats can be refuted. If there is at least one potentially dangerous group,
for which we cannot find a refutation, we cannot be sure of the other claims we would like to make
either.
Thissituation can becompared withthebuildingofa houseofcards. When we build the house,
all components must be placed in the right way. If all components are placed correctly, the house
will be finished (until a nice passer-by blows it away). If one component is placed incorrectly, the
wholethingwillcome down.
It is important to see that there is no circular reasoning involved here. Merely we have that,
when this approach succeeds in finding refutations for all positions, Black can at least get a draw. If
there isonlyone spot left where we cannot find a rule which shows how to refute the potential threat,
thewhole setofrules comes downlikeahouseofcards. We cannotclaim anything anymore.
Concluding, we have foundamethodwhere we can sometimes find a set of rules which ensures
the controller of the Zugzwang that he will not lose, since he can refute all the opponents threats. If
the method does not work, we can say nothing about the given position. Therefore it is useful to find
as many rules as possible, which can be applied, in order to be able to predict the result of a game in
asmanypositionsaspossible. Inthenextchapter thesetofrules foundsofarisdescribed.

6. Formal Definitions of Rules
In this chapter a formal definition is given of the nine rules which are used to refute potential
threats of the opponent. In section 6.10 it is described how these rules where found. As has been
stated before, the rules can only be applied by the person who controls the Zugzwang. Rules are
always applied in positions where the opponent is to move. Since Black controls the Zugzwang if
White has not created an odd threat, the rules can be applied on the whole board. If White controls
the Zugzwang, the rules can only be applied on the board without the column in which White has his
oddthreat. Even ifWhite hascreated anoddthreat, Black can stilltrytousethe rules toshowthat he
can achieve a draw. Normally this will not work, since there are no possibilities to refute the odd
threat. There are however positions where an odd threat can be refuted. In that case Black clearly
can get back control of Zugzwang. Therefore in a position in which White is to move, Black can
always try to find a good set of rules, while White can do so, if he has created at least one odd threat
(later we will encounter another position in which White can apply the rules). For simplicities sake,
the rules are described without referring to the player who controls the Zugzwang. The reader should
keep in mind that if White is in charge, he can only apply the rules on squares which are not in the
columnofhisoddthreat.
The names of the rules are chosen in a way to make clear on what observation the rule is based.
It is described which potentially threats are solved by applying a rule in a given position. Instead of
the term ’potential threats’ the term ’groups’ is used to indicated a position of 4 connected squares,
which could be usedbythe opponenttoconnectfourofhismen. Theterm ’opponent’isusedtorefer
totheopponentofthecontroller oftheZugzwang.
§6.1.Claimeven
A Claimeven makes direct use of the fact that the controller of the Zugzwang can get all empty
even squares (which are notdirectly playable), bylettingthe opponentplay all empty oddsquares. So
in individual cases, the controller gets an even square, for the price of the odd square below the even
square. A Claimeven is therefore concerned with two squares, an odd and an even square, both
empty, lying directly above each other. All groups which contain the even square are solved by the
Claimeven.
●
●
White to move
●●
Diagram 6.1.
Inthepositionofdiagram 6.1,thefollowing Claimeven instances can beapplied:

| a1-a2, a3-a4, | a5-a6, |     |     |     |     |
| ------------- | ------ | --- | --- | --- | --- |
b1-b2,b3-b4,b5-b6,
| c3-c4, c5-c6, |     |     |     |     |     |
| ------------- | --- | --- | --- | --- | --- |
| e3-e4, e5-e6, |     |     |     |     |     |
f1-f2,f3-f4,f5-f6,
g1-g2,g3-g4,g5-g6.
Since, as will be shown in chapter 7, all these instances of the Claimeven can be applied simul-
taneously and each potential threat of White contains at least one of the even squares of the listed
Claimeven instances, this set ofrules can be usedtoshowthat the positionof diagram 6.1 is at least a
draw forBlack.
| Claimeven | formally: |     |     |     |     |
| --------- | --------- | --- | --- | --- | --- |
Required: Two squares, directly above each other. Both squares should be empty. The upper
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| square mustbeeven.               |     |                 |     |     |     |
| -------------------------------- | --- | --------------- | --- | --- | --- |
| Solutions: Allgroupswhichcontain |     | theuppersquare. |     |     |     |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
§6.2.Baseinverse
A Baseinverse is based on the fact that a player cannot play two directly playable moves in one
turn. Therefore, after the opponenthas made his move the controller ofthe Zugzwang can stillplay at
least one of the two squares. Since the opponent can move first, he is the one who can decide which
square he gets, and which square willbe taken bythe controller ofthe Zugzwang. Therefore the con-
troller ofthe Zugzwang can onlybe sure that he gets at least one of the two squares, in that way solv-
| ingallgroupswhichcontain | bothsquares. |     |     |     |     |
| ------------------------ | ------------ | --- | --- | --- | --- |
●
|     |     |     | ●   | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●
|     |     | Diagram | 6.2. |     |     |
| --- | --- | ------- | ---- | --- | --- |
Inthepositionofdiagram 6.2,thefollowing Baseinverses can beapplied byBlack:
| a1-b1,c4-d3, | c4-e2, c4-f1, | d3-e2,d3-f1,e2-f1. |     |     |     |
| ------------ | ------------- | ------------------ | --- | --- | --- |
A Baseinverse like a1-c4 is also possible, but useless, since there are no groups which contain
both a1 and c4. Therefore such a Baseinverse would solve nothing. Another possible Baseinverse in
diagram 6.2isf1-g1. Althoughd1-g1contains bothsquares, this Baseinverse isofnouse either, since
| d1-g1isnopotential | threat asBlack | occupies          | e1.         |            |     |
| ------------------ | -------------- | ----------------- | ----------- | ---------- | --- |
| Which groupsare    | solved         | bysomeofthelisted | Baseinverse | instances? |     |

a1-b1solvesa1-d1,
c4-d3solvesa6-d3,b5-e2andc4-f1,
d3-f1solvesc4-f1.
These three instances show that it is very well possible that one kind of rule (Baseinverse) can
| have different | instances (c4-d3 | andd3-f1)tosolvethesame |          | group(c4-f1). |     |     |
| -------------- | ---------------- | ----------------------- | -------- | ------------- | --- | --- |
| Baseinverse    | formally:        |                         |          |               |     |     |
| Required:      | Twodirectly      | playable                | squares. |               |     |     |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| Solutions: | Allgroupswhichcontain |     | bothsquares. |     |     |     |
| ---------- | --------------------- | --- | ------------ | --- | --- | --- |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
§6.3.Vertical
A Vertical is based on the fact that a player cannot play two men in the same column in one
turn, while by playing one men in the column, the square above that men becomes immediately play-
able. This means that a player can always claim one of two consecutive squares in a column: if the
opponent plays the lower square, the claiming player can take the upper square immediately. If the
opponent never plays the lower square, the player can take that square himself sometime (he might
even be forced to do so). In both ways, at least one of the two squares will be occupied by the player
incontrol oftheZugzwang. Iftheuppersquare iseven, astrongerclaim can bemade which has been
done by Claimeven. Therefore the Vertical rule is only used if the upper square is odd. Since the
opponent can determine which square will be taken by which player, we can only be sure that groups
which contain both squares are solved by this rule. The name of the rule is based on the observation
| thatallgroupswhichcontain |     | bothsquares | are Vertical. |     |     |     |
| ------------------------- | --- | ----------- | ------------- | --- | --- | --- |
●
●
●
|     |     |     |     | ●   | White to | move |
| --- | --- | --- | --- | --- | -------- | ---- |
●
|     |     |     | Diagram | 6.3. |     |     |
| --- | --- | --- | ------- | ---- | --- | --- |
In the position of diagram 6.3 a great number of Verticals is possible. The most interesting is
e4-e5. At this point, where we cannot use a Claimeven for e4 and cannot use a Baseinverse to solve
the potential threat e2-e5, we should apply the Vertical e4-e5 to make sure that White cannot win at
| e2-e5. Notethatapplication |           | ofthisrule, | alsosolves | e3-e6. |     |     |
| -------------------------- | --------- | ----------- | ---------- | ------ | --- | --- |
| Vertical                   | formally: |             |            |        |     |     |
Required: Two squares directly above each other. Both squares should be empty. The upper
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| square | mustbeodd. |     |     |     |     |     |
| ------ | ---------- | --- | --- | --- | --- | --- |

Solutions: Allgroupswhichcontain bothsquares.
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
§6.4.Aftereven
Aftereven uses a special side-effect of the usage of one or more Claimevens. If a group can be
completed by the controller of the Zugzwang, by filling squares which all can be claimed using
Claimevens, then this player can be sure that he will eventually complete the group. In the column
where he plays the last man which completes the group, no other man will be thrown. Therefore the
opponent cannot get any of the squares above the last square of the Aftereven group. Which column
will be the last, if the Aftereven group needs at this time more than one man, cannot be determined
beforehand. The order in which those columns are filled can most of the time be determined by the
opponent. For this reason the only thing we can conclude is, that in at least one of the columns which
contain empty squares of the Aftereven group, no men will be put by the opponent, above the square
of the Aftereven group. Therefore groupsofthe opponent,which have squares inall columns where a
manofthe Aftereven groupisstillmissing, all higher than the Aftereven group,cannotbecompleted.
These groups all can only be completed after the groupwhich needs only even squares, clarifying the
chosen name fortherule.
●●● White to move
● ●
Diagram 6.4.
In the position of diagram 6.4, a Claimeven can be used on the squares f1-f2, while f2 is the
only square missing to complete c2-f2. For this reason we can see c2-f2 as an Aftereven group, with
only one empty square. Therefore no squares will be played after f2, which solves all groups which
need a square in the range f3-f6. As a side effect of the Aftereven, all groups which need the square
f2 itself, are also solved. In the same way b2-e2 is an Aftereven group, which needs only b2. This
solves all problems that need one or more squares in the range b2-b6. These two Afterevens and
some Claimevens in the other columns, solve all groups. This assures Black that he will win the
game, atb2orf2.

●●●
●
● ●● White to move
● ●
Diagram 6.5.
Inthepositionofdiagram 6.5Claimevens can beusedforf2andg2.Together they form anAft-
ereven solution, with d2-g2 as Aftereven group. This time more than one square is needed and there-
fore all squares in f3-f6 will not be played, or all squares in g3-g6 will not be played. The choice
between these columns can be made by White. Therefore only groups which contain squares in both
the f and g-column are solved by this Aftereven. c3-f3, for instance, is not solved by this Aftereven.
This group will become a serious threat for Black, since there is no rule which can be used to solve
thisproblem.
Aftereven formally:
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
A group which can be completed by the controller of the Zugzwang, using only the even
squares of a set of Claimevens. This groupis called the Aftereven group. The columns in which
theemptysquares lieare called theAftereven columns.
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
All groups which have at least one square in all Aftereven columns, above the empty square of
theAftereven groupinthatcolumn.
Allgroupswhichare solvedbytheClaimevens, whichare partoftheAftereven.
§6.5.Lowinverse
A Lowinverse is based on the fact that the sum of two odd numbers is even. Normally the con-
troller of the Zugzwang will be forced to play the lowest, even square of a column which contains an
odd number of empty squares. If, however, two columns with an odd number of empty squares exist,
the total number of empty squares in these two columns is even. This will force the opponent to play
first in one of these column. In that way the controller of the Zugzwang gets a chance to take the odd
square above the square which will be played by the opponent. The opponent decides in which
columnhewillplayfirst,implyingthatwecan onlyconclude thatwegetoneofthetwooddsquares.

White to move
●
|     |     | Diagram | 6.6. |     |
| --- | --- | ------- | ---- | --- |
Inthepositionofdiagram 6.6,aLowinverse can beused forthe squares c2-c3-d2-d3. The result
of this is, that Black gets at least one of the squares c3 and d3. This effect is the goal of the Lowin-
verse. This rule has a side-effect, too. The rule can be seen as consisting of two Verticals. Black will
play d3 as soon as White plays d2, or c3 as soon as White plays c2. After one of these variants
occurred, two squares remain, which Black can start treating as a normal Vertical. In general the
controller of the Zugzwang will get at least one square out of each of three pairs of squares: the
squares inthe first column (c2-c3), the squares inthe other column (d2-d3) and the two upper squares
(c3-d3). Note that a Lowinverse on c4-c5-d4-d5 is also possible in the position of diagram 6.6. It is
| notnecessaryforthelower | squares | oftheLowinverse | tobeplayable. |     |
| ----------------------- | ------- | --------------- | ------------- | --- |
It is necessary to see that there is no restriction which states that the upper squares must lie in
the same row. A Lowinverse on, for instance, a2-a3-c4-c5 isvery well possible. The onlyobservation
| needed isthefact | thattheupperfields | (a3andc5inthisexample) |     | are odd |
| ---------------- | ------------------ | ---------------------- | --- | ------- |
| Lowinverse       | formally:          |                        |     |         |
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
Two different columns, called the Lowinverse columns. In each Lowinverse column two
| squares,       | lyingdirectly aboveeachother. |     |        |     |
| -------------- | ----------------------------- | --- | ------ | --- |
| Allfoursquares | mustbeempty.                  |     |        |     |
| Inbothcolumns  | theupperofthetwosquares       |     | isodd. |     |
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| Allgroupswhichcontain | bothuppersquares. |     |     |     |
| --------------------- | ----------------- | --- | --- | --- |
Allgroupswhichare solvedbytheVerticals, whichare partoftheLowinverse.
§6.6.Highinverse
AHighinverse isbased onthesame principle astheLowinverse. Thistime the twoeven squares
above the upper odd squares are also taken into account. What happens at the time the opponent is
forced to play in one of the two columns? To see this we look again at the position of diagram 6.6.
Suppose White plays c2. Black then can play c3 and four squares remain empty: c4, d2, d3 and d4.
Since Black has already achieved his main goal of the inverse: getting one of the squares c3 and d3,
he now can try to get some more. He could for instance change d3 and d4 into a Claimeven. In that
case he gets at least c3 and d4. If we suppose that White plays d2 first, we can show in the same way
that Black gets at least c4 and d3. The choice between these two alternatives can be made by White.
Therefore, all we can conclude from this is that Black gets from each of the following pairs at least

one square: c3 and c4, d3 and d4, c3 and d3, c4 and d4. The last two of these pairs should be seen as
themain goalsoftheHighinverse, while theother twoare Vertical side-effects.
Note that it is easy to achieve only one of the main goals by using Claimevens (c4 and d4) or a
Lowinverse (c3andd3),butforthecombination ofthese goalsaHighinverse isneeded.
In the position of diagram 6.6 Black can claim something more. After White played c2 and
Black answered c3, both c4 and d2 can be played immediately. Therefore Black can not only use a
Claimeven for d3-d4 but can also use a Baseinverse for c4 and d2. Although that is no use in this
position, it would help if the columns where one column apart. In the other variant Black gets c4 for
sure, which means that anyhow, Black gets one of c4 and d2, because d2 is directly playable. In the
| same wayBlack | getseither | d4orc2, since | c2isdirectly | playable. |     |     |
| ------------- | ---------- | ------------- | ------------ | --------- | --- | --- |
As has been stated for the Lowinverse, there is no restriction which says that the upper squares
of the Highinverse must be in the same row. A Highinverse on, for instance, a2-a3-a4-c4-c5-c6 is
| therefore possible. |           |     |     |     |     |     |
| ------------------- | --------- | --- | --- | --- | --- | --- |
| Highinverse         | formally: |     |     |     |     |     |
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
Two different columns, called the Highinverse columns. In each Highinverse column three
| squares,      | lyingdirectly  | aboveeachother. |     |     |     |     |
| ------------- | -------------- | --------------- | --- | --- | --- | --- |
| Allsixsquares | are empty.     |                 |     |     |     |     |
| Inbothcolumns | theuppersquare | iseven.         |     |     |     |     |
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| Allgroupswhichcontain |     | thetwouppersquares. |          |     |     |     |
| --------------------- | --- | ------------------- | -------- | --- | --- | --- |
| Allgroupswhichcontain |     | thetwomiddle        | squares. |     |     |     |
All(vertical) groupswhichcontain thetwohighest squares ofoneoftheHighinverse columns.
| Ifthelower | square ofthefirstcolumnisdirectly |     |     | playable: |     |     |
| ---------- | --------------------------------- | --- | --- | --------- | --- | --- |
All groups which contain both the lower square of the first column and the upper square of the
secondcolumn.
| Ifthelower | square ofthesecondcolumnisdirectly |     |     | playable: |     |     |
| ---------- | ---------------------------------- | --- | --- | --------- | --- | --- |
All groups which contain both the lower square of the second column and the upper square of
thefirstcolumn.
§6.7.Baseclaim
ABaseclaim isthe combination oftwoBaseinverses and a Claimeven. Diagram 6.7willclarify
thisrule:
●
|     |     |     | ●   |     | White to | move |
| --- | --- | --- | --- | --- | -------- | ---- |
|     |     | ●   |     | ●   |          |      |

Diagram 6.7.
Suppose both the groups b1-e4 and c1-f1 have to be solved and no Claimeven can be used for
e4. Inthat case a Claimeven can be tried at c1-c2, tosolve b1-e4. ABaseinverse at c1-e1 isnotpossi-
ble, since these rules meet at square c1. This would make it impossible to solve c1-f1. The playable
square b1 of b1-e4 gives another possibility. To see how this can help we look at all possible first
moves of White in one of the squares b1, c1 or e1. White plays b1. Black plays e1 and a Claimeven
at c1-c2 can be used to solve b1-e4. White plays c1. Black plays e1 and a Baseinverse at b1-c2 can
be used to solve b1-e4. White plays e1. Black plays c1 and a Baseinverse at b1-c2 can be used to
solveb1-e4.
In all variants both groups are solved. Since b1-e4 is solved sometimes by a Claimeven and
| sometimes | byaBaseinverse, | thename Baseclaim | ischosen. |     |     |
| --------- | --------------- | ----------------- | --------- | --- | --- |
In general we need three directly playable squares and an even square directly above one of
these squares. To simplify things, we number the columns in such a way that the even square lies
above the directly playable square in the second column. The second and third playable square form
the Baseinverse and the first square and the non-playablesquare formthe real Baseclaim part. Inthis
case the groups which contain both the second and third directly playable squares and the groups
whichcontain boththefirstplayable square andthenon-playablesquare, are solved.
| Baseclaim | formally: |     |     |     |     |
| --------- | --------- | --- | --- | --- | --- |
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
Three directly playable squares andthesquare abovethesecondplayable square.
| Thenon-playablesquare |     | mustbeeven. |     |     |     |
| --------------------- | --- | ----------- | --- | --- | --- |
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
All groups which contain the first playable square and the square above the second playable
square.
| Allgroupswhichcontain |     | thesecondandthirdplayable |     | square. |     |
| --------------------- | --- | ------------------------- | --- | ------- | --- |
§6.8.Before
ABefore isbased on a combination of Claimevens and Verticals. The following diagram shows
| thegoaloftheBefore | rule: |     |     |     |     |
| ------------------ | ----- | --- | --- | --- | --- |
|                    |       |     | ●●  | ●   |     |
●
|     |     |     | ●●  | ● White | to move |
| --- | --- | --- | --- | ------- | ------- |
● ●
Diagram 6.8.

In the position of diagram 6.8 no solution can be found for d3-g3 using the previous rules. Still
it is clear that d3-g3 is no real threat. If White plays f2, Black can play f3, and if White does not play
f2, Black will, sometime, and win before White can win. In both cases White cannot win at f3. In
general we need a group for the controller of the Zugzwang, which is not yet completed. If this group
will be completed, not all squares which directly succeed the at this moment empty squares of the
Before group, can be played, since the game will be over, as soon as the last man has completed the
group. Suppose the opponent plays one of the squares needed to complete the Before group (like he
would be doing by playing f2 in diagram 6.8). In that case the controller of the Zugzwang can
immediately play the successor of the squares played by the opponent. This would mean that again
not all squares which succeed the empty squares of the Before groupcan betaken bythe opponent.A
groupwhichcontains allthosesuccessorsquares, can therefore notbesolved.
●
● White to move
●
Diagram 6.9.
In the position of diagram 6.9 we take b4-e1 as Before group. b4 and e1 are still empty, which
means thattheBefore worksinthispositionforallgroupswhichneed bothb5ande2. Theonlygroup
whichneeds bothisb5-e2. The Before rule uses this time the squares b4-b5and e1-e2. Assoonas the
opponent plays b4, b5 is played and as soon as e1 is played, e2 is answered. This will ensure Black
completing b4-e1, or stopping White from completing b5-e2, in both cases b5-e2 is not dangerous.
Side effect isthat ofbothpairs b4-b5and e1-e2 at least one square can be taken, therefore solving the
vertical groupswhichcontain both.
Now let us suppose we use a Claimeven at b3-b4 instead of the Vertical b4-b5. Is the conclu-
sion still valid that White cannot complete b5-e2? It is, as can easily be seen by looking at the goal
Black has at eachempty square of his Before group: taking it, or giving it away and taken the succes-
sor square instead. If a Claimeven at b3-b4 is used, Black chooses the first variant. In general, a
Before consists of a number of Claimevens and Verticals. Some of the Verticals may have an even
upper square, as e1-e2 does. This does not matter. If the Before would consist of Claimevens only, it
would be equal to an Aftereven. In that case we can draw stronger conclusions from the Aftereven,
andtherefore weonlyuseBefores, ifanAftereven cannotbeused.
Before formally:
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
Agroupwithoutmenoftheopponent,which iscalled theBefore group.
Allemptysquares oftheBefore groupshouldnotlie intheupperrowoftheboard.
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
All groups which contain all squares which are successors of empty squares in the Before
group.

| Allgroupswhichare | solvedbytheVerticals |     | whichare | partoftheBefore. |     |
| ----------------- | -------------------- | --- | -------- | ---------------- | --- |
Allgroupswhichare solvedbytheClaimevens which are partoftheBefore.
§6.9.Specialbefore
| TheSpecialbefore | is(what’s | inaname) aspecial | version | oftheBefore. |     |
| ---------------- | --------- | ----------------- | ------- | ------------ | --- |
●
●
|     |     |     | ●   | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●
|     |     | Diagram | 6.10. |     |     |
| --- | --- | ------- | ----- | --- | --- |
In the position of diagram 6.10, we can use d2-g2 as Before group. This Before can consist of
Claimevens at f1-f2 and g1-g2 and a Vertical at e2-e3. This Before would solve d3-g3, while there
are some side-effects caused by the Claimevens and Vertical. We have to use a Baseinverse to solve
a1-d1. This way we couldlosesquare b1,whichgivesusonlyonewaytosolveb1-e4:aClaimeven at
e3-e4. ThisClaimeven would,however, beinconflict with the Vertical at e2-e3. Therefore, we have
aproblem.
Still something can be done. The only reason why we play e3 after e2, is to stop White from
getting d3-g3. Black could also play d3 instead of e3 with the same effect. This time White is
stopped and Black has the possibility to use a Claimeven for e4. What would happen if White plays
d3, before he wants to play e2? In that case Black should immediately play e2 himself, in that way
stilldoingasisdictated bytheBefore. Tobeable toplayd3ore2when necessary,it isimportant that
| d3ande2are directly | playable. |     |     |     |     |
| ------------------- | --------- | --- | --- | --- | --- |
In general we need a normal Before group, of which one of the empty squares is directly play-
able. Furthermore we need another playable square. All groups are solved which contain the succes-
sors of the empty squares of the Before group and the extra playable square. Furthermore all groups
which contain both directly playable squares, are solved, since at least one of these is taken (some
kind of a Baseinverse). For the other parts of the Specialbefore (Claimevens or Verticals) the normal
rules apply.
| Specialbefore | formally: |     |     |     |     |
| ------------- | --------- | --- | --- | --- | --- |
Required:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
Agroupwithoutmenoftheopponent,which iscalled theSpecialbefore group.
| Adirectly playable | square inanother | column. |     |     |     |
| ------------------ | ---------------- | ------- | --- | --- | --- |
Allemptysquares oftheSpecialbefore groupshouldnotlieintheupperrowoftheboard.
| Oneemptysquare | oftheBefore | groupmustbeplayable. |     |     |     |
| -------------- | ----------- | -------------------- | --- | --- | --- |
Solutions:
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)

All groups which contain all successors of empty squares of the Specialbefore group and the
| extra playable        | square.     |                             |          |
| --------------------- | ----------- | --------------------------- | -------- |
| Allgroupswhichcontain |             | thetwoplayable              | squares. |
| Allgroupswhichare     |             | solvedbyoneoftheClaimevens. |          |
| Allgroupswhichare     |             | solvedbyoneoftheVerticals.  |          |
| §6.10.Creation        | ofStrategic | Rules.                      |          |
The most elementary rules are the Claimeven, Baseinverse, Lowinverse and Vertical. These
four rules are based on simple observations which can be made by any experienced player of the
game. These observations were made by the author of this article, and implemented in VICTOR, a
| program described | inchapter | 9.  |     |
| ----------------- | --------- | --- | --- |
Testing of several positions, using VICTOR revealed some problems: Positions as diagram 3.1
where not yet shown to be at least a draw for black. This was due to the fact that the white threats at
b2-b6 were considered to be a problem. The evaluation function lacked the knowledge to see that
after black would play b2, the game would be ended. This resulted in the invention of the Aftereven
by the author. The addition of the Aftereven to the evaluation function resulted in a significant
| improvement | inperformance. |     |     |
| ----------- | -------------- | --- | --- |
New tests showed that positions as shown in diagram 6.8 where a problem. This resulted in the
invention of the Before. Although the costs of the Before where very high in implementation (the
number ofdifferent instances of the Before in most positions is about one-third of the total number of
instances of solutions of all different types), this resulted in a major improvement of strength of the
evaluation function. The analysis given in appendix B of three start moves shows that the Before is
very important. It was after the Before was implemented that the general rules for all boards with at
| most6columns | where encountered. |     |     |
| ------------ | ------------------ | --- | --- |
Special situations where the usage of the Lowinverse was necessary but resulted in problems
justabovethefields oftheLowinverse, resulted intheadditionoftheHighinverse.
The Baseclaim and Specialbefore were added after special positions were encountered where
the evaluation function did not find a solution, while the author did see no reason why a solution was
impossible. Detailed analysis then showed the general conditions for these rules. The impact of these
two rules is probably not significant. The costs are low also, and therefore this knowledge has been
| added totheevaluation | function. |     |     |
| --------------------- | --------- | --- | --- |
It is possible to find more rules, when more positions are analysed where VICTOR cannot find
a solution yet, while it is known what the result of the game will be after correct play. The last two
rules show that this will most of the times result in special rules, which can be applied only in special
| situations. Forthisreason |     | nosearch forextra | rules wasmade. |
| ------------------------- | --- | ----------------- | -------------- |

7. Interaction of Strategic Rules
In Chapter 6 we have described nine strategic rules. Each rule can be used to show that one or
more groups cannot be completed by the opponent. In chapter 5 we made clear, that these rules are
only useful, if we show that all groups are harmless. Therefore we need to combine rules, which
together will ensure that the opponent cannot complete any group. We also have seen before that
some rules cannotbe combined, ifthey partly use the same set ofsquares. Therefore it is important to
show under which constraints rules can be applied simultaneously. These conditions are deduced in
thischapter.
§7.1.Dependence ofZugzwang
Some of the strategic rules depend on Zugzwang. The Claimeven, for instance, forbids the con-
troller of the Zugzwang to play in the column of the Claimeven, if the directly playable square in the
column is the lower square of the Claimeven. The number of squares which are forbidden is in this
case even, since this lower square is odd-numbered. Therefore this does notinfluence the situation on
theremainder oftheboard. TheLowinverse forbidsthecontroller oftheZugzwang toplay any ofthe
lower squares of the Lowinverse, until the opponent has played one of them. Since in both columns
an odd number of squares is forbidden, the total number of forbidden squares due to a Lowinverse is
even. Therefore this has no influence on the remainder of the board. This means that, for instance, a
Lowinverse oncolumns aandb,andaClaimeven incolumne,donotinterfere.
●●
●●
●●
●●
● White to move
●● ●●
Diagram 7.1.
Indiagram 7.1wehave aLowinverse ata2-a3-b2-b3 andaClaimeven at e1-e2. Since bothrules
forbid an even number of squares, this has no influence on the Zugzwang which forces White to
move. Suppose White plays e1, Black then answers e2, and the whole e-column has come available.
This means a total of six squares, which is an even number, and therefore White will eventually be
forced to play a2 or b2, showing that the Lowinverse can be used to refute a3-d3. If White first
played in the Lowinverse, say a2, Black wouldhave answered a3. Now b2-b3has turned intoa Verti-
cal, which does not depend on Zugzwang. Therefore all squares in both columns have become avail-
able, fora total of10squares. Since this number iseven again, we can stillbesure that Black willget
e2.
In general it is necessary that as soon the squares of one of the rules are filled in, the number of
extra squares available willbeeven. Ifthisisnotthecase, Zugzwang changes andaproblem occurs.
Now suppose that Black also wants to have square e6 in diagram 7.1 and used a Claimeven on

e5-e6 to get it. What would happen as soon as White plays e1? Black answer e2 and the e-column
can now be filled up to e4. The total number of squares coming available in the e-column is 4, an
even number. Therefore these two Claimevens can becombined, and they bothcan becombined with
theLowinverse attheaandbcolumn.
●●
● ●
●●
●●● ●●
●● White to move
●● ●
Diagram 7.2.
In the position of diagram 7.2, White is to move. Dangerous groups for Black are a2-d2, for
which White only needs a2, and a5-d5, for which White needs both a5 and b5. Now Black wants to
solve these problems by using a Claimeven at a2 and a Lowinverse at a4-a5-b4-b5. Now let us sup-
pose that White plays e6. Now itisBlacks turn.He cannotplaya1,becauseoftheClaimeven, andhe
cannotplayb4,becauseoftheLowinverse. Soclearly something iswrongwiththeruleshechose.
How can we detect that these two rules cannot be combined? We have to look at the a-column.
If we suppose that at a certain time a1 is played by White, Black will answer a2. Now the a-column
comes available up to a3, since a4 is already part of the Lowinverse. The number of new squares is
therefore 3, which is odd. This means that filling the Claimeven would turn the Zugzwang. That
means, that either the Zugzwang was right when the Claimeven is filled, but wrong for the Lowin-
verse, or, as we have seen, the Zugzwang was wrong for the Claimeven and would turn right for the
Lowinverse. In both cases we lose one of our rules and therefore these two cannot be combined.
(Note that Black stillcan winbyplayingb4.Heshouldhave usedaBefore instead ofaLowinverse to
refute a5-d5).
Ingeneral tworules can becombined ifthenumberofsquares comingavailable after one rule is
filled in, is even. That way, we are sure that the Zugzwang will not change after a rule is filled. This
observation isthekeytochecking whichrules can becombined.
Now suppose we have a Lowinverse at a2-a3-b2-b3 and a Claimeven at a5-a6. Can these two
be combined? To see they can, we first note that the first rule filled in is the Lowinverse, since a2
must be played Before a5. As soon as a2 or b2 is played by the opponent and resp. a3 or b3 is
answered, the squares of the Lowinverse in both columns come available. In this case a2-a4 and b2-
b6, a total of eight squares, which is even. This shows that a Claimeven can be used above a Lowin-
verse, while aLowinverse cannotbeusedaboveaClaimeven.

§7.2.Zugzwang-Independent Rules
Not all nine rules depend on the Zugzwang. The Vertical for instance does not. The only
demand of the Vertical is that as soon as the opponent plays the first square, the controller of the
Zugzwang should play the other. If at some time during the game the controller wants to play the
lower square himself, that is fine, too. Therefore a Vertical can be combined with all other rules, as
longasthesetsofsquares ofthedifferent rules are disjoint. Ifthatisthecase, onecan besure that the
demands of both rules do not interfere. There are even some positions in which it is clear that dis-
jointness of squares is not necessary. Suppose we want to combine a Vertical and a Before, while the
squares of the Vertical are equal to one of the Verticals of which the Before consists. In that case
both rules have the same demands for the squares and therefore they can be combined without trou-
ble. This is, however, useless. The Vertical which is part of the Before solves all problems which are
solved by the Vertical alone, and therefore if the Before is used, it is not necessary to also use the
Vertical. Forthisreason thiscombination isnotallowed, likesomeothersimilar combinations.
The Baseinverse does not depend on Zugzwang, either. Like the Vertical it can therefore be
combined with every other rule, as long as the sets of squares are disjoint. Although it can be com-
bined with a Baseclaim sometimes, since the sets of squares are not disjoint, this is not interesting, as
inthecase ofthecombination oftheVertical andtheBefore, andtherefore notallowed.
This gives us a second observation which is important in order to find out which rules can and
which cannot be combined: a Zugzwang independent rule can (at least) be combined with another
rule, ifthesetsofsquares are disjoint.
§7.3.Combinations ofZugzwang-Dependent Rules
In exactly the same way the Vertical can be combined with the Before sometimes, although
they share some squares, the Claimeven can sometimes be combined with an Aftereven, Before or
Specialbefore. This again is not useful, since these rules solve all the problems which the Claimeven
could solve. Some other combinations can be useful, however. Suppose we have two Afterevens,
which share a Claimeven. This combination will generally solve more problems then each of them
alone. Since there are no problems in combining them, this is allowed. The same result holds for a
combination of a (Special)Before and an Aftereven. If they share a Claimeven, they can be com-
bined.They cannot,ifaVertical ofoneofthemintersects aClaimeven oftheother.
This gives rise to the following observation: two rules of the type Aftereven, Before or Speci-
albefore, can be combined if they are column-wise disjoint or equal. This eliminates the possibility
ofanintersecting Vertical andClaimeven inoneofthecolumns.
The last interesting combination is the Lowinverse and (Special)Before. If a Claimeven part of
the Before intersects with the Lowinverse, or can be found beneath the Lowinverse, we cannot com-
bine them. But what happens if a Vertical of the Before equals the two squares of one of the columns
of the Lowinverse? Since the Lowinverse ensures a Vertical in both columns, these two can be com-
bined. For this reason we can combine a Lowinverse and a (Special)Before if they are column wise
disjoint or equal and no Claimeven part of the (Special)Before is lower in a column than a Lowin-
verse part(as wasshowninsection 1).

| §7.4.Collection |     | ofPossible | Combinations |     |     |     |     |     |     |     |
| --------------- | --- | ---------- | ------------ | --- | --- | --- | --- | --- | --- | --- |
The next table shows which rules can be combined. For each combination a code is given,
which denotes a constraint which must hold to allow them to combine. The following abbreviations
are used: CL =Claimeven, BI=Baseinverse, VE = Vertical, AE = Aftereven, LI = Lowinverse, HI =
| Highinverse, |     | BC=Baseclaim, |     | BE=Before, | SB=Specialbefore. |     |     |     |     |     |
| ------------ | --- | ------------- | --- | ---------- | ----------------- | --- | --- | --- | --- | --- |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
|     | CL  | (cid:2) 1                                                              | (cid:2)                                    |         |     |     |     |     |     |     |
| --- | --- | ---------------------------------------------------------------------- | ------------------------------------------ | ------- | --- | --- | --- | --- | --- | --- |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |         |     |     |     |     |     |     |
|     | BI  | (cid:2) 1                                                              | (cid:2) 1                                  | (cid:2) |     |     |     |     |     |     |
(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
|     | VE  | (cid:2) 1                                                              | (cid:2) 1                                                                                                 | (cid:2) | 1 (cid:2) |     |     |     |     |     |
| --- | --- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------- | --------- | --- | --- | --- | --- | --- |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |         |           |     |     |     |     |     |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
|     | AE  | (cid:2) 1                                                                                                                      | (cid:2) 1                                                                                                 | (cid:2)                                                                                                                                             | 1 (cid:2) 3                                                                                                                                         | (cid:2)                                                                                                                                             |                                                                                                                                                     |                                                                                                                                                     |           |         |
| --- | --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------- |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)        |                                                                                                           | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |                                                                                                                                                     |                                                                                                                                                     |                                                                                                                                                     |                                                                                                                                                     |           |         |
|     | LI  | (cid:2) 2                                                                                                                      | (cid:2) 1                                                                                                 | (cid:2)                                                                                                                                             | 1 (cid:2) 1&2                                                                                                                                       | (cid:2) 4                                                                                                                                           | (cid:2)                                                                                                                                             |                                                                                                                                                     |           |         |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                         | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |                                                                                                                                                     |                                                                                                                                                     |                                                                                                                                                     |           |         |
|     | HI  | (cid:2) 2                                                                                                                      | (cid:2) 1                                                                                                 | (cid:2)                                                                                                                                             | 1 (cid:2) 1&2                                                                                                                                       | (cid:2) 4                                                                                                                                           | (cid:2) 4                                                                                                                                           | (cid:2)                                                                                                                                             |           |         |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)        |                                                                                                           | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                           |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |                                                                                                                                                     |                                                                                                                                                     |           |         |
|     | BC  | (cid:2) 1                                                                                                                      | (cid:2) 1                                                                                                 | (cid:2)                                                                                                                                             | 1 (cid:2) 1                                                                                                                                         | (cid:2) 1&2                                                                                                                                         | (cid:2) 1&2                                                                                                                                         | (cid:2) 1                                                                                                                                           | (cid:2)   |         |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                         | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                           |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |                                                                                                                                                     |           |         |
|     | BE  | (cid:2) 1                                                                                                                      | (cid:2) 1                                                                                                 | (cid:2)                                                                                                                                             | 1 (cid:2) 3                                                                                                                                         | (cid:2) 2&3                                                                                                                                         | (cid:2) 1&2                                                                                                                                         | (cid:2) 1                                                                                                                                           | (cid:2) 3 | (cid:2) |
|     |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                                                                                                           | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                           |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                           |                                                                                                                                                     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) |           |         |
SB (cid:2) 1 (cid:2) 1 (cid:2) 1 (cid:2) 3 (cid:2) 2&3 (cid:2) 1&2 (cid:2) 1 (cid:2) 3 (cid:2) 3 (cid:2)
|               |     | (cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                    | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |         | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |     |     |
| ------------- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
|               |     | CL                                                                                                                             | BI                 | VE                                                                                                        | AE      | LI                                                                                                        | HI  | BC                                                                                                                                                         | BE  | SB  |
| 1.Combination |     | allowed                                                                                                                        | ifthesetsofsquares |                                                                                                           |         | are disjoint.                                                                                             |     |                                                                                                                                                            |     |     |
| 2.Combination |     | allowed                                                                                                                        | ifnoClaimeven      |                                                                                                           | isbelow | theinverse.                                                                                               |     |                                                                                                                                                            |     |     |
3.Combination allowed ifsetsofsquares are columnwise disjointorequal.
4.Combination allowed ifthe sets of squares are disjoint, and the set of columns used bythe inverses
are disjointorequal.
| N.B. (i).Iftwoconstraints |     |     | are | given,bothconstraints |     | mustbesatisfied. |     |     |     |     |
| ------------------------- | --- | --- | --- | --------------------- | --- | ---------------- | --- | --- | --- | --- |
N.B. (ii). For the Specialbefore, the two special squares are said never to equal the squares of the
other rule. This means that they can only be combined with another Before, Claimeven or Aftereven
| iftheyshare | exactly | someVerticals |     | orClaimevens. |     |     |     |     |     |     |
| ----------- | ------- | ------------- | --- | ------------- | --- | --- | --- | --- | --- | --- |

|     | 8. How | to Apply the | Strategic | Rules. |     |
| --- | ------ | ------------ | --------- | ------ | --- |
Inthischapter thepositionsare described inwhichoneofthe players can trytoprove that acer-
tain result can be obtained by correct play. A game is said to be played correctly, if both players
make each move (one of) the best move(s). The result of a correctly played game is therefore always
| equal tothegame-theoretical | value    | ofConnect-Four. |     |     |     |
| --------------------------- | -------- | --------------- | --- | --- | --- |
| §8.1.Strategic Rules        | forBlack |                 |     |     |     |
We havedeveloped aset ofrules which can beused toshowthat certain potential threats can be
refuted. Since some of the rules depend on Zugzwang, it is important that the person who applies
| them, isincontrol oftheZugzwang. |     |     |     |     |     |
| -------------------------------- | --- | --- | --- | --- | --- |
As we have seen, Black is in control of the Zugzwang, as long as White has not created an odd
threat. Now suppose White has created an odd threat, which gives him control of the Zugzwang.
What would happen if we still tried to apply the rules? Is it possible that in that case we would get a
result from this application of rules which cannot be trusted, or can we be sure that the result we find
iscorrect?
If the threat White has is good, there will generally be no set of rules which can refute that
threat. In that case we do not conclude anything for Black. If we can find a way to refute the threat,
as well as all other potential threats, we have found that White is not really in control of the
Zugzwang.
From this we can conclude that we donot have to check if Black is in control of the Zugzwang,
before we try to apply the rules. If Black is not in control, the rules will not yield any result, in which
case noharm isdonebytrying.
Theabovereasoning showsthat we donothave tobeable tocheck inagiven positionwhoisin
| control oftheZugzwang. | Thismaybeadifficult | task. |     |     |     |
| ---------------------- | ------------------- | ----- | --- | --- | --- |
| §8.2.Strategic Rules   | forWhite            |       |     |     |     |
Since White normally doesnotcontrol theZugzwang, heneeds anoddthreat somewhere totake
control. Let uslookataposition(diagram 8.1)where hehassuchathreat, toshowwhathappens.
●
●
|     |     | ●●●     |      | Black to | move |
| --- | --- | ------- | ---- | -------- | ---- |
|     |     | ●       | ●    |          |      |
|     |     | Diagram | 8.1. |          |      |

Black is to move, and White has an odd threat at a3. Therefore the number of squares which
will not be filled in, in the a-column is 5. This gives White control ofthe Zugzwang onthe remainder
of the board. If he can refute every potential threat using the strategic rules, he can be sure that at
some time, Black is forced to play a2, giving White a3. In that way Black will not get any square
higher than a2 in the a-column. For this reason, White can use as an extra rule, that no groups which
| need asquare | inthea-column, | abovea2,can | becompleted | byBlack. |     |
| ------------ | -------------- | ----------- | ----------- | -------- | --- |
Thefollowing setofrules willsolveallWhite’s problems forthepositionofdiagram 8.1:
Claimeven: b5-b6,c5-c6, f1-f2,f3-f4,f5-f6,g3-g4,g5-g6. Baseinverse: d5-e5.
It is easy to see that this way all vertical problems are solved. For the other potential threats,
theusedsolutionisgiven:
| c2-f2,          | d2-g2:Claimeven   | f1-f2. |        |     |     |
| --------------- | ----------------- | ------ | ------ | --- | --- |
| b5-e5,c5-f5,    | d5-g5:Baseinverse |        | d5-e5. |     |     |
| b6-e6,c6-f6,    | d6-g6:Claimeven   |        | d5-d6. |     |     |
| d2-g5:Claimeven |                   | f3-f4. |        |     |     |
| b6-e3:Claimeven |                   | b5-b6. |        |     |     |
| c5-f2,          | d4-g1:Claimeven   | f1-f2. |        |     |     |
| d6-g3:Claimeven |                   | f3-f4. |        |     |     |
Now let us suppose that the man at a1 is not played yet. Does this mean that White does not
control theZugzwang yet? Tosee thatthisisnotthecase welookatdiagram 8.2.
●
●
|     |     |     | ●●●          | Black to | move |
| --- | --- | --- | ------------ | -------- | ---- |
|     |     |     | ● ●          |          |      |
|     |     |     | Diagram 8.2. |          |      |
In this position the set of rules of diagram 8.1 can still be used. If we now look at the squares
which can be played before Zugzwang is important we get the following list: a1, b4, c4, d5, d6, e5,
e6, g2. This isan even number ofsquares, which could have been proven also byobserving that each
strategic rule releases an even number of squares as soon as it is filled in. The threat at a3 takes an
odd number of squares, which gives an even number of free squares with Black to move. Now we
cannot tell which player is going to take a1, but this is not important. This decision can be made by
Black. If Black does not want to move at a1, he does not have to. White then has to fill that square at
| last, while | itisanoddsquare. |     |     |     |     |
| ----------- | ---------------- | --- | --- | --- | --- |
This observation shows, that in the column where White has an odd threat, he normally gets the
odd squares up to and including his odd threat. If the playable square is odd, however, Black could
decide totake that square. Ifhetakes that square, hecan beforced toeventually take the even square
aboveit,givingWhite alloddsquares inthecolumn, except fortheplayable oddsquare.
In this case Black cannot use the fact that he can get a1 and a2, and therefore this position is
stillwonforWhite.

Ingeneral, White can usethestrategic rules onthe remainder ofthe board, while he gets at least
all odd squares in the column of his odd threat, except for the lowest odd square if it is directly play-
able.
If White has more than one odd threat, he can choose one as he likes, and then let the other odd
threat bepartoftheremainder oftheboard(which normally allows theopponenttofillinthatthreat).
| §8.3.AnExample                   | Threat Combination | forWhite |     |     |     |
| -------------------------------- | ------------------ | -------- | --- | --- | --- |
| Let uslookatthepositionofdiagram |                    | 8.3.     |     |     |     |
●●
●●
|     |     |     | ●   | Black to | move |
| --- | --- | --- | --- | -------- | ---- |
●
|     |     | Diagram | 8.3. |     |     |
| --- | --- | ------- | ---- | --- | --- |
White has two groups, d1-g4 and d3-g3, which both are filled half. These two groups can
together ensure White of getting an oddthreat. This can easily be seen, bylooking at what happens if
White starts filling up the g-column. Even if Black will put in some men himself, White will get at
least one of g3 and g4, which gives him an odd threat at f3. If Black has not yet played f2, this will
become a serious problem for him. Now suppose Black has played f2 already. In that case White
answers directly f3, giving an odd threat at g3 which is serious, if g2 is not yet played. Therefore let
us suppose that as soon as White plays g2, Black plays f2. Now White answers f3, and Black must
| answer g3,givingWhite | thevictory | atg4. |     |     |     |
| --------------------- | ---------- | ----- | --- | --- | --- |
As the above reasoning shows, White can always get an odd threat, or win. Therefore he can
get holdofthe Zugzwang and trytosolve all problems ontheremainder oftheboard. Butwhat tosay
aboutthef-andg-column? We cannotbesureyet where theoddthreat willbesituated, and therefore
we have to take reckon with both variants. One in which the f-columns is filled, and one in which the
g-columns is. Which squares can White claim inthese columns, inbothvariants?
First we supposethat White has used the rules onthe left part of the board. This might result in
situations where White must answer with a move in the left part of the board, if Black plays there. It
might also result inasituation where White cannotmake any move inthat part ofthe board. We have
| toconsider all these | situations. |     |     |     |     |
| -------------------- | ----------- | --- | --- | --- | --- |
We letWhite usethefollowing strategy: Hetakes oddsquares inthef-column whenever hecan,
and if he is forced to play somewhere in these columns (since he cannot play in the left part of the
board) he takes the lowest empty square in the g-column. If Black plays in the g-column, White
| answers intheg-column. | We nowlookatalldifferent |     | variants: |     |     |
| ---------------------- | ------------------------ | --- | --------- | --- | --- |
1.Black playsf1(diagram8.4).

●●
●●
|     |     | ●   | White | to move |
| --- | --- | --- | ----- | ------- |
●●
|     |     | Diagram 8.4. |     |     |
| --- | --- | ------------ | --- | --- |
White cannot play f2, since he wants to get the odd squares of the f-column. He cannot play at
the remainder of the board, therefore he plays g2. If Black now plays f2, White answers f3, and wins
at g3org4.Inthis case Black gets f1, f2 and f4 or g3, but not both. If Black plays g3after g2, White
plays g4 and the odd threat at f3 is created. Now the g-column can be considered as part of the
remainder of the board. Let us suppose that White uses Claimevens for the remainder of the g-
| column, thenhegetsg6aswell. | Inthiscase | Black getsf1,g3andg5. |     |     |
| --------------------------- | ---------- | --------------------- | --- | --- |
2.Black playsg2(diagram8.5).
●●
●●
|     |     | ●   | ● White | to move |
| --- | --- | --- | ------- | ------- |
●
|     |     | Diagram 8.5. |     |     |
| --- | --- | ------------ | --- | --- |
White now answers g3. He has created an odd threat at f3 and can once again consider the
remainder of the g-column as being part of the remainder of the board, and using Claimeven, gets g6.
Inthiscase Black can getf1,f2,g2,g4,g5.
3.f1isplayed before g1(diagram8.6).
In the first two variants, the odd threat was created at f3. It is also possible that the threat is
created at g3. To see what happens we look at a variant in which the White man of g1 is replaced by
oneatf1.

●●
●●
● Black to move
●
Diagram 8.6.
Suppose Black plays f2, White then answers f3 and an odd threat is created at g3. This threat is
however stronger than a normal threat, since White can play g2, if he wants to, since after Black
plays g3, White still can win at g4. Therefore White cannot get Zugzwang problems, for which rea-
son he can go on taking the odd squares in the f-column, giving Black only even squares in that
column. Inthiscase Black atmostgetsf2,f4,f6,g1,g3.
Suppose Black plays g1 instead of f2. Then White plays g2, and we get variant 1 again, except
forthebottommen.
Conclusion: In all variants, White gets the odd squares of the f-column, except maybe for the
lowest, directly playable square. He gets all even squares above g4 (that is only g6). Furthermore, he
gets one out of every two squares in the g-column, starting from the first playable square up to and
including g4.(This onlyensures that Black cannotgetavertical groupintheg-column.) Last, butnot
least, Black cannot complete a group which needs both a square in the range f3-f6 and one in the
range g4-g6,since before thattime, White willhavewon.
§8.4.Threat Combinations inGeneral
The above reasoning and conclusion shows that even in this particular diagram, it is not easy to
see what White at least gets, and which groups cannot be completed by Black. For the interested
reader we state in this section which conclusions can be used by White in general if a double threat
occurs. These results are notproven here, since they rely entirely onvariant analysis ashasbeen done
in the former section. Once the diagram is clear, the validity of the conclusions in this section are not
difficult tounderstand.
First we must define in which position we can talk about a threat combination. This definition
isnotdifficult:
A threat combination consists of two groups, which both are filled with two men. One group
needs two odd squares, while the second group needs one of the two squares of the first group, and
another even square, directly above, or beneath the second odd square of the first group. The square
whichbothgroupsshare shouldnotbedirectly playable.
Asthis definitionshows, there are two different kinds of threat combinations. One has the even
square above the odd square, like in the g-column of diagram 8.3. The other kind has the even square
belowtheoddsquare, asintheg-column ofdiagram 8.7(groupsd3-g3andd5-g2).

●
●
|     |     |     |     |     | ●   | Black to | move |
| --- | --- | --- | --- | --- | --- | -------- | ---- |
● ●
|     |     |     |     | Diagram | 8.7. |     |     |
| --- | --- | --- | --- | ------- | ---- | --- | --- |
Since these two kinds are different in the way they can make claims about squares White can
| occupy,these | are | dealt withseparately. |     |     |     |     |     |
| ------------ | --- | --------------------- | --- | --- | --- | --- | --- |
1.Even squareaboveoddsquare.
| Thefollowing |     | claims | can bemade | byWhite; |     |     |     |
| ------------ | --- | ------ | ---------- | -------- | --- | --- | --- |
1)Black getsnooddsquares inthecrossingcolumn(except forafirstdirectly playable square).
2)Black willnotgetbothasquare abovethecrossing square andasquare abovethe oddsquare inthe
other column. This is caused by the fact that after both the crossing square and the odd square in the
other column are played, White must already have won the game. Therefore above at least one of
| these squares, | nomovesare |     | made. |     |     |     |     |
| -------------- | ---------- | --- | ----- | --- | --- | --- | --- |
3) Black will not get both the square above the crossing square and the odd square in the other
column.
4) If the odd square in the other column is playable, the highest square in the crossing column which
| can betaken | byBlack, | isthesquare |     | directly abovethecrossing |     | square. |     |
| ----------- | -------- | ----------- | --- | ------------------------- | --- | ------- | --- |
5) If the first empty square in the crossing column is odd and the odd square in the other column is
not directly playable, a Baseinverse can be used on the lowest squares of both columns, giving one of
| thetwosquares |     | toWhite. |     |     |     |     |     |
| ------------- | --- | -------- | --- | --- | --- | --- | --- |
6)Inthe other column eachmove of the opponent will be answered, giving (at least) one out of every
two points to the solving player up to and including the odd square in that column. If rule 5 is
| applied, thisobservation |     |     | starts onesquare | higher. |     |     |     |
| ------------------------ | --- | --- | ---------------- | ------- | --- | --- | --- |
2.Oddsquareaboveevensquare.
This type of threat combination can (again) be split in two different variants, depending on the
fact whether the even square in the other column is directly playable or not. First we look at the rules
| whichholdifthesquare |     |        | isnotdirectly | playable: |     |     |     |
| -------------------- | --- | ------ | ------------- | --------- | --- | --- | --- |
| Thefollowing         |     | claims | can bemade    | byWhite:  |     |     |     |
1)Black getsnooddsquares inthecrossingcolumn(except forafirstdirectly playable square).
2)Black willnotgetbothasquare abovethecrossing square andasquare abovethe oddsquare inthe
other column. This is caused by the fact that after both the crossing square and the odd square in the
other column are played, White must already have won the game. Therefore above at least one of
| these squares, | nomovesare |     | made. |     |     |     |     |
| -------------- | ---------- | --- | ----- | --- | --- | --- | --- |
3) If the first empty square in the crossing column is odd and the odd square in the other column is
not directly playable, a Baseinverse can be used on the lowest squares of both column, giving one of
| thetwosquares |     | toWhite. |     |     |     |     |     |
| ------------- | --- | -------- | --- | --- | --- | --- | --- |
4)Inthe other column eachmove of the opponent will be answered, giving (at least) one out of every
two points to the solving player up to and including the odd square in that column. If rule 3 is

| applied, thisobservation |        | starts     | onesquare higher.      |        |             |
| ------------------------ | ------ | ---------- | ---------------------- | ------ | ----------- |
| Iftheeven                | square | isdirectly | playable, thefollowing | claims | can bemade: |
1)Black getsnooddsquares inthecrossingcolumn(except forafirstdirectly playable square).
2)Black willnotgetbothasquare abovethecrossing square andasquare abovethe oddsquare inthe
other column. This is caused by the fact that after both the crossing square and the odd square in the
other column are played, White must already have won the game. Therefore above at least one of
| these squares, | nomovesare | made. |     |     |     |
| -------------- | ---------- | ----- | --- | --- | --- |

9. Implementation
A program has been written which can be used to determine the value of a position, using the
nine strategic rules described earlier. This program has been called ’VICTOR’. This name is chosen
since the program will always win playing White (as will be shown in chapter 13) (Incidentally, it is
alsotheauthors firstname).
§9.1.Purpose ofVICTOR
Inchapters 5to8we havedeveloped asetofstrategic rules, ofwhich we have shown howthese
can be used to determine the game theoretical value of a position. VICTOR is an implementation of
these rules, achieving one of the goals of the project: a Shannon C-type strategy program to play
Connect-Four.
§9.2.Evaluation ofaPosition
A position in which White is to move, can be evaluated with Black as controller of the
Zugzwang, while a position with Black to move can be evaluated with White as controller. In the last
case the evaluation should be done on a part of the board, without one (odd threat) or two columns
(threat combination). For this reason, the position evaluator gets a description of the board, in which
for each square is set if it can be used in the evaluation. All empty squares necessary for one of the
ninestrategic rules, shouldlieinthepartoftheboardwhich isset.
The evaluation starts with finding all possible instances of the nine strategic rules. These rules
are tried onevery part ofthe board. For eachpositionwhere a rule can be applied itisthenchecked if
application of the rule will solve at least one real problem. To do this, all 69 possibilities to connect
fourmenare checked tosee iftheycan stillbecompleted bytheopponent.
Three numbers: rows, columns and possible groups are the constants describing the dimensions
of a board. All other constants are calculated, starting from these three (such as the number 69for the
standard 7x6board). Thiswaywecan useVICTOR forother boardsizes aswell.
Each application of one of the rules which solves at least one problem is stored. These applica-
tions are called solutions. This part of VICTOR results in a list of solutions, where each solution is
stored as a struct. The struct consists of fields describing the type of rule (Claimeven, Baseinverse
etc.) and the squares involved. Furthermore for each solution we have a list of the groups which are
solvedbythesolution.These listsare atmost69groupslong.
We also make a list for each problem, which contains (pointers to) the solutions can be used to
solve the problem. We have calculated an upper bound for the maximum number of different solu-
tions,asfunction ofthenumberofrowsandcolumnsoftheboard.
After all solutions have been found, it should be checked which solutions can work together,
and which cannot. For this reason the solutions are seen as nodes of a undirected graph. Two nodes
(solutions) are connected if and only if they cannot be used simultaneously. The connections are
stored in a adjacency matrix. In order to fill the adjacency matrix, the type of the solution and the
squares involved are important. As soon as the adjacency matrix is filled, it is not important any
more toknowwhich squares are usedbya solution, orwhat kindofsolution it is. Atthat time weare

only interested in which problems can be solved bya given solution and with which other solutions it
| can worktogether. | Theadjacencymatrix | isanormal | square array. |     |     |
| ----------------- | ------------------ | --------- | ------------- | --- | --- |
Thelast part ofthe evaluation consists offinding a set ofnodes(solutions) which can beused to
solve all problems, while no two solutions are connected. If we see the problems as nodes, too, and
we connect a solution and a problem if the solution solves the problem, and no problems are con-
| nected, we can | solveitasapuregraphproblem: |     |     |     |     |
| -------------- | --------------------------- | --- | --- | --- | --- |
Given are two sets of nodes, S(olutions) and P(roblems). We try to find an allowable (in graph
theory: independent) subset C(hosen) of S, with the property that Piscontained inB(C) (the set ofall
neighboursofnodesinC).
This problem can be solved using a simple backtracking algorithm. The following recursive
function illustratestheworkingofthealgorithm.
| FindChosenSet(P, | S)  |     |     |     |     |
| ---------------- | --- | --- | --- | --- | --- |
{
| if(P== | EmptySet)     | {                |             |                 |     |
| ------ | ------------- | ---------------- | ----------- | --------------- | --- |
|        | Eureka() /*We | havefoundasubset | Cwhichmeets | allconstraints. | */  |
}else {
|     | MostDifficultNode                      | =NodeWithLeastNumberOfNeighbours(P); |     |     |     |
| --- | -------------------------------------- | ------------------------------------ | --- | --- | --- |
|     | for(all neighboursofMostDifficultNode) |                                      | {   |     |     |
|     | FindChosenSet(P                        | -{MostDifficultNode                  |     | },  |     |
S-AllNeighboursOf(ChosenNeighbour));
}
}
}
Therecursive function getsasparameters aset ofproblemnodesPwhichhave tobesolved, and
a set ofsolutions whichstillcan beused. Iftheset ofproblems isempty, allproblems are solved, and
we can stop (indicated by Eureka()). Otherwise we find the most difficult problem to solve, which is
chosen to be the problem which has the least number of solutions which can be used to solve it. For
this problem we try all of his neighbours, which are solutions, to solve the problem. Trying a solution
consists of marking the problem as solved, and making sure that all solutions which are connected to
the chosen solution cannot be used to solve an other problem. This is done by passing the appropriate
sets to the next call of the function. If a problem has no solutions any more, or none of the solutions
| work,thefunction | endswithoutsuccess,causing |     | ittobacktrack. |     |     |
| ---------------- | -------------------------- | --- | -------------- | --- | --- |
If a set of solutions is found for a given position, these solutions show the plan which has to be
followed to play the game until the desired result (win for White, or at least a draw for Black) is
reached.
Withaminormodification itispossible tosometimes detect a winforBlack instead ofat least a
draw. If we find a set of solutions of which one is an Aftereven, we can be sure that Black will win
the game. With this modification, the same search procedures can be used to do this. Currently, this
| modification isnotimplemented. |             |     |     |     |     |
| ------------------------------ | ----------- | --- | --- | --- | --- |
| §9.3.Bottleneck                | ofAlgorithm |     |     |     |     |
The recursive search for the independent set is potentially NP-complete. Given the fact that the
number of solutions on the 7 x 6 board can be as much as several hundreds, one could expect that the

recursive search would be the bottleneck of VICTOR during execution. This is not the case. The
amount of time spent to find the solutions is in general responsible for over 80% of the used CPU-
time, including the building of the adjacency matrix, which is rather expensive. The recursive search
takes normally less than 10% of the CPU-time. This is probably due to the fact that in most positions
there are some groups which permit only one or two solutions. After chosing these, the possible
number of solutions for the other problems decreases, giving not much possibilities to backtrack.
This fact is illustrated best by looking at the test results which show that the evaluation of a position
onthestandard boardnever takes more thanafew CPUseconds.
§9.4.Some Dataonthe Program
VICTOR was written in the C programming language. The source code consists of about 5000
lines of C-code and an additional 1000 lines of comment. VICTOR consists of several modules. For
each strategic rule, one module is made. The way these modules interact makes it easy to add new
strategic rules, with only minor modifications in existing code. This is easily understood, by looking
at section 9.2. Only the first part of the algorithm uses information about the different kinds of solu-
tions. As soon as the adjacency matrix is build, these differences are nolonger used. For a new solu-
tion type, we first need to find all instances which can be used to solve problems. This part is com-
pletely independent of the other solution types. Next the adjacency matrix must be build. Here infor-
mation is needed to detect if two solutions can be used simultaneously. That part of VICTOR uses a
table, as described inchapter 7.Modification ofthe table just consists ofadding another rowofpossi-
bilities, and implementing possible new conditions which must be checked. This has be done several
times since the first evaluation function was written. Section 6.10 describes the way the nine rules
where found,implyingthattheevaluation function haschanged throughtime.
The evaluation part of VICTOR uses an adjacency matrix to keep track of the connected nodes
ofthegraph. Duetothislarge matrix, theevaluation partusesabout2Mbatruntime.
The time needed to evaluate a position depends roughly on the number of men in the position.
The larger the number of men, the shorter it takes to evaluate a position. Evaluation time lies some-
where between 0.01and10seconds.

|     |     |     | 10. First | Results. |
| --- | --- | --- | --------- | -------- |
Using VICTOR, consisting solely of the evaluation function (and some nice I/O routines), tests
| were made.  | Theresults | ofthese tests | are presented | inthischapter. |
| ----------- | ---------- | ------------- | ------------- | -------------- |
| §10.1.Small | Boards     |               |               |                |
The evaluation function was also used for boards smaller than the standard 7 x 6 board. All
boardsusedhadaneven numberofrows,since rules depending onZugzwang make useofthatfact.
It is not difficult to check that all rules derived in chapters 5, 6, 7 and 8 are independent of the
board size. The only important aspect of the board size is the fact that Zugzwang should not change
| after fillingupacolumn. |     | Therefore | thenumberofrowsmustbeeven. |     |
| ----------------------- | --- | --------- | -------------------------- | --- |
For six boards, 4 x 4, 4 x 6, 5 x 4, 5 x 6, 6 x 4 and 6 x 6, VICTOR was used to find a good
answer for Black after the first move of White. In all six positions the program found a good (i.e.,
leading to a draw) answer for Black against every first move of White. After VICTOR had found
similar results on a 6 x 8 board, we looked into the reason why VICTOR was sure about getting at
least a draw. This resulted in finding the strategic rules which can be used on all boards of 6 columns
| orlessandaneven |     | numberofrows(see | chapter | 2,section 3). |
| --------------- | --- | ---------------- | ------- | ------------- |
Asanexample, wegivetheset ofrulesVICTOR foundforanempty6x6board:
|     | Before a1a2b1b2c2c3d2d3 |      |     |     |
| --- | ----------------------- | ---- | --- | --- |
|     | Before a3a4b3b4c4c5d4d5 |      |     |     |
|     | Before b1b2c2c3d2d3e1e2 |      |     |     |
|     | Before b3b4c4c5d4d5e3e4 |      |     |     |
|     | Before c2c3d2d3e1e2f1f2 |      |     |     |
|     | Before c4c5d4d5e3e4f3f4 |      |     |     |
|     | Baseinverse             | c1d1 |     |     |
|     | Claimeven               | a5a6 |     |     |
|     | Claimeven               | b5b6 |     |     |
|     | Claimeven               | e5e6 |     |     |
|     | Claimeven               | f5f6 |     |     |
If we lookat the Claimevens which are part of the Befores, we see that Claimevens are used at:
a1-a2, a3-a4, a5-a6, b1-b2, b3-b4, b5-b6, e1-e2, e3-e4, e5-e6, f1-f2, f3-f4 and f5-f6. These are
equivalent withtherulewhichsaysthatinthecolumns a,b,eandf,Black shouldplayfollow-up.
The Baseinverse at c1-d1 shows the fact that after the first answer in the middle column, the
other middle column should be played. The verticals c2-c3, c4-c5, d2-d3 and d4-d5 show that after
theBaseinverse isplayed, Black hastoanswer eachmoveinamiddle columninthatsame column.
It should be clear that, given enough time, VICTOR would have found a similar set of rules for
any6x(2n)board.

| §10.2.The | 7x4Board |     |     |
| --------- | -------- | --- | --- |
Thestrategy whichhasbeendescribed inchapter 2does notwork onaboard with more than six
columns. On these boards it is not possible for Black to refute all horizontal combinations in a row,
with only one move, as could be done on a board of 6 columns or less. If, however, White does not
play in the middle column with his first move, Black has the opportunity to refute all horizontal
groups in the first row with only one move. Therefore it is not very surprising, that if White does not
plays his first man in the middle column on a 7 x 4 board, Black has an easy path to at least a draw.
Since the strategy Black can use in that case will be explained for the 7 x 6 board, we will omit it
here.
What happens if White plays 1. d1, .. ? In that case VICTOR could not find a strategy to give
| Black atleast | adraw. |     |     |
| ------------- | ------ | --- | --- |
At this time we had to start suggesting a best move for Black and see if after all answers of
| White, Black | couldfindadrawing | strategy. |     |
| ------------ | ----------------- | --------- | --- |
This approach can be used repeatedly: For all positions VICTOR cannot solve, we suggest a
best move for Black, and see ifall positionsafter answers ofWhite, can be solved. Inthis way it was
possible to show that Black can get at least a draw on a 7 x 4 board, in all variants, evaluating only
aboutthirtypositions.
| §10.3.The | Standard 7x6Board |     |     |
| --------- | ----------------- | --- | --- |
Since the search tree which was build manually for the 7 x 4 board was rather small, the same
approach was tried for the 7 x 6 board. Like on the 7 x 4 board, the only move White can make to
have a chance to win the game, is 1. d1. All other moves give Black the possibility to use a simple
strategy toachieve an easy draw. The strategic rules used byVICTOR after 1.a1orb1orc1toshow
that Black can reach a draw are given in appendix B. It is easy to see that the solutions found can be
| extended | toallboards oftheform7x(2n),fornanatural |     | number. |
| -------- | ---------------------------------------- | --- | ------- |
Since the search tree became very large after 1. d1, a manual approach could not be successful.
For this reason this approach was automated. The techniques used are described in the next chapters,
| aswell astheresults | foundinthisway. |     |     |
| ------------------- | --------------- | --- | --- |

11. Automated Analysis.
Ashas been stated inchapter 10,the positionafter 1.d1 onthe standard 7 x 6board was not yet
clear. The search tree starting from this position was also too large to search manually. For this rea-
son an automated search needed to be used, which could try to show that starting from a given posi-
tion, Black could always draw the game, or White could always win. Using such an automated
search, several unclear positionscould be tested, at the end (hopefully) showing what the value of the
game wouldbeafter correct play. Theusedsearch methodsare described inthischapter.
§11.1.The Oracle
Let us suppose we have access to an oracle. This oracle is able to tell us in a given position,
which move is the best that can be made. Unfortunately, the oracle is not able to tell us what the
result willbe, ifbothplayers play correctly, starting from that position. How can we use the informa-
tionprovided bytheoracle?
We can start by giving the initial position to the oracle and ask for the best move. After playing
that move, we reach a new position which is also offered to the oracle. Again we play the move sug-
gested bythe oracle. We repeat this untilthe game has ended. Let us suppose that White has won the
game. Does this result imply anything? To show it does we suppose that Black does not necessarily
have to loose the game. If that is the case, he should have somewhere played another move then he
played in the game guided by the oracle. However, that would mean that somewhere the oracle did
not suggest the best move, which cannot be true. This shows, that the result of only one game, pro-
vided that both players made the best move all the time, is enough to determine what the result will
beafter correct play.
Unfortunately, we do not have access to a perfect oracle. Let us therefore suppose we only can
use an oracle which can tell us which moves are best for White, but sometimes fails to tell us what
Black should do. We again play a game guided by the oracle, and end up with White winning. Does
this result imply anything? We now are not sure Black played the best moves all the time. Therefore,
in all positions where Black had to move, Black still can try some other moves. He might find a path
which leads to a draw, or even better, a win. It is not useful for White to try other moves, as long as
the moves given, lead to a win. Only if Black forces to go in a new variant, White needs to find the
bestmoveagain. Fortunately, theoracle willtell himwhichmovetochoose.
As long as White keeps winning, it is enough to try all variants for Black if Black is to move,
and onlytrythe best move for White. White doesnotneed tochange, since heisperfectly happywith
the result. IfBlack wouldfinda path to a draw, which makes Black happy, White is the one who has
totryallvariants, while Black can stick toonlyone,aslongasthatresults inadraw.
Therefore itisvery valuable toknowwhat the result willbestarting from a given position, even
if we have to confirm it by trying all variants. We then know for which player we have to try all dif-
ferent moves, and for which player we only have to try the best move. This eases our task consider-
ably.

§11.2.Conspiracy-Number Search
It has been shown in the former sections, that large amounts of work can be saved, if we grow
only the useful parts of a minimax tree. A simple n-ply tree is therefore of no use. Recently, McAl-
lester suggested a new search method in minimax trees. This new method is called conspiracy-
numbersearch.
In this section we will consider only the simple form of conspiracy-number search which has
been used forourConnect-Fourprogram. Moregeneral descriptions ofconspiracy-number search can
befoundin[7]and[8].
In the next sections we will use different values for the possible results of the evaluation func-
tion. -1 is used to mean that Black can at least draw the game, 0 means that a positionis still unclear,
while the value 1 indicates that White can win the game. Now White wants to get a maximal result
(1), while Black tries to get a minimal result (-1). Therefore nodes in the search tree where White is
to move are called max-nodes. Nodes where Black is to move are called min-nodes. Note, that for a
max-node, it is enough to find one son which has value 1, in order to change the value of the max-
node itself into one. To change the value of a max-node into -1, all sons have to have the value -1.
Forthemin-nodes,theoppositeistrue.
In our search tree a node can have three different values. Two of these, -1 and 1, are values
which cannot be changed. As soon as a node has one of these values, we know it is useless to evalu-
ate sons of the node, since it can never change value. If a node has value 0, we can change its value,
by evaluating its sons. As we have seen before, it is easier to change the value of a max-node into 1
then into -1. For the first change, we only need to find one son which has the value 1, while for the
value -1, we need to change the values of all his sons into -1. One could say that all his sons must
conspire inorder tochange itsvalue into-1. Therefore theconspiracy numberfor-1ofamax-nodeis
equal to his number of sons if no son has been evaluated yet. As soon as one one or more of his sons
hasbeen evaluated andhasthevalue -1,theconspiracy numberdecreases.
The conspiracy number for the value 1 for a max-node is 1, as long as no son is evaluated with
value 1,since weonlyneed tofindoneson,whosevalue is1,tochange thefathers value to1.
In general we have for each node two conspiracy numbers associated with it. One conspiracy
number for reaching the value -1 and one conspiracy number for the value 1. These conspiracy
numbers are equal to the least number of nodes in the subtree with this node as root, which have to
conspire in order to change the value of the father to the given value. As soon as one of the con-
spiracy numbers becomes 0, the value associated with that conspiracy number becomes the value of
that node. At that time the conspiracy number for the other value should have become infinite, since
there isnofinite numberofnodeswhich couldbyconspiring change thevalue ofthenode.
Ifweevaluate anewnodewehave tofindthecorrect conspiracy values. These are very easy to
find:
Evaluation returns -1:Conspiracy(-1) =0,Conspiracy(1) =infinite.
Evaluation returns 0(Min-node):Conspiracy(-1) =1,Conspiracy(1) =Number ofSons.
Evaluation returns 0(Max-node):Conspiracy(-1) =Number ofSons,Conspiracy(1) =1.
Evaluation returns 1:Conspiracy(-1) =infinite, Conspiracy(1) =0.

§11.3.Howtouse Conspiracy-Number Search
The only thing we have done so far, is adding some information to each node. Now we should
make use of the conspiracy numbers. To see how we can use it, we look at the meaning of the con-
spiracy numbers. If a conspiracy number is high, this means that we need to evaluate a large number
ofnodes,
in order to have a chance that the value of the root will change into that value. It is also possible, that
while evaluating some of these nodes, we find that we have to evaluate even more nodes, since these
nodesandtheir sonsare stillunclear.
Ifaconspiracy numberislow,wehave achance thatwe needonlyevaluate afew nodes.
We now use the following reasoning: suppose we can find the value of the root by evaluating
just a few nodes, it would be a waste to first evaluate many other nodes. If, on the other hand, we
need toevaluate alarge numberofnodes,notmuchharm isdone,ifwefirstevaluate afew others.
This reasoning says that if we have a chance to finish work soon, we should try that. Even if we
discover that it doesnotwork, the amountofextra work proportionaltothe workwe have todoafter-
wards isnotmuch.If,however, weare lucky, wehave saved alotofwork.
Applying this to conspiracy numbers, we first look at the conspiracy numbers for both values
and decide which result seems easier to achieve. After we have chosen the value which we try to
achieve, we look at all sons and pick the one which has the least conspiracy number for that value.
We are first going to try to change the value of that node. To do this, we pick the son of his, which
has the least conspiracy number, for the chosen value. If this node is still unclear, we pick the son of
hiswith least conspiracy number forthe chosen value, etc. Eventually, wereachanodewhich hasno
sons yet. This node we expand, and we evaluate all his sons. Using the conspiracy numbers of these
sons, we adjust the conspiracy number of the node we just expanded. This might change the con-
spiracy number of his father, his fathers father, etc. After we have changed the conspiracy numbers
of all his ancestors, we start again at the root, repeating the whole procedure. Hopefully, soon the
value oftherootischanged into-1or1,whichconcludes oursearch.
§11.4.Performance ofConspiracy-Number Search
Although a search tree which is grown using conspiracy-number search, is not a simple n-ply
tree, it is very well possible that much more than only the best variant for one player is tried. Let us
see what happens in an undesirable position. We assume that the strategic rules are powerful enough
to determine the value of any position of at least 10 men, while it cannot find any conclusions for
positions with 9 men or less. Given this information, we can easily see what happens to the tree
grown by the conspiracy-number search. Since all variants are equally bad, attention will be divided
between all variants. This will result in a tree which is roughly equally deep in all variants. In this
way we will probably not be able to find any results, since there are a large number of positions con-
taining 9menorless.
This shows that although conspiracy numbers tend to try promising variants sooner than others,
they sometimes cannot distinguish between good and bad variants and will therefore grow a tree
whichistoowide.
This theoretical observation was confirmed by practical results. First we look at an example
whichworked fine.

|     |     | ●●● | White to | move |
| --- | --- | --- | -------- | ---- |
●
Diagram 11.1.
Thepositionofdiagram 11.1can bewonbyWhite, byplayingthefollowing variant:
5.a1,b1
6.b2,d4
7.b3,e3
8.e4,..
The positionafter the 8th move of White can be shown to be a win for White. All moves made
by Black are forced, and therefore the conspiracy number for the value 1 is at all nodes in this vari-
ants equal to 1. Therefore this variant is expanded immediately, before a lot of time is spent in other
| variants where                       | Black hasalotofchoice. |                  |          |      |
| ------------------------------------ | ---------------------- | ---------------- | -------- | ---- |
| Inotherpositionstheconspiracy-number |                        | search getsworse | results. |      |
|                                      |                        |                  | White to | move |
●
Diagram 11.2.
In the position of diagram 11.2, Black made a very bad first move. Therefore many positions
which can be reached from this position can be won by White. Since we can only evaluate positions
for White in which White has a real odd threat or a threat combination, most positions will be
unclear. From this positiontherefore atree isbuild inwhich mostvariants are grownsimultaneously.
| Even after atree | of10,000positionsisbuilt,noresult | hasbeen | found. |     |
| ---------------- | --------------------------------- | ------- | ------ | --- |
Therefore conspiracy-number search alone, does not guarantee us that the main variants are
searched first. The next section shows howwe can combine conspiracy-number search and depth first
search.

§11.5.Conspiracy Numbers asOracle
Suppose,asindiagram 11.2,that a tree of10,000nodesisbuiltand noresult has been foundfor
the rootyet. Inthat case all seven sonsoftheroothave conspiracy numbers set. Lookingatthese con-
spiracy numbers we can try to get an impression about which variant is the best in order to achieve a
winforWhite, since White istomoveintherootposition.
There are different ways to choose a son as ’best son’. We could take the node with the lowest
conspiracy number for White. We could also take the son with least quotient
WhiteConspiracyNumber/BlackConspiracyNumber. An argument in favour of the last criterion is
that it is very well possible that the number of nodes in the subtrees are far apart. Therefore it is pos-
sible that the conspiracy numbers for one son are 10 and 15 respectively, and for the other 11 and
200. The conspiracy numbers for White are almost equal, but for Black they are far apart. It is clear
that the chance that the first son eventually appears to be at least a draw for Black is much higher
than the chance that the second variant will be a draw for Black. For that reason we choose the
secondsonasbestvariant. Ingeneral weusetheabovedescribed quotienttochose abestson.
After a son is chosen, we first determine the value of that son. This is done in exactly the same
way as for the initial position: first we build a search tree using conspiracy-number search. If this
does not yield a result, we chose the best variant for the player whose turn it is, and start again with a
new position. At last we will have determined the value of this son. At that time we go back to his
father and evaluate that position again, using the knowledge of this son we have evaluated. If, for
instance, this son is won by White, and White was to move in the father position, it is clear that the
father position can be won by White. If however, the son can be drawn by Black, we have to try
other variants to see if we may have chosen a wrong variant. In this way we will normally only try
alternatives for the player which cannot get the result he wants to achieve. Only if we first try a bad
variant before thebestvariant, we dotoomuchwork.
The choice for the variant is based on a large search tree, and therefore we can hope that we
willmostofthetime choosetherightvariant.
§11.6.Three-LevelSearch
Thehere described search methodnowconsists ofthree levels toevaluate aposition:
The first level consists of the knowledge-based search. A position is evaluated using strategic
rules only.Theresult ofthisis-1(at least adraw forBlack) 0(unclear) or1(winforWhite).
The second level consists of the conspiracy-number search. A search tree is built, using con-
spiracy numbers. Each node is evaluated using the first level search method. This can result in a
value forthe root(-1 or1), orthe fact that the positionis still unclear, even after a large tree has been
build (10,000 positions for instance). If that is the case, the conspiracy numbers of the sons of the
rootare usedtodetermine whichsonisthebestvariant.
The third level consists of the Depth First Search. Using the second level search method, each
node is evaluated. If the result of the node is -1 or 1, we return to the father of the node. If the result
ofthenodeis0,we usetheinformation aboutthesonstodetermine which sontotryfirst.

12. Implementation of Conspiracy-Number Search and Search Tables.
In this chapter the implementation of the conspiracy number search in our Connect-Four pro-
gram isexplained.
§12.1.Search TreeinMemory during Search
Conspiracy number search chooses a node to expand, expands it and evaluates its sons. After
this has been done another node is chosen, expanded, etc. The nodes which are chosen after each
other can be part of different subtrees, and for this reason, we need to have all subtrees in memory,
during the search. For most chess programs this is a problem, since the number ofpositionsevaluated
during a search is so large, that it is impossible to keep the whole search tree in memory. In the case
of VICTOR, we do grow search trees in the order of 10,000 positions, which makes it easily possible
tokeep theentire tree inmemory.
§12.2.Transpositions
A node of the search tree is equivalent to a position, while the connections between fathers and
sons in the tree determine the way the position was reached. While playing Connect-Four, it is very
well possible to reach the same position in several different ways. If we look at the position of
diagram 12.1, it is not possible to tell, which of the three given variants was played to reach the posi-
tion.
● White to move
●
Diagram 12.1.
1.d1,d2
2.c1,e1
or
1.d1,e1
2.c1,d2
or
1.c1,e1
2.d1,d2
Now suppose we make an analysis of the initial position. It is then very well possible that the

position of diagram 12.1 will be part of the tree in three different variants. As soon as we have
evaluated the position in one of the variants, we do not need to evaluate the position in the two other
variants anymore, since thevalue isindependent ofthewaythepositionisreached.
Therefore we should store the positions in a way which makes it easy to determine how many
times thepositionissonofanother father. Thiswaywecan prevent todoextra work.
Thewaywesolvedthis problem isbygivinga nodepotentially more than one father. When we
evaluate a node, we first try to find it in the set of nodes we already have. If the node is found there,
another father is added to the list of fathers for this node. It is not evaluated, since that has already
been done. If the node was not found, a new node is created with only one father, and the node is
evaluated.
When the conspiracy numbers of a node are updated, we normally had to pass the information
tohisfather. Thistime wehave topassittoallhisfathers.
The structure we now have is no longer a tree. It is a directed acyclic graph, but we can still
lookatit,asifitwere atree. Theonlydifference istheupdatingofallfathers, instead ofone.
Note that since we update all fathers if a node’s conspiracy values change, the node is actually
seen as some copies of the same node. Therefore the node is counted as many times as it is part of a
variant which leads to that node. It is therefore possible that both conspiracy numbers of the root are
larger than the number of leaves which need to change value, since some of the leaves occur in more
than one variant. Since this undesired effect does not change the nature of the conspiracy number
search, and can happen in all variants -upgrading on the average all conspiracy numbers alittle-it is
notremoved.
§12.3.Combination ofConspiracy-Number Search andDepth-First Search
As has been stated in chapter 11, the result of building a search tree with conspiracy numbers is
either the value of the root, or a guide to choose what the best move is from the root position. In the
latter case, we build a new search tree from the best son of the former root. This tree will contain a
large number of positions which we have evaluated before. It would therefore be a waste of CPU
time, to evaluate these again. For that reason search tables are build, which contain all positions for
whichwe havefoundthecorrect value sofar.
§12.4.Search Tables
A search table is a set of positions which have been evaluated. The position and the result are
stored in the table. These search tables can be used to check if a position which has to be evaluated
already has been evaluated. If the position is found in the search table, the result which is stored
there isused, instead ofthevalue obtained byevaluating thepositionagain.
We have changed VICTOR to work with a search table. Each time a search tree is built, for
eachpositionitischecked ifit ispart ofthe search table. After the new search tree has been built,no
matter ifthevalue oftheroothasbeen determined, eachpositioninthe search tree ofwhich the value
isknowntobe-1or1,isstored inthesearch table, unlessitwasalready there.
Diagram 12.2showstheadvantages ofthisapproach:

|     |     |     | ●   |     | White to | move |
| --- | --- | --- | --- | --- | -------- | ---- |
●
|     |     |     | Diagram | 12.2. |     |     |
| --- | --- | --- | ------- | ----- | --- | --- |
The position of diagram 12.2, reached after 1. d1, d2. 2. c1, e1, has been shown to be at least a
draw for Black, after a long analysis. All positions evaluated during this analysis are stored in the
| search table,   | including | thispositionitself, | since itsvalue       | isknown. |          |      |
| --------------- | --------- | ------------------- | -------------------- | -------- | -------- | ---- |
| Nowsupposeweare |           | goingtocheck        | thepositionofdiagram |          | 12.3:    |      |
|                 |           |                     |                      |          | White to | move |
●
|     |     |     | Diagram | 12.3. |     |     |
| --- | --- | --- | ------- | ----- | --- | --- |
Usingthesearch table, itisimmediately foundthat2.c1isnotagoodmoveforWhite, since the
answer 2 .., d2 results in a position which is at least drawn for Black. If this position would not have
been part of the search table, the whole analysis which has been done for the position of diagram
12.2,hadtoberepeated.
One could argue that even those positions which are still unclear, should be part of the search
table. We have chosen not to do this, since the only thing we gain for such a position is the time
needed to evaluate that position. Positions of which we have determined the correct value, may have
been solved only after a large search tree has been build starting from that position. Putting such a
position in the search table not only saves the time to evaluate that position, but also the time needed
| torebuild | thatwholesearch | tree. |     |     |     |     |
| --------- | --------------- | ----- | --- | --- | --- | --- |
The possibility to find positions in the search tables which are the root of a large subtree, of
which the game-theoretical value has already been found, is the main reason to implement the search
tables.
| §12.5.Generalised | Positions |     |     |     |     |     |
| ----------------- | --------- | --- | --- | --- | --- | --- |
If a large part of the board is filled with men, some men are surrounded by men of the other
colour. In such a position it is possible that some of the men cannot become part of a winning group

| anymore. Toillustratethis,we |     | lookatdiagram | 12.4. |     |     |
| ---------------------------- | --- | ------------- | ----- | --- | --- |
|                              |     | ●             | ●     |     |     |
●●
|     |     | ●   | ●   |     |     |
| --- | --- | --- | --- | --- | --- |
●●
|     |     | ●   | ●   | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●●
Diagram 12.4.
If we lookat the white man at a1, it is clear that that man cannot become part of winning group
any more. Therefore we can say that the fact that that man is White is not relevant in this position.
This does not mean that it could as well have been Black. We only claim that the fact that the man is
white is not important for any new potential threats. Still it is important that the man has been played
| there, otherwise | theother meninthea-column |     | couldnothave | been played. |     |
| ---------------- | ------------------------- | --- | ------------ | ------------ | --- |
We call all men which cannot become part any more of a winning group, in a given position
indifferent. In the position of diagram 12.4. all men in the a-column and b-column are indifferent,
| while all themeninthec-column |     | andd-column | are not. |     |     |
| ----------------------------- | --- | ----------- | -------- | --- | --- |
The reason whywe defined indifferent men willbecome clear, after we have lookedat the posi-
| tionofdiagram | 12.5. |     |     |     |     |
| ------------- | ----- | --- | --- | --- | --- |
●
●●●
●
●●●
|     |     |     | ●   | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●●●
Diagram 12.5.
The only difference between the positions of diagrams 12.4 and 12.5 is the order in which the
a-column has been filled. Since the rest of the game will be played at the other side of the board, we
| wonderifthegame-theoretical |     | values ofbothpositionsare |     | equal. |     |
| --------------------------- | --- | ------------------------- | --- | ------ | --- |
To see, that they must be equal, we look at the set of indifferent men of position 12.5. Just like
in the positionof diagram 12.4all men inthe a-column and b-column are indifferent, while the others
are not.
From the fact that the set of indifferent men of the two positions are equal and all other men are
equal, we conclude that the game-theoretical value of the positions must also be equal. To see this,
we suppose that play has proceeded in both positions in exactly the same way. Now suppose that one
of the players wins as play proceeds in one of the positions. Then the winning group cannot contain
any indifferent men, and therefore the same player will have won at the same time in the other

position.
In general: since any winning group of four men cannot contain indifferent men, a game which
leads to a win starting from one position leads also to a win in the other. In other words, the game-
theoretical value of two positions which have exactly the same set of indifferent men and contain
equal menatallother squares, mustbeequal.
This observation can be used in the search tables. Instead of putting a normal position in the
search table, we have three kind of men: White, Black and Indifferent. Every time we want to check
if some position is present in the search table, we first change the position into a position with indif-
ferent men, and check if that position is part of the search table. This way we can easily use the con-
clusions about, for instance, the position of diagram 12.4, to find the game-theoretical value of the
positionofdiagram 12.5.
One should note that the fact that, for instance, a White man is indifferent, does not imply, that
itcouldaswell have beenaBlack man. Tosee this,welookatthepositionofdiagram 12.6.
● ●
●●
● ●
●●
● ● White to move
● ●
Diagram 12.6.
The only difference between the positions of diagram 12.4 and 12.6, are the men at a1 and b1.
In the position of diagram 12.4 these men where indifferent. Now we have changed the colours of
these men, the man at b1 is no longer indifferent, since it can be part of the group b1-e4. The values
of the positions 12.4 and 12.6 are not necessarily the same, since their sets of indifferent men are not
equal.
This example shows that an indifferent man cannot be replaced by a man of the other colour.
The only thing we know about an indifferent man, is the fact that its current colour is not useful dur-
ingtherest ofthegame.
§12.6.Symmetry
It should be clear that when the position of diagram 12.7 is evaluated, the result is equal to the
result ofdiagram 12.2.

|     |     |     | ●   | White to | move |
| --- | --- | --- | --- | -------- | ---- |
●
|     |     | Diagram | 12.7. |     |     |
| --- | --- | ------- | ----- | --- | --- |
These two positions are each others mirror image after reflection in the middle column of the
board. Itiseasy tosee thatpositionswhich are eachothersmirror image havethesame result:
If we lookat the standard situation where two human players play against each other, they sit at
opposite sides of a vertical framework. They look at different sides of the men which are thrown into
the framework. The result of this is, that if one player sees the position of diagram 12.7 the other
| player sees | thepositionofdiagram | 12.2! |     |     |     |
| ----------- | -------------------- | ----- | --- | --- | --- |
Since we now know that two positions which are each others mirror image are equivalent, in
VICTOR an ordering is defined between positions. For every position given, it is compared using
that ordering, with its mirror image. The smallest position according to the ordering is then chosen.
In this way, we can be sure we are not working with mirror images of positions we have already
evaluated.
The result of this is, that the initial position has only four different sons, since the moves e1, f1
and g1result inmirror images ofthe first three moves. Due tothe fact that we list all possible fathers
of a given son, the initial position gets seven sons in our implementation, of which three have two
| fathers, | which are equivalent. |     |     |     |     |
| -------- | --------------------- | --- | --- | --- | --- |
Although one could argue that this is not the best representation possible, it has some nice
features: the concept of search tree is not changed where it was not necessary. If in a given position7
different moves can be made, we are sure we can find a son where we look for him. We do not have
to check if symmetry arises. Symmetry is thus only dealt with at the time a position is evaluated.
| Afterwards, | wedonothavetoconcern | ourselves | withit. |     |     |
| ----------- | -------------------- | --------- | ------- | --- | --- |

13. Results for the Standard 7 x 6 Board
In previous chapters various aspects of VICTOR where described. VICTOR has been used for
an exhaustive search of the 7 x 6 board, in the hope to find the game-theoretical value for the initial
position. As will be shown in this chapter, it was found that White can always win, if and only if he
starts playing1.d1.
§13.1.Initial Moves
As has been stated in chapter 11, Black has an easy strategy which gives him at least a draw,
which works in all variants of an 7 x (2n) board, provided the fact that White does not start at d1.
This strategy isdescribed inappendix B. The onlyremaining first move for White which gives him a
win,is1.d1. TothismoveBlack hasfourdifferent answers. Allofthese have been checked.
§13.2.1.d1,d2
● White to move
Diagram 13.1.
The position of diagram 13.1 can be won by White. It was easy to show that all other moves
than2.d3willgiveBlack atleast adraw. After 2.d3we getthepositionofdiagram 13.2.
● Black to move
Diagram 13.2.
Itdidnottake mucheffort toshowthat eachmoveat the bottom rowforBlack loses inthe posi-
tion of diagram 13.2. This is mostly due to the fact that White can take the field d4, while he already
hasd3. Therefore 2...,d4isBlacks last chance. That leads tothepositionofdiagram 13.3.

●
● White to move
Diagram 13.3.
In the position of diagram 13.3 it was easily shown that all moves at the bottom row lose for
White. Therefore White’s thirdmoveisforced: 3.d5,... Thisleads tothepositionofDiagram 13.4.
●
● Black to move
Diagram 13.4.
In the position of Diagram 13.4, it did not take much effort to show that three of the four possi-
ble moves for Black lose. The only move which remained unclear for some time was 3 .., b1. This
resulted inthepositionofDiagram 13.5.
●
● White to move
●
Diagram 13.5.
This time not all White moves were checked. Best move to play seemed to be 4. b2. This posi-
tion is shown in diagram 13.6. As we will see, 4. b2 will lead White to a win. Therefore it is not
necessarytolookatother possibilitiesforWhite.

●
|     |     | ●   | Black to | move |
| --- | --- | --- | -------- | ---- |
●
Diagram 13.6.
The position of diagram 13.6 was the most difficult position of the whole variation 1 d1, d2.
After a long search, VICTOR showed that White can win from this position. This conclusion showed
that1d1,d2leads toawinforWhite.
§13.3.1.d1,c1
| Thepositionofdiagram | 13.7results | after 1.d1,c1. |          |      |
| -------------------- | ----------- | -------------- | -------- | ---- |
|                      |             |                | White to | move |
●
Diagram 13.7.
Itwaseasy toshowthatWhite nowonlyhas three possibilitiestowinthe game: 2.c2or2.f1or
2. g1. Although VICTOR’s conspiracy numbers indicated that 2. f1 should be tried first, the author
thoughtthat2.c2wasabetter choice. After alongsearch itwasshownthat2.c2givesBlack the pos-
sibility to at least draw the game. To reach that result, Black must play 2 .., c3, otherwise White still
| can win. Thepositionafter | 2..,c3isshowninposition13.8. |     |     |     |
| ------------------------- | ---------------------------- | --- | --- | --- |
●
|     |     |     | White to | move |
| --- | --- | --- | -------- | ---- |
●
Diagram 13.8.

It was easy to show that most moves in position 13.8 for White do not lead to a win. The only
movewhichseemed promising was3.c4.Thispositionisshowindiagram 13.9
●
Black to move
●
Diagram 13.9.
In the position of diagram 13.9 most moves were easily shown to be lost for Black. The only
moves which were not clear yet, were 3 .., d2and 3 .., g1. Unfortunately, it was shown that after 3..,
g1there was no move which will give White a win. From this conclusion it followed that the move 2
c2leads toat least a draw for Black. Therefore another secondmove for White had tobetried. VIC-
TOR had already suggested 2 f1 as a best move and this time the author listened to that suggestion.
Thepositionisshownindiagram 13.10.
Black to move
●
Diagram 13.10.
In the positionof diagram 13.10, most moves were easily shown to give White a win. Only 2 ..,
g1gave someproblems. That positionisshownindiagram 13.11.
Black to move
● ●
Diagram 13.11.
It was suggested by VICTOR that in the position of diagram 13.11 the best move for White

would be 3 f2. It turned out that this move indeed leads to a win for White. For that reason no other
White moves were checked. All possible moves for Black were easily refuted, of which only 3 .., f3
tooksomemore time thantheothers. Thatpositioncan befoundindiagram 13.12.
●
White to move
● ●
Diagram 13.12.
In the position of diagram 13.12 VICTOR suggested 4. d2 as best move. After this move VIC-
TOR didnothave muchtroubletoshowthatWhite can win,independent ofBlacks nextmove.
Thefact that2f1leads toawin,while the seemingly mostpromising move, 2c2 doesnot,illus-
trates thefact thathumanintuitionisnotgoodenoughtoreally understandthegame.
§13.4.1.d1,b1
This variation was remarkably easy to solve. White’s strategy consists of using his domination
at the right wing of the board. The only move for White checked was 2 f1, which was strong enough
towinthegame. Thepositionafter 2f1isshownindiagram 13.13.
Black to move
●
Diagram 13.13.
Inthe positionofdiagram 13.13, White threats to play e1, creating two threats at c1 and g1. For
that reason Black only has three possible moves: c1, e1 or g1. After 2 .., c1 White can play 3 e1,
forcing Black toanswer 3..,g1. Thepositionafter these movesisshownindiagram 13.14.

White to move
|     |     | ●●      | ●      |
| --- | --- | ------- | ------ |
|     |     | Diagram | 13.14. |
The position of diagram 13.14 had already been checked and shown to be won by White, after
thevariation: 1d1,c12f1,b13e1,g1
If Black plays 2 .., g1 instead of 2 .., c1 White can once again obtain the position of diagram
13.14 by playing 3 e1. We nowhave shownthat the onlyremaining move for Black after 2f1, is2..,
| e1. That positionisshownindiagram |     | 13.15. |     |
| --------------------------------- | --- | ------ | --- |
White to move
|     |     | ●       | ●      |
| --- | --- | ------- | ------ |
|     |     | Diagram | 13.15. |
In the position of diagram 13.15 VICTOR suggested 3. f2 as best move. After a few hours of
| search itwasshownthatthatmoveindeed |     | guarantees | White awin. |
| ----------------------------------- | --- | ---------- | ----------- |
§13.5.1.d1,a1
As was to be expected, Blacks first move at a1 is very bad. White should be able to use the
opportunity to create threats at the center of the board. It was therefore not surprising that the first
| suggestedmove,2e1ensures | White | awin. |     |
| ------------------------ | ----- | ----- | --- |
After 2e1Black onlyhas two real possibilities:2..,c1and 2..,f1. All other moves give White
| theopportunitytocreate | twothreats | atthebottomrow. |     |
| ---------------------- | ---------- | --------------- | --- |
Independent of which of these two moves Black makes, 3 e2 will always ensure White a win.
Thetwopossible positionsafter White’s thirdmoveare shownindiagrams 13.16and13.17.

Black to move
● ●
Diagram 13.16.
Black to move
● ●
Diagram 13.17.
The fact that the positionsofdiagrams 13.16and 13.17can be won by White, shows that after 1
d1,a1White can winthegame.
§13.6.Evaluation ofResult
Aninteresting aspect ofsome variations, is the fact that in many positions where White can win
the game, he must make a forced move. This shows that the difference between a win for White and
at least a draw for Black is small. As soon as White makes one sub-optimal move, Black can reach a
draw. The 7 x 6 board is the smallest board at which this situation occurs. All smaller boards lead to
easily drawn games for Black. It is of course still possible, that the difference between a win for
Black and a draw for White on these smaller boards is also very small, although we do not expect
that.
Observing the variations which have tobesearched, it is clear, that some positions consisting of
only a few men can easily be checked, while other variations consisting of 6 or 7 men cause rather
difficult problems. This is probably due to the fact, that VICTOR has more trouble with positions
where both players seem to have chances. If one player can easily win, it is most of the time detected
soon.The more difficult positionsare decided bytactical threats, a concept which has to be solved by
searching instead ofevaluating.

14. Conclusions
In this chapter the project is evaluated. Moreover, the results are placed in the context of the
ShannonC-type strategy.
§14.1.Evaluation ofthe Project
Strategic rules have been defined for Connect-Four. These rules are similar to the rules expert
players use to determine which move to make. Using an algorithm to combine these rules it is some-
times possible todetermine the game-theoretical value of a position. Sometimes these rules cannot be
usedtofindaresult.
Thealgorithm can beusedasevaluation function, onanyboardofmx(2n)column. Application
ofthe algorithm on6x6and 6x8boards revealed an easy strategy which can beused forBlack toat
least draw thegame onanyboardwithlessthan7columns, andaneven numberofrows.
Using the same evaluation function it was easy to show that on a 7 x 4 board Black could also
draw thegame.
The evaluation function was not powerful enough to determine the game-theoretical value of
the standard 7 x 6 board. After some search techniques were implemented, it became clear, that the
search tree would become very large. Still it was possible, using 2 Sun-4 computers of the Vrije
Universiteit ofAmsterdam, toshowthattheinitialpositioncan bewonbywhite.
Mostlyduetohardware problems and wrongchoices ofvariations bythe author more than 1000
hours of CPU-time were used. The four winning variations described in chapter 13, together took
about350hoursofCPU-time.
It is quite surprising that two expert players had the feeling that the game could be at least
drawn by Black, if not won, while the search has revealed that White can win the game. It is maybe
even more surprising that the smallest board where White can win the game is chosen to be standard
board.
§14.2.Results ofShannon C-type strategy
One goal of the project was to show that a program can be written using the Shannon C-type
strategy. This goal is not only met, it is also shown that the program, VICTOR, can always win play-
ing White. There can be some doubt about the fact if the strategy used is pure Shannon C-type. The
evaluation function clearly is, while the search techniques clearly are not. If, however, the number of
positions which needed to be evaluated is compared to the upper bound for the number of legal posi-
tions (section 2.1), it is clear that the impact of the evaluation function is very large. We are optimis-
ticaboutthepossibilitiestoreduce theamountofsearch needed ifthe knowledgeused byVICTOR is
extended. We therefore believe that it will be possible to use the results of this project to develop a
program which is even more Shannon C-type, which achieves the same as VICTOR developed for
thisproject.

This project has shown that it is difficult to develop a Shannon C-type program, since much
knowledge has to be implemented. If, however, enough knowledge is gathered, the program can out-
perform all other programs and human beings. For a moderately complex problem as Connect-Four,
thisleads toaprogramwhich can determine thegame-theoretical value ofthegame.
| §14.3.Using | the Results | forPlaying |     |
| ----------- | ----------- | ---------- | --- |
Each time the game-theoretical value of a position had been determined, the search table built
duringthe search was dumped toafile. Asmall C-program then extracted therelevant, winninglines,
| fromthesearch | table. |     |     |
| ------------- | ------ | --- | --- |
Combination of the winning lines of the relevant variants resulted in a database of about half a
millionpositions.This database can be seen as anopeningbookforConnect-Four.Usingthisopening
book and the evaluation function for positions not present in the database, VICTOR can play
| correctly against | anyopponent,always |     | winningplayingWhite. |
| ----------------- | ------------------ | --- | -------------------- |
Each time VICTOR has tomake a move, hechecks ifany ofthe sons of the positionare present
in the data base. If so, one of these sons is chosen. If no son is present, all sons are evaluated. The
value of at least one of these sons must be 1, otherwise the database would not be complete. Such a
son is chosen. The database is ordered in a way which makes a binary search for a position possible.
| Therefore, | makingamovetakes | atmostafew | seconds. |
| ---------- | ---------------- | ---------- | -------- |

15. Future Development
In this chapter some ideas for future development are considered, as well as a message which
| hasbeen receivedafew | daysbefore | thistextwasprinted. |
| -------------------- | ---------- | ------------------- |
| §15.1.Suggestions    | forfurther | Research            |
It was possible to find the game-theoretical value of Connect-Four, using a combination of
Shannon C-type strategy and some search techniques. It can be tried to extend the knowledge imple-
mented, in that way reducing the amount of search needed. Another approach could try to automati-
cally derive thestrategic rules, instead ofimplementing rulessuggestedbyahumanexpert.
| §15.2.Future Development |     |     |
| ------------------------ | --- | --- |
VICTOR will be used to check more variations, to find paths for Black in which an imperfect
White player, can easily make a mistake. UsingthisknowledgeVICTOR shouldbeable towinallhis
White games, some of its Black games, and at least draw most of his Black games, depending on the
strength of its opponents. To test its strength, it will compete in the Olympiad organised in London
| whichisplanned          | forAugust1989. |     |
| ----------------------- | -------------- | --- |
| §15.3.Results Confirmed |                |     |
A few days before this final text was printed, a message in the USENET newsgroup
rec.games.programmer appeared, claiming that Connect-Four can be won by the first player. Author
of the USENET article was James D. Allen. Some variations were given, which confirmed our
results. Some results presented there were not yet checked by VICTOR, while others (e.g, the results
after 1 a1, b1 or c1 which can be used for every 7 x (2n) board) were found by VICTOR and not yet
by Allen. Allen made use of a brute force program which checked about 6 billion positions. It was
notpossible togetmoredetails aboutvariations Allen checked before thistexthadtobeprinted.

References
[1] H.J.van den Herik, Computerschaak, Schaakwereld en Kunstmatige Intelligentie, Ph.D
thesis, 1983.
[2] P.vanDiepen andH.J.vandenHerik, Schaken voorComputers,Academic Service, 1987.
[3] C.E. Shannon,Programming aComputer forPlaying Chess,PhilosophicalMagazine, 41,pp.
265-275,1950.
[4] D.E.Wilkins, Using Patterns and Plans in Chess, Artificial Intelligence, 14(2), pp. 165-203
(1980).
[5] H.J.van den Herik and I.S. Herschberg, The construction of an Omniscient Endgame Data
Base,ICCA Journal, 8(2),pp.66-87,1985.
[6] H.J.van den Herik, Informatica en het MenselijkBlikveld,InaugureleRede, Rijksuniversiteit
Limburg, Maastricht, 1988.
[7] J.Schaeffer, Conspiracy Numbers,Advances inComputer Chess, D.Beal, 1987.
[8] D.A.McAllester, Conspiracy Numbers for Min-Max Search, Artificial Intelligence, 35, pp.
287-310,1988.

|                              |     |            |                                | Appendix      | A   |     |     |           |     |
| ---------------------------- | --- | ---------- | ------------------------------ | ------------- | --- | --- | --- | --------- | --- |
| /*Thisprogram                |     | calculates | anupperboundofthenumberoflegal |               |     |     |     | positions |     |
| *onaCOLUMNS                  |     | xROWS      | board.                         |               |     |     |     |           |     |
| *Thisisdoneusingthefollowing |     |            |                                | observations: |     |     |     |           |     |
*Thenumberofmenonsuchaboardcan varybetween 0andCOLUMNS *ROWS.
| *Foreachnumberofmen,we   |                         |     | countthenumberofwaystodistribute |                                 |                         |     |     |     | the |
| ------------------------ | ----------------------- | --- | -------------------------------- | ------------------------------- | ----------------------- | --- | --- | --- | --- |
| *menoverthedifferent     |                         |     | columns.                         | Thisisdonebyfirstputtinganumber |                         |     |     |     |     |
| *ofmeninthefirstrow.Then |                         |     | somemenare                       |                                 | putinthesecondrow.These |     |     |     |     |
| *mencan                  | onlybeputincolumnswhere |     |                                  | amanwasputinthefirstrow.        |                         |     |     |     |     |
*Thiswaycontinuing, wegetadecreasing series ofnumbers, indicating the
*numberofmeninrows1uptoROWS.
| *Ifwename                 |                          | these numbers | a(1)toa(ROWS),                |                          | thenthenumberofways |     |             |     | we  |
| ------------------------- | ------------------------ | ------------- | ----------------------------- | ------------------------ | ------------------- | --- | ----------- | --- | --- |
| *can choosethea(1)columns |                          |               | toputthemenofthefirstrowin,is |                          |                     |     |             |     |     |
| *Chose(ROWS,              |                          | a(1)).        | Thea(2)menofthesecondrowcan   |                          |                     |     | beputinthis |     |     |
| *rowinChose(a(1),         |                          | a(2))         | different                     | ways,                    | andsoon.            |     |             |     |     |
| *Thetotal                 | numberofwaystodistribute |               |                               | agivennumberofmenoverthe |                     |     |             |     |     |
*different columns ismultipliedbythenumberofwaystocolour these men,
*whichisequal toChose(Men, Men/2), since halfofthemenare white, while
| *theother | halfisblack. |     |     |     |     |     |     |     |     |
| --------- | ------------ | --- | --- | --- | --- | --- | --- | --- | --- |
*
*N.B.1 Inorder tobeable toworkwiththelarge numbers involved,doubles
| * are  | usedinstead |         | ofint.                      |     |     |     |            |     |     |
| ------ | ----------- | ------- | --------------------------- | --- | --- | --- | ---------- | --- | --- |
| *N.B.2 | Inorder     | tospeed | thingsup,firstallChose(n,k) |     |     |     | numbersare |     |     |
* calculated.
| *N.B.3       | Another | method,somewhat |                              | faster | thantheoneusedhere, |     |     | using |     |
| ------------ | ------- | --------------- | ---------------------------- | ------ | ------------------- | --- | --- | ----- | --- |
| * arecursive |         | formula         | wassuggestedtomebyJohnTromp. |        |                     |     |     |       |     |
*/
| #define             | COLUMNS  |     | 7                 |             |     |       |     |      |     |
| ------------------- | -------- | --- | ----------------- | ----------- | --- | ----- | --- | ---- | --- |
| #define             | ROWS     |     | 6                 |             |     |       |     |      |     |
| #define             | MIN(A,B) |     | ((A)<(B)?(A):(B)) |             |     |       |     |      |     |
| doubleChose[COLUMNS |          |     | *ROWS             | +1][COLUMNS |     | *ROWS |     | +1]; |     |

main()
{
intMen;
| doubleTotal, |     | Extra, | Distributions(); |     |     |     |     |
| ------------ | --- | ------ | ---------------- | --- | --- | --- | --- |
Total =(double)0;
InitChose();
| for(Men=0;Men<= |               |                     | COLUMNS    |     | *ROWS;              | Men++)  | {   |
| --------------- | ------------- | ------------------- | ---------- | --- | ------------------- | ------- | --- |
|                 | Extra         | =Distributions(Men) |            |     | *Chose[Men][Men/2]; |         |     |
|                 | printf("Total |                     | with%dmen, |     | is%.0f0,Men,        | Extra); |     |
|                 | Total         | +=                  | Extra;     |     |                     |         |     |
}
| printf("Total |          | numberofpositionson%dx%dboardisatmost%.0f0, |       |         |     |     |     |
| ------------- | -------- | ------------------------------------------- | ----- | ------- | --- | --- | --- |
|               | COLUMNS, |                                             | ROWS, | Total); |     |     |     |
}
InitChose()
{
inti,j;
| for(i=0;i<= |                  |             | COLUMNS     | *ROWS;         | i++) | {                 |     |
| ----------- | ---------------- | ----------- | ----------- | -------------- | ---- | ----------------- | --- |
|             | Chose[i][0]      |             | =(double)1; |                |      |                   |     |
|             | for(j=1;j<i;j++) |             |             | {              |      |                   |     |
|             |                  | Chose[i][j] |             | =Chose[i-1][j] |      | +Chose[i-1][j-1]; |     |
}
|     | Chose[i][i] |     | =(double)1; |     |     |     |     |
| --- | ----------- | --- | ----------- | --- | --- | --- | --- |
}
}
double
Distributions(Men)
intMen;
{
doubleDistribute();
| return | (Distribute(1, |     | COLUMNS, |     | (double)1,Men)); |     |     |
| ------ | -------------- | --- | -------- | --- | ---------------- | --- | --- |
}

double
| Distribute(Row, | UpperBound,Product,MenLeft) |     |
| --------------- | --------------------------- | --- |
intRow,UpperBound,MenLeft;
doubleProduct;
{
inti;
doubleSum;
| if((ROWS | -Row+1)*UpperBound<MenLeft) | {   |
| -------- | --------------------------- | --- |
| return   | ((double)0);                |     |
}
| if(Row>ROWS) | {          |     |
| ------------ | ---------- | --- |
| return       | (Product); |     |
}
Sum=(double)0;
| for(i=MIN(UpperBound,MenLeft); | i>= 0;i--){ |     |
| ------------------------------ | ----------- | --- |
Sum+=Distribute(Row+1, i,
Product*Chose[UpperBound][i],
MenLeft -i);
}
return (Sum);
}

Appendix B
In this appendix we look at the set of rules found, after the best answer was made after the first
move of White, where White did not play 1. d1. In all cases the set of rules can be shown to be
independent of the height of the board, and therefore similar sets of rules can be used for all 7 x (2n)
boards.
§1.Situation after 1.a1.
After 1.a1,agoodanswer forBlack is1...,b1.
White to move
●
Diagram B.1.
Forthepositionofdiagram B.1,theprogram foundthefollowing set ofrules:
Before a2a3b2b3c1c2d1d2:
Before a4a5b4b5c3c4d3d4:
Before b2b3c1c2d1d2e2e3:
Before b4b5c3c4d3d4e4e5:
Before c1c2d1d2e2e3f2f3:
Before c3c4d3d4e4e5f4f5:
Before d1d2e2e3f2f3g1g2:
Before d3d4e4e5f4f5g3g4:
Baseinverse e1f1:
Claimeven c5c6:
Claimeven d5d6:
Claimeven g5g6:
If we look at the Claimevens which are part of the befores, we see that Claimevens are used
throughout the whole c, d and g column. In the e and f column a Baseinverse is used for the lower
two squares and verticals are used for the rest of the e and f columns. In the a and b columns we find
verticals, too.
This results in two pairs of columns, where Black gets at least one men in every odd row of
these columns, and three other columns where Black gets all even squares, while White gets all odd
squares. Since these pairs of columns, a and b versus e and f are divided by another pair of columns,
where Black gets all even squares, it is not hard to see that there is not one group White can com-
plete, without giving Black a win first. The reasoning for that is very similar to the reasoning used

forthe6x(2n)board.
§2.Situation after 1.b1.
After 1.b1,agoodanswer forBlack is1...,c1.
White to move
●
Diagram B.2.
Forthepositionofdiagram B.2,theprogram foundthefollowing set ofrules:
Before a1a2b2b3c2c3d1d2:
Before a3a4b4b5c4c5d3d4:
Before b2b3c2c3d1d2e1e2:
Before b4b5c4c5d3d4e3e4:
Before c2c3d1d2e1e2f2f3:
Before c4c5d3d4e3e4f4f5:
Before d1d2e1e2f2f3g2g3:
Before d3d4e3e4f4f5g4g5:
Baseinverse f1g1:
Claimeven a5a6:
Claimeven d5d6:
Claimeven e5e6:
As we can see, in the a, d and e column, all even squares are claimed by Black, while the b and c,
resp. f and g column form pairs, similar to the pairs of section 1. We can therefore conclude in the
same way, thatBlack can achieve atleast adraw onevery 7x(2n)board,ifWhite opens1.b1.
§3.Situation after 1.c1.
After 1.c1,agoodanswer forBlack is1...,d1.

White to move
●
|     |     | Diagram | B.3. |
| --- | --- | ------- | ---- |
Forthepositionofdiagram B.3,theprogram foundthefollowing set ofrules:
| Before    | a1a2b1b2c2c3d2d3: |     |     |
| --------- | ----------------- | --- | --- |
| Before    | a3a4b3b4c4c5d4d5: |     |     |
| Before    | b1b2c2c3d2d3e1e2: |     |     |
| Before    | b3b4c4c5d4d5e3e4: |     |     |
| Before    | c2c3d2d3e1e2f1f2: |     |     |
| Before    | c4c5d4d5e3e4f3f4: |     |     |
| Before    | d2d3e1e2f1f2g1g2: |     |     |
| Before    | d4d5e3e4f3f4g3g4: |     |     |
| Claimeven | a5a6:             |     |     |
| Claimeven | b5b6:             |     |     |
| Claimeven | e5e6:             |     |     |
| Claimeven | f5f6:             |     |     |
We can see that in the a, b, e, f and g column all even squares are claimed (except for g6, but
we can claim that square, just for symmetry reasons). The c and d column form a pair of columns,
giving Black at least one men in all odd rows of these columns. Again we can see that White cannot
complete a group, before Black does, and therefore Black achieves at least a draw. Like in the
| former twosections, | thisresult | can beextended | toall7x(2n)boards. |
| ------------------- | ---------- | -------------- | ------------------ |

|     |     | Appendix |     | C   |     |
| --- | --- | -------- | --- | --- | --- |
In this appendix the number of positions found for each number of men on the standard 7 x 6
boardispresented inatable.
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) 0 (cid:2)                                                                                                                                                  |     | 1   | (cid:2) 22                                                                                                                                                                      | (cid:2) 42121344720 | (cid:2) |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------- |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |     |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                     |         |
| (cid:2) 1 (cid:2)                                                                                                                                                  |     | 7   | (cid:2) 23                                                                                                                                                                      | (cid:2) 76871042612 | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2)                                                                                                                                                                                                                                                                                                               |        |       | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| 2                                                                                                                                                                                                                                                                                                                             |        | 56    | 24                                                                                                                                                                              | 141627466344          |         |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                                                                                                                            |        |       | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 3 (cid:2)                                                                                                                                                                                                                                                                                                             |        | 252   | (cid:2) 25                                                                                                                                                                      | (cid:2) 242619996500  | (cid:2) |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                                                                                                                            |        |       | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 4 (cid:2)                                                                                                                                                                                                                                                                                                             |        | 1260  | (cid:2) 26                                                                                                                                                                      | (cid:2) 417750499600  | (cid:2) |
| (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:2) (cid:2) |        |       | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| 5                                                                                                                                                                                                                                                                                                                             |        | 4620  | 27                                                                                                                                                                              | 669746637000          |         |
| (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:2) (cid:2) |        |       | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| (cid:2) (cid:2)                                                                                                                                                                                                                                                                                                               |        |       | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| 6                                                                                                                                                                                                                                                                                                                             |        | 18480 | 28                                                                                                                                                                              | 1073881265400         |         |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                                                                                                                            |        |       | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 7 (cid:2)                                                                                                                                                                                                                                                                                                             |        | 59815 | (cid:2) 29                                                                                                                                                                      | (cid:2) 1602674216640 | (cid:2) |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                                                                                                                            |        |       | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| 8                                                                                                                                                                                                                                                                                                                             | 206780 |       | 30                                                                                                                                                                              | 2377951581600         |         |
| (cid:2) (cid:2)                                                                                                                                                                                                                                                                                                               |        |       | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2) |        |     | (cid:2) | (cid:2)       | (cid:2) |
| --------------- | ------ | --- | ------- | ------------- | ------- |
| 9               | 605934 |     | 31      | 3277691366670 |         |
| (cid:2) (cid:2) |        |     | (cid:2) | (cid:2)       | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2)                                                                                                                                                    |          |     | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| 10                                                                                                                                                                 | 1869840  |     | 32                                                                                                                                                                              | 4460016493800         |         |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |          |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 11 (cid:2)                                                                                                                                                 | 5038572  |     | (cid:2) 33                                                                                                                                                                      | (cid:2) 5611156155990 | (cid:2) |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |          |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| 12                                                                                                                                                                 | 14164920 |     | 34                                                                                                                                                                              | 6893472773880         |         |
| (cid:2) (cid:2)                                                                                                                                                    |          |     | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2)                                                                                                                                                    |           |     | (cid:2)                                                                                                                                                                         | (cid:2)               | (cid:2) |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| 13                                                                                                                                                                 | 35459424  |     | 35                                                                                                                                                                              | 7754703113850         |         |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |           |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 14 (cid:2)                                                                                                                                                 | 91871208  |     | (cid:2) 36                                                                                                                                                                      | (cid:2) 8385425017200 | (cid:2) |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |           |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 15 (cid:2)                                                                                                                                                 | 214864650 |     | (cid:2) 37                                                                                                                                                                      | (cid:2) 8164755937800 | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2)    |           |     | (cid:2)    | (cid:2)               | (cid:2) |
| ------------------ | --------- | --- | ---------- | --------------------- | ------- |
| (cid:2) 16 (cid:2) | 516936420 |     | (cid:2) 38 | (cid:2) 7422505398000 | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) 17 (cid:2)                                                                                                                                                 | 1134183050 |     | (cid:2) 39                                                                                                                                                                      | (cid:2) 5789554210440 | (cid:2) |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |            |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 18 (cid:2)                                                                                                                                                 | 2546423880 |     | (cid:2) 40                                                                                                                                                                      | (cid:2) 3859702806960 | (cid:2) |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |            |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                       |         |
| (cid:2) 19 (cid:2)                                                                                                                                                 | 5252058812 |     | (cid:2) 41                                                                                                                                                                      | (cid:2) 1883902560540 | (cid:2) |
(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)
| (cid:2) (cid:2)                                                                                                                                                                                                                                                                                                               |     |     | (cid:2)                                                                                                                                                                         | (cid:2)        | (cid:2) |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------- |
| 20 11031780760                                                                                                                                                                                                                                                                                                                |     |     | 42                                                                                                                                                                              | 538257874440   |         |
| (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1) (cid:2) (cid:2) |     |     | (cid:2)                                                                                                                                                                         | (cid:2)        | (cid:2) |
| (cid:2) (cid:2)                                                                                                                                                                                                                                                                                                               |     |     | (cid:2)                                                                                                                                                                         | (cid:2)        | (cid:2) |
| 21 21406686756                                                                                                                                                                                                                                                                                                                |     |     | Total                                                                                                                                                                           | 70728639995483 |         |
| (cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)                                                                                                                                                            |     |     | (cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:1)(cid:2) |                |         |