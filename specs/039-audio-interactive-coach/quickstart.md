# Quickstart: Audio & Interactive Coach (Epic 10)

**Audience**: Developer implementing or deploying this feature.

---

## Deploy-time steps (manual, one-time)

### 1. Clear explanation_cache

All existing `explanation_cache` rows must be cleared at deploy time — pre-feature rows lack `[term:...]` tags and the `terms` JSONB field, so they would never surface term highlighting even after the feature ships.

**Run in Supabase SQL editor (production)**:
```sql
DELETE FROM explanation_cache;
```
(`TRUNCATE explanation_cache;` also works; `DELETE` is preferred because it does not require a table-level lock.)

This is NOT a migration (no rollback needed). Must be run before deploying this feature.

---

## Development workflow: SFX + music

1. Copy the placeholder MP3 to all 7 SFX slots:
```bash
PLACEHOLDER=~/Downloads/zapsplat_leisure_game_connect_4_disc_drop_into_grid_tower_game_play_single_008_52315.mp3
mkdir -p connect-four/public/audio/sfx
for name in disc_fall disc_land_disc disc_land_bottom bg_music win correct_move wrong_move; do
  cp "$PLACEHOLDER" "connect-four/public/audio/sfx/${name}.mp3"
done
```

2. Start the dev server and test all 7 sound events manually.

3. Source final CC0/royalty-free files from freesound.org or similar. Replace each placeholder file in place.

---

## Development workflow: TTS

1. Ensure `OPENAI_API_KEY` is set in `connect-four/server/.env`.

2. Generate audio for all eligible coach keys:
```bash
cd connect-four
node scripts/generate-tts.js --all-new
```
This writes MP3s to `public/audio/coach/` and updates `server/tts-registry.json` with status `awaiting_approval`.

3. Start the dev server and open `http://localhost:3001/admin/audio` in the browser.

4. For each key: listen to the audio. If acceptable, click "Approve". Use "Approve all generated" for bulk approval.

   **On every approve action**, the admin endpoint regenerates `public/audio/coach/coach-audio-manifest.json` — a JSON array of approved key strings (e.g. `["coach.immediate_threat.optimal.0", ...]`). This manifest is what `useCoachSpeech` fetches at mount to know which audio files exist, avoiding blind-fetch 404s.

5. Commit the generated MP3s and both registry files:
```bash
git add connect-four/public/audio/coach/ connect-four/server/tts-registry.json
git commit -m "feat: add TTS audio for coach keys (Epic 10)"
```

6. Deploy. Railway serves the committed MP3s and the manifest as static files.

---

## Development workflow: KB term annotation

1. Add `short_summary` fields to all 9 eligible KB entries (see `data-model.md`).

2. Verify the KB injection by triggering a deep reveal for a position involving a known pattern (e.g., z_threat). Check that:
   - The explanation contains `[term:community-z-threat]Z-threat[/term:community-z-threat]` markup.
   - The response includes `"terms": { "community-z-threat": "..." }`.
   - Tapping the term in the UI shows a popup with the correct summary.

3. Use a known test position for z_threat: run `./visualize_board.sh` to verify a movestring with a z_threat pattern, then trigger a deep reveal.

---

## Known gaps / post-MVP

- **Voice selection**: The `alloy` voice is hardcoded in the generate script. Post-MVP: expose voice picker in admin page.
- **Final SFX assets**: Placeholder MP3s must be replaced before public launch.
- **Music looping edge case**: On iOS, autoplay is blocked until a user gesture. The music toggle button doubles as the "unlock" gesture.
