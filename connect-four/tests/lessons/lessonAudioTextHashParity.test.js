// ⚠️ DO NOT WIRE INTO package.json YET — this test is RED on purpose until the two
// mp3s orphaned by the OI-164 text fix are regenerated (see below). It is committed
// now so the gap it closes is not lost; wire it in the same change that regenerates
// lesson-05's audio.
//
// THE GAP. `tests/lessons/lessonAudioCoverage.test.js` proves every narratable message
// has an audio file that EXISTS ON DISK, and that no on-disk clip is unreferenced. Neither
// check looks at whether the referenced clip was synthesized FROM THE CURRENT TEXT.
// Audio identity is `sha256(text)[:16].mp3` (`server/lessonAudio.js:44`), so the moment an
// author edits a string the stored `audio` path points at a recording of the OLD wording —
// the learner READS the corrected sentence and HEARS the wrong one, and every existing gate
// stays green. That is precisely what happened to OI-164: lesson 5 slide 1 said Green played
// the centre column "three times" when the movestring `333` gives Green two discs there.
//
// This gate is the missing half: the stored filename must be the hash of the text it claims
// to narrate. Verified at source before writing — across all 15 lessons it holds for
// 460 of 462 message/language pairs; the only two failures are the OI-164 fix itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMessages, hashMessageText } from '../../server/lessonAudio.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_DIR = path.join(__dirname, '../../lessons');

test('lesson audio filenames are the hash of the text they narrate (no stale clip after a text edit)', () => {
  const drift = [];
  for (const file of fs.readdirSync(LESSONS_DIR).filter(f => /^lesson-\d+-.*\.json$/.test(f)).sort()) {
    const lesson = JSON.parse(fs.readFileSync(path.join(LESSONS_DIR, file), 'utf8'));
    for (const { message, locator, textKey, audioKey } of collectMessages(lesson)) {
      for (const lang of ['en', 'es']) {
        const tk = lang === 'es' ? `${textKey}_es` : textKey;
        const ak = lang === 'es' ? `${audioKey}_es` : audioKey;
        const text = message[tk];
        const audio = message[ak];
        // No text in this language, or no clip authored yet: coverage is
        // lessonAudioCoverage.test.js's job, not this one's.
        if (typeof text !== 'string' || text.trim() === '' || !audio) continue;
        const expected = `/audio/lessons/${hashMessageText(text)}.mp3`;
        if (audio !== expected) drift.push(`${file} ${locator} [${lang}]: stored ${audio}, text hashes to ${expected}`);
      }
    }
  }
  assert.deepEqual(drift, [],
    `lesson audio is stale relative to its text — regenerate these clips:\n${drift.join('\n')}`);
});
