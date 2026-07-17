import { describe, it, expect } from 'vitest';

// Pure helper under test: build the cache filter for a position+locale.
import { buildCacheFilter } from './explainCacheKey.mjs';

describe('buildCacheFilter', () => {
  it('includes locale in the equality filter', () => {
    expect(buildCacheFilter('abc123', 'es')).toEqual({ position_hash: 'abc123', locale: 'es' });
  });
  it('defaults locale to en', () => {
    expect(buildCacheFilter('abc123')).toEqual({ position_hash: 'abc123', locale: 'en' });
  });
});
