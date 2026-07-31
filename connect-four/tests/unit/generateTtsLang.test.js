/**
 * OI-91 regression: `synthesizeAndWrite` must forward `lang` to `synthesize(text, lang)`.
 *
 * The bug: it called `synthesize(value)` with no second argument. `synthesize` validates `lang`
 * against ['en','es'] and throws `invalid lang 'undefined'`, so `generate-tts.js --key` and
 * `--all-new` were broken for EVERY language — including the default `en` — while the registry,
 * manifest and sync subcommands kept working. Nothing covered the synthesis path, so a one-word
 * omission silently disabled coach-audio generation from the CLI; it was only found by running it.
 *
 * This asserts the argument actually reaches the provider, using an injected fake so no OpenAI
 * call (and no cost) is involved.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { synthesizeAndWrite, audioDirForLang } from '../../scripts/generate-tts.js';

const entry = { key: 'coach.spoken.claimeven.prompt.0', slug: 'coach--spoken--claimeven--prompt--0' };

test('synthesizeAndWrite forwards lang to synthesize (OI-91)', async () => {
  for (const lang of ['en', 'es']) {
    const calls = [];
    const fake = async (text, langArg) => {
      calls.push({ text, langArg });
      return Buffer.from('fake-mp3');
    };

    // synthesizeAndWrite always writes to audioDirForLang() — the real public/audio/coach tree.
    // Use a slug that cannot collide with a shipped clip and delete it in `finally`, so a failing
    // assertion can never leave an untracked mp3 behind for someone to commit by accident.
    const slug = `oi91-scratch-${lang}`;
    const written = join(audioDirForLang(lang), `${slug}.mp3`);
    try {
      await synthesizeAndWrite({ ...entry, slug }, 'texto de prueba', lang, {
        synthesizeFn: fake,
      });

      assert.equal(calls.length, 1, 'synthesize should be called exactly once');
      assert.equal(
        calls[0].langArg,
        lang,
        `lang must be forwarded to synthesize(); got ${JSON.stringify(calls[0].langArg)}. ` +
          'Passing undefined is OI-91 — synthesize() throws "invalid lang".',
      );
      assert.equal(calls[0].text, 'texto de prueba');
    } finally {
      await rm(written, { force: true });
    }
  }
});

test('the real synthesize() rejects an undefined lang — i.e. the guard OI-91 tripped is still live', async () => {
  const { synthesize } = await import('../../server/ttsProvider.js');
  await assert.rejects(
    () => synthesize('hola', undefined),
    /invalid lang/i,
    'synthesize must keep rejecting an absent lang, or the forwarding assertion above loses its teeth',
  );
});
