- Board cells have no ARIA `role`/`aria-label` (accessibility gap surfaced during mobile QA 2026-07-07): screen readers can't identify columns, and automated tools must fall back to verbose a11y-tree walking to map column→cell. Add `role="button" aria-label="column N"` (or similar) to board cells.

- The button "review past mistakes" does not look like a button

- When clicking a disk in a lesson, and the coach speaks, the board flickrs

- We need to design and implement the onboarding experience

- The past games view in mobile shows the separator line too close to the chip filters

- Every call to action must be clickeable / tapable (past games for logged in users, if you tap it you go to the register/login page)

- bug: when the draggable split in the blunder view after clicking deep reveal gets too high up in the screen, the board suddenly stops being zoomed out and gets large again

-  You should only be able to do lessons in the saga order, and if you are free user, clicking in a locked lesson should open a call to action to become a paying user

- in immediate threat in all examples the user should be green, and in forced block the user must be gray

- Several Supabase queries fetch all rows and aggregate in JS instead of using DB-side count(); affected endpoints: GET /api/puzzles/counts, GET /api/stats, GET /api/games (blunder counting), GET /api/coach/weakness-map fallback. All are missing .limit() and will silently truncate at 1000 rows.

- GET /api/coach/queue is hard-capped at .limit(50) with no pagination (server/index.js:2508). A user with >50 blunders can never review the rest, and because the /mistakes category cards are derived from that capped 50-item list, whole categories (e.g. undercut, forced_win) get no card at all even though the blunders exist and are reachable via ?category=. Needs pagination + DB-side per-category counts. (Surfaced in QA 2026-07-07 round 2 with 137 blunders.)


- Current npm install reports this 15 vulnerabilities (1 low, 10 moderate, 2 high, 2 critical)

- Except for forced_block, no puzzles can have a forced_block, unless the forced block is the move that creates the pattern / move

- Incorporate allen T1-T7 transformations as well as the missing allen-v rules. Session: claude --resume cf6a4f19-5f8e-4928-b94f-05bb63c9cebc

- For double threat we should not check against correct col to determine if the user performed the puzzle correctly, but wether the position generated a double threat (there are boards where there are more than one way to generate the double threat)

- I don't like that "no mistakes" means no blunders. Performing a sub-optimal move is also a mistake. Also it is inconsistent to read that a game was lost and i performed no mistakes. Modify the number of mistakes to be the number of blunders + sub-optimal moves

- the coach mas speak in the lesson. For now we need to add the generate audios button in the /admin/lessons to pre-generate them, save the path for the audio in the json file and then serving them and playing them in each slide of the lesson

- the deep reveal should never say "community immediate threat", it should just say "immediate threat". That applies to all community-* knowledge-base entries

- security checkup: would anyone be able to access the codebase? Explore ways that a hacker could access the codebase

- each call to the openai llm must register the metadata the response has regarding spent tokens or spent dollars on that request

- unify sub-optimal move with blunder. The screens must be the same, a sub optimal move is a less severe blunder. The games analysis showing sub optimal moves and blunders should be seen the same, but the blunder view and the explorer view must be unified. The "start a game from here" and "what should I have played" and "mark as reviewed" buttons must be in the new merged window. No old dead code should remain from this merge

- The browser forgets i have signed in very quickly. I want the app to remember me

- There is a bug in the back button. Context: navigate to past games, click on a game, click a blunder move, then click in the game link (top right showing something like Move 10 / 16 · Jun 17), then clicking back switches back and forth between the game and the blunder, you never return home. The expected behaviour would be going from the blunder to the game to the past games to the home

- Setup stripe checkout. The code must be done so that we can incorporate a new payment processor in the future

- Add a logo at the top saying DecodeC4. Clicking it takes you to the home

- After importing a call to action to view the imported games

