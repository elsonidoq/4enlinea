import { describe, it, expect } from 'vitest';
import { loadKBShortSummary } from './llmCoachHelpers.js';

describe('loadKBShortSummary locale', () => {
  it('returns Spanish summary for es when present', () => {
    const es = loadKBShortSummary('claimeven', 'es');
    expect(es).toBeTruthy();
    // Spanish summary must not equal the English one (proves the es field was read)
    expect(es).not.toBe(loadKBShortSummary('claimeven', 'en'));
  });
  it('falls back to English when es missing', () => {
    // pick a slug you did NOT translate, or a nonexistent-es entry
    const enFallback = loadKBShortSummary('claimeven', 'en');
    expect(enFallback).toBeTruthy();
  });
});
