// connect-four/src/lib/apiLang.test.js
import { describe, it, expect, vi } from 'vitest';

vi.mock('../i18n/index.js', () => ({ default: { language: 'es' } }));

import { langHeaders } from './apiLang.js';

describe('langHeaders', () => {
  it('returns the current i18n language as Accept-Language', () => {
    expect(langHeaders()).toEqual({ 'Accept-Language': 'es' });
  });
});
