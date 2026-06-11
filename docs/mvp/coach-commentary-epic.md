# DecodeC4 — Board-Grounded Coach Commentary Epic

*Defines two implementation phases that replace context-dependent coach phrase pools with board-event-grounded commentary. Based on analysis of `useGameBoard.js`, `ChallengeScreen.jsx`, `CLChallengeScreen.jsx`, the existing classifier infrastructure in `server/index.js`, and the i18n pools in `src/i18n/en.json`.*

---

## Cross-cutting notes

**Problem statement:** The coach selects messages from pools tied to the *game mode* (`coach.sparring.*`) rather than to what is actually happening on the board. This causes two classes of failure:

1. **Context bleed** — `coach.sparring.deliberate_mistake.*` ("Oops — did I just give you something?") fires in ExplorerScreen, which has no concept of deliberate mistakes. `coach.sparring.ai_move.*` ("I'll take that.", "Hmm. My turn.") appears in non-competitive analysis contexts where opponent framing is wrong.
2. **Two concrete lesson-mode bugs** in `ChallengeScreen`:
   - `handleColumnClick` sends the undefined `category` prop to `/api/evaluate-move` instead of `confirmationCategory`; the server falls back to the classifier's `patternTag`, which may differ from the lesson's intended category.
   - The fallback when `coachPhraseKey` is null is always `coach.generic.blunder.*` regardless of move quality — so a correct move in a position the classifier doesn't recognise receives a blunder taunt.

**Solution — two phases:**
- **Phase 1** surgically fixes the two ChallengeScreen bugs. No new endpoints, no new i18n prefix.
- **Phase 2** replaces sparring-specific AI move pools with board-grounded commentary derived from the existing `/api/evaluate-move` endpoint and classifier. Extends the same quality-aware fallback pattern to the user-move path in `useGameBoard`.

**Coach persona:** First-person throughout all contexts. The AI/opponent speaks as "I". Because messages describe what literally happened on the board, they are valid in sparring, exploration, and lesson practice without any context flag.

**Classifier tags in use (Phase 2 covers all of them):**
`immediate_threat`, `forced_block`, `double_threat`, `claimeven`, `z_threat`, `odd_even_threat`, `forced_win`, `claimodd`, `figure_7`, `j_shape`, `overcut`, `undercut`

**No new server endpoints.** Phase 2 calls the existing `POST /api/evaluate-move` for AI moves, using the `patternTag` field that is already in the response. No schema changes.

**i18n fallback chain — AI move commentary (quality gates before patternTag):**
1. Quality fallback: `pickRandomKey(t, 'coach.ai_move.suboptimal')` when `quality !== 'optimal'` — fires regardless of patternTag; a suboptimal `double_threat` must not sound confident
2. Pattern-specific phrase: `pickRandomKey(t, `coach.ai_move.${patternTag}`)` when `quality === 'optimal'` and `patternTag` is non-null
3. Neutral fallback: `pickRandomKey(t, 'coach.ai_move.neutral')` when `quality === 'optimal'` and no patternTag
4. Network error: neutral fallback

**i18n fallback chain — user move commentary (GameScreen / ExplorerScreen):**
1. `coachPhraseKey` from evaluate-move response (pattern + quality specific — already working)
2. Quality-aware generic fallback: `pickRandomKey(t, `coach.generic.${quality}`)` — Phase 1 adds `optimal` and `suboptimal` pools; `blunder` already exists

**Deliberate mistakes in sparring:** The `isDeliberate` flag in `useGameBoard` no longer drives phrase selection. A deliberately suboptimal move classifies as `quality === 'suboptimal'` via evaluate-move and naturally lands in `coach.ai_move.suboptimal.*` ("I gave you something — find it."). No context flag needed.

**Double c4solver load per AI turn:** Phase 2 adds one `/api/evaluate-move` call per AI move in addition to the existing `/api/scores` call. Both call `solver.query` internally. This doubles solver load per AI turn. Acceptable at current user scale; the plan phase should evaluate whether to batch or cache.

---

## Phase 1 — Surgical Bug Fixes

**Estimated tasks:** 4–6

---

### Scope

Two targeted frontend fixes in `ChallengeScreen.jsx` and two new i18n pools. No backend changes.

---

### Frontend — `ChallengeScreen.handleColumnClick`

**Bug 1 — wrong category sent to evaluate-move in lesson mode:**

`CLChallengeScreen` renders `ChallengeScreen` without a `category` prop (it passes `confirmationCategory` instead). Inside `handleColumnClick`, the evaluate-move fetch body currently sends `category` (the undefined prop). Fix: compute `effectiveCategory` at the top of `handleColumnClick` using the same pattern already used by `initPuzzle`:

```js
const effectiveCategory = lessonMode ? confirmationCategory : category;
```

