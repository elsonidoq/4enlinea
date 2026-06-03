- e-mail design
- other way to register. password? with gmail? with instagram?
- avoid repeated puzzles in the same session: e.g. three consecutive puzzles of immediate threat, where the immediate threat was a vertical stack of 3 disks. It might make sense to have a function per puzzle, that extracts the "shape" of the puzzle (e.g. for an immediate threat it might be the group of three orientation and coarced grained position, for double threat it might be the union of the involved pieces translated into the top right corner)
- modify global colorscheme light 
- the review blunder screen should specify if the user played green or grey
- when reviewing a mistake, start a play from there
- do not leak llm prompt for deep reveal
- session stats table is not used
- paths en la navegacion, por que no estan mas? 
- each challenge in the challenges view must have: 1. progress bar, 2. if the user already cleared a challenge set, it has to be visually clear
- in forced_win, when we arrive to the double threat, the two threats must be highlighted in the board
- no supabase requests should be done client side
- full vulnerabilities scan: is the app secure?
- the coach speaks!
- sounds: 
    background music
    disk falling
    disk hitted another disk
    disk hitted the bottom of the board

- when you go to the next board in a challenge set, the pieces that are shared between the previous board and the next board just appear, but the new ones introduced by the next board fall using the animation like if you were dropping them. In the first board all pieces fall. The pieces that are already in the board should not perform any effect, just appear in the board

- The coach reads the deep reveal. As the coach mentions rows, columns, cells or regions the board is highlighted on the corresponding zone so it is easy to understand what the coach talks about. In the text, also rows, columns, cells and regions are highlighted if the user performs a tap or mouse over 

- Navigation doesn't work that well. Sometimes clicking back stops working, or sometimes it cycles through screens. BTW, why did we discard having different urls?

- Accuracy by pattern is wrong, shows 100% accuracy when I failed 3 puzzles and got one correct

- Back from clicking a blunder in the game review shows a screen where the coach writes Game not saved — analysis unavailable

- Remove best line from explain-move-llm endpoint and all along the codebase

- coach explanations yellow/red

- when the coach uses terminology like "major threat", it should be highlighted somehow and on mouseover or tap, it shows a short explanation of the term, points you to a lesson?

- a blunder must have permalink, it's a shared nugget of information! shareable across social network

- This is failing

curl 'https://kxtqwsumojtexokrtlfp.supabase.co/rest/v1/puzzle_attempts?columns=%22puzzle_id%22%2C%22device_uuid%22%2C%22moves_tried%22%2C%22outcome%22%2C%22first_attempt_correct%22%2C%22time_ms%22%2C%22created_at%22' \
  -H 'accept: */*' \
  -H 'accept-language: en-US,en;q=0.9' \
  -H 'apikey: sb_publishable_3KSyUWmg0EcobDV1SUentA_PnalTcSG' \
  -H 'authorization: Bearer eyJhbGciOiJFUzI1NiIsImtpZCI6IjkwMGQ5ZGU5LTJkNzgtNDA4NC1hODMwLTA4MTE5MTNlYTk5NyIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2t4dHF3c3Vtb2p0ZXhva3J0bGZwLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzMzE0ZDIxYS04NTk0LTQzMWQtODkyNC0wMmU3NTlhZDM1M2YiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgwMzczMDQ3LCJpYXQiOjE3ODAzNjk0NDcsImVtYWlsIjoiIiwicGhvbmUiOiIiLCJhcHBfbWV0YWRhdGEiOnt9LCJ1c2VyX21ldGFkYXRhIjp7fSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJhbm9ueW1vdXMiLCJ0aW1lc3RhbXAiOjE3ODAzNjk0NDd9XSwic2Vzc2lvbl9pZCI6ImUyMzExOWMwLWE3ZTEtNDdkZC1hYzIwLWI5NzY5MjQzZjQwZSIsImlzX2Fub255bW91cyI6dHJ1ZX0.ioK8WDmUEGVTj77vkK-fk5aZ7-YWkqJqBS4UYvntcc02WtcsEyfFHMS21yV4rlDwYCnwVyEKdVMbmI0iMa8VoQ' \
  -H 'content-profile: public' \
  -H 'content-type: application/json' \
  -H 'origin: http://localhost:5173' \
  -H 'priority: u=1, i' \
  -H 'referer: http://localhost:5173/' \
  -H 'sec-ch-ua: "Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: cross-site' \
  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36' \
  -H 'x-client-info: supabase-js-web/2.105.1' \
  --data-raw '[{"puzzle_id":"52928cca-386d-4b88-b638-711905908170","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[0],"outcome":"correct_first","first_attempt_correct":true,"time_ms":23231,"created_at":"2026-05-01T13:26:30.662Z"},{"puzzle_id":"52928cca-386d-4b88-b638-711905908170","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[0],"outcome":"correct_retry","first_attempt_correct":false,"time_ms":14210,"created_at":"2026-05-01T13:41:35.662Z"},{"puzzle_id":"8ef7dfa0-f65e-4418-a4df-94a06331a421","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[2],"outcome":"correct_first","first_attempt_correct":true,"time_ms":63987,"created_at":"2026-05-28T14:21:17.239Z"},{"puzzle_id":"96137e0a-3e53-40ea-b5c2-f281893107a3","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[3],"outcome":"correct_first","first_attempt_correct":true,"time_ms":1825,"created_at":"2026-05-28T14:49:19.075Z"},{"puzzle_id":"742ac763-86dd-4c00-b558-b93a57217556","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[5],"outcome":"wrong","first_attempt_correct":false,"time_ms":46825,"created_at":"2026-05-31T14:28:11.385Z"},{"puzzle_id":"985e11e3-1a41-405d-ae89-ded3b0b5edff","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[1],"outcome":"correct_first","first_attempt_correct":true,"time_ms":151738,"created_at":"2026-05-31T14:56:09.771Z"},{"puzzle_id":"8601557f-f283-433a-9c82-2273fc9eb474","device_uuid":"9521aca9-7013-4b97-a0a4-beea8120fa1e","moves_tried":[4],"outcome":"correct_first","first_attempt_correct":true,"time_ms":139518,"created_at":"2026-05-31T15:00:57.490Z"}]'

output

{
    "code": "23514",
    "details": null,
    "hint": null,
    "message": "new row for relation \"puzzle_attempts\" violates check constraint \"puzzle_attempts_outcome_check\""
}
