# Deep Reveal Improvements: Coach Reads Aloud + Board Sync

## Overview

The coach reads the deep reveal aloud. As the coach mentions rows, columns, cells, or regions, the board highlights the corresponding zone so it's easy to understand what the coach talks about — like a small presentation. In the text, references to rows, columns, cells, and regions are also highlighted when the user taps or hovers over them.

---

## Executive Summary

**Feasible, with a phased approach.** Phase 1 (interactive tap-to-toggle highlights) is low-risk and shippable in under a week. Phase 2 (TTS + audio sync) builds on the same annotation infrastructure. Phase 3 caches pre-generated audio for instant playback.

---

## Annotation Integrity Principles

These six principles govern every zone annotation across all three phases. They exist
because prompt instructions alone do not guarantee compliance — a rebuilt coach LLM
will still occasionally tag the wrong cell, name a column that disagrees with its
highlight, or reference notation the user cannot see. **The renderer and the
generation pipeline — not the prompt — are the enforcement boundary.** Principles 1–3
are the invariants the user experiences; principles 4–5 are the mechanism that
guarantees them even when the LLM disobeys; principle 6 keeps the text coherent when
read aloud.

### P1. No dangling affordance
A tappable span MUST always produce a visible board change. A zone can be syntactically
valid yet resolve to **zero overlay cells** — e.g. `tg` when there are no major
threats, or an abstract phrase the model tagged anyway ("the stack in that column",
"the double-threat setup"). If a zone resolves to an empty cell set, it is **not
rendered as interactive**: no dotted underline, no hover preview, no toggle. An
affordance that highlights nothing reads as a bug. This is stronger than the existing
bounds-check, which only catches out-of-range coordinates.

### P2. Text↔zone agreement
The location named in the **wrapped text** MUST match the **zone spec** carrying it.
`[zone:col1]column 4[/zone:col1]` is a defect even though both halves are individually
valid. The zone overlay is the single source of truth for any spatial claim; the
human-readable number is validated against the spec. On mismatch, the zone is dropped
(and, server-side, the explanation is regenerated) — a contradiction between the text
and the highlight is never rendered.

### P3. User-visible vocabulary only
The explanation addresses someone who **sees a graphical board (green/grey discs) and
hears audio** — never the internal ASCII diagram (`R`/`Y`) or any prompt artifact
(forced_win, leaf, solver, simulation, score, "patterns in data"), and never the
player names Red/Yellow/Black. This is sharper for Deep Reveal than for plain text
because **the text is read aloud**: "the R discs" or "this leads to forced_win" spoken
by TTS is meaningless to the listener. The allowed vocabulary is exactly what the user
perceives: green/grey discs, column numbers, row numbers, and Connect Four concepts.

### P4. Validate-then-cache (server-side enforcement)
Annotations are validated **against the actual board at generation time, server-side,
before caching or TTS generation**. An explanation that fails validation (P1–P3, P5)
is **regenerated, not stored**. Client-side dropping (`parseAnnotatedText` +
`console.warn`) remains as a last-resort guard for old cache entries, but it is not the
enforcement point: Phase 3 caches and voices the text, so a bad annotation that reaches
the cache gets **spoken aloud** before any client ever drops it. The gate must sit
upstream of the cache write.

### P5. Closed-vocabulary zones
Every zone the LLM emits MUST reference a location in a **pre-computed allowed set** —
the same set of board locations the coach context block exposes to the model. A zone
outside that set is dropped and triggers regeneration. This is the highlight-layer
expression of the coach grounding contract (see
[`coach_explanation_principles.md`](./coach_explanation_principles.md)): it is what
makes an annotation pointing at an occupied cell or a non-existent winning line
**impossible to render**, not merely discouraged.

### P6. Spoken-coherence of stripped text
TTS reads the **tag-stripped `cleanText`** (Phase 2). Tags MUST therefore wrap
natural-language spatial phrases, never bare coordinates:
`[zone:c4r3]the cell on row 3[/zone:c4r3]`, not `[zone:c4r3]c4r3[/zone:c4r3]`. The
cleanText must read as a coherent sentence with the tags removed. This is both a prompt
constraint and a validation check (reject annotations whose wrapped text is a raw
coordinate token).

**Traceability:** P1 ← cases 14, 15; P2 ← case 10; P3 ← case 12; P5 ← cases 16, 17
(occupied-cell / own-disc winning lines). All are real `llm_feedback` rows; they are
treated here as failure modes that **will recur** in a rebuilt system, independent of
how often the old system produced them.

---

## Phase 1: Tap-to-Toggle Interactive Highlights (4–6 days)

### Interaction Model