Send `effectiveCategory` in the fetch body instead of `category`. This ensures the server uses the lesson's intended category as `phrasePoolKey` rather than falling back to the classifier's `patternTag`.

**Bug 2 — quality-blind fallback always uses blunder pool:**

When `data.coachPhraseKey` is null, the current code unconditionally falls back to:
```js
`coach.generic.blunder.${Math.floor(Math.random() * 6)}`
```
This fires even when `data.quality === 'optimal'`, so a correct move in an unrecognised position receives a blunder taunt.

Fix: replace with a quality-aware branch:
- `quality === 'optimal'` → `pickRandomKey(t, 'coach.generic.optimal')`
- `quality === 'suboptimal'` → `pickRandomKey(t, 'coach.generic.suboptimal')`
- `quality === 'blunder'` → `pickRandomKey(t, 'coach.generic.blunder')` (existing keys, unchanged)

Use the existing `pickRandomKey` helper (currently defined in `useGameBoard.js`; extract to a shared util or duplicate in ChallengeScreen — plan phase decides).

---

### i18n keys — new in `en.json` (Phase 1)

```
coach.generic.optimal.0    "Good move."
coach.generic.optimal.1    "Nice choice."
coach.generic.optimal.2    "That's the one."

coach.generic.suboptimal.0 "Not bad, but there was a sharper move."
coach.generic.suboptimal.1 "You're close — try to find the stronger option."
coach.generic.suboptimal.2 "Reasonable, but not the best here."
```

The existing `coach.generic.blunder.*` pool (6 keys) is unchanged.

---

### Acceptance scenarios — Phase 1

1. **Bug 1 fixed:** In lesson mode (`CLChallengeScreen`), a move submission sends `confirmationCategory` (e.g. `"immediate_threat"`) in the evaluate-move body, never `undefined`. Verifiable by logging or intercepting the fetch body.
2. **Bug 2 fixed:** An optimal move in a position the classifier does not recognise (returns `coachPhraseKey: null`, `quality: 'optimal'`) produces a phrase from `coach.generic.optimal.*`, never from `coach.generic.blunder.*`.
3. **Regression guard:** A genuine blunder (`quality: 'blunder'`) still produces a phrase from `coach.generic.blunder.*`.

---

### NOT included in Phase 1

- AI move commentary (Phase 2).
- `useGameBoard` user-move fallback fix (Phase 2).
- Any changes to `coach.sparring.*` pools (Phase 2).

---

## Phase 2 — Board-Grounded Coach Commentary

**Estimated tasks:** 14–18

---

### Scope

Replace `coach.sparring.ai_move.*`, `coach.sparring.deliberate_mistake.*`, and `coach.sparring.user_move.generic.*` with board-grounded commentary. Add one evaluate-move call per AI turn in `useGameBoard`. Add 13 pattern-specific AI phrase pools and 3 generic AI phrase pools to `en.json`. Fix the user-move fallback in `useGameBoard` to use the quality-aware generic pools introduced in Phase 1.

---

### Frontend — `useGameBoard.commitAiMove`

**Add evaluate-move call for AI move classification:**

After `aiCol` is determined (at the end of `makeAiMove`, before calling `commitAiMove`), call:

```
POST /api/evaluate-move
Body: { movestring: currentMoves.join(''), col: aiCol }
```

No `category` field — the server uses `patternTag` from the classifier. The response fields used are `patternTag` (string | null) and `quality` ('optimal' | 'suboptimal' | 'blunder').

The call runs in parallel with the board commit. `commitAiMove` receives the resolved classification result (or null on network error) as an additional argument.

**Coach phrase selection in `commitAiMove`:**

Quality gates before patternTag. A suboptimal AI move must never fire a confident pattern-specific phrase (e.g. "I've created two threats" for a move the solver rates as a mistake).

```
if (quality !== 'optimal')
  → pickRandomKey(t, 'coach.ai_move.suboptimal')
else if (patternTag && t(`coach.ai_move.${patternTag}.0`) !== `coach.ai_move.${patternTag}.0`)
  → pickRandomKey(t, `coach.ai_move.${patternTag}`)
else
  → pickRandomKey(t, 'coach.ai_move.neutral')
```

The `mood` for the coach message:
- Pattern-specific (any quality): `'think'`
- `suboptimal`/`blunder` fallback: `'oops'`
- Neutral: `'think'`

The `replace` flag (replace intro message on the opening AI move when `side === 'second'`) is preserved unchanged.

**Edge-case AI paths in `commitAiMove`:**

`commitAiMove` is reached from three call sites: normal play, the network-error fallback (picks a random legal column), and the `side === 'second'` opening auto-play move.

