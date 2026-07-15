import { describe, it, expect } from 'vitest';
import { stripInternalTokens, guardExplainMoveLlmPayload } from './reasonRenderGuard.mjs';

describe('stripInternalTokens locale', () => {
  it('en rewrites cXrY to "column N"', () => {
    expect(stripInternalTokens('play c4r3 now', 'en')).toBe('play column 4 now');
  });
  it('es rewrites cXrY to "columna N"', () => {
    expect(stripInternalTokens('jugá c4r3 ahora', 'es')).toBe('jugá columna 4 ahora');
  });
  it('defaults to en', () => {
    expect(stripInternalTokens('play c4r3 now')).toBe('play column 4 now');
  });
});

describe('guardExplainMoveLlmPayload locale', () => {
  it('threads locale into cXrY rewrite', () => {
    const out = guardExplainMoveLlmPayload({ explanation: 'mirá c2r5', prompt: '', terms: {}, locale: 'es' });
    expect(out.explanation).toBe('mirá columna 2');
  });
});
