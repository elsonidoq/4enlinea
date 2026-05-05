# Feedback

1- For each board, there must be debugging information to make sense of the board and understand weird cases. Specifically, the trace describing the solver scores, the softmax values, the temperature, and the decision of each player must be logged. Also the reason the game did not continue.

2- There must be a way to see the next candidate without neither approving nor rejecting a board

3- Still observing boards that have few moves. I tested lowering the temperature to a really small value, and still. It might make sense to also sample a minimum number of plays to enforce a more complete game (harder to spot patterns) 

4- In the view where I'm reviewing a candidate board, there should be a title reminding what category we are working on. Currently we have the category number, but that does not mean anything for the human annotator

5- Escape key should close the modal when reporting a reject

6- Sometimes there is no highlighted cell in the board. There are some examples in the database where the description says that. Use those examples to reproduce the error, diagnose and fix it

7- Multimove cases must highlight the whole multi move, otherwise it forces the human curator to think the move (parity control, fork setup, Zugzwang)

8- The button "reject all" should be "delete all". It must delete the candidates not reviewed yet

9- There are some bugs marked as classifier bugs in the database