- **Error fallback (random column):** This path is a pre-existing issue that should not exist; the spec does not endorse it. For coach purposes, any path that lacks a successful evaluate-move result passes `null` classification → neutral fallback (`coach.ai_move.neutral.*`).
- **Opening auto-play (`side === 'second'`):** Uses the existing `replace`/intro path unchanged. No evaluate-move call is made for this move.

**Remove phrase pools no longer used:**
- `coach.sparring.ai_move.*` — delete all references and keys
- `coach.sparring.deliberate_mistake.*` — delete all references and keys
- `isDeliberate` no longer drives phrase selection; the flag may be retained for dev logging but must not control i18n key selection

---

### Frontend — `useGameBoard.handleColumnClick` (user-move fallback)

The current fallback when no `coachPhraseKey` is returned and `quality !== 'blunder'`:

```js
const key = pickRandomKey(t, 'coach.sparring.user_move.generic');
```

Replace with the quality-aware generic pools from Phase 1:

```js
const key = pickRandomKey(t, `coach.generic.${data.quality ?? 'blunder'}`);
```

Remove `coach.sparring.user_move.generic.*` from `en.json`.

**Also update `ExplorerScreen.jsx:219–221`:** the `timeoutContent` render in the DeepReveal pane contains a ternary with two broken branches:

- Line 220 (`patternTag` present): `t('coach.categories.${patternTag}', patternTag)` — the `coach.categories.*` namespace does not exist in `en.json`; `t()` always falls back to the raw tag string (e.g. `"immediate_threat"`). Fix: replace with `t('mistakes.pattern.${patternTag}', patternTag)`, which is a complete namespace covering all 12 classifier tags.
- Line 221 (`patternTag` absent): `t('coach.sparring.user_move.generic.0', 'Try a different approach.')` — the key is removed by Phase 2 and the hardcoded fallback would fire silently. Fix: replace with `t('coach.generic.suboptimal.0')` so it resolves consistently against the new pool.

---

### i18n keys — removed from `en.json` (Phase 2)

```
coach.sparring.ai_move.0              "I'll take that."
coach.sparring.ai_move.1              "Interesting. Let's see."
coach.sparring.ai_move.2              "Hmm. My turn."

coach.sparring.deliberate_mistake.0   "Oops — did I just give you something?"
coach.sparring.deliberate_mistake.1   "I may have slipped there. Can you punish it?"

coach.sparring.user_move.generic.0    "Interesting choice. Let's see how it plays out."
coach.sparring.user_move.generic.1    "Got it. Now watch how I respond."
coach.sparring.user_move.generic.2    "Noted. Your move is on the board."
```

---

### i18n keys — added to `en.json` (Phase 2)

**Pattern-specific AI move phrases (`coach.ai_move.<tag>.*`):**

```
coach.ai_move.immediate_threat.0   "I can win right now."
coach.ai_move.immediate_threat.1   "That's game — connecting four."

coach.ai_move.forced_block.0       "I had to block that — you had a real threat there."
coach.ai_move.forced_block.1       "No choice but to defend. Nice pressure."

coach.ai_move.double_threat.0      "Sorry — I've created two threats at once. You can only block one."
coach.ai_move.double_threat.1      "Double threat. One of them will connect."

coach.ai_move.claimeven.0          "Claimeven working in my favor — I'm claiming below your even-row threat."
coach.ai_move.claimeven.1          "I'll take that even-row claim. Your threat is neutralized."

coach.ai_move.z_threat.0           "Z-threat activated — that odd-row square is mine now."
coach.ai_move.z_threat.1           "I've secured the parity chain. You'd need an even number of moves to stop me."

coach.ai_move.odd_even_threat.0    "Playing to the odd row — that's parity control on my side."
coach.ai_move.odd_even_threat.1    "Odd-row threat in place. Even rows won't save you."

coach.ai_move.forced_win.0         "I can force you to lose from here — let's see if you can find the escape."
coach.ai_move.forced_win.1         "The path is forced — find the escape if you can."

coach.ai_move.claimodd.0           "Breaking the claimeven lock — I'm anchoring on an odd row."
coach.ai_move.claimodd.1           "Claimodd. Your even-row strategy just lost its grip."

coach.ai_move.figure_7.0           "Figure-7 trap set — two threats you can't both stop."
coach.ai_move.figure_7.1           "I've completed the Figure-7. Two threats incoming."

coach.ai_move.j_shape.0            "J-Shape in place — I'm threatening in three directions now."
coach.ai_move.j_shape.1            "Three simultaneous threats. You can block one, maybe two."

coach.ai_move.overcut.0            "Overcut — my upper threat beats yours in this column."
coach.ai_move.overcut.1            "Same parity, upper wins. Your lower threat is dead."

coach.ai_move.undercut.0           "Undercut. Gravity fills bottom-up — your upper threat can't reach first."
coach.ai_move.undercut.1           "I'm taking the lower threat. Yours is blocked by my disc now."
```