| Behavior | Detail |
|---|---|
| **Hover** | Dim preview highlight on board + subtle brightening of the text span. Clears on mouse-out if not toggled. No-op on touch devices. |
| **Tap/click** | Toggles the zone highlight on/off. Toggled state persists until re-tapped or cleared. |
| **Multiple zones** | Additive — tapping a second zone adds to the highlighted set. Both stay lit simultaneously. |
| **Clear** | A "Clear highlights" link button appears when ≥1 zone is active. Also tapping outside any zone span clears all. |
| **Text affordance** | Tappable spans have a subtle dotted underline in the default state. |
| **Color matching** | When a zone is toggled on, the text span uses the same accent color as the board `zh` overlay — visually linking the text reference to the highlighted cells. |

### Zone Types

The LLM annotates board references inline using a `[zone:<spec>]text[/zone:<spec>]` format:

| Zone spec | Example text | Board effect |
|---|---|---|
| `colN` | `[zone:col4]column 4[/zone:col4]` | Entire column tinted with `zh` rings on all cells |
| `cNrM` | `[zone:c3r2]this cell[/zone:c3r2]` | Single cell `zh` ring |
| `cells:c1r2,c2r3,...` | `[zone:cells:c4r2,c4r4]rows 2 and 4[/zone:cells:c4r2,c4r4]` | Multiple cell `zh` rings |
| `rowN` | `[zone:row5]the top row[/zone:row5]` | Entire row tinted with `zh` rings |
| `tg` | `[zone:tg]this threat[/zone:tg]` | All current major threat cells for **the user's player** (the player being coached) |

Column and row numbers in annotations are **1-indexed** (matching the LLM prompt convention). The parser converts to 0-indexed internally for Board overlays.

**`tg` player resolution:** The coaching context is always from the user's perspective — the coach is explaining what happened to the user's position. `tg` resolves to the userPlayer's major threat cells, computed via `Board.getMajorThreatCells()` filtered for the player who just moved (or the player being coached, depending on context). The `zoneToOverlays` function receives `userMajorThreats` and `opponentMajorThreats` as separate arguments. If the LLM needs to reference opponent threats, it must use explicit `cells:` notation. A future extension may add `tg-opp` if opponent-threat references become common in the LLM output.

**Load-bearing assumption:** `Board.getMajorThreatCells()` is O(672) and runs in under 1ms per the 009 refactor. It returns threat cells for both players. The `tg` resolution must filter for the correct player — verify with a concrete test case before wiring it into `zoneToOverlays`. See constitution Principle VI (validate signal validity before using it).

### Color System

Single unified "coach mention" color — zones are geometrically distinct on the board (whole column vs. single cell) so multiple colors aren't needed:

```
--zone-highlight: #5B9BD5 (soft blue, distinct from all existing overlay colors)
```

Board overlay (`zh`):
- Inactive (hover preview): 30% opacity ring
- Active (toggled): 100% opacity pulsing ring

Text span states:
- Default: dotted underline in `--ink-soft` (gray)
- Hover preview: background at 15% `--zone-highlight`
- Toggled on: background at 25% `--zone-highlight`, bold text in `--zone-highlight`, left-border accent
- Toggled + hover: background at 35% `--zone-highlight`

The blue is visually distinct from all five existing overlay types:

| Overlay | Color | Meaning |
|---|---|---|
| `tg` | Green | Your threat / good move |
| `td` | Gray | Opponent threat |
| `tr` | Red | Your played move (wrong) |
| `claim` | Amber | Claimeven cell |
| `win` | Green pulse | Winning line |
| **`zh`** | **Blue** | **Coach-mention zone** |

**Existing token check:** `--zone-highlight: #5B9BD5` was verified against all existing CSS tokens in `src/styles/tokens.css` and `src/index.css`. No existing token uses this blue range. The color is distinct from `--disc-green (#2faa5a)`, `--eval-good (#2bb462)`, `--eval-mid (#f5a623)`, `--eval-bad (#e8543e)`, `--threat-green`, `--threat-gray`, `--threat-red`, `--claim`, and the dark-surface text/scaffold tokens. No collision.

### Overlay Merge Contract

The Board currently uses a single `ovMap` (`{col},{row} → type`) — a cell can have at most one overlay type (line 59 of Board.jsx). The `zh` overlay is **independent** of the existing overlay layer and renders as a **separate `<span>`** in the cell, parallel to the existing overlay `<span>`:

- **Board change**: Inside the cell render loop (after the existing overlay `<span>` at line 212-221), add a second `<span>` for `zh` that renders only when the cell is in the `zhCells` set. This means `zh` can layer on top of `tg`/`td`/`tr`/`claim`/`win` without conflict.
- **Prop**: Board receives a new optional `zhCells` prop: `Set<string>` where keys are `"col,row"` strings.
- **Merge responsibility**: Each parent screen owns the merge. `AnnotatedExplanation` emits `zhCells` via `onHighlightsChange(zhCells)`. The parent screen passes `zhCells` to Board alongside existing `overlays`. No merging happens inside Board — it renders both layers independently.

**Why a separate prop, not merged into `overlays`:** The existing `overlays` array feeds a single `ovMap` with exclusive type dispatch. Adding `zh` as a sixth type would require changing the rendering branch structure and risks breaking the visual treatment of existing types. A parallel layer is lower-risk and keeps the change surface minimal (one new `<span>` block).

