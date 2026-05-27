Puzzle view
    - Should say which color you are playing (red or yellow)
    - Should say if the player started or not, for some puzzles that is relevant
    - When clicking a column a disk should be placed. The same experience as if the player was playing a game in the sparring section. The highlight (green for correct, red for wrong) should appear on the disk the user placed.
    - There should be a button to tag the puzzle as a false positive (this will be disabled in the future)
    - After the user performed the selection, the correct answer has to be revealed. That depends on the puzzle. 


How correct answers should be highlighted
In every case, the disk the user placed has to be highlighted showing wether it was the correct answer or not.
If the disk the user placed as not correct, a correct disk should be placed and highlighted as the correct answer.

Also for 
- Double threat: Also highlight the major threats it creates with another color
- Forbidden columns: The user should be able to select all the columns and submit the answer with a button. After doing that diks are placed in the corresponding columns and highlighted wether each was correct or not. If there was any wrong answer, the correct answer is highlighted and the oponent's threat rendering that column forbidden is also highlighted
- Claimeven: After the feedback for wether the user placed the correct column or not as in the rest of the puzzles, a toggle appears that shows the user an overlay with blurred disks showing how the play would unfold
- Figure 7: The figure 7 should be highlighted
- J-shape: The j-shape should be highlighted



# Puzzle generation issues
1. Immediate threat and forced block should not generate boards with double threats
2. Forced win should not create boards with an immediate double threat: The total number of moves in the sequence should be more than 3 (3 moves involve placing a disk, the oponent places another and then in the last disk the player wins)


# Experience issues
- If I go the solve one puzzle, for instance forced win, and then go back to the dashboard and go back to the puzzles section, another puzzle appears. This should be deterministic, I should see the same puzzle again
- I see sometimes the same puzzle that I already solved
- There is a bug in forbidden columns. It always says that the answer is wrong. I guess it might have to do with the fact that there are more than one correct column
- In the puzzles section, both Figure 7 and j-shape disks are already highlighted before the user even shows an answer. That highlight should not appear until we reveal the answer
