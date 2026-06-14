- e-mail design: The current e-mail is ugly

- I don't think it is very effective to have only the magic link as a way to sign in. What other ways to register can we implement. password? with gmail? with meta?

- avoid repeated puzzles in the same session: e.g. three consecutive puzzles of immediate threat, where the immediate threat was a vertical stack of 3 disks. It might make sense to have a function per puzzle, that extracts the "shape" of the puzzle (e.g. for an immediate threat it might be the group of three orientation and coarced grained position, for double threat it might be the union of the involved pieces translated into the top right corner). Using the shape, a ranker function can determine an order that the puzzle should have so that there are no two identicaly shaped puzzle next to each other

- modify global colorscheme light. Currently there is a global dark color scheme, and all the components have to override it. 

- each challenge in the challenges view must have: 1. progress bar, 2. if the user already cleared a challenge set, it has to be visually clear 3. the accuracy somewhat visually (not with a number)

- Words like "fork" or "double threat" should be marked differently so that doing mouse over / clicking / tapping shows a popup with a small explanation of what the word is. This can be done with the knowledge-base

- in forced_win, when we arrive to the double threat, the two threats must be highlighted in the board

- no supabase requests should be done client side, every request from the client must be performed to the server, and the server handles the request to the database

- We need to perform a full vulnerabilities scan: is the app secure?

- Make the coach speak. It is very hard for someone to read the coach's messages while they are playing.

- the app must have sounds: 
    background music
    disk falling
    disk hitted another disk
    disk hitted the bottom of the board


- The speed between the player moves and the coach moves is too high, I don't have time to read both coach messages. There should be a small pause between those messages

- In all screens where we are reviewing a game or a blunder, it must be clear if the user was playing Gray or Green

- There is a working PoC to import games from papergames (./connect-four/server/scripts/import_papergames_blunders.mjs). The user should be able to set the papergames id into the profile and click import. Free tier imports the last 5 games. Imported games must have the papergames metadata


- the curation page, instead of having one component per category, must have a drop down to select what puzzle type we want to generate. Those puzzle types must be the same as the blunders categories

- Technical debt: we need to map technical debt and fix the most important issues. There are dead screens and dead code. We need to clean the repository. 

- when you go to the next board in a challenge set, the pieces that are shared between the previous board and the next board just appear, but the new ones introduced by the next board fall using the animation like if you were dropping them. In the first board all pieces fall. The pieces that are already in the board should not perform any effect, just appear in the board

- The coach reads the deep reveal. As the coach mentions rows, columns, cells or regions the board is highlighted on the corresponding zone so it is easy to understand what the coach talks about. In the text, also rows, columns, cells and regions are highlighted if the user performs a tap or mouse over. This has low priority 

- Game navigation should be improved. Sort games according to these criteria:
    - Games I played well
    - Games I had horrible blunders
    - Recent games

- In every part of the project the disks must be refered to as green/gray not yellow/red, even in scripts like visualize_board.sh. This is mostly done, but I think there might be some remains

- a blunder must have permalink, it's a shared nugget of information! shareable across social network — requires refactoring MistakeDetailScreen to cold-boot from a single blunder id (currently takes a blunders[] array + index passed by MistakesListScreen) and adding a GET /api/blunders/:id endpoint

- We need to have a production DB, and a staging DB

- We need to be able to perform a deploy to staging, and a deploy to production

- After clicking in the correct column in the socratic board, a disk must fall. Also a visual feedback wether your answer is correct or not must be shown, exactly as it is done in the challenges board. In practice boards, the first board also does not drop a disk when you click, the second one works well
