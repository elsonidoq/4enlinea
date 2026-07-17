import { describe, it, expect } from 'vitest';
import { audioDirForLang, manifestPathForLang } from './generate-tts.js';

describe('generate-tts locale paths', () => {
  it('en writes to the root coach dir (unchanged)', () => {
    expect(audioDirForLang('en')).toMatch(/public\/audio\/coach$/);
  });
  it('es writes to the es subdir', () => {
    expect(audioDirForLang('es')).toMatch(/public\/audio\/coach\/es$/);
  });
  it('manifest path follows the same layout', () => {
    expect(manifestPathForLang('es')).toMatch(/public\/audio\/coach\/es\/coach-audio-manifest\.json$/);
  });
});