**Generic AI move phrases:**

```
coach.ai_move.suboptimal.0   "I might have missed something there — see if you can take advantage."
coach.ai_move.suboptimal.1   "Not my sharpest move. There may be an opportunity for you."
coach.ai_move.suboptimal.2   "I gave you something — find it."

coach.ai_move.neutral.0      "I'll take that square."
coach.ai_move.neutral.1      "Setting up my position."
coach.ai_move.neutral.2      "Let's see how this develops."
```

---

### Acceptance scenarios — Phase 2

1. **Pool removal:** `coach.sparring.ai_move.*`, `coach.sparring.deliberate_mistake.*`, and `coach.sparring.user_move.generic.*` have no remaining references in `src/`. Verifiable with `rg 'coach\.sparring\.(ai_move|deliberate_mistake|user_move\.generic)' connect-four/src/`.
2. **Pattern phrases are a high-difficulty feature by design:** On easy/medium difficulty, `makeAiMove` plays suboptimal moves; the quality gate routes these to `coach.ai_move.suboptimal.*`. Pattern-specific phrases (`coach.ai_move.<tag>.*`) only fire for `quality === 'optimal'` AI moves — which occur predominantly on hard/perfect difficulty. This is intentional.
3. **Neutral fallback on null classification:** When the evaluate-move call fails (network error, error-fallback path, or opening auto-play), `commitAiMove` receives `null` and produces a phrase from `coach.ai_move.neutral.*`, never a pattern-specific or blunder phrase.
4. **ExplorerScreen deep-reveal fix:** The `timeoutContent` ternary resolves `patternTag` via `t('mistakes.pattern.${patternTag}', patternTag)` (not the non-existent `coach.categories.*` prefix) and the absent-patternTag branch resolves via `t('coach.generic.suboptimal.0')`.

---

### NOT included

- `es.json` translation updates — localization is a separate task.
- AI move commentary during `forced_win` sequence's opponent response moves (`outcome === 'continue'` in `handleSequenceClick`) — that path currently shows no message and is unchanged; the user experience is focused on the user's forcing moves.
- Coach commentary for `forbidden_columns` AI moves — there are no AI moves in that puzzle type.
- Changes to the existing `coach.<category>.prompt.*`, `coach.<category>.hint.*`, and `coach.<category>.<quality>.*` pools — those are correct and remain unchanged. Exception: `coach.forced_win` has no `suboptimal` pool (only `optimal` and `blunder`). The quality-gate fallback handles this correctly: a suboptimal AI forced-win move lands in `coach.ai_move.suboptimal`, and a suboptimal user move falls through to `coach.generic.suboptimal`. No new key needed.
- New classifier tags beyond the 12 listed — classifier improvements are a separate epic.
- Batching or caching the evaluate-move call for AI moves — performance optimisation deferred to the plan phase.
- `coach.sparring.hint.generic.*` — the hint toggle phrase ("The best move is highlighted — trust the column.") is informational about the hint UI, not about game state or opponent framing. Content is context-neutral and valid in both sparring and ExplorerScreen. Intentionally retained unchanged.
- `coach.sparring.explorer.intro.*` ("What would you play instead?", "Explore the position. Try a different move.") — content is context-appropriate for exploration in all game modes. Intentionally retained unchanged.
- `coach.sparring.review.*` — server-selected key returned as `summaryPhraseKey` by `GET /api/games/:id/analyze`; resolved by `ReviewScreen` via `t(summaryPhraseKey)`. Not part of the in-game coach message system being refactored. Intentionally retained unchanged.

---

## Dependency graph

```
[already shipped: ChallengeScreen, CLChallengeScreen, useGameBoard, /api/evaluate-move classifier]
  └─► Phase 1 (surgical lesson-mode fixes — standalone, no dependencies)
        └─► Phase 2 (board-grounded AI + user-move fallbacks — depends on Phase 1's generic pools)
```

Phase 1 ships first. Phase 2 depends on the `coach.generic.optimal.*` and `coach.generic.suboptimal.*` pools introduced in Phase 1.

---

## Summary

| Phase | Files changed | Backend changes | New i18n keys | Removed i18n keys | Tasks |
|---|---|---|---|---|---|
| 1. Surgical fixes | `ChallengeScreen.jsx`, `en.json` | None | 6 (generic optimal + suboptimal) | None | 4–6 |
| 2. Board-grounded commentary | `useGameBoard.js`, `ExplorerScreen.jsx`, `en.json` | None (reuses `/api/evaluate-move`) | 31 (13×2 pattern-specific + 3×3 generic AI pools) | 8 (sparring-specific pools) | 14–18 |
