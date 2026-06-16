- I have to be able to logout

- The button "review past mistakes" does not look like a button

- When clicking a disk in a lesson, and the coach speaks, the board flickrs

- We need to design and implement the onboarding experience

- Call to action to play against another person using papergames integration https://developers.papergames.io/docs/play-vs-random/

- The past games view in mobile shows the separator line too close to the chip filters

- Every call to action must be clickeable / tapable (past games for logged in users, if you tap it you go to the register/login page)

- Blunder does not link to game. It is important specially when navigating through the blunders view

- bug: when the draggable split in the blunder view after clicking deep reveal gets too high the board suddenly stops being zoomed out and gets large again

- locked lessons are clickable and playable

- in immediate threat in all examples the user should be green, and in forced block the user must be gray

- When reviewing a game, the analysis is always recomputed, and it takes time. It should be computed once, and then cached

- Blunders now can be duplicated in the database. The number of times a user made a mistake is important. There should be a way for a user to know their most common mistakes

- Need to translate everything to spanish

- Several Supabase queries fetch all rows and aggregate in JS instead of using DB-side count(); affected endpoints: GET /api/puzzles/counts, GET /api/stats, GET /api/games (blunder counting), GET /api/coach/weakness-map fallback. All are missing .limit() and will silently truncate at 1000 rows.