### LLM Prompt Modification

Add to `buildExplainPrompt` in `server/llmCoachHelpers.js`:

```
## Output format

Wrap any reference to a specific board location in zone tags:

- `[zone:colN]column N[/zone:colN]` — a single column
- `[zone:cNrM]the cell at row M[/zone:cNrM]` — a single cell
- `[zone:cells:c1r2,c2r3]these cells[/zone:cells:c1r2,c2r3]` — multiple cells (comma-separated)
- `[zone:rowN]row N[/zone:rowN]` — an entire row
- `[zone:tg]this threat[/zone:tg]` — all current major threat cells for the player

Rules:
- Only tag EXPLICIT spatial references. Do NOT tag abstract concepts like "the position" or "the tactic." (P1)
- The number you write in the text MUST match the zone spec — `[zone:col4]column 4[/zone:col4]`, never a spec that disagrees with the words. (P2)
- Use only vocabulary the reader can see and hear: green/grey discs, column numbers, row numbers. Never use the diagram letters R/Y, the names Red/Yellow/Black, or internal terms (forced_win, leaf, solver, simulation, score, "patterns in data"). (P3)
- Only tag board locations that appear in the allowed-locations list provided in the context. (P5)
- Tags wrap natural language, not bare coordinates: `[zone:c4r3]the cell on row 3[/zone:c4r3]`, not `[zone:c4r3]c4r3[/zone:c4r3]`. (P6)
- Use column numbers as they appear in the board context above (1-indexed columns, row 1 = bottom).
- For "best line" columns, tag each one individually.
- The board has 7 columns (1–7, left to right) and 6 rows (1–6, bottom to top).
```

These rules are **enforced server-side at generation time (P4)**, not merely requested: an explanation whose annotations violate P1–P3, P5, or P6 is regenerated before it is cached or voiced. The prompt rules raise compliance; the validation gate guarantees it.

### Component Architecture

