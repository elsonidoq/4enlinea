import { describe, it, expect } from 'vitest';
import { buildTtsInstructions, SPANISH_ACCENT_DIRECTIVE } from './ttsInstructions.mjs';

describe('buildTtsInstructions', () => {
  it('returns the base prompt unchanged for en', () => {
    const base = 'Speak with warmth and energy.';
    expect(buildTtsInstructions(base, 'en')).toBe(base);
  });

  it('returns base + Spanish accent directive for es', () => {
    const base = 'Speak with warmth and energy.';
    const result = buildTtsInstructions(base, 'es');
    expect(result).toContain(base);
    expect(result).toContain(SPANISH_ACCENT_DIRECTIVE);
  });

  it('joins base and directive with two newlines for es', () => {
    const base = 'Speak with warmth and energy.';
    const result = buildTtsInstructions(base, 'es');
    expect(result).toBe(`${base}\n\n${SPANISH_ACCENT_DIRECTIVE}`);
  });

  it('returns just the trimmed directive for es with an empty base', () => {
    expect(buildTtsInstructions('', 'es')).toBe(SPANISH_ACCENT_DIRECTIVE);
  });

  it('returns just the trimmed directive for es with a whitespace-only base', () => {
    expect(buildTtsInstructions('   ', 'es')).toBe(SPANISH_ACCENT_DIRECTIVE);
  });

  it('returns empty string for en with an empty base', () => {
    expect(buildTtsInstructions('', 'en')).toBe('');
  });

  it('defaults to en behavior for unknown/unsupported lang values', () => {
    const base = 'Speak with warmth and energy.';
    expect(buildTtsInstructions(base, 'fr')).toBe(base);
  });
});