```
┌─ ChallengeScreen / ExplorerScreen / DeepRevealButton / ExplainMoveButton ─┐
│                                                                           │
│  state: activeZones (Set<zoneIndex>)                                     │
│                                                                           │
│  ┌──────────────────────┐    ┌──────────────────────┐                    │
│  │  <AnnotatedText>     │    │  <Board>              │                    │
│  │                      │    │                      │                    │
│  │  "Playing in [col4]  │    │  ⚫ ⚫ ⚫ ⚫ ⚫ ⚫ ⚫    │                    │
│  │  creates a threat    │    │  ⚫ ⚫ ⚫ ⚫ ⚫ ⚫ ⚫    │                    │
│  │  at [c4r2,c4r4]..."  │    │  ⚫ ⚫ ◎ ⚫ ⚫ ⚫ ⚫    │  ← col4 highlighted│
│  │                      │    │  ⚫ ⚫ ◎ ⚫ ⚫ ⚫ ⚫    │                    │
│  │  [Clear highlights]  │    │  ⚫ ⚫ ⚫ ⚫ ⚫ ⚫ ⚫    │                    │
│  └──────────────────────┘    └──────────────────────┘                    │
│           │                           ▲                                  │
│           │ onToggleZone(index)        │ overlays={[...]}                 │
│           └───────────────────────────┘                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Component API Contracts

**`<AnnotatedExplanation>`** — full wrapper (text parsing + Board sync):

| Prop | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | Yes | Raw LLM explanation (may contain `[zone:]` tags) |
| `userMajorThreats` | `Array<{c, r}>` | No | Major threat cells for the user's player (for `tg` zone resolution) |
| `opponentMajorThreats` | `Array<{c, r}>` | No | Major threat cells for the opponent (for future `tg-opp` or explicit reference) |
| `onHighlightsChange` | `(zhCells: Set<string>) => void` | No | Called when the active zh cell set changes. Parent wires to Board's `zhCells` prop. |
| `className` | `string` | No | Optional CSS class for the wrapper |
| `children` | `ReactNode` | No | Rendered after the explanation text (e.g., flag button, best-line chips) |

**`<AnnotatedText>`** — text-only rendering (no Board sync dependency):

| Prop | Type | Required | Description |
|---|---|---|---|
| `cleanText` | `string` | Yes | Zone-tag-stripped text to render |
| `zones` | `Array<Zone>` | Yes | Parsed zone objects with `{index, spec, startChar, endChar, text}` |
| `activeZones` | `Set<number>` | Yes | Which zone indices are currently toggled on |
| `onToggleZone` | `(index: number) => void` | Yes | Called on tap/click of a zone span |
| `onClearAll` | `() => void` | No | Called when "Clear highlights" is clicked (if omitted, button is not rendered) |

**`parseAnnotatedText(text: string): { cleanText: string, zones: Zone[] }`**:
- Strips `[zone:<spec>]...[/zone:<spec>]` tags, returns cleaned text and parsed zone array
- Zone objects include character offsets in the cleaned text for hover/tap hit-testing
- Invalid zone specs (out-of-bounds coords, malformed syntax) trigger `console.warn` and the zone is omitted from the returned array

**`zoneToOverlays(zoneSpec, userMajorThreats, opponentMajorThreats): Array<{c, r}>`**:
- Converts a zone spec string to 0-indexed `{c, r}` coordinates
- `colN` → all 6 cells in column N-1
- `cNrM` → single cell at col N-1, row M-1
- `cells:c1r2,...` → array of individual cells
- `rowN` → all 7 cells in row N-1
- `tg` → `userMajorThreats` (returns the passed-in array directly)
- Out-of-bounds individual cells are dropped with `console.warn`; an entirely invalid spec returns `[]`

**`regexFallbackParse(text: string): { cleanText: string, zones: Zone[] }`**:
- Best-effort detection of unannotated spatial references in old cache entries
- Matches: `/\bcolumn\s+(\d+)\b/gi`, `/\bcol\s+(\d+)\b/gi`, `/\brows?\s+(\d+)\s+and\s+(\d+)\b/gi`, `/\brows?\s+(\d+)\b/gi`
- Does NOT attempt to match: "column four" (textual numbers), "the middle column", "the top row", "that cell", "the diagonal"
- False positives are possible (e.g., "column N" in abstract phrasing); this is acceptable for a fallback
- Precision/recall expectations: ~70% recall on typical LLM output, ~90% precision. The fallback exists to prevent old cache entries from appearing broken, not to perfectly annotate them.

### DeepRevealButton and ExplainMoveButton — Board-less Context

`DeepRevealButton.jsx` and `ExplainMoveButton.jsx` are self-contained components that render explanation text inside a `revealBox` div. They have **no Board in their render tree**. These components use `<AnnotatedText>` (text-only interactive highlights) — **not** `<AnnotatedExplanation>` (which requires a Board for zh overlay sync).

To support future Board sync, each component accepts an optional `onZoneHighlightsChange` callback. When provided, the component wraps with `<AnnotatedExplanation>` instead of `<AnnotatedText>`, and the parent screen wires the callback to its Board's `zhCells` prop. When omitted (current default), only text-side highlights render — the board does not react to zone toggles.

**Current plan for Phase 1:** Both components use `<AnnotatedText>` only. Board sync for these surfaces is deferred until a parent screen actually renders a Board alongside them.

### Integration Points

All four deep reveal surfaces consume either `<AnnotatedExplanation>` (with Board sync) or `<AnnotatedText>` (text-only):

| Surface | File | Current renderer | Change |
|---|---|---|---|
| Deep Reveal bottom-sheet (challenges) | `ChallengeScreen.jsx` ~L739 | Plain text `<p>` | Replace with `<AnnotatedExplanation>`. ChallengeScreen already owns `overlays` state + Board — pass `zhCells` to Board alongside existing overlays. |
| Position Explorer bottom-sheet | `ExplorerScreen.jsx` ~L436 | `<ReactMarkdown>` | Replace with `<AnnotatedExplanation>`. `ExplorerBoard` (inner component) renders Board with `overlays={[...trOverlay, ...hintOverlays]}`. Thread `zhCells` through ExplorerScreen → ExplorerBoard → Board.zhCells. |
| Mistake Detail panel | `DeepRevealButton.jsx` ~L126 | `<ReactMarkdown>` | Replace with `<AnnotatedText>` (text-only). No Board in render tree. Add optional `onZoneHighlightsChange` prop for future Board sync. |
| Sparring explain | `ExplainMoveButton.jsx` | `<ReactMarkdown>` | Replace with `<AnnotatedText>` (text-only). Same Board-less pattern as DeepRevealButton. |

### Cache Migration

The `deep_reveal_json` column in `explanation_cache` is extended additively:

```json
// Old (still supported)
{ "explanation": "Playing in column 4 creates a double threat...", "bestLine": [...], "prompt": "..." }

// New
{ "explanation": "Playing in [zone:col4]column 4[/zone:col4] creates a double threat at [zone:cells:c4r2,c4r4]rows 2 and 4[/zone:cells:c4r2,c4r4]...", "bestLine": [...], "prompt": "..." }
```

Old cache entries without `[zone:]` tags are handled by `regexFallbackParse()` on the client — no data migration needed.

---

## Phase 2: TTS Playback + Auto-Toggle (5–8 days)

During audio playback, zones auto-toggle in sync with the coach's spoken words. The user can still manually tap to lock/unlock zones independently of the audio position.

### Playback Behavior

| Behavior | Detail |
|---|---|
| **Auto-toggle** | When the coach's voice reaches a zone reference, the zone auto-toggles on with a brief pulse animation. Previous auto-toggled zone clears (unless the user manually locked it). |
| **Manual override** | If the user taps a zone during playback, it locks in the toggled state and won't auto-clear when the audio moves on. A small lock/thumbtack icon appears on locked spans. |
| **Playback controls** | Play/pause button. Scrubber bar with zone markers (ticks showing where highlights occur). |
| **Silent mode** | Interactive tap-to-toggle works identically with or without audio. TTS is opt-in via a speaker button. |
| **Autoplay gate** | Browser autoplay policy requires a user gesture. The "Learn more" button tap satisfies this — audio starts after the bottom-sheet animation completes (~300ms delay). |

### TTS Provider: Azure Speech Services

| Dimension | Value |
|---|---|
| **SDK** | `microsoft-cognitiveservices-speech-sdk` (npm) |
| **Free tier** | 500K chars/month (~1,600 deep reveals/month at zero cost) |
| **Neural pricing** | $15/M chars ($0.0045 per avg 300-char reveal) |
| **Latency** | ~75ms to first audio byte |
| **Sync mechanism** | `WordBoundary` event: `textOffset` (char index) + `audioOffset` (100-nanosecond ticks) |
| **SSML support** | Full: `<voice>`, `<prosody>`, `<bookmark>` |
| **Voice** | `en-US-ChristopherNeural` (male, coaching tone) |

**Why Azure over alternatives:**
- **Web Speech API:** `onboundary` events unreliable; iOS Safari doesn't fire them at all. Not viable for sync.
- **ElevenLabs:** Better voice quality, but 30× more expensive ($0.03/reveal vs. $0.0045) and no free tier.
- **OpenAI TTS:** No word-level timestamps at all.
- **Azure:** Free tier covers all MVP usage. WordBoundary events give precise per-word timing. Mature SDK.

### Sync Engine

```javascript
function useAudioSync(cleanText, zones, activeZones, toggleZone) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(null);
  const lockedZones = useRef(new Set()); // zones user manually locked during playback

  // Build character-offset → zone lookup
  const charToZone = useMemo(() => {
    const map = new Map();
    for (const z of zones) {
      for (let i = z.startChar; i < z.endChar; i++) {
        map.set(i, z);
      }
    }
    return map;
  }, [zones]);

  const play = async () => {
    const speechConfig = SpeechConfig.fromSubscription(key, region);
    const synthesizer = new SpeechSynthesizer(speechConfig);
    const ssml = buildSSML(cleanText);

    synthesizer.wordBoundary = (sender, event) => {
      const zone = charToZone.get(event.textOffset);
      if (!zone || lockedZones.current.has(zone.index)) return;

      // Auto-clear previous auto-toggled zone
      if (currentZoneIndex !== null && !lockedZones.current.has(currentZoneIndex)) {
        toggleZone(currentZoneIndex);
      }
      // Auto-toggle current zone
      if (!activeZones.current.has(zone.index)) {
        toggleZone(zone.index);
      }
      setCurrentZoneIndex(zone.index);
    };

    synthesizer.synthesisCompleted = () => {
      // Clear last auto-toggled zone if not locked
      if (currentZoneIndex !== null && !lockedZones.current.has(currentZoneIndex)) {
        toggleZone(currentZoneIndex);
      }
      setIsPlaying(false);
      setCurrentZoneIndex(null);
    };

    setIsPlaying(true);
    await synthesizer.speakSsmlAsync(ssml);
  };

  const pause = () => { /* pause + remember position */ };
  const lockCurrentZone = () => {
    if (currentZoneIndex !== null) lockedZones.current.add(currentZoneIndex);
  };

  return { play, pause, isPlaying, currentZoneIndex, lockCurrentZone };
}
```

### SSML Construction

```javascript
function buildSSML(cleanText) {
  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
         xmlns:mstts="http://www.w3.org/2001/mstts"
         xml:lang="en-US">
    <voice name="en-US-ChristopherNeural">
      <mstts:silence type="SentenceBoundary" value="200ms"/>
      <prosody rate="0.95" pitch="+0%">
        ${escapeXml(cleanText)}
      </prosody>
    </voice>
  </speak>`;
}
```

---

## Phase 3: Audio Cache (2–3 days)

After the LLM responds, asynchronously generate TTS audio and store it alongside the explanation:

### Cache Shape

```json
// explanation_cache.deep_reveal_json (extended)
{
  "explanation": "Playing in [zone:col4]column 4[/zone:col4]...",
  "bestLine": ["Col 4", "Col 2", "Col 5"],
  "prompt": "...",
  "audioBase64": "<base64-encoded mp3>",
  "audioTimestamps": [
    { "charIndex": 0, "timeMs": 0 },
    { "charIndex": 12, "timeMs": 840 },
    { "charIndex": 25, "timeMs": 1520 }
  ]
}
```

### Async Generation Flow

```
LLM response received
  │
  ├─ 1. Return { explanation, bestLine, prompt } to client immediately (same as today)
  │
  └─ 2. Async (non-blocking):
       ├─ Generate TTS audio via Azure Speech SDK
       ├─ Collect WordBoundary timestamps
       └─ UPDATE explanation_cache
          SET deep_reveal_json = deep_reveal_json || { audioBase64, audioTimestamps }
```

### Performance

| Scenario | Latency to audio start |
|---|---|
| Cache hit + pre-generated audio | ~200ms (audio download) |
| Cache hit + live TTS (no pre-gen) | ~275ms (generate + download) |
| Cache miss + live TTS | ~1,775ms (LLM dominates; audio loads while text displays) |

Cache hits skip Azure API calls entirely, keeping the app within the free tier indefinitely at MVP scale.

### Storage Cost

- Avg 300-char explanation → ~15–20s audio at 32kbps MP3 → ~60–80KB
- 10,000 unique positions cached → ~600–800MB
- Supabase Storage: $0.021/GB/month → ~$17/month at 10K entries
- Mitigation: LRU eviction for positions older than 90 days with no cache hit

---

## Cost Analysis

### Per-User (20 deep reveals/week, all cache misses)

| Provider | Per-reveal | Weekly | Monthly |
|---|---|---|---|
| Azure Speech (neural) | $0.0045 | $0.09 | $0.36 |
| Azure Speech (free tier) | $0 | $0 | $0 (first 1,600 reveals/mo) |

### At Scale

| Scale | Azure neural | Azure free tier |
|---|---|---|
| 100 WAU, 5 reveals each, 50% cache hit | $1.13/wk | $0 |
| 1,000 WAU, 5 reveals each, 50% cache hit | $11.25/wk | $0 |
| 10,000 WAU, 5 reveals each, 50% cache hit | $112.50/wk | ~$90/wk (beyond free tier) |

**Azure free tier covers all MVP usage.** No TTS costs until the app exceeds ~1,600 deep reveals/month.

### LLM Cost Increase (Annotated Output)

The annotation markup adds ~15–25% more output tokens:
- Avg explanation: ~300 chars → ~375 chars with annotations
- Extra tokens: ~20–30 output tokens per reveal
- At GPT-4o-mini pricing ($0.60/1M output tokens): ~$0.00002 extra per explanation
- **Negligible.**

---

## Latency Analysis

| Scenario | LLM | TTS Gen | Network | **Total** |
|---|---|---|---|---|
| Cache hit + pre-generated audio (Phase 3) | — | — | ~200ms | **~200ms** |
| Cache hit + live TTS (Phase 2) | — | ~75ms | ~200ms | **~275ms** |
| Cache miss + live TTS (Phase 2) | ~1,500ms | ~75ms | ~200ms | **~1,775ms** |
| Cache miss + text only (today) | ~1,500ms | — | — | **~1,500ms** |

The ~275ms for cache hits is imperceptible. For cache misses, the LLM dominates anyway — text appears immediately while audio loads (progressive enhancement).

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **LLM doesn't annotate consistently** | No highlights shown | Client-side `regexFallbackParse()` detects "column N", "row N", "col N" patterns. Also: few-shot examples in the prompt improve compliance. |
| **LLM hallucinates wrong zone specs** | Wrong cells highlighted | Validate zone specs against board bounds (col 1–7, row 1–6). Drop invalid cells/specs with `console.warn` — errors must not pass silently (constitution Principle VII). Individual out-of-bounds cells are dropped from multi-cell specs; single-cell/col/row specs that are entirely invalid return empty. |
| **Zone resolves to zero cells** (empty `tg`, abstract phrase) | Tappable span highlights nothing — reads as a bug | **P1:** a zone whose overlay set is empty is not rendered as interactive (no underline/hover/toggle). Checked after `zoneToOverlays`. |
| **Text number disagrees with highlight** | User sees "column 4" but column 1 lights up | **P2:** validate the number in the wrapped text against the zone spec; drop on mismatch (regenerate server-side). |
| **Text references R/Y discs or internal terms** | Meaningless to reader, worse when read aloud | **P3:** reject annotations/text containing diagram letters, player color-names, or internal jargon. |
| **Bad annotation reaches cache and gets voiced** | TTS speaks wrong/garbled reference | **P4:** validate annotations server-side **before** cache write and TTS generation; regenerate on failure. Client drop is a last-resort guard only. |
| **Zone points outside the allowed-locations set** | Highlights an occupied cell or non-existent line | **P5:** drop any zone not in the pre-computed allowed set and regenerate; bridges to coach grounding contract. |
| **Tag wraps a bare coordinate** | TTS reads "c4r3" aloud | **P6:** reject annotations whose wrapped text is a raw coordinate token; tags must wrap natural language. |
| **iOS Safari TTS limitations** | No audio on iOS | Azure Speech SDK works cross-platform. For the interactive tap-to-toggle, no audio is needed — Phase 1 works everywhere. |
| **Audio generation cost at scale** | Unexpected cloud bill | Azure free tier (500K chars/mo) as safety net. Per-user quota (20/week) already caps usage. Set billing alert at $10/mo. |
| **SSML/annotation escaping** | Broken audio or highlights | Sanitize annotation tags before SSML construction. Escape XML entities in clean text. |
| **Cache invalidation** | Old cache entries lack annotations | `regexFallbackParse()` fallback. New entries use annotated format. No migration needed. |
| **Browser autoplay policy** | Audio blocked | Audio starts only after user taps "Learn more" button (user gesture satisfied). Silent autoplay is never attempted. |

---

## Effort Summary

| Phase | Days | Ships independently? | Dependencies |
|---|---|---|---|
| Phase 1: Tap-to-toggle | 4–6 | Yes | None |
| Phase 2: TTS + sync | 5–8 | Yes (builds on Phase 1 infra) | Phase 1 |
| Phase 3: Audio cache | 2–3 | Yes (pure optimization) | Phase 2 |
| **Total** | **11–17** | | |

---

## Files Touched

| File | Phase | Change |
|---|---|---|
| `server/llmCoachHelpers.js` | 1 | Add "Output format" section to `buildExplainPrompt` |
| `server/index.js` | 1, 3 | Phase 1: no change (pass-through). Phase 3: async audio generation + cache write. |
| `src/lib/annotatedText.js` | 1 | **New.** `parseAnnotatedText()`, `zoneToOverlays()`, `regexFallbackParse()` |
| `src/components/AnnotatedExplanation.jsx` | 1 | **New.** Shared wrapper: parses text, manages `activeZones`, emits overlays |
| `src/components/AnnotatedText.jsx` | 1 | **New.** Renders interactive spans with hover/tap/toggle visual states |
| `src/components/Board.jsx` | 1 | Add `zh` overlay type (soft blue pulsing ring) |
| `src/styles/tokens.css` | 1 | Add `--zone-highlight` token |
| `src/components/DeepRevealButton.jsx` | 1 | Replace `<ReactMarkdown>` with `<AnnotatedText>` (text-only; no Board in render tree). Add optional `onZoneHighlightsChange` prop. |
| `src/components/ExplainMoveButton.jsx` | 1 | Replace `<ReactMarkdown>` with `<AnnotatedText>` (text-only). Same Board-less pattern. |
| `src/screens/ChallengeScreen.jsx` | 1 | Replace plain-text `<p>` with `<AnnotatedExplanation>`. Accept `zhCells` from `onHighlightsChange`, pass to Board. |
| `src/screens/ExplorerScreen.jsx` | 1 | Replace `<ReactMarkdown>` with `<AnnotatedExplanation>`. Thread `zhCells` through ExplorerBoard to Board. |
| `package.json` | 2 | Add `microsoft-cognitiveservices-speech-sdk` |
| `.env` / server config | 2 | Add `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |

---

## Testing Strategy

Per constitution Principle III (Testing Standards):

### Unit Tests (`src/lib/annotatedText.test.js`)

| Function | Test cases |
|---|---|
| `parseAnnotatedText` | Valid single zone (each spec type: col, cell, cells, row, tg); multiple zones in one text; zone with no matching close tag (dropped); zone with invalid coord (console.warn + dropped); empty text; text with no zones; nested/malformed tags; adjacent zones (no gap between `[/zone:X][zone:Y]`) |
| `zoneToOverlays` | `colN` → 6 cells; `cNrM` → 1 cell; `cells:` → N cells; `rowN` → 7 cells; `tg` → returns passed-in majorThreats array; out-of-bounds col (returns []); out-of-bounds row in multi-cell spec (drops that cell, keeps valid ones); empty spec; unknown spec (returns []) |
| `regexFallbackParse` | "column 4" → 1 zone; "col 3 and col 5" → 2 zones; "rows 2 and 4" → cells for both rows; text with no spatial references (returns empty zones); "Column 1" (capitalized); false positive: "column N is critical" (acceptable — fallback is best-effort) |

### Integration / Manual Verification

| Surface | Verification |
|---|---|
| Board `zh` overlay | Render Board with `zhCells` containing a known set. Visually confirm: (a) zh ring renders alongside existing tg/td/tr overlays without conflict, (b) pulsing animation plays, (c) hover-preview and active states render at correct opacities |
| ChallengeScreen | Open Deep Reveal on a puzzle. Verify: annotated zones toggle on tap, Board highlights sync, "Clear highlights" clears both text and Board, overlay merge works alongside existing puzzle evaluation overlays |
| ExplorerScreen | Same as ChallengeScreen, but verify zh overlays don't conflict with `useGameBoard.hintOverlays` or the `tr` overlay |
| DeepRevealButton | Tap zone spans — text highlights work. Verify no crash when `onZoneHighlightsChange` is undefined |
| LLM prompt compliance | Run a sample of 10 positions through the updated prompt. Verify ≥80% of spatial references are tagged with `[zone:]` markup. If compliance is lower, add few-shot examples to the prompt. |

---

## Documentation Deliverables

Per constitution Principle VIII (Documentation as First-Class Deliverable), the following docs must be updated as part of implementation — a task is not done until its documentation is present:

| Document | What to add | Phase |
|---|---|---|
| `docs/architecture/frontend-conventions.md` | New Board overlay type `zh` (soft blue pulsing ring); `zhCells` prop contract; `<AnnotatedExplanation>` and `<AnnotatedText>` component patterns (interactive annotated text with Board sync) | 1 |
| `docs/architecture/server-conventions.md` | LLM prompt format extension: `[zone:<spec>]text[/zone:<spec>]` annotation convention added to `buildExplainPrompt`; cache backward-compatibility (old entries lack annotations, handled by `regexFallbackParse`) | 1 |
| `docs/architecture/data-model.md` | `explanation_cache.deep_reveal_json` extended shape: annotations now embedded in `explanation` field; Phase 3 adds `audioBase64` and `audioTimestamps` | 1, 3 |
| `docs/architecture/api-conventions.md` | `/api/explain-move-llm` response: `explanation` field now contains `[zone:]` markup. Clients MUST parse through `parseAnnotatedText` before rendering. Old clients rendering raw text will see markup tags — cache-bust or deploy client + server together. | 1 |
| `specs/<next-spec>/contracts/annotated-text.md` | Formal contract for the `[zone:<spec>]text[/zone:<spec>]` annotation format, zone spec vocabulary, and parser behavior (error cases, coordinate bounds) | 1 |

**Deploy order note:** The server-side prompt change and the client-side parser must deploy together. If the server sends annotated text to an old client, raw `[zone:col4]` tags will appear in the UI. Mitigation: the server change is additive — old cache entries without annotations still render correctly via `regexFallbackParse`. New entries with annotations are only served after the client deploy.

---

## Constitution Compliance

This section verifies each principle of the constitution (v1.3.2) against the plan.

### I. Explanation Engine as Single Source of Truth
**Compliant.** Zone annotations are added in the LLM annotation layer (layer 3) of the existing Explanation Engine. The LLM is instructed to ground spatial references in concrete board positions, not speculate. Progressive disclosure is preserved: one-line summaries remain unchanged; full annotation only appears on explicit user action (Deep Reveal tap).

### II. Code Quality & Simplicity
**Compliant.** `<AnnotatedExplanation>` and `<AnnotatedText>` are extracted because the same pattern is needed across 4 surfaces — legitimate DRY, not speculative abstraction. One function (`parseAnnotatedText`) handles the regex parse. One function (`zoneToOverlays`) maps specs to coordinates. Three similar lines are not being prematurely factored. No storage backend is referenced directly by any new component.

### III. Testing Standards
**Compliant with plan.** See "Testing Strategy" section above. Unit tests for pure functions, manual verification for Board rendering and surface integration. `tg` zone resolution uses `getMajorThreatCells()` which is already tested with real solver output in the classifier tests.

### IV. UX Consistency & Progressive Disclosure
**Compliant.** The `zh` overlay uses a single unified color (`--zone-highlight: #5B9BD5`) across all surfaces. The annotation format (`[zone:<spec>]`) is the same in every Deep Reveal context. Zone highlights are behind the existing Deep Reveal user gesture — no new disclosure path is added. Commit-first mode in Sparring is unaffected (zone highlights appear only in the post-move reveal, not before).

### V. Performance Requirements
**Compliant.** Annotation parsing (`parseAnnotatedText`) is a single regex pass over ~400 chars — sub-millisecond. `zoneToOverlays` is O(zones × cells) — negligible (max ~42 cells per spec). LLM output token increase is ~20–30 tokens per explanation (~$0.00002 at GPT-4o-mini pricing). The 2-second latency budget is unaffected. See "Latency Analysis" section.

### VI. Implementation & Debugging Methodology
**Compliant with noted verification step.** The `tg` zone resolution makes a load-bearing assumption that `Board.getMajorThreatCells()` returns the correct threat cells for the annotation context. This assumption is documented above under Zone Types and must be verified with a concrete test case before wiring. All other signals (parse regex, zone → coordinate mapping, LLM prompt compliance) have concrete verification paths in the Testing Strategy.

### VII. Software Design Philosophy
**Compliant** after the fix to "silently drop invalid specs." Invalid zone coordinates now emit `console.warn` before dropping. The fallback parser explicitly acknowledges its best-effort nature with documented precision/recall expectations (~70% recall). "In the face of ambiguity, refuse the temptation to guess" — the parser does not guess: if a zone spec is malformed, it is dropped (with warning), not interpreted heuristically.

### VIII. Documentation as First-Class Deliverable
**Compliant with plan.** See "Documentation Deliverables" section above. Five documentation artifacts are identified with specific content and phase assignments. Each is part of the relevant task's definition of done.

---

## Deferred (Post-MVP)

- ElevenLabs upgrade path for higher voice quality
- Word-level TTS precision (Azure WordBoundary gives per-word; phrase-level is sufficient for MVP)
- Scrubber bar with zone marker ticks during audio playback
- Audio speed control (0.5× / 1× / 1.5×)
- Voice selection (male/female coach)
- Offline TTS via Web Speech API fallback (no sync, read-aloud only)
